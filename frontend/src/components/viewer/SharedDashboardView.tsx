import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Check,
  Download,
  Image,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Timer,
  WifiOff,
  X,
} from 'lucide-react';
import { shareAPI } from '../../api/share';
import type {
  DashboardFilter,
  DashboardFilterType,
  DashboardFilterValues,
  DashboardFull,
  WidgetData,
} from '../../types';
import ChartWidget from '../dashboard/ChartWidget';
import TableWidget from '../dashboard/TableWidget';
import MetricWidget from '../dashboard/MetricWidget';
import DashboardFilterBar from '../dashboard/DashboardFilterBar';
import DashboardSocket from '../../api/websocket';
import Menu from '../../ui/Menu';
import type { MenuItem } from '../../ui/Menu';
import { IconButton } from '../../ui/Button';
import { normalizeLayout } from '../../utils/dashboard';
import { downloadCSV, downloadDataUrl, safeFilename } from '../../utils/csv';
import { toDashboardCSV } from '../../utils/dashboardExport';
import { apiErrorMessage } from '../../utils/apiError';
import {
  filterValuesFromSearch,
  hasFilterChanges,
  initialFilterValues,
  searchFromFilterValues,
} from '../../utils/filters';
import { relativeTime, refreshLabel } from '../../utils/format';
import { WIDGET_TYPE_LABELS, widgetTitle } from '../../utils/widgetConfig';
import '../dashboard/DashboardView.css';
import './SharedDashboardView.css';

const AUTO_REFRESH_OPTIONS = [0, 15, 30, 60, 300];

const normalizeFull = (data: DashboardFull): DashboardFull => ({
  ...data,
  widgets: Array.isArray(data.widgets) ? data.widgets : [],
  dashboard: {
    ...data.dashboard,
    filters: Array.isArray(data.dashboard.filters) ? data.dashboard.filters : [],
  },
});

const SharedDashboardView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const embed = searchParams.get('embed') === '1';

  const [dashboard, setDashboard] = useState<DashboardFull | null>(null);
  const [status, setStatus] = useState<'loading' | 'password' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterValues>(() =>
    filterValuesFromSearch(searchParams.toString()),
  );
  const [draftFilters, setDraftFilters] = useState<DashboardFilterValues>(() =>
    filterValuesFromSearch(searchParams.toString()),
  );
  const [autoRefreshSec, setAutoRefreshSec] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [widgetUpdatedAt, setWidgetUpdatedAt] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const bootToken = useRef<string | null>(null);
  const initializedFor = useRef<string | null>(null);
  const autoInitializedFor = useRef<string | null>(null);
  const hasLoaded = useRef(false);
  const passwordRef = useRef<string | undefined>(undefined);
  const draftRef = useRef(draftFilters);
  const autoApplyTimer = useRef<number | null>(null);

  useEffect(() => {
    draftRef.current = draftFilters;
  }, [draftFilters]);

  useEffect(() => () => {
    if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const load = useCallback(
    async (
      filters: DashboardFilterValues,
      options?: { silent?: boolean; pwd?: string },
    ): Promise<boolean> => {
      if (!token) return false;
      const silent = options?.silent ?? false;
      if (!silent) setLoading(true);
      const pwd = options && 'pwd' in options ? options.pwd : passwordRef.current;
      try {
        const res =
          pwd !== undefined
            ? await shareAPI.verifyPassword(token, pwd, filters)
            : await shareAPI.getShared(token, filters);
        const data = normalizeFull(res.data as DashboardFull);
        setDashboard(data);
        setStatus('ready');
        setError('');
        setPasswordError('');
        if (options && 'pwd' in options && pwd !== undefined) {
          passwordRef.current = pwd;
        }
        hasLoaded.current = true;
        const stamp = new Date().toISOString();
        setLastUpdatedAt(stamp);
        setWidgetUpdatedAt(
          Object.fromEntries(data.widgets.map((widgetData) => [widgetData.widget.id, stamp])),
        );
        return true;
      } catch (err) {
        const response = (err as { response?: { data?: { password_required?: boolean } } }).response;
        // A protected link answers 401 with password_required. That is a prompt,
        // not a failure: show the password form instead of an error.
        if (response?.data?.password_required) {
          setStatus('password');
          return false;
        }
        const message = apiErrorMessage(
          err,
          hasLoaded.current ? 'Could not refresh this dashboard.' : 'This link is not available.',
        );
        if (!hasLoaded.current) setStatus('error');
        setError(message);
        if (options && 'pwd' in options) setPasswordError(message);
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  // Initial load from the URL. Filter changes call load() directly so they do
  // not double-fetch through this effect.
  useEffect(() => {
    if (!token || bootToken.current === token) return;
    bootToken.current = token;
    const urlFilters = filterValuesFromSearch(searchKey);
    setAppliedFilters(urlFilters);
    setDraftFilters(urlFilters);
    draftRef.current = urlFilters;
    load(urlFilters);
  }, [token, searchKey, load]);

  const dashboardId = dashboard?.dashboard.id;

  useEffect(() => {
    if (!dashboardId || !token) return;
    // Password-protected shares authenticate with a POST body, which a
    // WebSocket handshake cannot carry. Skip the socket instead of retrying a
    // request that will always be rejected; the viewer still refreshes manually
    // and on its auto-refresh interval.
    if (passwordRef.current !== undefined) return;
    DashboardSocket.connectForShare(token);
    const unsubscribe = DashboardSocket.onMessage((msg) => {
      if (msg.type !== 'widget_data') return;
      const stamp = new Date().toISOString();
      setDashboard((current) => {
        if (!current) return current;
        return {
          ...current,
          widgets: current.widgets.map((widgetData) =>
            widgetData.widget.id === msg.widget_id
              ? { ...widgetData, data: msg.data, error: msg.error }
              : widgetData,
          ),
        };
      });
      setWidgetUpdatedAt((current) => ({ ...current, [msg.widget_id]: stamp }));
      setLastUpdatedAt(stamp);
    });
    return () => {
      DashboardSocket.disconnect();
      unsubscribe();
    };
  }, [dashboardId, token]);

  const filters = dashboard?.dashboard.filters ?? [];
  const dashboardDefaultRefresh = dashboard?.dashboard.refresh_interval_seconds ?? 0;

  // Merge URL overrides with each filter's configured default once the filter
  // definitions are known.
  useEffect(() => {
    if (!dashboard) return;
    if (initializedFor.current === dashboard.dashboard.id) return;
    initializedFor.current = dashboard.dashboard.id;
    const values = initialFilterValues(dashboard.dashboard.filters, appliedFilters);
    setAppliedFilters(values);
    setDraftFilters(values);
    draftRef.current = values;
  }, [dashboard, appliedFilters]);

  useEffect(() => {
    if (!dashboard) return;
    if (autoInitializedFor.current === dashboard.dashboard.id) return;
    autoInitializedFor.current = dashboard.dashboard.id;
    setAutoRefreshSec(dashboard.dashboard.refresh_interval_seconds ?? 0);
  }, [dashboard]);

  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const timer = window.setInterval(() => {
      load(appliedFilters, { silent: true });
    }, autoRefreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefreshSec, appliedFilters, load]);

  const applyFilterValues = (values: DashboardFilterValues) => {
    draftRef.current = values;
    setDraftFilters(values);
    setAppliedFilters(values);
    const query = searchFromFilterValues(values);
    const params = new URLSearchParams(query);
    if (embed) params.set('embed', '1');
    setSearchParams(params, { replace: true });
    load(values);
  };

  const handleFilterChange = (id: string, value: string, type: DashboardFilterType) => {
    const next = { ...draftRef.current, [id]: value };
    draftRef.current = next;
    setDraftFilters(next);
    if (type === 'select' || type === 'date') {
      if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current);
      autoApplyTimer.current = window.setTimeout(() => {
        autoApplyTimer.current = null;
        applyFilterValues(next);
      }, 300);
    }
  };

  const handleApplyFilters = () => {
    if (autoApplyTimer.current) {
      window.clearTimeout(autoApplyTimer.current);
      autoApplyTimer.current = null;
    }
    applyFilterValues(draftRef.current);
  };

  const handleClearFilter = (filter: DashboardFilter) => {
    applyFilterValues({ ...appliedFilters, [filter.id]: filter.default ?? '' });
  };

  const handleResetFilters = () => {
    if (autoApplyTimer.current) {
      window.clearTimeout(autoApplyTimer.current);
      autoApplyTimer.current = null;
    }
    const defaults = initialFilterValues(filters, {});
    applyFilterValues(defaults);
  };

  const handleVerify = async () => {
    setPasswordError('');
    const ok = await load(appliedFilters, { pwd: password });
    if (!ok) {
      setStatus((current) => (current === 'ready' ? current : 'password'));
    }
  };

  const handleExportWidget = (widgetData: WidgetData, index: number) => {
    const csv = toDashboardCSV([widgetData]);
    if (!csv) {
      setError('No data to export yet.');
      return;
    }
    downloadCSV(
      safeFilename(`${dashboard?.dashboard.name ?? 'dashboard'}-${widgetData.widget.widget_type}-${index + 1}`),
      csv,
    );
  };

  const handleExportWidgetPNG = (widgetData: WidgetData, index: number) => {
    const container = document.querySelector(
      `[data-widget-id="${widgetData.widget.id}"]`,
    );
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setError('This widget has no image to export.');
      return;
    }
    try {
      const output = document.createElement('canvas');
      output.width = canvas.width;
      output.height = canvas.height;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(canvas, 0, 0);
      const name = `${dashboard?.dashboard.name ?? 'dashboard'}-${widgetTitle(widgetData.widget)}-${index + 1}`;
      downloadDataUrl(`${safeFilename(name)}.png`, output.toDataURL('image/png'));
    } catch {
      setError('Could not export this widget as an image.');
    }
  };

  const handleExportAll = () => {
    const csv = toDashboardCSV(dashboard?.widgets ?? []);
    if (!csv) {
      setError('No data to export yet.');
      return;
    }
    downloadCSV(safeFilename(`${dashboard?.dashboard.name ?? 'dashboard'}-export`), csv);
  };

  const autoOptions = Array.from(new Set([dashboardDefaultRefresh, ...AUTO_REFRESH_OPTIONS])).sort(
    (a, b) => a - b,
  );
  const autoLabel = autoRefreshSec === 0 ? 'Off' : refreshLabel(autoRefreshSec);
  const autoMenuItems: MenuItem[] = autoOptions.map((seconds) => ({
    key: `auto-${seconds}`,
    label: `${seconds === 0 ? 'Off' : refreshLabel(seconds)}${
      seconds === dashboardDefaultRefresh && seconds > 0 ? ' (default)' : ''
    }`,
    icon: seconds === autoRefreshSec ? Check : undefined,
    onSelect: () => setAutoRefreshSec(seconds),
  }));

  if (status === 'password') {
    return (
      <div className="shared-view-password">
        <div className="shared-view-card">
          <h3>Password Required</h3>
          <p className="shared-view-card-copy">
            This dashboard is protected. Enter the password you were given to view it.
          </p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter dashboard password"
            autoComplete="current-password"
            onKeyDown={(event) => event.key === 'Enter' && handleVerify()}
          />
          <button onClick={handleVerify} disabled={loading}>
            {loading ? 'Checking…' : 'Submit'}
          </button>
          {passwordError && <p className="shared-view-error" role="alert">{passwordError}</p>}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    if (status === 'error') {
      return (
        <div className="shared-view-password">
          <div className="shared-view-card">
            <h3>This link is not available</h3>
            <p className="shared-view-card-copy">
              {error || 'The link may have expired or been revoked by its owner.'}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="shared-view-loading" aria-busy="true">
        <div className="shared-view-skeleton" />
        <div className="shared-view-skeleton-grid" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="shared-view-skeleton-card" key={index} />
          ))}
        </div>
      </div>
    );
  }

  const widgets = [...dashboard.widgets].sort((a, b) => {
    if (a.widget.position_y !== b.widget.position_y) {
      return a.widget.position_y - b.widget.position_y;
    }
    return a.widget.position_x - b.widget.position_x;
  });
  const activeFilters = filters.filter((filter) => (appliedFilters[filter.id] ?? '') !== '');
  const updatedLabel = lastUpdatedAt ? relativeTime(lastUpdatedAt, now) : '';
  const hasData = widgets.some((widgetData) => !!widgetData.data);

  return (
    <div
      className={`shared-view${embed ? ' shared-view--embed' : ''}`}
      ref={rootRef}
    >
      <header className="shared-view-header">
        <div className="shared-view-brand">
          <h2>{dashboard.dashboard.name}</h2>
          <span className="shared-view-badge">Read-only</span>
          {updatedLabel && (
            <span
              className="shared-view-freshness"
              title={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : undefined}
            >
              Updated {updatedLabel}
            </span>
          )}
        </div>
        <div className="shared-view-actions">
          <Menu
            label="Auto-refresh interval"
            align="end"
            trigger={
              <button className="shared-view-btn" title="Auto-refresh interval">
                <Timer size={13} aria-hidden="true" />
                Auto: {autoLabel}
              </button>
            }
            items={autoMenuItems}
          />
          <button
            className="shared-view-btn"
            onClick={handleExportAll}
            disabled={!hasData}
            title="Export every widget to one CSV"
          >
            <Download size={13} aria-hidden="true" />
            Export
          </button>
          <button
            className="shared-view-btn shared-view-btn--icon"
            onClick={() => window.print()}
            title="Print or save as PDF"
            aria-label="Print or save as PDF"
          >
            <Printer size={14} aria-hidden="true" />
          </button>
          <button
            className="shared-view-btn"
            onClick={() => load(appliedFilters)}
            disabled={loading}
          >
            <RefreshCw size={13} aria-hidden="true" />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {!isOnline && (
        <div className="shared-view-offline" role="status">
          <WifiOff size={14} aria-hidden="true" />
          You are offline. Showing the last loaded data.
        </div>
      )}

      {error && (
        <div className="shared-view-inline-error" role="alert">
          {error}
        </div>
      )}

      <DashboardFilterBar
        filters={filters}
        values={draftFilters}
        loading={loading}
        dirty={hasFilterChanges(filters, draftFilters)}
        onChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {activeFilters.length > 0 && (
        <div className="dashboard-filter-chips" aria-label="Active filters">
          {activeFilters.map((filter) => (
            <span className="dashboard-filter-chip" key={filter.id}>
              <span>
                {filter.label || filter.id}:{' '}
                <strong>{appliedFilters[filter.id]}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleClearFilter(filter)}
                aria-label={`Clear ${filter.label || filter.id} filter`}
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" className="filter-clear-all" onClick={handleResetFilters}>
            Clear all
          </button>
        </div>
      )}

      <div className="shared-view-grid">
        {widgets.map((widgetData, index) => {
          const layout = normalizeLayout({
            x: widgetData.widget.position_x,
            y: widgetData.widget.position_y,
            w: widgetData.widget.width,
            h: widgetData.widget.height,
          });
          const widgetTitleText = widgetTitle(widgetData.widget);
          const widgetStamp = widgetUpdatedAt[widgetData.widget.id];
          const widgetMenu: MenuItem[] = [
            {
              key: 'csv',
              label: 'Export CSV',
              icon: Download,
              disabled: !widgetData.data,
              onSelect: () => handleExportWidget(widgetData, index),
            },
            {
              key: 'png',
              label: 'Export PNG',
              icon: Image,
              disabled: widgetData.widget.widget_type !== 'chart' || !widgetData.data,
              onSelect: () => handleExportWidgetPNG(widgetData, index),
            },
          ];
          return (
            <div
              key={widgetData.widget.id}
              data-widget-id={widgetData.widget.id}
              className="shared-view-widget"
              style={{
                gridColumn: `${layout.x + 1} / span ${layout.w}`,
                gridRow: `${layout.y + 1} / span ${layout.h}`,
              }}
            >
              <div className="shared-view-widget-header">
                <div className="shared-view-widget-heading">
                  <span className="shared-view-widget-title">{widgetTitleText}</span>
                  {widgetData.widget.config?.title && (
                    <span className="shared-view-widget-type">
                      {WIDGET_TYPE_LABELS[widgetData.widget.widget_type]}
                    </span>
                  )}
                  {widgetStamp && (
                    <span
                      className="shared-view-widget-updated"
                      title={new Date(widgetStamp).toLocaleString()}
                    >
                      {relativeTime(widgetStamp, now)}
                    </span>
                  )}
                </div>
                <Menu
                  label={`${widgetTitleText} actions`}
                  align="end"
                  trigger={
                    <IconButton size="sm" label={`${widgetTitleText} actions`}>
                      <MoreHorizontal size={15} aria-hidden="true" />
                    </IconButton>
                  }
                  items={widgetMenu}
                />
              </div>
              <div className="shared-view-widget-body">
                {widgetData.widget.widget_type === 'chart' && (
                  <ChartWidget data={widgetData.data} config={widgetData.widget.config} />
                )}
                {widgetData.widget.widget_type === 'table' && (
                  <TableWidget data={widgetData.data} config={widgetData.widget.config} />
                )}
                {widgetData.widget.widget_type === 'metric' && (
                  <MetricWidget data={widgetData.data} config={widgetData.widget.config} />
                )}
                {widgetData.error && (
                  <div className="shared-view-widget-error" role="alert">
                    <strong>This widget could not load its data.</strong>
                    <details>
                      <summary>Details</summary>
                      <pre>{widgetData.error}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {widgets.length === 0 && (
          <div className="shared-view-empty">No widgets are available for this dashboard.</div>
        )}
      </div>
    </div>
  );
};

export default SharedDashboardView;

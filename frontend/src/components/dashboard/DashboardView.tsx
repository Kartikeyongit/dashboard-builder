import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Check,
  Download,
  ExternalLink,
  Image,
  MoreHorizontal,
  Pencil,
  Printer,
  RefreshCw,
  Timer,
  WifiOff,
  X,
} from 'lucide-react';
import { dashboardAPI, widgetAPI } from '../../api/dashboard';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { addToast } from '../../store/toastSlice';
import type {
  DashboardFilter,
  DashboardFilterType,
  DashboardFilterValues,
  DashboardFull,
  WidgetData,
} from '../../types';
import { canEditContent } from '../../utils/permissions';
import { normalizeLayout } from '../../utils/dashboard';
import {
  filterValuesFromSearch,
  hasFilterChanges,
  initialFilterValues,
  searchFromFilterValues,
} from '../../utils/filters';
import { findCrossFilter, normalizeDimensionName, toggledFilterValue } from '../../utils/crossFilter';
import { downloadCSV, downloadDataUrl, safeFilename, toCSV } from '../../utils/csv';
import { toDashboardCSV } from '../../utils/dashboardExport';
import { apiErrorMessage } from '../../utils/apiError';
import { relativeTime, refreshLabel } from '../../utils/format';
import { WIDGET_TYPE_LABELS, refreshOverrideLabel, widgetTitle } from '../../utils/widgetConfig';
import { useDashboardSocket } from '../../hooks/useDashboardSocket';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import DashboardFilterBar from './DashboardFilterBar';
import ShareDialog from './ShareDialog';
import DashboardSettingsDialog from './DashboardSettingsDialog';
import EmptyState from '../ui/EmptyState';
import WidgetBoundary from '../errors/WidgetBoundary';
import Menu from '../../ui/Menu';
import type { MenuItem } from '../../ui/Menu';
import { IconButton } from '../../ui/Button';
import './DashboardView.css';

const AUTO_REFRESH_OPTIONS = [0, 15, 30, 60, 300];


const normalizeFull = (data: DashboardFull): DashboardFull => ({
  ...data,
  widgets: Array.isArray(data.widgets) ? data.widgets : [],
  dashboard: {
    ...data.dashboard,
    filters: Array.isArray(data.dashboard.filters) ? data.dashboard.filters : [],
  },
});

const DashboardView: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);

  const [initialFilters, setInitialFilters] = useState<DashboardFilterValues>(() =>
    filterValuesFromSearch(searchParams.toString())
  );
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterValues>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<DashboardFilterValues>(initialFilters);
  const [full, setFull] = useState<DashboardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crossFilterSource, setCrossFilterSource] = useState<{ widgetId: string; filterId: string } | null>(null);
  const [autoRefreshSec, setAutoRefreshSec] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [widgetUpdatedAt, setWidgetUpdatedAt] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const [refreshingWidget, setRefreshingWidget] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const initializedFor = useRef<string | null>(null);
  const autoInitializedFor = useRef<string | null>(null);
  const loadedDashboardId = useRef<string | null>(null);
  const warnedColumns = useRef<Set<string>>(new Set());
  const pageRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const searchKey = searchParams.toString();
  const draftRef = useRef(draftFilters);
  const autoApplyTimer = useRef<number | null>(null);

  useEffect(() => {
    draftRef.current = draftFilters;
  }, [draftFilters]);

  useEffect(() => () => {
    if (autoApplyTimer.current) window.clearTimeout(autoApplyTimer.current);
  }, []);

  // Relative "updated" labels need to tick even when no data changes.
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

  // The scheduler pushes per-widget refreshes over the dashboard socket. The
  // viewer keeps its data in local state, so merge those updates here.
  useDashboardSocket(
    dashboardId,
    useCallback((message) => {
      const stamp = new Date().toISOString();
      setFull((current) => {
        if (!current) return current;
        return {
          ...current,
          widgets: current.widgets.map((widgetData) =>
            widgetData.widget.id === message.widget_id
              ? { ...widgetData, data: message.data, error: message.error }
              : widgetData,
          ),
        };
      });
      setWidgetUpdatedAt((current) => ({ ...current, [message.widget_id]: stamp }));
      setLastUpdatedAt(stamp);
    }, []),
  );

  const load = useCallback(
    async (filters: DashboardFilterValues, silent = false) => {
      if (!dashboardId) return;
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const res = await dashboardAPI.getFull(dashboardId, filters);
        if (seq !== requestSeq.current) return;
        const data = normalizeFull(res.data);
        setFull(data);
        const stamp = new Date().toISOString();
        setLastUpdatedAt(stamp);
        setWidgetUpdatedAt(
          Object.fromEntries(data.widgets.map((widgetData) => [widgetData.widget.id, stamp])),
        );
        setError('');
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(apiErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [dashboardId]
  );

  useEffect(() => {
    if (!dashboardId) return;
    // Do not show the previous dashboard's widgets while the next one loads.
    if (loadedDashboardId.current !== dashboardId) {
      loadedDashboardId.current = dashboardId;
      setFull(null);
      setCrossFilterSource(null);
      warnedColumns.current = new Set();
      autoInitializedFor.current = null;
      setLastUpdatedAt(null);
      setWidgetUpdatedAt({});
    }
    // The URL is the source of truth for applied filters, which keeps copied
    // links working and makes the current filter state explicit.
    const urlFilters = filterValuesFromSearch(searchKey);
    initializedFor.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is the source of truth for filter state
    setInitialFilters(urlFilters);
    setAppliedFilters(urlFilters);
    load(urlFilters, false);
  }, [searchKey, dashboardId, load]);

  // Seed the control values from defaults + URL overrides once the dashboard
  // (and therefore its filter definitions) is available.
  useEffect(() => {
    if (!full) return;
    if (initializedFor.current === full.dashboard.id) return;
    initializedFor.current = full.dashboard.id;
    const values = initialFilterValues(full.dashboard.filters, initialFilters);
    setDraftFilters(values);
    setAppliedFilters(values);
  }, [full, initialFilters]);

  const dashboardDefaultRefresh = full?.dashboard.refresh_interval_seconds ?? 0;

  // Start from the dashboard's own interval, then let the viewer override it
  // for this visit without changing the saved dashboard.
  useEffect(() => {
    if (!full) return;
    if (autoInitializedFor.current === full.dashboard.id) return;
    autoInitializedFor.current = full.dashboard.id;
    setAutoRefreshSec(full.dashboard.refresh_interval_seconds ?? 0);
  }, [full]);

  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0 || !dashboardId) return;
    const timer = window.setInterval(() => {
      load(appliedFilters, true);
    }, autoRefreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefreshSec, appliedFilters, dashboardId, load]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (pageRef.current?.requestFullscreen) {
        await pageRef.current.requestFullscreen();
      }
    } catch {
      dispatch(addToast({ message: 'Fullscreen is not available', type: 'error' }));
    }
  };

  const applyFilterValues = useCallback(
    (values: DashboardFilterValues) => {
      draftRef.current = values;
      setDraftFilters(values);
      setAppliedFilters(values);
      const query = searchFromFilterValues(values);
      setSearchParams(query ? new URLSearchParams(query) : {}, { replace: true });
      // The URL effect reloads when the query changes. Re-applying the same
      // values still needs an explicit reload.
      if (query === searchKey) load(values);
    },
    [load, searchKey, setSearchParams]
  );

  const handleFilterChange = (id: string, value: string, type: DashboardFilterType) => {
    const next = { ...draftRef.current, [id]: value };
    draftRef.current = next;
    setDraftFilters(next);

    // Selects and dates apply immediately (debounced); free text and numbers
    // wait for the explicit Apply button so every keystroke is not a query.
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
    setCrossFilterSource(null);
    applyFilterValues(draftRef.current);
  };

  const handleClearFilter = (filter: DashboardFilter) => {
    setCrossFilterSource(null);
    applyFilterValues({ ...appliedFilters, [filter.id]: filter.default ?? '' });
  };

  const handleResetFilters = () => {
    if (autoApplyTimer.current) {
      window.clearTimeout(autoApplyTimer.current);
      autoApplyTimer.current = null;
    }
    const defaults = initialFilterValues(full?.dashboard.filters, {});
    setCrossFilterSource(null);
    setDraftFilters(defaults);
    draftRef.current = defaults;
    setSearchParams({}, { replace: true });
    if (searchKey === '') load(defaults);
  };

  // A chart click drives an existing dashboard filter. The filter is applied
  // through the same URL/state path as the filter bar, so the value still
  // travels to SQL as a bound parameter.
  const handleChartSelect = (widgetId: string, column: string, value: string) => {
    const filter = findCrossFilter(full?.dashboard.filters, column);
    if (!filter) {
      const normalized = normalizeDimensionName(column);
      if (normalized && !warnedColumns.current.has(normalized)) {
        warnedColumns.current.add(normalized);
        dispatch(addToast({
          message: `No dashboard filter matches "${column}". Add a filter with id "${normalized}" to cross-filter from this chart.`,
          type: 'info',
        }));
      }
      return;
    }

    const next = toggledFilterValue(filter, appliedFilters[filter.id], value);
    setCrossFilterSource(next === (filter.default ?? '') ? null : { widgetId, filterId: filter.id });
    applyFilterValues({ ...appliedFilters, [filter.id]: next });
  };

  const handleClearCrossFilter = (filter: DashboardFilter) => {
    setCrossFilterSource(null);
    applyFilterValues({ ...appliedFilters, [filter.id]: filter.default ?? '' });
  };

  const handleExportWidget = (widgetData: WidgetData, index: number) => {
    const csv = toCSV(widgetData.data);
    if (!csv) {
      dispatch(addToast({ message: 'No data to export yet', type: 'error' }));
      return;
    }
    const name = `${full?.dashboard.name ?? 'dashboard'}-${widgetData.widget.widget_type}-${index + 1}`;
    downloadCSV(safeFilename(name), csv);
  };

  const handleExportWidgetPNG = (widgetData: WidgetData, index: number) => {
    const container = document.querySelector(`[data-widget-id="${widgetData.widget.id}"]`);
    const canvas = container?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      dispatch(addToast({ message: 'This widget has no image to export', type: 'error' }));
      return;
    }
    try {
      // Charts render on a transparent canvas. Composite onto white so the PNG
      // stays readable in dark-themed documents and slide decks.
      const output = document.createElement('canvas');
      output.width = canvas.width;
      output.height = canvas.height;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(canvas, 0, 0);
      const name = `${full?.dashboard.name ?? 'dashboard'}-${widgetTitle(widgetData.widget)}-${index + 1}`;
      downloadDataUrl(`${safeFilename(name)}.png`, output.toDataURL('image/png'));
    } catch {
      dispatch(addToast({ message: 'Could not export this widget as an image', type: 'error' }));
    }
  };

  const handleRefreshWidget = async (widgetData: WidgetData) => {
    if (!dashboardId) return;
    setRefreshingWidget(widgetData.widget.id);
    try {
      const res = await widgetAPI.refresh(dashboardId, widgetData.widget.id, appliedFilters);
      const updated = res.data;
      setFull((current) =>
        current
          ? {
              ...current,
              widgets: current.widgets.map((item) =>
                item.widget.id === updated.widget.id
                  ? { ...item, data: updated.data, error: updated.error }
                  : item,
              ),
            }
          : current,
      );
      setWidgetUpdatedAt((current) => ({
        ...current,
        [widgetData.widget.id]: new Date().toISOString(),
      }));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not refresh the widget'), type: 'error' }));
    } finally {
      setRefreshingWidget(null);
    }
  };

  const handleExportAll = () => {
    const csv = toDashboardCSV(full?.widgets ?? []);
    if (!csv) {
      dispatch(addToast({ message: 'No data to export yet', type: 'error' }));
      return;
    }
    downloadCSV(safeFilename(`${full?.dashboard.name ?? 'dashboard'}-export`), csv);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !full) {
    return (
      <div className="dashboard-view" ref={pageRef} aria-busy="true" aria-label="Loading dashboard">
        <div className="dashboard-view-skeleton-toolbar" />
        <div className="dashboard-view-skeleton-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="dashboard-view-skeleton-card" key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error && !full) {
    return (
      <div className="dashboard-view" ref={pageRef}>
        <div className="dashboard-view-error">
          <h3>Could not load dashboard</h3>
          <p>{error}</p>
          <button className="dv-btn" onClick={() => navigate('/dashboards')}>Back to Dashboards</button>
        </div>
      </div>
    );
  }

  if (!full) return null;

  const filters = full.dashboard.filters ?? [];
  const activeCrossFilter = crossFilterSource
    ? filters.find((filter) => filter.id === crossFilterSource.filterId)
    : undefined;
  const activeCrossFilterValue = activeCrossFilter
    ? appliedFilters[activeCrossFilter.id] ?? ''
    : '';
  const widgets = [...full.widgets].sort((a, b) => {
    if (a.widget.position_y !== b.widget.position_y) {
      return a.widget.position_y - b.widget.position_y;
    }
    return a.widget.position_x - b.widget.position_x;
  });
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
  const activeFilters = filters.filter((filter) => (appliedFilters[filter.id] ?? '') !== '');
  const hasData = widgets.some((widgetData) => !!widgetData.data);
  const updatedLabel = lastUpdatedAt ? relativeTime(lastUpdatedAt, now) : '';

  return (
    <div className={`dashboard-view${isFullscreen ? ' dashboard-view--fullscreen' : ''}`} ref={pageRef}>
      <div className="dashboard-view-toolbar">
        <div className="dashboard-view-title">
          <Link to="/dashboards" className="dv-back" title="Back to dashboards">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <h2>{full.dashboard.name}</h2>
          {autoRefreshSec > 0 && (
            <span className="dv-refresh-badge" title={`Auto-refresh every ${refreshLabel(autoRefreshSec)}`}>
              <Timer size={11} aria-hidden="true" />
              {refreshLabel(autoRefreshSec)}
            </span>
          )}
          {updatedLabel && (
            <span className="dv-freshness" title={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : undefined}>
              {updatedLabel}
            </span>
          )}
        </div>

        <div className="dashboard-view-actions">
          {canEdit && (
            <Link to={`/dashboards/${full.dashboard.id}/edit`} className="dv-btn dv-btn--primary">
              Edit
            </Link>
          )}
          {canEdit && (
            <button className="dv-btn" onClick={() => setShowShare(true)}>
              Share
            </button>
          )}
          {canEdit && (
            <button className="dv-btn" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          )}
          <Menu
            label="Auto-refresh interval"
            align="end"
            trigger={
              <button className="dv-btn" title="Auto-refresh interval">
                <Timer size={13} aria-hidden="true" />
                Auto: {autoLabel}
              </button>
            }
            items={autoMenuItems}
          />
          <button
            className="dv-btn"
            onClick={handleExportAll}
            disabled={!hasData}
            title="Export every widget to one CSV"
          >
            <Download size={13} aria-hidden="true" />
            Export
          </button>
          <button
            className="dv-btn dv-btn--icon"
            onClick={handlePrint}
            title="Print or save as PDF"
            aria-label="Print or save as PDF"
          >
            <Printer size={14} aria-hidden="true" />
          </button>
          <button className="dv-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button className="dv-btn" onClick={() => load(appliedFilters)} disabled={loading}>
            <RefreshCw size={13} aria-hidden="true" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="dashboard-view-offline" role="status">
          <WifiOff size={14} aria-hidden="true" />
          You are offline. Showing the last loaded data.
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

      {activeCrossFilter && activeCrossFilterValue && (
        <div className="dashboard-cross-filter">
          <span>
            Cross-filter: <strong>{activeCrossFilter.label || activeCrossFilter.id}</strong> = {activeCrossFilterValue}
          </span>
          <button
            type="button"
            onClick={() => handleClearCrossFilter(activeCrossFilter)}
            title="Clear cross-filter"
            aria-label="Clear cross-filter"
          >
            ×
          </button>
        </div>
      )}

      {error && <div className="dashboard-view-inline-error">{error}</div>}

      <div className="dashboard-view-grid">
        {widgets.map((widgetData, index) => {
          const layout = normalizeLayout({
            x: widgetData.widget.position_x,
            y: widgetData.widget.position_y,
            w: widgetData.widget.width,
            h: widgetData.widget.height,
          });
          const canExport =
            (widgetData.widget.widget_type === 'table' || widgetData.widget.widget_type === 'metric') &&
            !!widgetData.data;
          const widgetTitleText = widgetTitle(widgetData.widget);
          const widgetMenu: MenuItem[] = [
            {
              key: 'refresh',
              label: refreshingWidget === widgetData.widget.id ? 'Refreshing…' : 'Refresh widget',
              icon: RefreshCw,
              disabled: refreshingWidget === widgetData.widget.id,
              onSelect: () => handleRefreshWidget(widgetData),
            },
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
          if (canEdit) {
            widgetMenu.push(
              {
                key: 'query',
                label: 'View query',
                icon: ExternalLink,
                separatorBefore: true,
                onSelect: () => navigate(`/queries/${widgetData.widget.query_id}/edit`),
              },
              {
                key: 'edit',
                label: 'Edit widget',
                icon: Pencil,
                onSelect: () => navigate(`/dashboards/${full.dashboard.id}/edit?widget=${widgetData.widget.id}`),
              },
            );
          }
          const widgetStamp = widgetUpdatedAt[widgetData.widget.id];
          return (
            <div
              key={widgetData.widget.id}
              data-widget-id={widgetData.widget.id}
              className={`dashboard-view-widget${
                crossFilterSource?.widgetId === widgetData.widget.id
                  ? ' dashboard-view-widget--cross-filter-source'
                  : ''
              }`}
              style={{
                gridColumn: `${layout.x + 1} / span ${layout.w}`,
                gridRow: `${layout.y + 1} / span ${layout.h}`,
              }}
            >
              <div className="dashboard-view-widget-header">
                <div className="dv-widget-heading">
                  <span className="dv-widget-title">{widgetTitleText}</span>
                  {widgetData.widget.config?.title && (
                    <span className="dv-widget-type">
                      {WIDGET_TYPE_LABELS[widgetData.widget.widget_type]}
                    </span>
                  )}
                  {widgetData.widget.refresh_interval_override !== undefined &&
                    widgetData.widget.refresh_interval_override !== null && (
                      <span
                        className="dv-widget-refresh"
                        title={refreshOverrideLabel(
                          widgetData.widget.refresh_interval_override,
                          dashboardDefaultRefresh,
                        )}
                      >
                        {widgetData.widget.refresh_interval_override === 0
                          ? 'Off'
                          : `${widgetData.widget.refresh_interval_override}s`}
                      </span>
                    )}
                  {widgetStamp && (
                    <span
                      className="dv-widget-updated"
                      title={new Date(widgetStamp).toLocaleString()}
                    >
                      {refreshingWidget === widgetData.widget.id
                        ? 'Refreshing…'
                        : `Updated ${relativeTime(widgetStamp, now)}`}
                    </span>
                  )}
                </div>
                <div className="dv-widget-actions">
                  {canExport && (
                    <button
                      className="dv-export-btn"
                      onClick={() => handleExportWidget(widgetData, index)}
                      title="Export this widget as CSV"
                    >
                      CSV
                    </button>
                  )}
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
              </div>
              <div className="dashboard-view-widget-body">
                <WidgetBoundary
                  title={`Widget ${index + 1} failed to render`}
                  resetKey={`${widgetData.widget.id}:${widgetData.error ?? ''}:${widgetData.data ? widgetData.data.rows.length : 'none'}`}
                >
                  {widgetData.widget.widget_type === 'chart' && (
                    <ChartWidget
                      data={widgetData.data}
                      config={widgetData.widget.config}
                      onSelect={(column, value) => handleChartSelect(widgetData.widget.id, column, value)}
                    />
                  )}
                  {widgetData.widget.widget_type === 'table' && (
                    <TableWidget data={widgetData.data} config={widgetData.widget.config} />
                  )}
                  {widgetData.widget.widget_type === 'metric' && (
                    <MetricWidget data={widgetData.data} config={widgetData.widget.config} />
                  )}
                </WidgetBoundary>
                {widgetData.error && (
                  <div className="dashboard-view-widget-error" role="alert">
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
          <div className="dashboard-view-empty">
            <EmptyState
              icon="widget"
              title="No widgets yet"
              description={canEdit
                ? 'Edit this dashboard to add charts, tables, and metrics.'
                : 'This dashboard does not have any widgets yet.'}
              action={canEdit ? { label: 'Edit Dashboard', onClick: () => navigate(`/dashboards/${full.dashboard.id}/edit`) } : undefined}
            />
          </div>
        )}
      </div>

      {canEdit && showShare && (
        <ShareDialog dashboardId={full.dashboard.id} onClose={() => setShowShare(false)} />
      )}

      {canEdit && (
        <DashboardSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          dashboard={full.dashboard}
          onSaved={(updated) =>
            setFull((current) =>
              current ? { ...current, dashboard: { ...current.dashboard, ...updated } } : current,
            )
          }
        />
      )}
    </div>
  );
};

export default DashboardView;

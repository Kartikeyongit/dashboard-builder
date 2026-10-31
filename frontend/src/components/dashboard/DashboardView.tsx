import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardAPI } from '../../api/dashboard';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { addToast } from '../../store/toastSlice';
import type { DashboardFilter, DashboardFilterValues, DashboardFull, WidgetData } from '../../types';
import { canEditContent } from '../../utils/permissions';
import { normalizeLayout } from '../../utils/dashboard';
import {
  filterValuesFromSearch,
  hasFilterChanges,
  initialFilterValues,
  searchFromFilterValues,
} from '../../utils/filters';
import { findCrossFilter, normalizeDimensionName, toggledFilterValue } from '../../utils/crossFilter';
import { downloadCSV, safeFilename, toCSV } from '../../utils/csv';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import DashboardFilterBar from './DashboardFilterBar';
import ShareDialog from './ShareDialog';
import EmptyState from '../ui/EmptyState';
import './DashboardView.css';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crossFilterSource, setCrossFilterSource] = useState<{ widgetId: string; filterId: string } | null>(null);

  const initializedFor = useRef<string | null>(null);
  const loadedDashboardId = useRef<string | null>(null);
  const warnedColumns = useRef<Set<string>>(new Set());
  const pageRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);
  const searchKey = searchParams.toString();

  const load = useCallback(
    async (filters: DashboardFilterValues, silent = false) => {
      if (!dashboardId) return;
      const seq = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const res = await dashboardAPI.getFull(dashboardId, filters);
        if (seq !== requestSeq.current) return;
        setFull(normalizeFull(res.data));
        setError('');
      } catch (err: any) {
        if (seq !== requestSeq.current) return;
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load dashboard');
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
    }
    // The URL is the source of truth for applied filters, which keeps copied
    // links working and makes the current filter state explicit.
    const urlFilters = filterValuesFromSearch(searchKey);
    initializedFor.current = null;
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

  const refreshInterval = full?.dashboard.refresh_interval_seconds ?? 0;
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !dashboardId) return;
    const timer = window.setInterval(() => {
      load(appliedFilters, true);
    }, refreshInterval * 1000);
    return () => window.clearInterval(timer);
  }, [refreshInterval, appliedFilters, dashboardId, load]);

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

  const handleApplyFilters = () => {
    setCrossFilterSource(null);
    applyFilterValues(draftFilters);
  };

  const handleResetFilters = () => {
    const defaults = initialFilterValues(full?.dashboard.filters, {});
    setCrossFilterSource(null);
    setDraftFilters(defaults);
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

  if (loading && !full) {
    return (
      <div className="dashboard-view" ref={pageRef}>
        <div className="dashboard-view-loading">Loading dashboard...</div>
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
          {refreshInterval > 0 && (
            <span className="dv-refresh-badge" title="Auto-refresh interval">
              {refreshInterval}s
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
          <button className="dv-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button className="dv-btn" onClick={() => load(appliedFilters)} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <DashboardFilterBar
        filters={filters}
        values={draftFilters}
        loading={loading}
        dirty={hasFilterChanges(filters, draftFilters)}
        onChange={(id, value) =>
          setDraftFilters((current) => ({ ...current, [id]: value }))
        }
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

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
          return (
            <div
              key={widgetData.widget.id}
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
                <span className="dv-widget-type">{widgetData.widget.widget_type}</span>
                {canExport && (
                  <button
                    className="dv-export-btn"
                    onClick={() => handleExportWidget(widgetData, index)}
                    title="Export this widget as CSV"
                  >
                    CSV
                  </button>
                )}
              </div>
              <div className="dashboard-view-widget-body">
                {widgetData.widget.widget_type === 'chart' && (
                  <ChartWidget
                    data={widgetData.data}
                    config={widgetData.widget.config}
                    onSelect={(column, value) => handleChartSelect(widgetData.widget.id, column, value)}
                  />
                )}
                {widgetData.widget.widget_type === 'table' && <TableWidget data={widgetData.data} />}
                {widgetData.widget.widget_type === 'metric' && (
                  <MetricWidget data={widgetData.data} config={widgetData.widget.config} />
                )}
                {widgetData.error && <div className="dashboard-view-widget-error">{widgetData.error}</div>}
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
    </div>
  );
};

export default DashboardView;

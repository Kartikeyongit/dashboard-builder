import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { debounce } from 'lodash';
import {
  ArrowLeft,
  ClipboardCopy,
  Copy,
  Eye,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  loadDashboardFull,
  clearCurrentFull,
  removeWidgetFromCurrent,
  restoreWidgetToCurrent,
  updateWidgetInCurrent,
  updateWidgetLayout,
} from '../../store/dashboardSlice';
import { widgetAPI } from '../../api/dashboard';
import type { CreateWidgetPayload, UpdateWidgetPayload } from '../../api/dashboard';
import type { Widget, WidgetConfig, WidgetData } from '../../types';
import { addToast } from '../../store/toastSlice';
import { useDashboardSocket } from '../../hooks/useDashboardSocket';
import { useDeferredDelete } from '../../hooks/useDeferredDelete';
import { canEditContent } from '../../utils/permissions';
import { apiErrorMessage } from '../../utils/apiError';
import { getNextWidgetY, widgetToLayout } from '../../utils/dashboard';
import { refreshLabel } from '../../utils/format';
import { normalizeWidgetConfig, widgetTitle } from '../../utils/widgetConfig';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import AddWidgetDialog from './AddWidgetDialog';
import ShareDialog from './ShareDialog';
import DashboardSettingsDialog from './DashboardSettingsDialog';
import DashboardFilterDialog from './DashboardFilterDialog';
import WidgetInspector from './WidgetInspector';
import Menu from '../../ui/Menu';
import type { MenuItem } from '../../ui/Menu';
import ConfirmDialog from '../../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import WidgetBoundary from '../errors/WidgetBoundary';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardEditor.css';

const WIDGET_ICONS: Record<string, React.ReactNode> = {
  chart: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  table: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
    </svg>
  ),
  metric: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const DashboardEditor: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentFull, loading } = useAppSelector((state) => state.dashboards);
  const user = useAppSelector((state) => state.auth.user);
  const canEdit = canEditContent(user);
  const deferredDelete = useDeferredDelete();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [inspectorDirty, setInspectorDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [gridWidth, setGridWidth] = useState(1200);
  const pendingLayoutUpdates = useRef(new Map<string, Partial<CreateWidgetPayload>>());
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const saveLayoutRef = useRef<ReturnType<typeof debounce> | null>(null);

  // Warn before leaving the page while the inspector has unsaved changes.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      inspectorDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (dashboardId) dispatch(loadDashboardFull(dashboardId));
    return () => { dispatch(clearCurrentFull()); };
  }, [dashboardId, dispatch]);

  useDashboardSocket(dashboardId);

  useEffect(() => {
    if (!inspectorDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [inspectorDirty]);

  // Measure the real container instead of assuming a fixed 1200px width.
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const styles = window.getComputedStyle(el);
      const padding =
        (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
      const width = el.clientWidth - padding;
      if (width > 0) setGridWidth(width);
    };
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, dashboardId, previewMode]);

  useEffect(() => {
    const saveLayout = debounce(async (dashId: string) => {
      const updates = Array.from(pendingLayoutUpdates.current.entries());
      pendingLayoutUpdates.current.clear();
      if (updates.length === 0) return;

      setSaveStatus('saving');
      try {
        await Promise.all(
          updates.map(([widgetId, layout]) => widgetAPI.update(dashId, widgetId, layout))
        );
        setSaveStatus('saved');
      } catch (error) {
        updates.forEach(([widgetId, layout]) => {
          pendingLayoutUpdates.current.set(widgetId, layout);
        });
        console.error(error);
        setSaveStatus('error');
      }
    }, 500);

    saveLayoutRef.current = saveLayout;
    return () => {
      saveLayout.flush();
      saveLayout.cancel();
      saveLayoutRef.current = null;
    };
  }, [dispatch]);

  const queueLayoutSave = (dashId: string) => {
    saveLayoutRef.current?.(dashId);
  };

  const handleLayoutChange = (layout: Layout) => {
    if (!canEdit || !currentFull || !dashboardId) return;
    const widgets = Array.isArray(currentFull.widgets) ? currentFull.widgets : [];
    layout.forEach((l) => {
      const wd = widgets.find(w => w.widget.id === l.i);
      if (wd) {
        const newPos = { position_x: l.x, position_y: l.y, width: l.w, height: l.h };
        const hasChanged =
          wd.widget.position_x !== newPos.position_x ||
          wd.widget.position_y !== newPos.position_y ||
          wd.widget.width !== newPos.width ||
          wd.widget.height !== newPos.height;

        if (!hasChanged) return;

        dispatch(updateWidgetLayout({ widget_id: l.i, ...newPos }));
        pendingLayoutUpdates.current.set(l.i, newPos);
      }
    });
    queueLayoutSave(dashboardId);
  };

  const handleAddWidget = async (payload: CreateWidgetPayload) => {
    if (!dashboardId) return;
    try {
      await widgetAPI.create(dashboardId, payload);
      dispatch(addToast({ message: 'Widget added', type: 'success' }));
      dispatch(loadDashboardFull(dashboardId));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not add the widget'), type: 'error' }));
    }
  };

  const handleDuplicateWidget = async (widget: Widget) => {
    if (!dashboardId || !currentFull) return;
    const allWidgets = currentFull.widgets.map(w => w.widget);
    const config = {
      ...normalizeWidgetConfig(widget.widget_type, widget.config),
      title: `${widgetTitle(widget)} (copy)`.slice(0, 120),
    };
    try {
      await widgetAPI.create(dashboardId, {
        query_id: widget.query_id,
        widget_type: widget.widget_type,
        config,
        position_x: widget.position_x,
        position_y: getNextWidgetY(allWidgets),
        width: widget.width,
        height: widget.height,
        refresh_interval_override: widget.refresh_interval_override ?? null,
      });
      dispatch(addToast({ message: 'Widget duplicated', type: 'success' }));
      dispatch(loadDashboardFull(dashboardId));
    } catch (err) {
      dispatch(addToast({ message: apiErrorMessage(err, 'Could not duplicate the widget'), type: 'error' }));
    }
  };

  const handleDeleteWidget = (widgetData: WidgetData) => {
    if (!dashboardId) return;
    // Capture the current snapshot so Undo can restore the widget and its data
    // without refetching.
    const snapshot = widgetData;
    deferredDelete({
      entity: 'Widget',
      remove: () => dispatch(removeWidgetFromCurrent(snapshot.widget.id)),
      restore: () => dispatch(restoreWidgetToCurrent(snapshot)),
      commit: async () => {
        try {
          await widgetAPI.delete(dashboardId, snapshot.widget.id);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: apiErrorMessage(err, 'Could not remove the widget') };
        }
      },
    });
  };

  const handleCopyConfig = async (widget: Widget) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(widget.config ?? {}, null, 2));
      dispatch(addToast({ message: 'Widget config copied', type: 'success' }));
    } catch {
      dispatch(addToast({ message: 'Could not copy the widget config', type: 'error' }));
    }
  };

  const handleInspectorSave = useCallback(
    async (values: { config: WidgetConfig; refresh_interval_override: number | null }) => {
      if (!dashboardId || !editingWidgetId) return;
      const payload: UpdateWidgetPayload = {
        config: values.config,
        refresh_interval_override: values.refresh_interval_override,
      };
      try {
        const res = await widgetAPI.update(dashboardId, editingWidgetId, payload);
        dispatch(updateWidgetInCurrent(res.data));
        setEditingWidgetId(null);
        dispatch(addToast({ message: 'Widget updated', type: 'success' }));
      } catch (err) {
        throw new Error(apiErrorMessage(err, 'Could not update the widget'), { cause: err });
      }
    },
    [dashboardId, dispatch, editingWidgetId],
  );

  const retryLayoutSave = () => {
    if (!dashboardId) return;
    queueLayoutSave(dashboardId);
  };

  if (loading || !currentFull) {
    return (
      <div className="editor-page">
        <div className="skeleton-editor">
          <div className="skeleton-toolbar" />
          <div className="skeleton-grid-area">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ gridColumn: i < 2 ? 'span 6' : 'span 4', gridRow: i < 2 ? 'span 4' : 'span 3' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const widgets = Array.isArray(currentFull.widgets) ? currentFull.widgets : [];
  const layout: Layout = widgets.map(wd => widgetToLayout(wd.widget));
  const nextWidgetY = getNextWidgetY(widgets.map(w => w.widget));
  const editingWidget = widgets.find(w => w.widget.id === editingWidgetId) ?? null;

  const widgetMenu = (widgetData: WidgetData): MenuItem[] => [
    {
      key: 'edit',
      label: 'Edit widget',
      icon: Pencil,
      onSelect: () => setEditingWidgetId(widgetData.widget.id),
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onSelect: () => handleDuplicateWidget(widgetData.widget),
    },
    {
      key: 'copy-json',
      label: 'Copy config JSON',
      icon: ClipboardCopy,
      onSelect: () => handleCopyConfig(widgetData.widget),
    },
    {
      key: 'delete',
      label: 'Delete widget',
      icon: Trash2,
      danger: true,
      separatorBefore: true,
      onSelect: () => handleDeleteWidget(widgetData),
    },
  ];

  const renderWidgetBody = (widgetData: WidgetData) => (
    <>
      <WidgetBoundary
        title="This widget failed to render"
        resetKey={`${widgetData.widget.id}:${widgetData.error ?? ''}:${widgetData.data ? widgetData.data.rows.length : 'none'}`}
      >
        {widgetData.widget.widget_type === 'chart' && (
          <ChartWidget data={widgetData.data} config={widgetData.widget.config} />
        )}
        {widgetData.widget.widget_type === 'table' && (
          <TableWidget data={widgetData.data} config={widgetData.widget.config} />
        )}
        {widgetData.widget.widget_type === 'metric' && (
          <MetricWidget data={widgetData.data} config={widgetData.widget.config} />
        )}
      </WidgetBoundary>
      {widgetData.error && <div className="widget-error">{widgetData.error}</div>}
    </>
  );

  const renderWidgetFooter = (widgetData: WidgetData) => (
    <div className="widget-header" key={`${widgetData.widget.id}-footer`}>
      <div className={`widget-header-left${canEdit ? ' widget-drag-handle' : ''}`}>
        <span className="widget-type-icon">{WIDGET_ICONS[widgetData.widget.widget_type]}</span>
        <span className="widget-header-title">{widgetTitle(widgetData.widget)}</span>
        {widgetData.widget.refresh_interval_override !== undefined &&
          widgetData.widget.refresh_interval_override !== null && (
            <span
              className="widget-refresh-badge"
              title={`Refresh override: ${refreshLabel(widgetData.widget.refresh_interval_override)}`}
            >
              {widgetData.widget.refresh_interval_override === 0
                ? 'Off'
                : refreshLabel(widgetData.widget.refresh_interval_override)}
            </span>
          )}
      </div>
      {canEdit && (
        <Menu
          label={`${widgetTitle(widgetData.widget)} actions`}
          trigger={
            <button
              type="button"
              className="widget-menu-btn widget-no-drag"
              aria-label={`${widgetTitle(widgetData.widget)} actions`}
            >
              <MoreHorizontal size={16} aria-hidden="true" />
            </button>
          }
          items={widgetMenu(widgetData)}
        />
      )}
    </div>
  );

  const renderWidgetCard = (widgetData: WidgetData, mobile = false) => {
    const layoutInfo = widgetToLayout(widgetData.widget);
    return (
      <div
        className={`widget-box${mobile ? ' widget-box--mobile' : ''}`}
        key={widgetData.widget.id}
        style={mobile ? { minHeight: Math.max(layoutInfo.h * 30, 180) } : undefined}
      >
        {renderWidgetFooter(widgetData)}
        <div className="widget-content">{renderWidgetBody(widgetData)}</div>
      </div>
    );
  };

  return (
    <div className="editor-page">
      <button type="button" className="back-btn" onClick={() => navigate('/dashboards')}>
        <ArrowLeft size={14} aria-hidden="true" />
        Back to Dashboards
      </button>

      <div className="editor-toolbar">
        <h2>{currentFull.dashboard.name}</h2>
        <div className="toolbar-actions">
          {canEdit && (
            <span className="preview-toggle" role="group" aria-label="Preview width">
              <button
                type="button"
                className={`preview-toggle__btn${previewMode === 'desktop' ? ' is-active' : ''}`}
                onClick={() => setPreviewMode('desktop')}
                aria-pressed={previewMode === 'desktop'}
                title="Desktop preview"
              >
                <Monitor size={14} aria-hidden="true" />
                Desktop
              </button>
              <button
                type="button"
                className={`preview-toggle__btn${previewMode === 'mobile' ? ' is-active' : ''}`}
                onClick={() => setPreviewMode('mobile')}
                aria-pressed={previewMode === 'mobile'}
                title="Mobile preview"
              >
                <Smartphone size={14} aria-hidden="true" />
                Mobile
              </button>
            </span>
          )}
          {canEdit && saveStatus !== 'idle' && (
            <span className={`save-status save-status--${saveStatus}`} aria-live="polite">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && (
                <>
                  Save failed
                  <button type="button" className="save-retry" onClick={retryLayoutSave}>
                    Retry
                  </button>
                </>
              )}
            </span>
          )}
          {canEdit && (
            <>
              <button onClick={() => setShowAddDialog(true)}>
                <Plus size={14} aria-hidden="true" />
                Add Widget
              </button>
              <button className="secondary" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal size={14} aria-hidden="true" />
                Filters
                {currentFull.dashboard.filters && currentFull.dashboard.filters.length > 0 && (
                  <span className="filter-count">{currentFull.dashboard.filters.length}</span>
                )}
              </button>
              <button className="secondary" onClick={() => setShowShare(true)}>
                <Share2 size={14} aria-hidden="true" />
                Share
              </button>
              <button className="secondary" onClick={() => setShowSettings(true)}>
                <Settings size={14} aria-hidden="true" />
                Settings
              </button>
            </>
          )}
          <button className="secondary" onClick={() => navigate(`/dashboards/${dashboardId}`)}>
            <Eye size={14} aria-hidden="true" />
            View
          </button>
          <button className="secondary" onClick={() => dispatch(loadDashboardFull(dashboardId!))}>
            <RefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div
        className={`grid-container${previewMode === 'mobile' ? ' grid-container--mobile-preview' : ''}`}
        ref={gridContainerRef}
      >
        {previewMode === 'mobile' ? (
          <div className="editor-mobile-preview">
            <div className="editor-mobile-preview__frame">
              <div className="editor-mobile-preview__bar">
                <Smartphone size={14} aria-hidden="true" />
                Mobile preview
              </div>
              <div className="editor-mobile-preview__list">
                {widgets.map(wd => renderWidgetCard(wd, true))}
                {widgets.length === 0 && (
                  <div className="editor-mobile-preview__empty">No widgets yet.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <GridLayout
              className="layout"
              layout={layout}
              gridConfig={{ cols: 12, rowHeight: 30 }}
              width={gridWidth}
              onLayoutChange={handleLayoutChange}
              dragConfig={{ handle: '.widget-drag-handle', cancel: '.widget-no-drag', enabled: canEdit }}
              resizeConfig={{ enabled: canEdit }}
            >
              {widgets.map(wd => renderWidgetCard(wd))}
            </GridLayout>

            {widgets.length === 0 && (
              <EmptyState
                icon="widget"
                title="No widgets yet"
                description={canEdit
                  ? 'Add a chart, table, or metric to start building your dashboard.'
                  : 'This dashboard does not have any widgets yet.'}
                action={canEdit ? { label: 'Add Widget', onClick: () => setShowAddDialog(true) } : undefined}
              />
            )}
          </>
        )}
      </div>

      {canEdit && showAddDialog && (
        <AddWidgetDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddWidget}
          nextY={nextWidgetY}
        />
      )}
      {canEdit && showShare && dashboardId && (
        <ShareDialog dashboardId={dashboardId} onClose={() => setShowShare(false)} />
      )}
      {canEdit && currentFull && (
        <DashboardSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          dashboard={currentFull.dashboard}
        />
      )}
      {canEdit && showFilters && currentFull && (
        <DashboardFilterDialog
          dashboard={currentFull.dashboard}
          onClose={() => setShowFilters(false)}
          onSaved={() => dashboardId && dispatch(loadDashboardFull(dashboardId))}
        />
      )}
      {canEdit && editingWidget && dashboardId && (
        <WidgetInspector
          key={editingWidget.widget.id}
          widget={editingWidget.widget}
          columns={editingWidget.data?.columns ?? []}
          dashboardRefreshSeconds={currentFull.dashboard.refresh_interval_seconds}
          onClose={() => setEditingWidgetId(null)}
          onSave={handleInspectorSave}
          onDirtyChange={setInspectorDirty}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved widget changes?"
        description="You have unsaved changes in the widget inspector. Leaving this page will discard them."
        confirmLabel="Discard and leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          if (blocker.state === 'blocked') {
            setInspectorDirty(false);
            setEditingWidgetId(null);
            blocker.proceed();
          }
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset();
          setInspectorDirty(false);
          setEditingWidgetId(null);
        }}
      />
    </div>
  );
};

export default DashboardEditor;

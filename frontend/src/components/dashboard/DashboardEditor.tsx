import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { debounce } from 'lodash';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  loadDashboardFull,
  clearCurrentFull,
  removeWidgetFromCurrent,
  updateWidgetLayout,
} from '../../store/dashboardSlice';
import { widgetAPI } from '../../api/dashboard';
import type { CreateWidgetPayload } from '../../api/dashboard';
import { addToast } from '../../store/toastSlice';
import { useDashboardSocket } from '../../hooks/useDashboardSocket';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import AddWidgetDialog from './AddWidgetDialog';
import ShareDialog from './ShareDialog';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardEditor.css';

const WIDGET_LABELS: Record<string, string> = {
  chart: 'Chart',
  table: 'Table',
  metric: 'Metric',
};

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const pendingLayoutUpdates = useRef(new Map<string, Partial<CreateWidgetPayload>>());

  useEffect(() => {
    if (dashboardId) dispatch(loadDashboardFull(dashboardId));
    return () => { dispatch(clearCurrentFull()); };
  }, [dashboardId, dispatch]);

  useDashboardSocket(dashboardId);

  const debouncedSaveLayout = useMemo(
    () => debounce(async (dashId: string) => {
      const updates = Array.from(pendingLayoutUpdates.current.entries());
      pendingLayoutUpdates.current.clear();
      if (updates.length === 0) return;

      setSaveStatus('saving');
      try {
        await Promise.all(
          updates.map(([widgetId, layout]) => widgetAPI.update(dashId, widgetId, layout))
        );
      setSaveStatus('saved');
      dispatch(addToast({ message: 'Layout saved', type: 'success' }));
    } catch (error) {
      updates.forEach(([widgetId, layout]) => {
        pendingLayoutUpdates.current.set(widgetId, layout);
      });
      console.error(error);
      setSaveStatus('error');
      dispatch(addToast({ message: 'Failed to save layout', type: 'error' }));
    }
    }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSaveLayout.flush();
      debouncedSaveLayout.cancel();
    };
  }, [debouncedSaveLayout]);

  const handleLayoutChange = (layout: Layout) => {
    if (!currentFull || !dashboardId) return;
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
    debouncedSaveLayout(dashboardId);
  };

  const handleAddWidget = async (payload: CreateWidgetPayload) => {
    if (!dashboardId) return;
    await widgetAPI.create(dashboardId, payload);
    dispatch(addToast({ message: 'Widget added', type: 'success' }));
    dispatch(loadDashboardFull(dashboardId));
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!dashboardId) return;
    await widgetAPI.delete(dashboardId, widgetId);
    dispatch(addToast({ message: 'Widget removed', type: 'success' }));
    dispatch(removeWidgetFromCurrent(widgetId));
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
  const layout: Layout = widgets.map(w => ({
    i: w.widget.id,
    x: w.widget.position_x,
    y: w.widget.position_y,
    w: w.widget.width,
    h: w.widget.height,
  }));

  return (
    <div className="editor-page">
      <button type="button" className="back-btn" onClick={() => navigate('/dashboards')}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Dashboards
      </button>

      <div className="editor-toolbar">
        <h2>{currentFull.dashboard.name}</h2>
        <div className="toolbar-actions">
          {saveStatus !== 'idle' && (
            <span className={`save-status save-status--${saveStatus}`}>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Save failed'}
            </span>
          )}
          <button onClick={() => setShowAddDialog(true)}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Widget
          </button>
          <button className="secondary" onClick={() => setShowShare(true)}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.633l-4.94 2.47a3 3 0 100 4.326l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.748l4.94-2.47A3 3 0 0015 8z" />
            </svg>
            Share
          </button>
          <button className="secondary" onClick={() => dispatch(loadDashboardFull(dashboardId!))}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid-container">
        <GridLayout
          className="layout"
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 30 }}
          width={1200}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ handle: '.widget-drag-handle' }}
        >
          {widgets.map(wd => (
            <div key={wd.widget.id} className="widget-box">
              <div className="widget-header widget-drag-handle">
                <div className="widget-header-left">
                  <span className="widget-type-icon">{WIDGET_ICONS[wd.widget.widget_type]}</span>
                  <span>{WIDGET_LABELS[wd.widget.widget_type] || wd.widget.widget_type}</span>
                </div>
                <button className="widget-remove-btn" onClick={() => handleDeleteWidget(wd.widget.id)} title="Remove widget">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="widget-content">
                {wd.widget.widget_type === 'chart' && <ChartWidget data={wd.data} config={wd.widget.config} />}
                {wd.widget.widget_type === 'table' && <TableWidget data={wd.data} />}
                {wd.widget.widget_type === 'metric' && <MetricWidget data={wd.data} config={wd.widget.config} />}
                {wd.error && <div className="widget-error">{wd.error}</div>}
              </div>
            </div>
          ))}
        </GridLayout>

        {widgets.length === 0 && (
          <div className="editor-empty">
            <svg className="editor-empty-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <div><strong>No widgets yet</strong><br />Click <strong>Add Widget</strong> to start building this dashboard.</div>
          </div>
        )}
      </div>

      {showAddDialog && <AddWidgetDialog onClose={() => setShowAddDialog(false)} onAdd={handleAddWidget} />}
      {showShare && dashboardId && <ShareDialog dashboardId={dashboardId} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default DashboardEditor;

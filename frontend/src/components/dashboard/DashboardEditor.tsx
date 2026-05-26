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
import { useDashboardSocket } from '../../hooks/useDashboardSocket';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import AddWidgetDialog from './AddWidgetDialog';
import ShareDialog from './ShareDialog';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DashboardEditor.css';

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
      } catch (error) {
        updates.forEach(([widgetId, layout]) => {
          pendingLayoutUpdates.current.set(widgetId, layout);
        });
        console.error(error);
        setSaveStatus('error');
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
    dispatch(loadDashboardFull(dashboardId));
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!dashboardId) return;
    await widgetAPI.delete(dashboardId, widgetId);
    dispatch(removeWidgetFromCurrent(widgetId));
  };

  if (loading || !currentFull) return <div>Loading...</div>;

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
      {/* Back button – outside toolbar, matches other pages */}
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate('/dashboards')}
      >
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
          <button onClick={() => setShowAddDialog(true)}>Add Widget</button>
          <button className="secondary" onClick={() => setShowShare(true)}>Share</button>
          <button className="secondary" onClick={() => dispatch(loadDashboardFull(dashboardId!))}>Refresh</button>
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
                <span>{wd.widget.widget_type}</span>
                <button onClick={() => handleDeleteWidget(wd.widget.id)}>×</button>
              </div>
              <div className="widget-content">
                {wd.widget.widget_type === 'chart' && <ChartWidget data={wd.data} config={wd.widget.config} />}
                {wd.widget.widget_type === 'table' && <TableWidget data={wd.data} />}
                {wd.widget.widget_type === 'metric' && <MetricWidget data={wd.data} config={wd.widget.config} />}
                {wd.error && <div style={{ color: 'red', padding: 8 }}>{wd.error}</div>}
              </div>
            </div>
          ))}
        </GridLayout>

        {widgets.length === 0 && (
          <div className="empty-state">
            No widgets yet. Add one to start building this dashboard.
          </div>
        )}
      </div>

      {showAddDialog && <AddWidgetDialog onClose={() => setShowAddDialog(false)} onAdd={handleAddWidget} />}
      {showShare && dashboardId && <ShareDialog dashboardId={dashboardId} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default DashboardEditor;
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { shareAPI } from '../../api/share';
import type { DashboardFull } from '../../types';
import ChartWidget from '../dashboard/ChartWidget';
import TableWidget from '../dashboard/TableWidget';
import MetricWidget from '../dashboard/MetricWidget';
import DashboardSocket from '../../api/websocket';
import { normalizeLayout } from '../../utils/dashboard';
import './SharedDashboardView.css';

const SharedDashboardView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [dashboard, setDashboard] = useState<DashboardFull | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef<typeof DashboardSocket | null>(null);

  const loadDashboard = async (pwd?: string) => {
    try {
      let res;
      if (pwd !== undefined) {
        res = await shareAPI.verifyPassword(token!, pwd);
      } else {
        res = await shareAPI.getShared(token!);
      }
      if ('password_required' in res.data) {
        setPasswordRequired(true);
      } else {
        const dashboardFull = res.data as DashboardFull;
        setDashboard({
          ...dashboardFull,
          widgets: Array.isArray(dashboardFull.widgets) ? dashboardFull.widgets : [],
        });
        setPasswordRequired(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const dashboardId = dashboard?.dashboard.id;

  useEffect(() => {
    if (!dashboardId || !token) return;
    const socket = DashboardSocket;
    socket.connectForShare(token);
    const unsub = socket.onMessage((msg) => {
      if (msg.type === 'widget_data') {
        setDashboard(prev => {
          if (!prev) return prev;
          const widgets = Array.isArray(prev.widgets) ? prev.widgets : [];
          return {
            ...prev,
            widgets: widgets.map(wd => {
              if (wd.widget.id === msg.widget_id) {
                return { ...wd, data: msg.data, error: msg.error };
              }
              return wd;
            }),
          };
        });
      }
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      unsub();
    };
    // Depend on the dashboard id, not the dashboard object: every incoming
    // widget update replaces that object and would otherwise reconnect the
    // socket in a loop.
  }, [dashboardId, token]);

  if (passwordRequired) {
    return (
      <div className="shared-view-password">
        <div className="shared-view-card">
          <h3>Password Required</h3>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter dashboard password"
            onKeyDown={e => e.key === 'Enter' && loadDashboard(password)}
          />
          <button onClick={() => loadDashboard(password)}>Submit</button>
          {error && <p className="shared-view-error">{error}</p>}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="shared-view-loading">
        <div className="shared-view-card">Loading dashboard...</div>
      </div>
    );
  }

  const widgets = Array.isArray(dashboard.widgets) ? dashboard.widgets : [];
  const orderedWidgets = [...widgets].sort((a, b) => {
    if (a.widget.position_y !== b.widget.position_y) {
      return a.widget.position_y - b.widget.position_y;
    }
    return a.widget.position_x - b.widget.position_x;
  });

  return (
    <div className="shared-view">
      <header className="shared-view-header">
        <h2>{dashboard.dashboard.name}</h2>
        <span className="shared-view-badge">Read-only</span>
      </header>
      <div className="shared-view-grid">
        {orderedWidgets.map(wd => {
          const layout = normalizeLayout({
            x: wd.widget.position_x,
            y: wd.widget.position_y,
            w: wd.widget.width,
            h: wd.widget.height,
          });
          return (
            <div
              key={wd.widget.id}
              className="shared-view-widget"
              style={{
                gridColumn: `${layout.x + 1} / span ${layout.w}`,
                gridRow: `${layout.y + 1} / span ${layout.h}`,
              }}
            >
              <div className="shared-view-widget-body">
                {wd.widget.widget_type === 'chart' && <ChartWidget data={wd.data} config={wd.widget.config} />}
                {wd.widget.widget_type === 'table' && <TableWidget data={wd.data} />}
                {wd.widget.widget_type === 'metric' && <MetricWidget data={wd.data} config={wd.widget.config} />}
                {wd.error && <div className="shared-view-widget-error">{wd.error}</div>}
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

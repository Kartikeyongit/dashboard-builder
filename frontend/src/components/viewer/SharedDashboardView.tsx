import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { shareAPI } from '../../api/share';
import type { DashboardFull } from '../../types';
import ChartWidget from '../dashboard/ChartWidget';
import TableWidget from '../dashboard/TableWidget';
import MetricWidget from '../dashboard/MetricWidget';
import DashboardSocket from '../../api/websocket';

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

  // Connect WebSocket for live updates
  useEffect(() => {
    if (!dashboard || !token) return;
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
  }, [dashboard, token]);

  if (passwordRequired) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
        <h3>Password required</h3>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={() => loadDashboard(password)}>Submit</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  if (!dashboard) return <div style={{ padding: 20 }}>Loading...</div>;
  const widgets = Array.isArray(dashboard.widgets) ? dashboard.widgets : [];

  return (
    <div style={{ padding: 20 }}>
      <h2>{dashboard.dashboard.name} (read‑only)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {widgets.map(wd => (
          <div key={wd.widget.id} style={{ border: '1px solid #ccc', padding: 12, background: '#fff' }}>
            {wd.widget.widget_type === 'chart' && <ChartWidget data={wd.data} config={wd.widget.config} />}
            {wd.widget.widget_type === 'table' && <TableWidget data={wd.data} />}
            {wd.widget.widget_type === 'metric' && <MetricWidget data={wd.data} config={wd.widget.config} />}
            {wd.error && <div style={{ color: 'red' }}>{wd.error}</div>}
          </div>
        ))}
      </div>
      {widgets.length === 0 && <p>No widgets are available for this dashboard.</p>}
    </div>
  );
};

export default SharedDashboardView;

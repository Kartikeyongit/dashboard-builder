import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import './Home.css';

const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user) dispatch(fetchDashboards());
  }, [user, dispatch]);

  // ---------- PUBLIC LANDING (unchanged) ----------
  if (!user) {
    return (
      <main className="public-home">
        <section className="public-home__panel">
          <p className="eyebrow">Dashboard Builder</p>
          <h1>Build dashboards from your database queries</h1>
          <p className="lede">
            Connect a datasource, save SQL queries, and arrange charts, tables, and metrics
            into shareable dashboards.
          </p>
          <div className="action-row">
            <Link className="button button--primary" to="/login">Log in</Link>
            <Link className="button" to="/register">Create account</Link>
          </div>
        </section>
      </main>
    );
  }

  // ---------- AUTHENTICATED HOME (compact, no scroll) ----------
  return (
    <div className="home-authenticated">
      <div className="home-panel">
        <p className="eyebrow">Workspace</p>
        <h1>Welcome to Dashboard Builder</h1>
        <p className="lede">
          Start by connecting data, writing a query, then placing the result into a dashboard.
        </p>
        <div className="quick-actions">
          <Link to="/datasources">Manage datasources</Link>
          <Link to="/queries">Write queries</Link>
          <Link to="/dashboards">Open dashboards</Link>
        </div>
      </div>

      {/* Compact stats row – only 2 cards to avoid overflow */}
      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value">{dashboards.length}</div>
          <div className="stat-label">Dashboards</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user.role}</div>
          <div className="stat-label">Role</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
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

  return (
    <div className="home-authenticated">
      <div className="home-panel">
        <p className="eyebrow">Workspace</p>
        <h1>Welcome to Dashboard Builder</h1>
        <p className="lede">
          Start by connecting data, writing a query, then placing the result into a dashboard.
        </p>
        <div className="quick-actions">
          <Link to="/datasources">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm0 5a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
            </svg>
            Datasources
          </Link>
          <Link to="/queries">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            Queries
          </Link>
          <Link to="/dashboards">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboards
          </Link>
        </div>
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value">{dashboards.length}</div>
          <div className="stat-label">Dashboards</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{user.role}</div>
          <div className="stat-label">Role</div>
        </div>
      </div>
    </div>
  );
};

export default Home;

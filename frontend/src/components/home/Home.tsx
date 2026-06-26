import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import './Home.css';

const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboards());
      dispatch(fetchDatasources());
      dispatch(fetchQueries());
    }
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

  const recentDashboards = [...dashboards].slice(0, 3);
  const hasData = datasources.length > 0 || queries.length > 0 || dashboards.length > 0;

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
        <Link to="/datasources" className="stat-card">
          <div className="stat-value">{datasources.length}</div>
          <div className="stat-label">Datasources</div>
        </Link>
        <Link to="/queries" className="stat-card">
          <div className="stat-value">{queries.length}</div>
          <div className="stat-label">Queries</div>
        </Link>
        <Link to="/dashboards" className="stat-card">
          <div className="stat-value">{dashboards.length}</div>
          <div className="stat-label">Dashboards</div>
        </Link>
        <div className="stat-card">
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{user.role}</div>
          <div className="stat-label">Role</div>
        </div>
      </div>

      {recentDashboards.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <h3>Recent Dashboards</h3>
            <Link to="/dashboards" className="home-section-link">View all</Link>
          </div>
          <div className="home-dashboard-list">
            {recentDashboards.map(d => (
              <div key={d.id} className="home-dashboard-item" onClick={() => navigate(`/dashboards/${d.id}/edit`)}>
                <div className="home-dashboard-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div className="home-dashboard-info">
                  <span className="home-dashboard-name">{d.name}</span>
                  <span className="home-dashboard-date">Created {new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <svg className="home-dashboard-chevron" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasData && (
        <div className="home-section">
          <div className="home-section-header">
            <h3>Getting Started</h3>
          </div>
          <div className="home-checklist">
            <div className={`checklist-item ${datasources.length > 0 ? 'done' : ''}`}>
              <div className="checklist-check">
                {datasources.length > 0 ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="checklist-number">1</span>
                )}
              </div>
              <div className="checklist-content">
                <span className="checklist-title">Connect a datasource</span>
                <span className="checklist-desc">Add a PostgreSQL or MySQL database</span>
              </div>
              {datasources.length === 0 && <Link to="/datasources/new" className="checklist-action">Add</Link>}
            </div>
            <div className={`checklist-item ${queries.length > 0 ? 'done' : ''}`}>
              <div className="checklist-check">
                {queries.length > 0 ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="checklist-number">2</span>
                )}
              </div>
              <div className="checklist-content">
                <span className="checklist-title">Write a query</span>
                <span className="checklist-desc">Create SQL queries to fetch your data</span>
              </div>
              {queries.length === 0 && <Link to="/queries/new" className="checklist-action">Write</Link>}
            </div>
            <div className={`checklist-item ${dashboards.length > 0 ? 'done' : ''}`}>
              <div className="checklist-check">
                {dashboards.length > 0 ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="checklist-number">3</span>
                )}
              </div>
              <div className="checklist-content">
                <span className="checklist-title">Build a dashboard</span>
                <span className="checklist-desc">Add charts, tables, and metrics</span>
              </div>
              {dashboards.length === 0 && <Link to="/dashboards" className="checklist-action">Build</Link>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

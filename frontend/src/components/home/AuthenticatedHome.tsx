import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Activity, Check, Star, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import { teamAPI } from '../../api/team';
import { auditActionLabel } from '../../utils/audit';
import type { AuditEvent } from '../../types';
import { pluralize, relativeTime } from '../../utils/format';
import { fadeInUp, staggerContainer } from '../../animations';
import './Home.css';

const ONBOARDING_STORAGE_KEY = 'dashboard-builder-onboarding-dismissed';

function readOnboardingDismissed(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const AuthenticatedHome = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [onboardingDismissed, setOnboardingDismissed] = useState(readOnboardingDismissed);
  const [activity, setActivity] = useState<AuditEvent[]>([]);

  useEffect(() => {
    dispatch(fetchDashboards());
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  }, [dispatch]);

  // Activity is admin-only, so viewers simply do not see the section.
  useEffect(() => {
    if (user?.role !== 'admin') return;
    let cancelled = false;
    teamAPI
      .listAudit(6)
      .then((res) => {
        if (!cancelled) setActivity(res.data.events);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const recentDashboards = useMemo(
    () =>
      [...dashboards]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    [dashboards],
  );

  const pinnedDashboards = useMemo(
    () => dashboards.filter((dashboard) => dashboard.is_favorite),
    [dashboards],
  );

  const totalWidgets = useMemo(
    () => dashboards.reduce((sum, dashboard) => sum + (dashboard.widget_count ?? 0), 0),
    [dashboards],
  );

  const onboardingSteps = [
    {
      done: datasources.length > 0,
      title: 'Connect a datasource',
      desc: 'Add a PostgreSQL or MySQL database',
      to: '/datasources/new',
      action: 'Add',
    },
    {
      done: queries.length > 0,
      title: 'Write a query',
      desc: 'Create SQL queries to fetch your data',
      to: '/queries/new',
      action: 'Write',
    },
    {
      done: dashboards.length > 0,
      title: 'Build a dashboard',
      desc: 'Create a dashboard and add widgets',
      to: '/dashboards?new=1',
      action: 'Build',
    },
    {
      done: totalWidgets > 0,
      title: 'Add a widget',
      desc: 'Turn a saved query into a chart, table, or metric',
      to: '/dashboards',
      action: 'Add',
    },
  ];
  const completedSteps = onboardingSteps.filter((step) => step.done).length;

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {
      // The checklist still stays hidden for this session.
    }
  };

  const firstName = user?.email?.split('@')[0] || 'there';
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <motion.div
      className="home-authenticated"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Welcome Banner */}
      <motion.div
        className="welcome-banner"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="welcome-content">
          <p className="welcome-greeting">Welcome back</p>
          <h1 className="welcome-title">{displayName}</h1>
          <p className="welcome-desc">
            {dashboards.length > 0
              ? 'Pick up where you left off or create something new.'
              : 'Start by connecting a database, then write a query and build a dashboard.'}
          </p>
          <div className="welcome-actions">
            <Link to="/dashboards?new=1" className="home-cta">
              New dashboard
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link to="/datasources/new" className="home-cta home-cta--ghost">
              Connect data
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="home-stats"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[
          { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>, value: dashboards.length, label: 'Dashboards' },
          { to: '/datasources', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />, value: datasources.length, label: 'Datasources' },
          { to: '/queries', icon: <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />, value: queries.length, label: 'Queries' },
          { to: null, icon: <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />, value: totalWidgets, label: 'Widgets' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeInUp}>
            {stat.to ? (
              <Link to={stat.to} className="stat-card">
                <div className="stat-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{stat.icon}</svg>
                </div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </Link>
            ) : (
              <div className="stat-card">
                <div className="stat-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{stat.icon}</svg>
                </div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Action Cards */}
      <motion.div
        className="home-actions"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[
          { to: '/datasources/new', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />, title: 'Add Datasource', desc: 'Connect a PostgreSQL or MySQL database' },
          { to: '/queries/new', icon: <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />, title: 'Write a Query', desc: 'Create SQL with schema auto-complete' },
          { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>, title: 'View Dashboards', desc: 'Explore, view and edit your dashboards' },
        ].map((action, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Link to={action.to} className="action-card">
              <div className="action-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {action.icon}
                </svg>
              </div>
              <div className="action-card-title">{action.title}</div>
              <p className="action-card-desc">{action.desc}</p>
              <svg className="action-card-arrow" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Pinned Dashboards */}
      {pinnedDashboards.length > 0 && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Pinned</h3>
            <Link to="/dashboards" className="home-section-link">Manage pins</Link>
          </div>
          <div className="home-dashboard-list">
            {pinnedDashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                type="button"
                className="home-dashboard-item"
                onClick={() => navigate(`/dashboards/${dashboard.id}`)}
              >
                <div className="home-dashboard-icon home-dashboard-icon--pinned">
                  <Star size={18} fill="currentColor" aria-hidden="true" />
                </div>
                <div className="home-dashboard-info">
                  <span className="home-dashboard-name">{dashboard.name}</span>
                  <span className="home-dashboard-date">
                    {pluralize(dashboard.widget_count ?? 0, 'widget')} · updated {relativeTime(dashboard.updated_at)}
                  </span>
                </div>
                <ArrowRight className="home-dashboard-chevron" size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recently Updated */}
      {recentDashboards.length > 0 && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Recently updated</h3>
            <Link to="/dashboards" className="home-section-link">View all</Link>
          </div>
          <div className="home-dashboard-list">
            {recentDashboards.map((dashboard, i) => (
              <motion.button
                key={dashboard.id}
                type="button"
                className="home-dashboard-item"
                onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
              >
                <div className="home-dashboard-icon">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div className="home-dashboard-info">
                  <span className="home-dashboard-name">{dashboard.name}</span>
                  <span className="home-dashboard-date">
                    {pluralize(dashboard.widget_count ?? 0, 'widget')} · updated {relativeTime(dashboard.updated_at)}
                  </span>
                </div>
                <ArrowRight className="home-dashboard-chevron" size={16} aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Team activity */}
      {user?.role === 'admin' && activity.length > 0 && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Team activity</h3>
            <Link to="/team" className="home-section-link">View all</Link>
          </div>
          <div className="home-activity-list">
            {activity.map((event) => (
              <div className="home-activity-item" key={event.id}>
                <span className="home-activity-icon" aria-hidden="true">
                  <Activity size={14} />
                </span>
                <span className="home-activity-text">
                  <span className="home-activity-title">
                    {auditActionLabel(event.action)}
                    {event.target_name && <strong>{event.target_name}</strong>}
                  </span>
                  <span className="home-activity-meta">
                    {event.actor_email || 'System'} · {relativeTime(event.created_at)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Onboarding */}
      {!onboardingDismissed && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="home-section-header">
            <div>
              <h3>{completedSteps === onboardingSteps.length ? 'You are all set' : 'Getting started'}</h3>
              <p className="home-section-sub">
                {completedSteps} of {onboardingSteps.length} steps complete
              </p>
            </div>
            <button
              type="button"
              className="home-onboarding-dismiss"
              onClick={dismissOnboarding}
              aria-label="Dismiss getting started checklist"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="home-progress" aria-hidden="true">
            <span style={{ width: `${(completedSteps / onboardingSteps.length) * 100}%` }} />
          </div>

          <motion.div
            className="home-checklist"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {onboardingSteps.map((item, i) => (
              <motion.div key={item.title} className={`checklist-item ${item.done ? 'done' : ''}`} variants={fadeInUp}>
                <div className="checklist-check">
                  {item.done ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <span className="checklist-number">{i + 1}</span>
                  )}
                </div>
                <div className="checklist-content">
                  <span className="checklist-title">{item.title}</span>
                  <span className="checklist-desc">{item.desc}</span>
                </div>
                {!item.done && <Link to={item.to} className="checklist-action">{item.action}</Link>}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AuthenticatedHome;

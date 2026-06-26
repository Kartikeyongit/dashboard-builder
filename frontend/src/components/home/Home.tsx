import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import { fadeInUp, staggerContainer } from '../../animations';
import './Home.css';

/* ---------- Animated Counter ---------- */
function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 60, damping: 20 });
  const rounded = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    if (inView) motionValue.set(end);
  }, [inView, end, motionValue]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>{suffix}
    </span>
  );
}

/* ---------- Feature Card ---------- */
const features = [
  {
    iconClass: 'feature-icon--database',
    icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" stroke="currentColor" strokeWidth="1.8" fill="none" />,
    title: 'Connect Databases',
    desc: 'Link PostgreSQL or MySQL databases in seconds. Support for SSL, custom ports, and connection testing.',
  },
  {
    iconClass: 'feature-icon--code',
    icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    title: 'Write SQL Queries',
    desc: 'Built-in Monaco editor with syntax highlighting, auto-complete, table schema hints, and ad-hoc execution.',
  },
  {
    iconClass: 'feature-icon--dashboard',
    icon: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="14" y="3" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="3" y="14" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /><rect x="14" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" /></>,
    title: 'Build Dashboards',
    desc: 'Drag-and-drop grid with charts, tables, and metric widgets. Real-time updates via WebSocket.',
  },
  {
    iconClass: 'feature-icon--share',
    icon: <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" stroke="currentColor" strokeWidth="1.8" fill="none" />,
    title: 'Share Live Views',
    desc: 'Generate shareable links with live data. No login required for viewers — perfect for stakeholders.',
  },
];

/* ---------- Public Landing Page ---------- */
const PublicLanding = () => (
  <div className="public-home">
    {/* Hero */}
    <section className="hero">
      <div className="hero-mesh" />
      <div className="hero-grid" />
      <div className="hero-floating hero-floating--1" />
      <div className="hero-floating hero-floating--2" />
      <div className="hero-floating hero-floating--3" />

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <span className="hero-badge-dot" />
          Live data dashboards
        </motion.div>

        <h1 className="hero-title">
          Build dashboards from your database
        </h1>
        <p className="hero-subtitle">
          Connect PostgreSQL or MySQL, write SQL queries, and arrange charts, tables, and metrics
          into shareable dashboards — all in real time.
        </p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link to="/register" className="hero-btn hero-btn--primary">
            Get started free
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <Link to="/login" className="hero-btn hero-btn--secondary">
            Sign in
          </Link>
        </motion.div>
      </motion.div>
    </section>

    {/* Features */}
    <section className="section">
      <div className="section-inner">
        <motion.p
          className="section-label"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Everything you need
        </motion.p>
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          From database to dashboard in minutes
        </motion.h2>
        <motion.p
          className="section-desc"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          No ETL pipelines. No complex configuration. Connect, query, and visualize your data.
        </motion.p>

        <motion.div
          className="features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((f, i) => (
            <motion.div key={i} className="feature-card" variants={fadeInUp} whileHover={{ y: -4 }}>
              <div className={`feature-icon ${f.iconClass}`}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* Stats Bar */}
    <section className="stats-bar">
      <div className="section-inner">
        <motion.div
          className="stats-grid"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="stat-item">
            <div className="stat-number">
              <AnimatedCounter end={200} suffix="+" />
            </div>
            <div className="stat-label">Data Sources Connected</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              <AnimatedCounter end={50} suffix="+" />
            </div>
            <div className="stat-label">Dashboards Built</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              <AnimatedCounter end={99} suffix="%" />
            </div>
            <div className="stat-label">Uptime</div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* How It Works */}
    <section className="section">
      <div className="section-inner">
        <motion.p
          className="section-label"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          How it works
        </motion.p>
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Three steps to insight
        </motion.h2>

        <motion.div
          className="steps"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { num: 1, title: 'Connect a datasource', desc: 'Add your PostgreSQL or MySQL database with connection details. Test the connection to make sure everything works.' },
            { num: 2, title: 'Write SQL queries', desc: 'Use the built-in editor with syntax highlighting and schema auto-complete. Run ad-hoc queries to validate your results.' },
            { num: 3, title: 'Build & share dashboards', desc: 'Add charts, tables, and metrics to a grid layout. Share a live link with your team — no login required for viewers.' },
          ].map((step, i) => (
            <motion.div key={i} className="step" variants={fadeInUp}>
              <div className="step-number">{step.num}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* CTA Banner */}
    <section className="cta-banner">
      <motion.div
        className="cta-content"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2>Ready to visualize your data?</h2>
        <p>Connect your first database in under a minute. No credit card required.</p>
        <Link to="/register" className="cta-btn">
          Get started for free
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </motion.div>
    </section>

    {/* Footer */}
    <footer className="landing-footer">
      <p>&copy; {new Date().getFullYear()} Dashboard Builder. Built with React, TypeScript &amp; PostgreSQL.</p>
    </footer>
  </div>
);

/* ---------- Authenticated Home ---------- */
const AuthenticatedHome = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchDashboards());
    dispatch(fetchDatasources());
    dispatch(fetchQueries());
  }, [dispatch]);

  const recentDashboards = [...dashboards].slice(0, 3);
  const hasData = datasources.length > 0 || queries.length > 0 || dashboards.length > 0;

  const activities: { label: string; time: string; color: string }[] = [];
  if (datasources.length > 0) {
    activities.push({ label: `${datasources.length} datasource${datasources.length > 1 ? 's' : ''} connected`, time: 'active', color: '#3b82f6' });
  }
  if (queries.length > 0) {
    activities.push({ label: `${queries.length} quer${queries.length > 1 ? 'ies' : 'y'} saved`, time: 'active', color: '#8b5cf6' });
  }
  if (dashboards.length > 0) {
    activities.push({ label: `${dashboards.length} dashboard${dashboards.length > 1 ? 's' : ''} built`, time: 'active', color: '#10b981' });
  }

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
            {hasData
              ? 'Pick up where you left off or create something new.'
              : 'Start by connecting a database, then write a query and build a dashboard.'}
          </p>
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
          { to: '/datasources', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" stroke="currentColor" strokeWidth="2" fill="none" />, color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', value: datasources.length, label: 'Datasources' },
          { to: '/queries', icon: <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" fill="currentColor" />, color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', value: queries.length, label: 'Queries' },
          { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="14" y="3" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="3" y="14" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="14" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /></>, color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)', value: dashboards.length, label: 'Dashboards' },
          { to: null, icon: <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fill="currentColor" />, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', value: user?.role || '—', label: 'Role', isString: true },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeInUp}>
            {stat.to ? (
              <Link to={stat.to} className="stat-card">
                <div className="stat-card-icon" style={{ background: stat.bg }}>
                  <svg width="16" height="16" viewBox="0 0 20 20">{stat.icon}</svg>
                </div>
                <div className="stat-card-value" style={{ textTransform: 'capitalize' } as React.CSSProperties}>
                  {stat.value}
                </div>
                <div className="stat-card-label">{stat.label}</div>
              </Link>
            ) : (
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: stat.bg }}>
                  <svg width="16" height="16" viewBox="0 0 20 20">{stat.icon}</svg>
                </div>
                <div className="stat-card-value" style={{ textTransform: 'capitalize' } as React.CSSProperties}>
                  {String(stat.value)}
                </div>
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
          { to: '/datasources/new', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" stroke="currentColor" strokeWidth="2" fill="none" />, bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', title: 'Add Datasource', desc: 'Connect a PostgreSQL or MySQL database' },
          { to: '/queries/new', icon: <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" fill="currentColor" />, bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', title: 'Write a Query', desc: 'Create SQL with schema auto-complete' },
          { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="14" y="3" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="3" y="14" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="14" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /></>, bg: 'linear-gradient(135deg, #10b981, #059669)', title: 'View Dashboards', desc: 'Explore and edit your dashboards' },
        ].map((action, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Link to={action.to} className="action-card">
              <div className="action-card-icon" style={{ background: action.bg }}>
                <svg width="18" height="18" viewBox="0 0 20 20">{action.icon}</svg>
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

      {/* Activity Section */}
      {activities.length > 0 && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Activity</h3>
          </div>
          <div className="activity-list">
            {activities.map((a, i) => (
              <motion.div
                key={i}
                className="activity-item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05, duration: 0.3 }}
              >
                <div className="activity-dot" style={{ background: a.color }} />
                <span className="activity-text">{a.label}</span>
                <span className="activity-time">{a.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Dashboards */}
      {recentDashboards.length > 0 && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Recent Dashboards</h3>
            <Link to="/dashboards" className="home-section-link">View all</Link>
          </div>
          <div className="home-dashboard-list">
            {recentDashboards.map((d, i) => (
              <motion.div
                key={d.id}
                className="home-dashboard-item"
                onClick={() => navigate(`/dashboards/${d.id}/edit`)}
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
                  <span className="home-dashboard-name">{d.name}</span>
                  <span className="home-dashboard-date">Created {new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <svg className="home-dashboard-chevron" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Getting Started Checklist */}
      {!hasData && (
        <motion.div
          className="home-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="home-section-header">
            <h3>Getting Started</h3>
          </div>
          <motion.div
            className="home-checklist"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              { done: datasources.length > 0, num: 1, title: 'Connect a datasource', desc: 'Add a PostgreSQL or MySQL database', link: '/datasources/new', action: 'Add' },
              { done: queries.length > 0, num: 2, title: 'Write a query', desc: 'Create SQL queries to fetch your data', link: '/queries/new', action: 'Write' },
              { done: dashboards.length > 0, num: 3, title: 'Build a dashboard', desc: 'Add charts, tables, and metrics', link: '/dashboards', action: 'Build' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className={`checklist-item ${item.done ? 'done' : ''}`}
                variants={fadeInUp}
              >
                <div className="checklist-check">
                  {item.done ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="checklist-number">{item.num}</span>
                  )}
                </div>
                <div className="checklist-content">
                  <span className="checklist-title">{item.title}</span>
                  <span className="checklist-desc">{item.desc}</span>
                </div>
                {!item.done && (
                  <Link to={item.link} className="checklist-action">{item.action}</Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ---------- Home Entry Point ---------- */
const Home: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  if (!user) return <PublicLanding />;

  return <AuthenticatedHome />;
};

export default Home;

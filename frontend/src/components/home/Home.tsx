import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchDashboards } from '../../store/dashboardSlice';
import { fetchDatasources } from '../../store/datasourceSlice';
import { fetchQueries } from '../../store/querySlice';
import { fadeInUp, staggerContainer, shapeFloat, nodePulse, slowRotate } from '../../animations';
import './Home.css';

const features = [
  {
    iconClass: 'feature-icon--database',
    icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />,
    title: 'Connect Databases',
    desc: 'Link PostgreSQL or MySQL databases in seconds. Support for SSL, custom ports, and connection testing.',
  },
  {
    iconClass: 'feature-icon--code',
    icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />,
    title: 'Write SQL Queries',
    desc: 'Built-in Monaco editor with syntax highlighting, auto-complete, table schema hints, and ad-hoc execution.',
  },
  {
    iconClass: 'feature-icon--dashboard',
    icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>,
    title: 'Build Dashboards',
    desc: 'Drag-and-drop grid with charts, tables, and metric widgets. Real-time updates via WebSocket.',
  },
  {
    iconClass: 'feature-icon--share',
    icon: <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />,
    title: 'Share Live Views',
    desc: 'Generate shareable links with live data. No login required for viewers — perfect for stakeholders.',
  },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'Data Engineer at Acme', avatar: 'SC', quote: 'We replaced a complex BI stack with Dashboard Builder. Our team went from waiting days for reports to building their own dashboards in minutes.', color: '#6366f1' },
  { name: 'Marcus Johnson', role: 'CTO at Stackflow', avatar: 'MJ', quote: 'The SQL editor with schema auto-complete is a game changer. Our analysts can explore data without switching between tools.', color: '#8b5cf6' },
  { name: 'Elena Rodriguez', role: 'Product Manager at Nimbus', avatar: 'ER', quote: 'Sharing live dashboards with stakeholders used to be a headache. Now I just send a link and they see real-time data instantly.', color: '#10b981' },
];

function SectionHeader({ label, title, desc }: { label: string; title: string; desc?: string }) {
  return (
    <>
      <motion.p
        className="section-label"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        {label}
      </motion.p>
      <motion.h2
        className="section-title"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        {title}
      </motion.h2>
      {desc && (
        <motion.p
          className="section-desc"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          {desc}
        </motion.p>
      )}
    </>
  );
}

function HeroArt() {
  const nodes = [
    { x: 180, y: 200 },
    { x: 300, y: 170 },
    { x: 270, y: 290 },
    { x: 160, y: 310 },
    { x: 340, y: 270 },
  ];
  return (
    <div className="hero-art">
      <motion.svg viewBox="0 0 500 500" className="hero-art-svg" fill="none" overflow="visible">
        <motion.g animate={shapeFloat(22)}>
          <circle cx="250" cy="260" r="200" fill="url(#heroGlow1)" />
        </motion.g>
        <motion.g animate={shapeFloat(18)}>
          <circle cx="360" cy="150" r="120" fill="url(#heroGlow2)" />
        </motion.g>
        <motion.g animate={shapeFloat(26)}>
          <circle cx="140" cy="360" r="90" fill="url(#heroGlow3)" />
        </motion.g>
        <motion.g animate={shapeFloat(14)}>
          <circle cx="380" cy="330" r="60" fill="url(#heroGlow4)" />
        </motion.g>
        <motion.g animate={slowRotate(60)} style={{ originX: '250px', originY: '250px' }}>
          <polygon
            points="250,80 330,120 330,220 250,260 170,220 170,120"
            stroke="rgba(99, 102, 241, 0.15)"
            strokeWidth="1.5"
          />
        </motion.g>
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <line
                x1={nodes[i - 1].x} y1={nodes[i - 1].y}
                x2={node.x} y2={node.y}
                stroke="rgba(99, 102, 241, 0.08)"
                strokeWidth="1"
              />
            )}
            <motion.circle
              cx={node.x} cy={node.y} r="4"
              fill="rgba(99, 102, 241, 0.4)"
              animate={nodePulse(i)}
            />
          </React.Fragment>
        ))}
        {nodes.length > 2 && (
          <line
            x1={nodes[0].x} y1={nodes[0].y}
            x2={nodes[2].x} y2={nodes[2].y}
            stroke="rgba(99, 102, 241, 0.06)"
            strokeWidth="1"
          />
        )}
        <defs>
          <radialGradient id="heroGlow1">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.12)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </radialGradient>
          <radialGradient id="heroGlow2">
            <stop offset="0%" stopColor="rgba(6, 182, 212, 0.1)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </radialGradient>
          <radialGradient id="heroGlow3">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.08)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </radialGradient>
          <radialGradient id="heroGlow4">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.08)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

type Testimonial = { name: string; role: string; avatar: string; quote: string; color: string };

function AutoScrollTestimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [isPaused, setIsPaused] = useState(false);

  const startScroll = useCallback(() => {
    intervalRef.current = setInterval(() => {
      if (!scrollRef.current || isPaused) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const next = scrollLeft + clientWidth;
      scrollRef.current.scrollTo({
        left: next >= maxScroll ? 0 : next,
        behavior: 'smooth',
      });
    }, 4000);
  }, [isPaused]);

  useEffect(() => {
    startScroll();
    return () => clearInterval(intervalRef.current);
  }, [startScroll]);

  return (
    <motion.div
      className="testimonials-scroll"
      ref={scrollRef}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      onMouseEnter={() => { setIsPaused(true); clearInterval(intervalRef.current); }}
      onMouseLeave={() => { setIsPaused(false); startScroll(); }}
    >
      {testimonials.map((t, i) => (
        <motion.div key={i} className="testimonial-card" variants={fadeInUp}>
          <div className="testimonial-text">"{t.quote}"</div>
          <div className="testimonial-author">
            <div className="testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
            <div>
              <div className="testimonial-name">{t.name}</div>
              <div className="testimonial-role">{t.role}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

const PublicLanding = () => {
  const steps = [
    {
      icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />,
      title: 'Connect a datasource',
      desc: 'Add your PostgreSQL or MySQL database with connection details. Test the connection to make sure everything works.',
    },
    {
      icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />,
      title: 'Write SQL queries',
      desc: 'Use the built-in editor with syntax highlighting and schema auto-complete. Run ad-hoc queries to validate your results.',
    },
    {
      icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>,
      title: 'Build & share dashboards',
      desc: 'Add charts, tables, and metrics to a grid layout. Share a live link with your team — no login required for viewers.',
    },
  ];

  return (
    <div className="public-home">
      {/* ──────── Hero ──────── */}
      <section className="hero">
        <div className="hero-inner">
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
              Build <span className="hero-title-gradient">dashboards</span> from your <span className="hero-title-gradient">database</span>
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

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          >
            <HeroArt />
          </motion.div>
        </div>
      </section>

      {/* ──────── Features ──────── */}
      <section className="section">
        <div className="section-inner">
          <SectionHeader label="Everything you need" title="From database to dashboard in minutes" desc="No ETL pipelines. No complex configuration. Connect, query, and visualize your data." />

          <motion.div
            className="features-grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="feature-card"
                variants={fadeInUp}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className={`feature-icon ${f.iconClass}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

      {/* ──────── How It Works ──────── */}
      <section className="section steps-section">
        <div className="section-inner">
          <SectionHeader label="How it works" title="Three steps to insight" />

          <motion.div
            className="steps-horizontal"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="step-card"
                variants={fadeInUp}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="step-card-number">{i + 1}</div>
                <div className="step-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {step.icon}
                  </svg>
                </div>
                <h3 className="step-card-title">{step.title}</h3>
                <p className="step-card-desc">{step.desc}</p>
                {i < steps.length - 1 && <div className="step-card-line" />}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──────── Showcase ──────── */}
      <section className="section showcase-section">
        <div className="section-inner">
          <SectionHeader label="See it in action" title="A live dashboard in seconds" desc="Connect, query, and visualize — all from one interface." />

          <motion.div
            className="showcase-frame"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="showcase-bar">
              <div className="showcase-dots">
                <span className="showcase-dot showcase-dot--red" />
                <span className="showcase-dot showcase-dot--yellow" />
                <span className="showcase-dot showcase-dot--green" />
              </div>
              <div className="showcase-address">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                app.dashboardbuilder.io/dashboards/revenue
              </div>
            </div>
            <div className="showcase-content">
              <div className="showcase-toolbar">
                <div className="showcase-tabs">
                  <span className="showcase-tab active">Revenue Overview</span>
                  <span className="showcase-tab">User Analytics</span>
                  <span className="showcase-tab">Performance</span>
                </div>
                <div className="showcase-actions">
                  <span className="showcase-pill">Share</span>
                  <span className="showcase-pill">Edit</span>
                </div>
              </div>
              <div className="showcase-grid">
                <div className="showcase-widget showcase-widget--wide">
                  <div className="showcase-widget-header">
                    <span className="showcase-widget-dot" style={{ background: '#6366f1' }} />
                    <span>Revenue (last 30 days)</span>
                  </div>
                  <div className="showcase-chart">
                    <div className="showcase-bar" style={{ height: '60%' }} />
                    <div className="showcase-bar" style={{ height: '85%' }} />
                    <div className="showcase-bar" style={{ height: '45%' }} />
                    <div className="showcase-bar" style={{ height: '70%' }} />
                    <div className="showcase-bar" style={{ height: '90%' }} />
                    <div className="showcase-bar" style={{ height: '55%' }} />
                    <div className="showcase-bar" style={{ height: '75%' }} />
                  </div>
                </div>
                <div className="showcase-widget">
                  <div className="showcase-widget-header">
                    <span className="showcase-widget-dot" style={{ background: '#10b981' }} />
                    <span>Total Users</span>
                  </div>
                  <div className="showcase-metric">12,483</div>
                  <div className="showcase-change positive">+12% this month</div>
                </div>
                <div className="showcase-widget">
                  <div className="showcase-widget-header">
                    <span className="showcase-widget-dot" style={{ background: '#8b5cf6' }} />
                    <span>Active Queries</span>
                  </div>
                  <div className="showcase-metric">847</div>
                  <div className="showcase-change negative">-3% this week</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──────── Testimonials ──────── */}
      <section className="section">
        <div className="section-inner">
          <SectionHeader label="Testimonials" title="Trusted by data teams" desc="See what our users say about Dashboard Builder." />

          <AutoScrollTestimonials testimonials={testimonials} />
        </div>
      </section>

      {/* ──────── Footer ──────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard Builder
          </div>
          <nav className="footer-nav">
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </nav>
          <p className="footer-copy">&copy; {new Date().getFullYear()} Dashboard Builder</p>
        </div>
      </footer>
    </div>
  );
};

/* ──────── Authenticated Home ──────── */
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
    activities.push({ label: `${datasources.length} datasource${datasources.length > 1 ? 's' : ''} connected`, time: 'active', color: '#6366f1' });
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
            { to: '/datasources', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />, color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', value: datasources.length, label: 'Datasources' },
            { to: '/queries', icon: <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />, color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', value: queries.length, label: 'Queries' },
            { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>, color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)', value: dashboards.length, label: 'Dashboards' },
            { to: null, icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" strokeLinecap="round" strokeLinejoin="round" />, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', value: user?.role || '—', label: 'Role' },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeInUp}>
            {stat.to ? (
              <Link to={stat.to} className="stat-card">
                <div className="stat-card-icon" style={{ background: stat.bg }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{stat.icon}</svg>
                </div>
                <div className="stat-card-value" style={{ textTransform: 'capitalize' } as React.CSSProperties}>
                  {stat.value}
                </div>
                <div className="stat-card-label">{stat.label}</div>
              </Link>
            ) : (
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: stat.bg }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{stat.icon}</svg>
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
            { to: '/datasources/new', icon: <path d="M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3M4 7v6c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 7c0 1.657 3.582 3 8 3s8-1.343 8-3" />, bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', title: 'Add Datasource', desc: 'Connect a PostgreSQL or MySQL database' },
            { to: '/queries/new', icon: <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />, bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', title: 'Write a Query', desc: 'Create SQL with schema auto-complete' },
            { to: '/dashboards', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /></>, bg: 'linear-gradient(135deg, #10b981, #059669)', title: 'View Dashboards', desc: 'Explore, view and edit your dashboards' },
        ].map((action, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Link to={action.to} className="action-card">
                <div className="action-card-icon" style={{ background: action.bg }}>
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

      {/* Activity */}
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

      {/* Getting Started */}
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
              <motion.div key={i} className={`checklist-item ${item.done ? 'done' : ''}`} variants={fadeInUp}>
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
                {!item.done && <Link to={item.link} className="checklist-action">{item.action}</Link>}
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

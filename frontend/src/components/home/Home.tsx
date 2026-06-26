import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
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

/* ---------- FAQ Accordion ---------- */
const faqs = [
  { q: 'What databases do you support?', a: 'We currently support PostgreSQL and MySQL. Both SSL and non-SSL connections are supported with custom ports.' },
  { q: 'Can I share dashboards with people who don\'t have an account?', a: 'Yes. Every dashboard has a shareable link that viewers can open without logging in. You control whether the link is public or requires authentication.' },
  { q: 'How does the widget editor work?', a: 'Widgets are placed on a drag-and-drop grid. You can resize and rearrange them freely. Each widget connects to a saved query and renders as a chart, table, or metric card.' },
  { q: 'Is my data secure?', a: 'Yes. Connections to your database use encrypted credentials. Dashboard links can be restricted. We never store raw query results — only the SQL text.' },
  { q: 'Can I use my own domain?', a: 'Shared dashboards can be embedded in iframes on your own domain. Enterprise plans include custom domain support.' },
];

/* ---------- Testimonials ---------- */
const testimonials = [
  { name: 'Sarah Chen', role: 'Data Engineer at Acme', avatar: 'SC', quote: 'We replaced a complex BI stack with Dashboard Builder. Our team went from waiting days for reports to building their own dashboards in minutes.', color: '#3b82f6' },
  { name: 'Marcus Johnson', role: 'CTO at Stackflow', avatar: 'MJ', quote: 'The SQL editor with schema auto-complete is a game changer. Our analysts can explore data without switching between tools.', color: '#8b5cf6' },
  { name: 'Elena Rodriguez', role: 'Product Manager at Nimbus', avatar: 'ER', quote: 'Sharing live dashboards with stakeholders used to be a headache. Now I just send a link and they see real-time data instantly.', color: '#10b981' },
];

/* ---------- Pricing ---------- */
const plans = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'For individual developers and small projects.',
    features: ['1 datasource', '5 saved queries', '3 dashboards', 'Shareable links'],
    cta: 'Get started',
    to: '/register',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For teams that need more power and flexibility.',
    features: ['10 datasources', '50 saved queries', 'Unlimited dashboards', 'Team members', 'Priority support'],
    cta: 'Start trial',
    to: '/register',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For organizations with advanced security and scale needs.',
    features: ['Unlimited datasources', 'Unlimited queries', 'Custom domain', 'SSO / SAML', 'SLA & dedicated support', 'On-premise option'],
    cta: 'Contact sales',
    to: '/register',
    featured: false,
  },
];

/* ---------- Section wrapper ---------- */
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

/* ---------- Back to Top Button ---------- */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          aria-label="Back to top"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

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
        <SectionHeader label="Everything you need" title="From database to dashboard in minutes" desc="No ETL pipelines. No complex configuration. Connect, query, and visualize your data." />

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
            <div className="stat-number"><AnimatedCounter end={200} suffix="+" /></div>
            <div className="stat-label">Data Sources Connected</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><AnimatedCounter end={50} suffix="+" /></div>
            <div className="stat-label">Dashboards Built</div>
          </div>
          <div className="stat-item">
            <div className="stat-number"><AnimatedCounter end={99} suffix="%" /></div>
            <div className="stat-label">Uptime</div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* How It Works */}
    <section className="section">
      <div className="section-inner">
        <SectionHeader label="How it works" title="Three steps to insight" />

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

    {/* Integrations */}
    <section className="section">
      <div className="section-inner">
        <SectionHeader label="Integrations" title="Works with your database" desc="Connect directly to the databases you already use. No middleware or ETL required." />

        <motion.div
          className="integrations-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { name: 'PostgreSQL', icon: 'PG', color: '#336791', desc: 'Full support for PostgreSQL 12+ including SSL, connection pooling, and schema introspection.' },
            { name: 'MySQL', icon: 'MY', color: '#4479A1', desc: 'Compatible with MySQL 8+ and MariaDB. Supports custom ports and SSL connections.' },
            { name: 'REST API', icon: 'API', color: '#6d28d9', desc: 'Coming soon — connect to any REST API and visualize JSON responses as dashboards.' },
          ].map((db, i) => (
            <motion.div key={i} className="integration-card" variants={fadeInUp} whileHover={{ y: -4 }}>
              <div className="integration-icon" style={{ background: db.color }}>{db.icon}</div>
              <div className="integration-info">
                <h3>{db.name}</h3>
                <p>{db.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* Demo Preview */}
    <section className="demo-preview">
      <div className="section-inner">
        <SectionHeader label="See it in action" title="A live dashboard in seconds" desc="Connect, query, and visualize — all from one interface." />

        <motion.div
          className="demo-mockup"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mockup-toolbar">
            <div className="mockup-tabs">
              <span className="mockup-tab active">Revenue Overview</span>
              <span className="mockup-tab">User Analytics</span>
              <span className="mockup-tab">Performance</span>
            </div>
            <div className="mockup-actions">
              <span className="mockup-pill">Share</span>
              <span className="mockup-pill">Edit</span>
            </div>
          </div>
          <div className="mockup-grid">
            <div className="mockup-widget mockup-widget--wide">
              <div className="mockup-widget-header">
                <span className="mockup-widget-dot" style={{ background: '#3b82f6' }} />
                <span>Revenue (last 30 days)</span>
              </div>
              <div className="mockup-chart">
                <div className="mockup-bar" style={{ height: '60%' }} />
                <div className="mockup-bar" style={{ height: '85%' }} />
                <div className="mockup-bar" style={{ height: '45%' }} />
                <div className="mockup-bar" style={{ height: '70%' }} />
                <div className="mockup-bar" style={{ height: '90%' }} />
                <div className="mockup-bar" style={{ height: '55%' }} />
                <div className="mockup-bar" style={{ height: '75%' }} />
              </div>
            </div>
            <div className="mockup-widget">
              <div className="mockup-widget-header">
                <span className="mockup-widget-dot" style={{ background: '#10b981' }} />
                <span>Total Users</span>
              </div>
              <div className="mockup-metric">12,483</div>
              <div className="mockup-change positive">+12% this month</div>
            </div>
            <div className="mockup-widget">
              <div className="mockup-widget-header">
                <span className="mockup-widget-dot" style={{ background: '#8b5cf6' }} />
                <span>Active Queries</span>
              </div>
              <div className="mockup-metric">847</div>
              <div className="mockup-change negative">-3% this week</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="section">
      <div className="section-inner">
        <SectionHeader label="Testimonials" title="Trusted by data teams" desc="See what our users say about Dashboard Builder." />

        <motion.div
          className="testimonials-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((t, i) => (
            <motion.div key={i} className="testimonial-card" variants={fadeInUp} whileHover={{ y: -4 }}>
              <div className="testimonial-quote">"{t.quote}"</div>
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
      </div>
    </section>

    {/* Pricing */}
    <section className="section pricing-section">
      <div className="section-inner">
        <SectionHeader label="Pricing" title="Simple, transparent pricing" desc="Start free. Upgrade when you need more." />

        <motion.div
          className="pricing-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}
              variants={fadeInUp}
              whileHover={plan.featured ? { y: -6 } : { y: -3 }}
            >
              {plan.featured && <div className="pricing-badge">Most popular</div>}
              <h3 className="pricing-name">{plan.name}</h3>
              <div className="pricing-price">
                <span className="pricing-amount">{plan.price}</span>
                {plan.period && <span className="pricing-period">{plan.period}</span>}
              </div>
              <p className="pricing-desc">{plan.desc}</p>
              <ul className="pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={plan.to} className={`pricing-cta ${plan.featured ? 'pricing-cta--primary' : ''}`}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>

    {/* FAQ */}
    <section className="section faq-section">
      <div className="section-inner">
        <SectionHeader label="FAQ" title="Frequently asked questions" />

        <motion.div
          className="faq-list"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
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
      <div className="landing-footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard Builder
          </div>
          <p className="footer-desc">
            Connect your database, write SQL queries, and build beautiful shareable dashboards
            in minutes.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a href="#" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-links">
          <h4>Product</h4>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/integrations">Integrations</Link>
          <Link to="/docs">API Docs</Link>
        </div>
        <div className="footer-links">
          <h4>Resources</h4>
          <Link to="/docs">Documentation</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/support">Support</Link>
        </div>
        <div className="footer-links">
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Dashboard Builder. All rights reserved.</p>
      </div>
    </footer>

    <BackToTop />
  </div>
);

/* ---------- FAQ Item ---------- */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div className={`faq-item ${open ? 'faq-item--open' : ''}`} variants={fadeInUp}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <motion.svg
          width="16" height="16" viewBox="0 0 20 20" fill="currentColor"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-answer"
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p>{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
          { to: null, icon: <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fill="currentColor" />, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', value: user?.role || '—', label: 'Role' },
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

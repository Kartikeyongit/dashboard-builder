import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Database,
  LayoutDashboard,
  Lock,
  Radio,
  Share2,
  ShieldCheck,
  Terminal,
  Users,
} from 'lucide-react';
import PublicShell, { GITHUB_URL, GithubMark } from '../layout/PublicShell';
import { usePageTitle } from '../../utils/usePageTitle';
import './landing.css';

const DEPLOYMENT_URL = `${GITHUB_URL}/blob/main/DEPLOYMENT.md`;

const PAGE_TITLE = 'Dashboard Builder — Live SQL dashboards for PostgreSQL & MySQL';

const highlights = [
  {
    icon: Database,
    title: 'PostgreSQL & MySQL',
    desc: 'Connect in place with SSL and custom ports.',
  },
  {
    icon: Radio,
    title: 'Live updates',
    desc: 'WebSocket refresh on a schedule you control.',
  },
  {
    icon: Share2,
    title: 'Share without accounts',
    desc: 'Read-only links that can expire or take a password.',
  },
  {
    icon: ShieldCheck,
    title: 'MIT licensed',
    desc: 'Self-host free, forever. No per-seat pricing.',
  },
];

const differentiators = [
  {
    icon: Database,
    title: 'Connect in place',
    desc: 'Your database stays your database. No warehouse and no sync job — every chart queries your database directly.',
    bullets: [
      'PostgreSQL and MySQL with SSL and custom ports',
      'Credentials encrypted with a key you control',
      'Read-only queries with row limits and timeouts',
    ],
  },
  {
    icon: Share2,
    title: 'Share the answer, not the database',
    desc: 'Give stakeholders a live view without giving them a login or a database connection.',
    bullets: [
      'Read-only links with optional passwords and expiry',
      'Iframe embeds that keep the filter bar and freshness',
      'CSV, PNG, and print exports when someone needs a file',
    ],
  },
  {
    icon: Users,
    title: 'Run it like software',
    desc: 'The operational basics are already there, so you can hand it to a team.',
    bullets: [
      'Admin, editor, and viewer roles',
      'Audit feed for invites, roles, shares, and password changes',
      'Deploy with Docker, Render, or your own stack',
    ],
  },
];

const steps = [
  {
    icon: Database,
    title: 'Connect',
    desc: 'Add PostgreSQL or MySQL, test the connection, and browse the schema before you write anything.',
  },
  {
    icon: Terminal,
    title: 'Query',
    desc: 'Write SQL in Monaco with schema autocomplete, run a selection, and save the queries you reuse.',
  },
  {
    icon: LayoutDashboard,
    title: 'Compose & share',
    desc: 'Drag charts, tables, and metrics onto a grid. Refresh live, filter, export, or share a read-only link.',
  },
];

const securityPoints = [
  {
    icon: Lock,
    title: 'Credentials encrypted at rest',
    desc: 'Datasource passwords are encrypted with a key you supply, not stored in plain text.',
  },
  {
    icon: ShieldCheck,
    title: 'Read-only SQL sandbox',
    desc: 'Queries run with row limits and statement timeouts against your database.',
  },
  {
    icon: Users,
    title: 'Roles and an audit trail',
    desc: 'Admins manage members and roles; every invite, share, and role change is recorded.',
  },
  {
    icon: Share2,
    title: 'Viewers never need a login',
    desc: 'Shared views stay read-only and can be password-protected or given an expiry date.',
  },
];

const faqs = [
  {
    q: 'What databases can I connect?',
    a: 'PostgreSQL and MySQL, including connections over SSL and custom ports. You can keep several datasources in one workspace and test any saved connection from the datasource list.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'Only if you self-host. The repository ships a Docker Compose file and a Render blueprint; the deployment guide walks through both. Once it is running, everything happens in the browser.',
  },
  {
    q: 'Can I share a dashboard without giving someone an account?',
    a: 'Yes. Create a read-only share link, optionally protected by a password and an expiry date. Anyone with the link can view the dashboard without creating an account, and the embedded view keeps its filters.',
  },
  {
    q: 'Where does my data live?',
    a: 'In your database. Queries run against your own datasource on demand, and only a short-lived in-memory result cache (15 seconds by default) exists to avoid duplicate work. Credentials are encrypted at rest with a key you control.',
  },
  {
    q: 'Is it really free?',
    a: 'The project is MIT licensed. Self-hosting costs nothing and there is no per-seat pricing. The hosted instance may have the limits of whatever free infrastructure it runs on.',
  },
  {
    q: 'Can I export what I build?',
    a: 'Table and metric widgets download as CSV, charts export as PNG, and the full dashboard can be printed to PDF. Share links cover the cases where someone needs a live view instead.',
  },
];

function SectionIntro({
  id,
  label,
  title,
  desc,
}: {
  id: string;
  label: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="lp-section__head">
      <p className="lp-eyebrow">{label}</p>
      <h2 id={id} className="lp-section__title">
        {title}
      </h2>
      {desc && <p className="lp-section__desc">{desc}</p>}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div
      className="lp-preview"
      role="img"
      aria-label="Illustrative Dashboard Builder dashboard showing revenue, active users, and orders metrics, a revenue bar chart, and a recent orders table"
    >
      <div className="lp-preview__chrome" aria-hidden="true">
        <span className="lp-preview__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="lp-preview__label">Illustrative dashboard</span>
        <span className="lp-preview__live">
          <i />
          Live
        </span>
      </div>

      <div className="lp-preview__body" aria-hidden="true">
        <div className="lp-preview__filters">
          <span>Last 30 days</span>
          <span>All regions</span>
          <span className="lp-preview__filter--accent">3 active filters</span>
        </div>

        <div className="lp-preview__metrics">
          <div className="lp-preview__metric">
            <span>Revenue</span>
            <strong>$184.2k</strong>
            <em className="is-up">+12.4%</em>
          </div>
          <div className="lp-preview__metric">
            <span>Active users</span>
            <strong>12,483</strong>
            <em className="is-up">+8.1%</em>
          </div>
          <div className="lp-preview__metric">
            <span>Orders</span>
            <strong>1,847</strong>
            <em className="is-down">-2.3%</em>
          </div>
        </div>

        <div className="lp-preview__chart">
          <div className="lp-preview__chart-head">
            <span>Revenue over time</span>
            <span>Updated 8s ago</span>
          </div>
          <div className="lp-preview__bars">
            {[42, 58, 36, 64, 52, 78, 61, 88, 72, 95, 68, 82].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="lp-preview__axis">
            <span>Oct 1</span>
            <span>Oct 15</span>
            <span>Oct 30</span>
          </div>
        </div>

        <div className="lp-preview__table">
          <div className="lp-preview__row">
            <span>Enterprise plan</span>
            <strong>$8,400</strong>
            <span>Paid</span>
          </div>
          <div className="lp-preview__row">
            <span>Team plan</span>
            <strong>$2,150</strong>
            <span>Paid</span>
          </div>
          <div className="lp-preview__row">
            <span>Starter plan</span>
            <strong>$940</strong>
            <span>Trial</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LandingPage: React.FC = () => {
  usePageTitle(PAGE_TITLE);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <MotionConfig reducedMotion="user">
      <PublicShell>
        <section className="lp-hero">
          <div className="lp-hero__inner">
            <motion.div
              className="lp-hero__content"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <p className="lp-badge">
                <span className="lp-badge__dot" aria-hidden="true" />
                Open source &middot; MIT licensed
              </p>

              <h1 className="lp-hero__title">
                From your database to a <span className="lp-hero__accent">live dashboard</span> in minutes.
              </h1>

              <p className="lp-hero__sub">
                Connect PostgreSQL or MySQL, write SQL, and compose dashboards your team can actually
                use — without moving your data or paying per seat.
              </p>

              <div className="lp-hero__actions">
                <Link to="/register" className="lp-btn lp-btn--primary">
                  Start free
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="lp-btn lp-btn--secondary">
                  See how it works
                </a>
              </div>

              <ul className="lp-hero__chips">
                <li>
                  <Check size={14} aria-hidden="true" /> PostgreSQL &amp; MySQL
                </li>
                <li>
                  <Check size={14} aria-hidden="true" /> Read-only share links
                </li>
                <li>
                  <Check size={14} aria-hidden="true" /> Self-host with Docker
                </li>
              </ul>
            </motion.div>

            <motion.div
              className="lp-hero__visual"
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.12 }}
            >
              <DashboardPreview />
            </motion.div>
          </div>
        </section>

        <section className="lp-strip" aria-label="Product highlights">
          <h2 className="lp-sr-only">Product highlights</h2>
          <div className="lp-strip__inner">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div className="lp-strip__item" key={title}>
                <span className="lp-strip__icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="product" className="lp-section" aria-labelledby="product-title">
          <div className="lp-section__inner">
            <SectionIntro
              id="product-title"
              label="Why this one"
              title="Your data stays where it belongs"
              desc="Most BI tools ask you to copy your data into their cloud. This one queries it where it already lives."
            />

            <div className="lp-cards">
              {differentiators.map(({ icon: Icon, title, desc, bullets }) => (
                <article className="lp-card" key={title}>
                  <span className="lp-card__icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <ul className="lp-list">
                    {bullets.map((bullet) => (
                      <li key={bullet}>
                        <Check size={15} aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="lp-section lp-section--muted"
          aria-labelledby="how-title"
        >
          <div className="lp-section__inner">
            <SectionIntro
              id="how-title"
              label="How it works"
              title="Three steps, no pipeline"
              desc="No ETL, no warehouse, and no weekly sync job between you and a chart."
            />

            <ol className="lp-steps">
              {steps.map(({ icon: Icon, title, desc }, index) => (
                <li className="lp-step" key={title}>
                  <div className="lp-step__top">
                    <span className="lp-step__num" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span className="lp-step__icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="security" className="lp-section" aria-labelledby="security-title">
          <div className="lp-section__inner lp-security">
            <div>
              <SectionIntro
                id="security-title"
                label="Security & ownership"
                title="Built to run inside your perimeter"
                desc="You keep the database, the credentials, and the deployment. The app keeps its hands off your data."
              />

              <ul className="lp-security__list">
                {securityPoints.map(({ icon: Icon, title, desc }) => (
                  <li key={title}>
                    <span className="lp-security__icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="lp-selfhost" aria-label="Self-hosting quick start">
              <div className="lp-selfhost__head">
                <span className="lp-selfhost__title">
                  <Terminal size={16} aria-hidden="true" />
                  Self-host in minutes
                </span>
                <span className="lp-selfhost__tag">MIT</span>
              </div>
              <pre tabIndex={0} role="region" aria-label="Self-hosting commands">
                <code>
                  <span className="lp-code__prompt">$</span> git clone {GITHUB_URL}.git{'\n'}
                  <span className="lp-code__prompt">$</span> cd dashboard-builder{'\n'}
                  <span className="lp-code__prompt">$</span> docker compose up -d
                </code>
              </pre>
              <div className="lp-selfhost__meta">
                <span>Docker</span>
                <span>Render</span>
                <span>No per-seat pricing</span>
              </div>
              <a className="lp-selfhost__link" href={DEPLOYMENT_URL} target="_blank" rel="noreferrer">
                Read the deployment guide
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>

        <section id="faq" className="lp-section lp-section--muted" aria-labelledby="faq-title">
          <div className="lp-section__inner">
            <SectionIntro id="faq-title" label="FAQ" title="Questions worth asking" />

            <div className="lp-faq">
              {faqs.map((faq, index) => {
                const open = openFaq === index;
                const questionId = `faq-question-${index}`;
                const answerId = `faq-answer-${index}`;
                return (
                  <div className="lp-faq__item" key={faq.q}>
                    <h3 className="lp-faq__heading">
                      <button
                        type="button"
                        className="lp-faq__question"
                        id={questionId}
                        aria-expanded={open}
                        aria-controls={answerId}
                        onClick={() => setOpenFaq(open ? null : index)}
                      >
                        <span>{faq.q}</span>
                        <ChevronDown size={18} aria-hidden="true" />
                      </button>
                    </h3>
                    <div
                      className="lp-faq__answer"
                      id={answerId}
                      role="region"
                      aria-labelledby={questionId}
                      hidden={!open}
                    >
                      <p>{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-cta-section" aria-labelledby="cta-title">
          <div className="lp-cta">
            <h2 id="cta-title">Your data is already there.</h2>
            <p>
              Start free on the hosted instance, or self-host the whole stack under the MIT license.
            </p>
            <div className="lp-cta__actions">
              <Link to="/register" className="lp-btn lp-btn--light">
                Create your account
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a
                className="lp-btn lp-btn--ghost-light"
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
              >
                <GithubMark size={16} />
                View on GitHub
              </a>
            </div>
            <p className="lp-cta__note">MIT licensed · Free to self-host · No per-seat pricing</p>
          </div>
        </section>
      </PublicShell>
    </MotionConfig>
  );
};

export default LandingPage;

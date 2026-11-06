import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../../theme/useTheme';
import './PublicShell.css';

export const GITHUB_URL = 'https://github.com/Kartikeyongit/dashboard-builder';
const README_URL = `${GITHUB_URL}#readme`;
const DEPLOYMENT_URL = `${GITHUB_URL}/blob/main/DEPLOYMENT.md`;
const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;

/** GitHub mark as an inline SVG: lucide no longer ships brand icons. */
export const GithubMark: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
];

/**
 * Chrome for the public landing page only. Authenticated routes use AppShell,
 * and the auth screens keep their own full-screen layout.
 */
const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resolved, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const themeLabel = resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="lp-shell">
      <a className="lp-skip" href="#main">
        Skip to content
      </a>

      <header className="lp-header">
        <div className="lp-header__inner">
          <Link to="/" className="lp-brand" aria-label="Dashboard Builder home">
            <span className="lp-brand__mark" aria-hidden="true">
              <LayoutDashboard size={17} />
            </span>
            <span>Dashboard Builder</span>
          </Link>

          <nav className="lp-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-header__actions">
            <a
              className="lp-icon-link"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Dashboard Builder on GitHub"
            >
              <GithubMark size={17} />
            </a>
            <button
              type="button"
              className="lp-icon-link"
              onClick={toggle}
              aria-label={themeLabel}
              title={themeLabel}
            >
              {resolved === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
            <Link to="/login" className="lp-signin">
              Sign in
            </Link>
            <Link to="/register" className="lp-btn lp-btn--primary lp-btn--sm">
              Start free
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="lp-icon-link lp-menu-btn"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div id="lp-mobile-menu" className="lp-mobile" hidden={!menuOpen}>
          <nav aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="lp-mobile__actions">
            <Link to="/login" className="lp-btn lp-btn--secondary" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <Link to="/register" className="lp-btn lp-btn--primary" onClick={() => setMenuOpen(false)}>
              Start free
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="lp-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand">
            <Link to="/" className="lp-brand" aria-label="Dashboard Builder home">
              <span className="lp-brand__mark" aria-hidden="true">
                <LayoutDashboard size={17} />
              </span>
              <span>Dashboard Builder</span>
            </Link>
            <p>Open-source dashboards for data that stays in your database.</p>
            <span className="lp-footer__badge">MIT licensed</span>
          </div>

          <nav className="lp-footer__col" aria-label="Product">
            <h2>Product</h2>
            <ul>
              <li><a href="#product">Why self-host</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </nav>

          <nav className="lp-footer__col" aria-label="Resources">
            <h2>Resources</h2>
            <ul>
              <li><a href={README_URL} target="_blank" rel="noreferrer">Documentation</a></li>
              <li><a href={DEPLOYMENT_URL} target="_blank" rel="noreferrer">Deployment guide</a></li>
              <li><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></li>
            </ul>
          </nav>

          <nav className="lp-footer__col" aria-label="Legal">
            <h2>Legal</h2>
            <ul>
              <li><a href={LICENSE_URL} target="_blank" rel="noreferrer">MIT license</a></li>
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/register">Create account</Link></li>
            </ul>
          </nav>
        </div>

        <div className="lp-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Dashboard Builder</p>
          <p>Built with Go, React, and PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;

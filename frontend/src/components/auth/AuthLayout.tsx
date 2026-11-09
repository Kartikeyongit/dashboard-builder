import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '../../theme/useTheme';
import './Auth.css';

type AuthMode = 'login' | 'register';

interface AuthLayoutProps {
  mode: AuthMode;
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}

const FEATURES = [
  'PostgreSQL & MySQL support',
  'Real-time WebSocket updates',
  'Charts, tables & metric widgets',
];

const SWITCHES: Record<AuthMode, { prompt: string; label: string; to: string }> = {
  login: { prompt: 'New here?', label: 'Create account', to: '/register' },
  register: { prompt: 'Already have an account?', label: 'Sign in', to: '/login' },
};

/**
 * Shared chrome for the public auth screens: a slim brand bar, the product
 * story panel on wide screens, and one focusable form column.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ mode, title, subtitle, children }) => {
  const { resolved, toggle } = useTheme();
  const themeLabel = resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const authSwitch = SWITCHES[mode];

  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <Link to="/" className="auth-brand-link" aria-label="Dashboard Builder home">
          <span className="auth-mark" aria-hidden="true">
            <LayoutDashboard size={18} />
          </span>
          <span className="auth-brand-name">Dashboard Builder</span>
        </Link>

        <div className="auth-topbar__actions">
          <button
            type="button"
            className="auth-theme"
            onClick={toggle}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {resolved === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <p className="auth-switch">
            <span className="auth-switch__prompt">{authSwitch.prompt}</span>{' '}
            <Link to={authSwitch.to}>{authSwitch.label}</Link>
          </p>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-card">
          <aside className="auth-story" aria-label="About Dashboard Builder">
            <span className="auth-story__badge">
              <ShieldCheck size={13} aria-hidden="true" />
              Open source · MIT licensed
            </span>
            <span className="auth-story__mark" aria-hidden="true">
              <LayoutDashboard size={24} />
            </span>
            <p className="auth-story__name">Dashboard Builder</p>
            <p className="auth-story__copy">
              Connect databases, write SQL, and build live dashboards with drag-and-drop
              widgets.
            </p>
            <ul className="auth-story__features">
              {FEATURES.map((feature) => (
                <li key={feature} className="auth-story__feature">
                  <Check size={16} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </aside>

          <section className="auth-panel" aria-labelledby="auth-title">
            <h1 id="auth-title" className="auth-title">
              {title}
            </h1>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
};

interface AuthAlertProps {
  message: string;
  onDismiss: () => void;
}

/** Server-level failure summary. Focused by the caller after a failed submit. */
export const AuthAlert = React.forwardRef<HTMLDivElement, AuthAlertProps>(function AuthAlert(
  { message, onDismiss },
  ref,
) {
  return (
    <div className="auth-alert" role="alert" tabIndex={-1} ref={ref}>
      <AlertCircle className="auth-alert__icon" size={17} aria-hidden="true" />
      <span className="auth-alert__message">{message}</span>
      <button
        type="button"
        className="auth-alert__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
});

export default AuthLayout;

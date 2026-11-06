import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { acceptTeamInvite, registerUser, clearError } from '../../store/authSlice';
import { teamAPI } from '../../api/team';
import { apiErrorMessage } from '../../utils/apiError';
import { usePageTitle } from '../../utils/usePageTitle';
import type { InvitePreview } from '../../types';
import './Auth.css';

interface Requirement { key: string; label: string; test: (pw: string) => boolean; }

const REQUIREMENTS: Requirement[] = [
  { key: 'len', label: '6+ characters', test: pw => pw.length >= 6 },
  { key: 'upper', label: 'Uppercase', test: pw => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'Lowercase', test: pw => /[a-z]/.test(pw) },
  { key: 'digit', label: 'Digit', test: pw => /[0-9]/.test(pw) },
  { key: 'special', label: 'Special char', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 6) score += 20;
  if (pw.length >= 10) score += 10;
  if (/[A-Z]/.test(pw)) score += 20;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[0-9]/.test(pw)) score += 20;
  if (/[^A-Za-z0-9]/.test(pw)) score += 20;
  if (score < 30) return { score, label: 'Weak', color: 'var(--color-danger)' };
  if (score < 60) return { score, label: 'Fair', color: 'var(--color-warning)' };
  if (score < 80) return { score, label: 'Good', color: 'var(--color-primary)' };
  return { score: 100, label: 'Strong', color: 'var(--color-accent)' };
}

const Register: React.FC = () => {
  usePageTitle('Create your account — Dashboard Builder');
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch, inviteToken]);

  // The invite preview is public, so the signup form can name the team before
  // the visitor creates a password.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while the public preview request runs
    setInviteLoading(true);
    teamAPI
      .previewInvite(inviteToken)
      .then((res) => {
        if (cancelled) return;
        setInvitePreview(res.data);
        setEmail(res.data.email);
        setInviteError('');
      })
      .catch((err) => {
        if (!cancelled) setInviteError(apiErrorMessage(err, 'This invite link is no longer valid.'));
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const minPassword = inviteToken ? 8 : 6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteToken) {
      dispatch(acceptTeamInvite({ token: inviteToken, display_name: displayName, password }));
      return;
    }
    dispatch(registerUser({ email, password, org_name: orgName }));
  };

  const heading = invitePreview ? `Join ${invitePreview.org_name}` : 'Create an account';
  const subtitle = invitePreview
    ? `You were invited as ${invitePreview.role}. Choose a password to get started.`
    : 'Get started with Dashboard Builder';
  const visibleError = inviteError || error;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <svg className="auth-brand-icon" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="white" fillOpacity="0.15" />
            <path d="M14 18h20v2H14zm0 6h14v2H14zm0 6h16v2H14z" fill="white" />
          </svg>
          <h1>Dashboard Builder</h1>
          <p>Connect databases, write SQL, and build live dashboards with drag-and-drop widgets.</p>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              PostgreSQL &amp; MySQL support
            </div>
            <div className="auth-brand-feature">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Real-time WebSocket updates
            </div>
            <div className="auth-brand-feature">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Charts, tables &amp; metric widgets
            </div>
          </div>
        </div>

        <div className="auth-form-side">
          <h2>{heading}</h2>
          <p className="auth-subtitle">{subtitle}</p>

          {inviteLoading && !invitePreview && (
            <div className="auth-invite-status" role="status">Checking your invite…</div>
          )}

          {visibleError && (
            <div className="error-msg">
              <span>{visibleError}</span>
              <button onClick={() => dispatch(clearError())} aria-label="Dismiss error">×</button>
            </div>
          )}

          {!inviteLoading && !invitePreview && inviteError && (
            <div className="auth-invite-help">
              <p>Ask an admin to send a fresh invite link, or create your own organization.</p>
              <Link to="/register" className="auth-btn auth-btn--link">Create an organization</Link>
            </div>
          )}

          {(!inviteToken || invitePreview) && (
            <form onSubmit={handleSubmit}>
              {invitePreview && (
                <div className="auth-invite-note">
                  <strong>{invitePreview.email}</strong>
                  <span>Invite expires {new Date(invitePreview.expires_at).toLocaleDateString()}.</span>
                </div>
              )}

              {!inviteToken && (
                <div className="form-group">
                  <label>Organization Name</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v2H6V4zm0 4h8v2H6V8zm0 4h4v2H6v-2z" clipRule="evenodd" />
                    </svg>
                    <input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      required
                    />
                  </div>
                </div>
              )}

              {inviteToken && (
                <div className="form-group">
                  <label htmlFor="invite-name">Your name</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <input
                      id="invite-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How your teammates will see you"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    readOnly={Boolean(invitePreview)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={inviteToken ? 'Create a password (8+ characters)' : 'Create a password'}
                    autoComplete="new-password"
                    required
                    minLength={minPassword}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="password-strength" style={{ visibility: password ? 'visible' : 'hidden' }}>
                  <div className="strength-bar">
                    <div className="strength-bar-fill" style={{ width: `${strength.score}%`, background: strength.color }} />
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  <div className="strength-requirements">
                    {REQUIREMENTS.map(req => {
                      const met = req.test(password);
                      return (
                        <span key={req.key} className="strength-requirement" style={{ color: met ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            {met
                              ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            }
                          </svg>
                          {req.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? <span className="spinner" /> : null}
                {isLoading ? (inviteToken ? 'Joining…' : 'Creating account…') : (inviteToken ? 'Join team' : 'Create account')}
              </button>
            </form>
          )}

          <div className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

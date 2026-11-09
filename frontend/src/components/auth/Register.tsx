import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Mail, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { acceptTeamInvite, clearError, registerUser } from '../../store/authSlice';
import { teamAPI } from '../../api/team';
import { apiErrorMessage } from '../../utils/apiError';
import {
  isValidEmail,
  meetsMinimumLength,
  MIN_INVITE_PASSWORD,
  MIN_REGISTER_PASSWORD,
  normalizeEmail,
} from '../../utils/authValidation';
import { usePageTitle } from '../../utils/usePageTitle';
import type { InvitePreview } from '../../types';
import Button from '../../ui/Button';
import AuthLayout, { AuthAlert } from './AuthLayout';
import { AuthTextField, PasswordField } from './AuthFields';

interface FieldErrors {
  org?: string;
  email?: string;
  password?: string;
}

const Register: React.FC = () => {
  usePageTitle('Create your account — Dashboard Builder');
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));

  const orgRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const inviteAlertRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
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

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (inviteError) inviteAlertRef.current?.focus();
  }, [inviteError]);

  const minPassword = inviteToken ? MIN_INVITE_PASSWORD : MIN_REGISTER_PASSWORD;

  const heading = useMemo(
    () => (invitePreview ? `Join ${invitePreview.org_name}` : 'Create an account'),
    [invitePreview],
  );
  const subtitle = invitePreview
    ? `You were invited as ${invitePreview.role}. Choose a password to get started.`
    : 'Get started with Dashboard Builder';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    const nextErrors: FieldErrors = {};
    if (!inviteToken && !orgName.trim()) {
      nextErrors.org = 'Enter an organization name.';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = 'Enter your email address.';
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Create a password.';
    } else if (!meetsMinimumLength(password, minPassword)) {
      nextErrors.password = `Use at least ${minPassword} characters.`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.org) orgRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    if (inviteToken) {
      dispatch(
        acceptTeamInvite({
          token: inviteToken,
          display_name: displayName.trim(),
          password,
        }),
      );
      return;
    }

    dispatch(
      registerUser({
        email: normalizeEmail(email),
        password,
        org_name: orgName.trim(),
      }),
    );
  };

  return (
    <AuthLayout mode="register" title={heading} subtitle={subtitle}>
      {error && (
        <AuthAlert
          ref={alertRef}
          message={error}
          onDismiss={() => {
            dispatch(clearError());
            (inviteToken ? emailRef : orgRef).current?.focus();
          }}
        />
      )}

      {inviteLoading && !invitePreview && (
        <div className="auth-invite-status" role="status">
          Checking your invite…
        </div>
      )}

      {!inviteLoading && !invitePreview && inviteError && (
        <div
          className="auth-invite-help"
          role="alert"
          tabIndex={-1}
          ref={inviteAlertRef}
        >
          <p>{inviteError}</p>
          <p>Ask an admin to send a fresh invite link, or create your own organization.</p>
          <Link to="/register" className="ui-btn ui-btn--secondary ui-btn--md">
            Create an organization
          </Link>
        </div>
      )}

      {(!inviteToken || invitePreview) && (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {invitePreview && (
            <div className="auth-invite-note">
              <strong>{invitePreview.email}</strong>
              <span>Invite expires {new Date(invitePreview.expires_at).toLocaleDateString()}.</span>
            </div>
          )}

          {!inviteToken && (
            <AuthTextField
              id="register-org"
              label="Organization name"
              icon={Building2}
              inputRef={orgRef}
              value={orgName}
              onChange={(event) => {
                setOrgName(event.target.value);
                if (errors.org) setErrors((current) => ({ ...current, org: undefined }));
              }}
              placeholder="e.g. Acme Corp"
              autoComplete="organization"
              required
              error={errors.org}
            />
          )}

          {inviteToken && (
            <AuthTextField
              id="register-name"
              label="Your name"
              icon={User}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How your teammates will see you"
              autoComplete="name"
              hint="Optional — you can change this later."
            />
          )}

          <AuthTextField
            id="register-email"
            label="Email"
            type="email"
            icon={Mail}
            inputRef={emailRef}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={Boolean(invitePreview)}
            hint={invitePreview ? 'This address came from your invite.' : undefined}
            required
            error={errors.email}
          />

          <PasswordField
            id="register-password"
            label="Password"
            inputRef={passwordRef}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
            placeholder={`Create a password (${minPassword}+ characters)`}
            autoComplete="new-password"
            required
            minLength={minPassword}
            showStrength
            error={errors.password}
          />

          <Button type="submit" variant="primary" size="lg" block loading={isLoading}>
            {isLoading
              ? inviteToken
                ? 'Joining…'
                : 'Creating account…'
              : inviteToken
                ? 'Join team'
                : 'Create account'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default Register;

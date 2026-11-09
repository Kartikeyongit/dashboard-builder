import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { clearError, loginUser } from '../../store/authSlice';
import { isValidEmail } from '../../utils/authValidation';
import { usePageTitle } from '../../utils/usePageTitle';
import Button from '../../ui/Button';
import AuthLayout, { AuthAlert } from './AuthLayout';
import { AuthTextField, PasswordField } from './AuthFields';

interface FieldErrors {
  email?: string;
  password?: string;
}

const Login: React.FC = () => {
  usePageTitle('Sign in — Dashboard Builder');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Announce a failed sign-in and put focus on the summary so keyboard and
  // screen-reader users do not have to hunt for the message.
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  // Seeded demo credentials only exist on a local database. Showing the button
  // in production would advertise a login that cannot work (or worse, a
  // default password someone forgot to change).
  const fillDemo = () => {
    setEmail('admin@acme.com');
    setPassword('password123');
    setErrors({});
    dispatch(clearError());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Enter your email address.';
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = 'Enter your password.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    dispatch(loginUser({ email: trimmedEmail, password }));
  };

  return (
    <AuthLayout mode="login" title="Welcome back" subtitle="Sign in to your account">
      {error && (
        <AuthAlert
          ref={alertRef}
          message={error}
          onDismiss={() => {
            dispatch(clearError());
            emailRef.current?.focus();
          }}
        />
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthTextField
          id="login-email"
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
          required
          error={errors.email}
        />

        <PasswordField
          id="login-password"
          label="Password"
          inputRef={passwordRef}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          minLength={1}
          error={errors.password}
        />

        <Button type="submit" variant="primary" size="lg" block loading={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <button type="button" className="auth-demo" onClick={fillDemo}>
          Fill demo credentials: <code>admin@acme.com</code> / <code>password123</code>
        </button>
      )}

      <p className="auth-help">Trouble signing in? Contact your workspace admin.</p>
    </AuthLayout>
  );
};

export default Login;

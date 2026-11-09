import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '../../ui/Field';
import { getPasswordStrength, meetsMinimumLength } from '../../utils/authValidation';

interface SharedFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

interface AuthTextFieldProps
  extends SharedFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  icon: LucideIcon;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** Text field with a leading icon and the shared label/error wiring. */
export const AuthTextField: React.FC<AuthTextFieldProps> = ({
  id,
  label,
  hint,
  error,
  required,
  icon: Icon,
  inputRef,
  className,
  ...inputProps
}) => {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={clsx('ui-field', 'auth-field', className)}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="ui-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="auth-input-wrap">
        <Icon className="auth-input-icon" size={17} aria-hidden="true" />
        <Input
          id={id}
          ref={inputRef}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="ui-field__description ui-field__description--error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="ui-field__description">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

interface PasswordFieldProps
  extends SharedFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'size' | 'type'> {
  inputRef?: React.Ref<HTMLInputElement>;
  /** Show the strength meter and the enforced minimum-length rule. */
  showStrength?: boolean;
  /** The only hard rule, kept in step with the API. */
  minLength: number;
}

/**
 * Password input with an accessible visibility toggle. The strength meter is
 * advisory; only `minLength` is enforced, matching what the API accepts.
 */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  hint,
  error,
  required,
  inputRef,
  showStrength = false,
  minLength,
  value,
  className,
  ...inputProps
}) => {
  const [visible, setVisible] = useState(false);
  const password = typeof value === 'string' ? value : '';
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const meetsRule = meetsMinimumLength(password, minLength);

  const descriptionIds = [
    showStrength ? `${id}-rule` : null,
    error ? `${id}-error` : hint ? `${id}-hint` : null,
  ].filter(Boolean);

  return (
    <div className={clsx('ui-field', 'auth-field', className)}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="ui-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div className="auth-input-wrap auth-input-wrap--password">
        <Lock className="auth-input-icon" size={17} aria-hidden="true" />
        <Input
          id={id}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionIds.length > 0 ? descriptionIds.join(' ') : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>

      {showStrength && (
        <div className="auth-strength">
          {password.length > 0 && (
            <span className="sr-only" role="status">
              Password strength: {strength.label}
            </span>
          )}
          {password.length > 0 && (
            <div className="auth-strength__row">
              <span className="auth-strength__bar" aria-hidden="true">
                <span
                  className={clsx(
                    'auth-strength__fill',
                    strength.tone && `auth-strength__fill--${strength.tone}`,
                  )}
                  style={{ width: `${strength.score}%` }}
                />
              </span>
              <span
                className={clsx(
                  'auth-strength__label',
                  strength.tone && `auth-strength__label--${strength.tone}`,
                )}
              >
                {strength.label}
              </span>
            </div>
          )}
          <p
            id={`${id}-rule`}
            className={clsx('auth-strength__rule', meetsRule && 'auth-strength__rule--met')}
          >
            {meetsRule ? <Check size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
            At least {minLength} characters
          </p>
          <p className="auth-strength__tip">
            Add uppercase letters, numbers, or symbols to make it stronger.
          </p>
        </div>
      )}

      {error ? (
        <p id={`${id}-error`} className="ui-field__description ui-field__description--error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="ui-field__description">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

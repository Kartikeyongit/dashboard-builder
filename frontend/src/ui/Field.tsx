import React, { useId } from 'react';
import clsx from 'clsx';
import './Field.css';

interface FieldProps {
  label: string;
  children: React.ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
  /** Helper text shown below the control. */
  hint?: string;
  /** Validation message. Replaces the hint and marks the control invalid. */
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * Associates a label, hint, and error message with a single form control.
 * The control receives a generated id and aria-describedby automatically.
 */
const Field: React.FC<FieldProps> = ({ label, children, hint, error, required, className }) => {
  const generatedId = useId();
  const controlId = children.props.id ?? generatedId;
  const describedBy = hint || error ? `${controlId}-description` : undefined;

  const control = React.cloneElement(children, {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  });

  return (
    <div className={clsx('ui-field', className)}>
      <label className="ui-field__label" htmlFor={controlId}>
        {label}
        {required && <span className="ui-field__required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {(hint || error) && (
        <p
          id={describedBy}
          className={clsx('ui-field__description', error && 'ui-field__description--error')}
          role={error ? 'alert' : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={clsx('ui-input', className)} {...props} />;
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={clsx('ui-select', className)} {...props}>
      {children}
    </select>
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={clsx('ui-textarea', className)} {...props} />;
});

export default Field;

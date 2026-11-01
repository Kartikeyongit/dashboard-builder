import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  description?: React.ReactNode;
  /** Raw error text, shown inside a disclosure so it never dominates the page. */
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'The page could not be loaded. Try again, and if it keeps happening check the server logs.',
  details,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}) => (
  <div className={compact ? 'ui-error ui-error--compact' : 'ui-error'} role="alert">
    <div className="ui-error__icon" aria-hidden="true">
      <AlertTriangle size={compact ? 16 : 20} />
    </div>
    <div className="ui-error__content">
      <p className="ui-error__title">{title}</p>
      <p className="ui-error__description">{description}</p>
      {details && (
        <details className="ui-error__details">
          <summary>Technical details</summary>
          <pre>{details}</pre>
        </details>
      )}
    </div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RotateCw size={13} aria-hidden="true" />
        {retryLabel}
      </Button>
    )}
  </div>
);

export default ErrorState;

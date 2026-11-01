import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorState from '../../ui/ErrorState';

interface Props {
  children: React.ReactNode;
  /** Widget name, used to make the message specific. */
  title?: string;
  /** Reset the boundary when this value changes (for example, new data). */
  resetKey?: unknown;
}

/**
 * Keeps a single broken widget from taking down the whole dashboard.
 */
const WidgetBoundary: React.FC<Props> = ({ children, title = 'This widget failed to render', resetKey }) => (
  <ErrorBoundary
    resetKeys={[resetKey]}
    fallbackRender={({ error, resetErrorBoundary }) => (
      <ErrorState
        compact
        title={title}
        description="Its query or configuration may be invalid. Other widgets are unaffected."
        details={error instanceof Error ? error.message : String(error)}
        onRetry={resetErrorBoundary}
        retryLabel="Retry widget"
      />
    )}
  >
    {children}
  </ErrorBoundary>
);

export default WidgetBoundary;

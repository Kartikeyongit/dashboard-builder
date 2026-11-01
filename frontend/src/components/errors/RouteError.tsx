import React from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import ErrorState from '../../ui/ErrorState';
import './RouteError.css';

/**
 * Route-level error boundary. Without this a render error falls through to
 * React Router's unstyled default screen and the app looks broken.
 */
const RouteError: React.FC = () => {
  const error = useRouteError();

  let title = 'This page could not be displayed';
  let description = 'An unexpected error interrupted rendering. Reloading usually fixes it.';
  let details: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Request failed (${error.status})`;
    description =
      error.status === 404
        ? 'The page you are looking for does not exist or was moved.'
        : 'The server returned an error while loading this page.';
    details = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    details = error.message;
    if (error.message.includes('Failed to fetch dynamically imported module')) {
      title = 'A new version is available';
      description = 'Reload the page to load the latest version of the app.';
    }
  }

  return (
    <div className="route-error-page">
      <Link to="/" className="route-error-brand">
        <LayoutDashboard size={18} aria-hidden="true" />
        Dashboard Builder
      </Link>
      <ErrorState
        title={title}
        description={description}
        details={details}
        onRetry={() => window.location.reload()}
        retryLabel="Reload page"
      />
      <Link to="/" className="route-error-home">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to home
      </Link>
    </div>
  );
};

export default RouteError;

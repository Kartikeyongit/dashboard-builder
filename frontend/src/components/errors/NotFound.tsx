import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ErrorState from '../../ui/ErrorState';
import './RouteError.css';

const NotFound: React.FC = () => (
  <div className="route-error-page">
    <ErrorState
      title="Page not found"
      description="The page you are looking for does not exist or was moved. Check the address, or go back to your dashboards."
    />
    <Link to="/" className="route-error-home">
      <ArrowLeft size={14} aria-hidden="true" />
      Back to home
    </Link>
  </div>
);

export default NotFound;

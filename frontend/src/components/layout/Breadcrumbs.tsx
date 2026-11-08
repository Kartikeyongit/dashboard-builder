import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';
import { useAppSelector } from '../../hooks';
import { buildBreadcrumbs } from './breadcrumbsModel';
import './Breadcrumbs.css';

/**
 * Route-aware breadcrumbs. Dynamic ids resolve to names from the loaded lists
 * so the trail reads like navigation, not UUIDs.
 */
const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const dashboards = useAppSelector((state) => state.dashboards.list);
  const datasources = useAppSelector((state) => state.datasources.items);
  const queries = useAppSelector((state) => state.queries.items);
  const currentFull = useAppSelector((state) => state.dashboards.currentFull);

  const crumbs = buildBreadcrumbs(location.pathname, {
    dashboards,
    datasources,
    queries,
    currentDashboard: currentFull?.dashboard,
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const content = index === 0 ? (
            <>
              <HomeIcon size={14} aria-hidden="true" />
              <span className="breadcrumbs__home-label">{crumb.label}</span>
            </>
          ) : (
            crumb.label
          );

          return (
            <li key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronRight size={13} aria-hidden="true" className="breadcrumbs__sep" />}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className="breadcrumbs__link" title={crumb.label}>
                  {content}
                </Link>
              ) : (
                <span
                  className={isLast ? 'breadcrumbs__current' : 'breadcrumbs__label'}
                  aria-current={isLast ? 'page' : undefined}
                  title={crumb.label}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

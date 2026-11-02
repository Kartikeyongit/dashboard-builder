import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';
import { useAppSelector } from '../../hooks';
import './Breadcrumbs.css';

interface Crumb {
  label: string;
  to?: string;
}

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

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];

  const section = segments[0];
  const id = segments[1];
  const isEdit = segments[2] === 'edit';

  if (section === 'datasources') {
    crumbs.push({ label: 'Datasources', to: '/datasources' });
    if (id === 'new') {
      crumbs.push({ label: 'New datasource' });
    } else if (id) {
      const name = datasources.find((item) => item.id === id)?.name;
      crumbs.push({ label: name ?? 'Datasource', to: isEdit ? `/datasources/${id}/edit` : undefined });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  } else if (section === 'queries') {
    crumbs.push({ label: 'Queries', to: '/queries' });
    if (id === 'new') {
      crumbs.push({ label: 'New query' });
    } else if (id) {
      const name = queries.find((item) => item.id === id)?.name;
      crumbs.push({ label: name ?? 'Query', to: isEdit ? `/queries/${id}/edit` : undefined });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  } else if (section === 'dashboards') {
    crumbs.push({ label: 'Dashboards', to: '/dashboards' });
    if (id) {
      const name =
        (currentFull?.dashboard.id === id ? currentFull.dashboard.name : undefined) ??
        dashboards.find((item) => item.id === id)?.name ??
        'Dashboard';
      crumbs.push({ label: name, to: isEdit ? `/dashboards/${id}` : undefined });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              {index > 0 && <ChevronRight size={13} aria-hidden="true" className="breadcrumbs__sep" />}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className="breadcrumbs__link">
                  {index === 0 ? (
                    <>
                      <HomeIcon size={14} aria-hidden="true" />
                      <span className="breadcrumbs__home-label">{crumb.label}</span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              ) : (
                <span className={isLast ? 'breadcrumbs__current' : 'breadcrumbs__label'} aria-current={isLast ? 'page' : undefined}>
                  {index === 0 ? (
                    <>
                      <HomeIcon size={14} aria-hidden="true" />
                      <span className="breadcrumbs__home-label">{crumb.label}</span>
                    </>
                  ) : (
                    crumb.label
                  )}
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

export interface Crumb {
  label: string;
  to?: string;
}

interface NamedItem {
  id: string;
  name: string;
}

export interface BreadcrumbSources {
  dashboards: NamedItem[];
  datasources: NamedItem[];
  queries: NamedItem[];
  currentDashboard?: NamedItem;
}

const humanize = (segment: string): string =>
  segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * Route-aware breadcrumbs. Dynamic ids resolve to names from the loaded lists
 * so the trail reads like navigation, not UUIDs.
 */
export function buildBreadcrumbs(
  pathname: string,
  sources: BreadcrumbSources,
): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];

  const section = segments[0];
  const id = segments[1];
  const isEdit = segments[2] === 'edit';

  if (section === 'datasources') {
    crumbs.push({ label: 'Datasources', to: '/datasources' });
    if (id === 'new') {
      crumbs.push({ label: 'New datasource' });
    } else if (id) {
      const name = sources.datasources.find((item) => item.id === id)?.name;
      crumbs.push({
        label: name ?? 'Datasource',
        to: isEdit ? `/datasources/${id}/edit` : undefined,
      });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  } else if (section === 'queries') {
    crumbs.push({ label: 'Queries', to: '/queries' });
    if (id === 'new') {
      crumbs.push({ label: 'New query' });
    } else if (id) {
      const name = sources.queries.find((item) => item.id === id)?.name;
      crumbs.push({
        label: name ?? 'Query',
        to: isEdit ? `/queries/${id}/edit` : undefined,
      });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  } else if (section === 'dashboards') {
    crumbs.push({ label: 'Dashboards', to: '/dashboards' });
    if (id === 'new') {
      crumbs.push({ label: 'New dashboard' });
    } else if (id) {
      const name =
        (sources.currentDashboard?.id === id ? sources.currentDashboard.name : undefined) ??
        sources.dashboards.find((item) => item.id === id)?.name ??
        'Dashboard';
      crumbs.push({
        label: name,
        to: isEdit ? `/dashboards/${id}` : undefined,
      });
      if (isEdit) crumbs.push({ label: 'Edit' });
    }
  } else if (section === 'team') {
    crumbs.push({ label: 'Team', to: '/team' });
  } else if (section === 'settings') {
    crumbs.push({ label: 'Settings', to: '/settings' });
  } else if (section) {
    // Keep unknown routes readable instead of showing only "Home".
    crumbs.push({ label: humanize(section) });
  }

  return crumbs;
}

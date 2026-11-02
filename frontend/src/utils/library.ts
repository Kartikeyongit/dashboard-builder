import type { Dashboard } from '../types';

export type DashboardSort = 'updated' | 'created' | 'name' | 'widgets';

export const DASHBOARD_SORT_OPTIONS: { value: DashboardSort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'widgets', label: 'Most widgets' },
];

/** Case-insensitive substring match across any of the provided fields. */
export function matchesSearch(query: string, ...fields: (string | undefined | null)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle));
}

export interface DashboardFilterOptions {
  query: string;
  favoritesOnly: boolean;
}

export function filterDashboards(list: Dashboard[], options: DashboardFilterOptions): Dashboard[] {
  return list.filter((dashboard) => {
    if (options.favoritesOnly && !dashboard.is_favorite) return false;
    return matchesSearch(
      options.query,
      dashboard.name,
      dashboard.description,
      ...(dashboard.tags ?? []),
    );
  });
}

const byUpdated = (a: Dashboard, b: Dashboard) =>
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

export function sortDashboards(list: Dashboard[], sort: DashboardSort): Dashboard[] {
  const sorted = [...list];
  switch (sort) {
    case 'created':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      break;
    case 'widgets':
      sorted.sort((a, b) => (b.widget_count ?? 0) - (a.widget_count ?? 0) || byUpdated(a, b));
      break;
    case 'updated':
    default:
      sorted.sort(byUpdated);
      break;
  }
  return sorted;
}

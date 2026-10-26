import type { DashboardFilter, DashboardFilterValues } from '../types';

/**
 * Reads filter values from a URL search string. Only `f_<id>` params are
 * considered. When filter definitions are supplied, unknown ids are ignored so
 * stale links cannot inject arbitrary values.
 */
export function filterValuesFromSearch(
  search: string,
  filters?: DashboardFilter[]
): DashboardFilterValues {
  const params = new URLSearchParams(search);
  const allowed = filters ? new Set(filters.map((f) => f.id)) : null;
  const values: DashboardFilterValues = {};

  params.forEach((value, key) => {
    if (!key.startsWith('f_')) return;
    const id = key.slice(2);
    if (!id) return;
    if (allowed && !allowed.has(id)) return;
    values[id] = value;
  });

  return values;
}

/** Builds the query string for the given filter values (without `?`). */
export function searchFromFilterValues(values: DashboardFilterValues): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([id, value]) => {
    if (value !== undefined && value !== null) {
      params.set(`f_${id}`, value);
    }
  });
  return params.toString();
}

/**
 * Merges URL overrides with each filter's configured default. Missing values
 * stay empty so the backend can report which filter a query still needs.
 */
export function initialFilterValues(
  filters: DashboardFilter[] | undefined,
  overrides: DashboardFilterValues = {}
): DashboardFilterValues {
  const values: DashboardFilterValues = {};
  (filters ?? []).forEach((filter) => {
    values[filter.id] = overrides[filter.id] ?? filter.default ?? '';
  });
  return values;
}

/** True when at least one filter differs from its configured default. */
export function hasFilterChanges(
  filters: DashboardFilter[] | undefined,
  values: DashboardFilterValues
): boolean {
  return (filters ?? []).some((filter) => (values[filter.id] ?? '') !== (filter.default ?? ''));
}

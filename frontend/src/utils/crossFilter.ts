import type { DashboardFilter } from '../types';

/**
 * Converts a chart column name into the shape used by dashboard filter IDs.
 * `Country Name` and `country_name` both normalize to `country_name`, so a
 * query result and a filter definition can be matched without extra config.
 */
export function normalizeDimensionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Finds the dashboard filter a chart column should drive. Filters are matched
 * by id first, then by label. Returns undefined when the dashboard has no
 * filter for that dimension, in which case a click cannot be applied safely.
 */
export function findCrossFilter(
  filters: DashboardFilter[] | undefined,
  column: string
): DashboardFilter | undefined {
  const target = normalizeDimensionName(column);
  if (!target) return undefined;

  const list = filters ?? [];
  return (
    list.find((filter) => normalizeDimensionName(filter.id) === target) ??
    list.find((filter) => normalizeDimensionName(filter.label || '') === target)
  );
}

/**
 * Clicking the active value again clears the filter back to its configured
 * default. Clicking a different value makes that value the active filter.
 */
export function toggledFilterValue(
  filter: DashboardFilter,
  current: string | undefined,
  clicked: string
): string {
  const active = current ?? filter.default ?? '';
  return active === clicked ? filter.default ?? '' : clicked;
}

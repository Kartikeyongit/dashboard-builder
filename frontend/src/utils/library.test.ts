import { describe, expect, it } from 'vitest';
import type { Dashboard } from '../types';
import { filterDashboards, matchesSearch, sortDashboards } from './library';

const makeDashboard = (overrides: Partial<Dashboard>): Dashboard => ({
  id: 'id',
  org_id: 'org',
  name: 'Dashboard',
  description: '',
  tags: [],
  refresh_interval_seconds: 0,
  filters: [],
  is_favorite: false,
  widget_count: 0,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const dashboards: Dashboard[] = [
  makeDashboard({
    id: 'a',
    name: 'Revenue',
    description: 'Weekly sales',
    tags: ['Finance'],
    is_favorite: true,
    widget_count: 4,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  }),
  makeDashboard({
    id: 'b',
    name: 'Operations',
    description: 'On-call health',
    tags: ['Ops'],
    is_favorite: false,
    widget_count: 1,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  }),
  makeDashboard({
    id: 'c',
    name: 'Customers',
    description: 'Signups by country',
    tags: ['growth', 'finance'],
    is_favorite: true,
    widget_count: 2,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  }),
];

describe('matchesSearch', () => {
  it('matches case-insensitively across fields', () => {
    expect(matchesSearch('REVENUE', 'Revenue')).toBe(true);
    expect(matchesSearch('sales', 'Revenue', 'Weekly sales')).toBe(true);
    expect(matchesSearch('nope', 'Revenue')).toBe(false);
  });

  it('treats an empty query as a match', () => {
    expect(matchesSearch('  ', 'anything')).toBe(true);
  });
});

describe('filterDashboards', () => {
  it('searches names, descriptions, and tags', () => {
    expect(filterDashboards(dashboards, { query: 'finance', favoritesOnly: false }).map((d) => d.id))
      .toEqual(['a', 'c']);
    expect(filterDashboards(dashboards, { query: 'signups', favoritesOnly: false }).map((d) => d.id))
      .toEqual(['c']);
  });

  it('can restrict to favorites', () => {
    expect(filterDashboards(dashboards, { query: '', favoritesOnly: true }).map((d) => d.id))
      .toEqual(['a', 'c']);
  });
});

describe('sortDashboards', () => {
  it('sorts by recently updated by default', () => {
    expect(sortDashboards(dashboards, 'updated').map((d) => d.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by name, creation date, and widget count', () => {
    expect(sortDashboards(dashboards, 'name').map((d) => d.id)).toEqual(['c', 'b', 'a']);
    expect(sortDashboards(dashboards, 'created').map((d) => d.id)).toEqual(['c', 'b', 'a']);
    expect(sortDashboards(dashboards, 'widgets').map((d) => d.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input', () => {
    const original = dashboards.map((d) => d.id);
    sortDashboards(dashboards, 'name');
    expect(dashboards.map((d) => d.id)).toEqual(original);
  });
});

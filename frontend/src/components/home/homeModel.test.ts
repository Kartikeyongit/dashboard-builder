import { describe, expect, it } from 'vitest';
import {
  buildOnboarding,
  buildRecentDashboards,
  completedSteps,
  getPrimaryAction,
} from './homeModel';
import type { Dashboard } from '../../types';

const dashboard = (overrides: Partial<Dashboard>): Dashboard => ({
  id: 'd1',
  org_id: 'org',
  name: 'Dashboard',
  refresh_interval_seconds: 0,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('getPrimaryAction', () => {
  it('gives viewers no create action', () => {
    expect(
      getPrimaryAction({ canEdit: false, datasourceCount: 0, queryCount: 0 }),
    ).toBeNull();
  });

  it('starts with a datasource', () => {
    expect(
      getPrimaryAction({ canEdit: true, datasourceCount: 0, queryCount: 0 }),
    ).toMatchObject({ kind: 'datasource', to: '/datasources/new' });
  });

  it('asks for a query once a datasource exists', () => {
    expect(
      getPrimaryAction({ canEdit: true, datasourceCount: 1, queryCount: 0 }),
    ).toMatchObject({ kind: 'query', to: '/queries/new' });
  });

  it('offers a dashboard once a query exists', () => {
    expect(
      getPrimaryAction({ canEdit: true, datasourceCount: 1, queryCount: 1 }),
    ).toMatchObject({ kind: 'dashboard', to: '/dashboards?new=1' });
  });
});

describe('buildOnboarding', () => {
  it('marks every step from workspace counts', () => {
    const steps = buildOnboarding({ dashboardCount: 0, datasourceCount: 1, queryCount: 0 });

    expect(steps).toHaveLength(3);
    expect(steps.map((step) => step.done)).toEqual([true, false, false]);
    expect(completedSteps(steps)).toBe(1);
  });

  it('hides nothing and reports completion when everything exists', () => {
    const steps = buildOnboarding({ dashboardCount: 2, datasourceCount: 1, queryCount: 3 });
    expect(completedSteps(steps)).toBe(3);
  });
});

describe('buildRecentDashboards', () => {
  it('deduplicates ids and keeps pinned dashboards first', () => {
    const dashboards = [
      dashboard({ id: 'newest', updated_at: '2026-03-10T12:00:00Z' }),
      dashboard({ id: 'pinned', is_favorite: true, updated_at: '2026-01-01T00:00:00Z' }),
      dashboard({ id: 'newest', name: 'Duplicate', updated_at: '2026-03-11T12:00:00Z' }),
      dashboard({ id: 'older', updated_at: '2026-02-01T00:00:00Z' }),
    ];

    expect(buildRecentDashboards(dashboards).map((item) => item.id)).toEqual([
      'pinned',
      'newest',
      'older',
    ]);
  });

  it('sorts each group by the latest update and caps the list', () => {
    const dashboards = [
      dashboard({ id: 'a', is_favorite: true, updated_at: '2026-01-01T00:00:00Z' }),
      dashboard({ id: 'b', is_favorite: true, updated_at: '2026-02-01T00:00:00Z' }),
      dashboard({ id: 'c', updated_at: '2026-03-01T00:00:00Z' }),
      dashboard({ id: 'd', updated_at: '2026-04-01T00:00:00Z' }),
    ];

    expect(buildRecentDashboards(dashboards, 3).map((item) => item.id)).toEqual(['b', 'a', 'd']);
  });

  it('returns an empty list for limit zero', () => {
    expect(buildRecentDashboards([dashboard({})], 0)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbsModel';

const sources = {
  dashboards: [{ id: 'd-1', name: 'Revenue overview' }],
  datasources: [{ id: 'ds-1', name: 'Warehouse' }],
  queries: [{ id: 'q-1', name: 'Monthly revenue' }],
  currentDashboard: { id: 'd-2', name: 'Fresh from the API' },
};

describe('buildBreadcrumbs', () => {
  it('shows a single current Home crumb at the root', () => {
    expect(buildBreadcrumbs('/', sources)).toEqual([{ label: 'Home', to: '/' }]);
  });

  it('resolves static sections', () => {
    expect(buildBreadcrumbs('/team', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Team', to: '/team' },
    ]);
    expect(buildBreadcrumbs('/settings', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Settings', to: '/settings' },
    ]);
  });

  it('resolves dashboard names from the loaded list', () => {
    expect(buildBreadcrumbs('/dashboards/d-1', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Dashboards', to: '/dashboards' },
      { label: 'Revenue overview' },
    ]);
  });

  it('prefers the fully loaded dashboard over the list entry', () => {
    expect(buildBreadcrumbs('/dashboards/d-2', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Dashboards', to: '/dashboards' },
      { label: 'Fresh from the API' },
    ]);
  });

  it('adds an Edit step for edit routes', () => {
    expect(buildBreadcrumbs('/dashboards/d-1/edit', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Dashboards', to: '/dashboards' },
      { label: 'Revenue overview', to: '/dashboards/d-1' },
      { label: 'Edit' },
    ]);
  });

  it('handles create routes', () => {
    expect(buildBreadcrumbs('/datasources/new', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Datasources', to: '/datasources' },
      { label: 'New datasource' },
    ]);
    expect(buildBreadcrumbs('/queries/new', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Queries', to: '/queries' },
      { label: 'New query' },
    ]);
  });

  it('falls back to section labels when names are unknown', () => {
    expect(buildBreadcrumbs('/queries/q-404', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Queries', to: '/queries' },
      { label: 'Query' },
    ]);
  });

  it('humanizes unknown sections instead of leaving Home alone', () => {
    expect(buildBreadcrumbs('/release-notes', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Release Notes' },
    ]);
  });

  it('ignores trailing slashes', () => {
    expect(buildBreadcrumbs('/settings/', sources)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Settings', to: '/settings' },
    ]);
  });
});

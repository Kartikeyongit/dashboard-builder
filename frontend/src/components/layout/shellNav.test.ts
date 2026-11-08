import { describe, expect, it } from 'vitest';
import { SHELL_NAV_SECTIONS, isNavItemActive } from './shellNav';

const items = SHELL_NAV_SECTIONS.flatMap((section) => section.items);

describe('SHELL_NAV_SECTIONS', () => {
  it('keeps the workspace destinations in priority order', () => {
    expect(SHELL_NAV_SECTIONS[0].label).toBe('Workspace');
    expect(SHELL_NAV_SECTIONS[0].items.map((item) => item.to)).toEqual([
      '/',
      '/dashboards',
      '/queries',
      '/datasources',
    ]);
  });

  it('put manage destinations in their own labelled group', () => {
    expect(SHELL_NAV_SECTIONS[1].label).toBe('Manage');
    expect(SHELL_NAV_SECTIONS[1].items.map((item) => item.label)).toEqual([
      'Team',
      'Settings',
    ]);
  });

  it('exposes every destination exactly once', () => {
    const paths = items.map((item) => item.to);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toHaveLength(6);
  });
});

describe('isNavItemActive', () => {
  const find = (to: string) => {
    const item = items.find((candidate) => candidate.to === to);
    if (!item) throw new Error(`Missing nav item ${to}`);
    return item;
  };

  it('only marks Home active at the root', () => {
    expect(isNavItemActive('/', find('/'))).toBe(true);
    expect(isNavItemActive('/dashboards', find('/'))).toBe(false);
  });

  it('keeps section items active on nested routes', () => {
    expect(isNavItemActive('/dashboards', find('/dashboards'))).toBe(true);
    expect(isNavItemActive('/dashboards/d-1', find('/dashboards'))).toBe(true);
    expect(isNavItemActive('/dashboards/d-1/edit', find('/dashboards'))).toBe(true);
    expect(isNavItemActive('/queries/new', find('/queries'))).toBe(true);
    expect(isNavItemActive('/settings', find('/settings'))).toBe(true);
  });

  it('does not match sibling paths with a shared prefix', () => {
    expect(isNavItemActive('/queries-archive', find('/queries'))).toBe(false);
    expect(isNavItemActive('/teamwork', find('/team'))).toBe(false);
  });
});

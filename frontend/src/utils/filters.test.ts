import { describe, expect, it } from 'vitest';
import {
  filterValuesFromSearch,
  hasFilterChanges,
  initialFilterValues,
  searchFromFilterValues,
} from './filters';
import type { DashboardFilter } from '../types';

const filters: DashboardFilter[] = [
  { id: 'start_date', label: 'Start date', type: 'date', default: '2026-01-01' },
  { id: 'status', label: 'Status', type: 'select', options: ['paid', 'pending'] },
];

describe('filterValuesFromSearch', () => {
  it('reads only f_ params', () => {
    expect(filterValuesFromSearch('?f_status=paid&other=1&f_start_date=2026-02-01')).toEqual({
      status: 'paid',
      start_date: '2026-02-01',
    });
  });

  it('ignores unknown ids when definitions are supplied', () => {
    expect(
      filterValuesFromSearch('?f_status=paid&f_unknown=x', filters)
    ).toEqual({ status: 'paid' });
  });

  it('preserves explicit empty values so a default can be cleared', () => {
    expect(filterValuesFromSearch('?f_status=&f_start_date=2026-02-01')).toEqual({
      status: '',
      start_date: '2026-02-01',
    });
  });

  it('handles a leading question mark or bare string', () => {
    expect(filterValuesFromSearch('f_status=paid')).toEqual({ status: 'paid' });
  });
});

describe('searchFromFilterValues', () => {
  it('prefixes keys and keeps explicit empties', () => {
    const query = searchFromFilterValues({ status: 'paid', start_date: '' });
    expect(query).toBe('f_status=paid&f_start_date=');
  });

  it('round-trips with filterValuesFromSearch', () => {
    const values = { status: 'pending', start_date: '2026-03-01' };
    expect(filterValuesFromSearch(searchFromFilterValues(values))).toEqual(values);
  });
});

describe('initialFilterValues', () => {
  it('applies defaults and URL overrides', () => {
    expect(initialFilterValues(filters, { status: 'paid' })).toEqual({
      start_date: '2026-01-01',
      status: 'paid',
    });
  });

  it('lets an explicit empty override clear a default', () => {
    expect(initialFilterValues(filters, { start_date: '' })).toEqual({
      start_date: '',
      status: '',
    });
  });

  it('returns empty values when there are no filters', () => {
    expect(initialFilterValues(undefined)).toEqual({});
  });
});

describe('hasFilterChanges', () => {
  it('detects a value that differs from the default', () => {
    expect(hasFilterChanges(filters, { start_date: '2026-01-01', status: 'paid' })).toBe(true);
  });

  it('is false when everything matches the defaults', () => {
    expect(hasFilterChanges(filters, { start_date: '2026-01-01', status: '' })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  findCrossFilter,
  normalizeDimensionName,
  toggledFilterValue,
} from './crossFilter';
import type { DashboardFilter } from '../types';

const filters: DashboardFilter[] = [
  { id: 'country', label: 'Country', type: 'select', options: ['US', 'DE'] },
  { id: 'start_date', label: 'Start date', type: 'date', default: '2026-01-01' },
  { id: 'status', label: 'Order Status', type: 'text' },
];

describe('normalizeDimensionName', () => {
  it('lowercases and converts separators to underscores', () => {
    expect(normalizeDimensionName('Country Name')).toBe('country_name');
    expect(normalizeDimensionName('order-status')).toBe('order_status');
    expect(normalizeDimensionName('  COUNTRY  ')).toBe('country');
  });

  it('trims leading and trailing separators', () => {
    expect(normalizeDimensionName('__Total__')).toBe('total');
  });
});

describe('findCrossFilter', () => {
  it('matches a column to a filter id', () => {
    expect(findCrossFilter(filters, 'country')?.id).toBe('country');
    expect(findCrossFilter(filters, 'Country')?.id).toBe('country');
  });

  it('matches a column to a filter label', () => {
    expect(findCrossFilter(filters, 'order status')?.id).toBe('status');
    expect(findCrossFilter(filters, 'Start Date')?.id).toBe('start_date');
  });

  it('returns undefined when no filter matches', () => {
    expect(findCrossFilter(filters, 'revenue')).toBeUndefined();
    expect(findCrossFilter(undefined, 'country')).toBeUndefined();
    expect(findCrossFilter(filters, '')).toBeUndefined();
  });
});

describe('toggledFilterValue', () => {
  it('sets the clicked value when it is not active', () => {
    expect(toggledFilterValue(filters[0], '', 'US')).toBe('US');
    expect(toggledFilterValue(filters[0], 'DE', 'US')).toBe('US');
  });

  it('clears back to the default when the active value is clicked again', () => {
    expect(toggledFilterValue(filters[1], '2026-02-01', '2026-02-01')).toBe('2026-01-01');
    expect(toggledFilterValue(filters[0], 'US', 'US')).toBe('');
  });
});

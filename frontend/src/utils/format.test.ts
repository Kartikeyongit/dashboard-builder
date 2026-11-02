import { describe, expect, it } from 'vitest';
import { pluralize, refreshLabel, relativeTime } from './format';

const NOW = new Date('2026-06-15T12:00:00Z').getTime();
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('relativeTime', () => {
  it('shows "just now" for the last few seconds', () => {
    expect(relativeTime(isoAgo(10 * 1000), NOW)).toBe('just now');
    expect(relativeTime(isoAgo(-5 * 1000), NOW)).toBe('just now');
  });

  it('uses minutes, hours, and days', () => {
    expect(relativeTime(isoAgo(5 * 60 * 1000), NOW)).toBe('5 min ago');
    expect(relativeTime(isoAgo(2 * 60 * 60 * 1000), NOW)).toBe('2 hr ago');
    expect(relativeTime(isoAgo(26 * 60 * 60 * 1000), NOW)).toBe('yesterday');
    expect(relativeTime(isoAgo(3 * 24 * 60 * 60 * 1000), NOW)).toBe('3 days ago');
    expect(relativeTime(isoAgo(14 * 24 * 60 * 60 * 1000), NOW)).toBe('2 wk ago');
  });

  it('falls back to a short date for older timestamps', () => {
    const label = relativeTime('2024-03-04T10:00:00Z', NOW);
    expect(label).toContain('2024');
  });

  it('returns an empty string for invalid input', () => {
    expect(relativeTime('not-a-date', NOW)).toBe('');
  });
});

describe('pluralize', () => {
  it('uses the singular for one and plural otherwise', () => {
    expect(pluralize(1, 'widget')).toBe('1 widget');
    expect(pluralize(0, 'widget')).toBe('0 widgets');
    expect(pluralize(3, 'query', 'queries')).toBe('3 queries');
  });
});

describe('refreshLabel', () => {
  it('describes common refresh intervals', () => {
    expect(refreshLabel(0)).toBe('Off');
    expect(refreshLabel(30)).toBe('30s');
    expect(refreshLabel(300)).toBe('5 min');
    expect(refreshLabel(3600)).toBe('1 hr');
  });
});

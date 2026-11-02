/**
 * Small, dependency-free formatting helpers used across the library lists.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const shortDateWithYear = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Human-friendly "time ago" label. Accepts an ISO timestamp and an optional
 * clock so tests stay deterministic.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diff = now - then;
  if (diff < 45 * 1000) return 'just now';
  if (diff < 90 * 1000) return '1 min ago';
  if (diff < HOUR) return `${Math.round(diff / MINUTE)} min ago`;
  if (diff < 90 * MINUTE) return '1 hr ago';
  if (diff < DAY) return `${Math.round(diff / HOUR)} hr ago`;
  if (diff < 2 * DAY) return 'yesterday';
  if (diff < WEEK) return `${Math.round(diff / DAY)} days ago`;
  if (diff < 5 * WEEK) return `${Math.round(diff / WEEK)} wk ago`;

  const date = new Date(then);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return sameYear ? shortDate.format(date) : shortDateWithYear.format(date);
}

/** "1 widget" / "3 widgets", with an optional irregular plural. */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Returns a short label for a refresh interval in seconds. */
export function refreshLabel(seconds: number): string {
  if (!seconds) return 'Off';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} hr`;
}

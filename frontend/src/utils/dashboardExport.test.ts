import { describe, expect, it } from 'vitest';
import type { WidgetData } from '../types';
import { toDashboardCSV } from './dashboardExport';

const widget = (id: string, title: string, columns: string[], rows: unknown[][]): WidgetData => ({
  widget: {
    id,
    dashboard_id: 'dash',
    query_id: 'query',
    widget_type: 'table',
    config: { title },
    position_x: 0,
    position_y: 0,
    width: 6,
    height: 4,
  },
  data: { columns, rows },
});

describe('toDashboardCSV', () => {
  it('exports each widget in its own titled section', () => {
    const csv = toDashboardCSV([
      widget('a', 'Revenue', ['total'], [[10]]),
      widget('b', 'Customers', ['country', 'count'], [['US', 3]]),
    ]);

    expect(csv).toBe(
      'Widget,Revenue\r\n\r\ntotal\r\n10\r\n\r\nWidget,Customers\r\n\r\ncountry,count\r\nUS,3',
    );
  });

  it('skips widgets without data and preserves data without a custom title', () => {
    const csv = toDashboardCSV([
      { widget: widget('a', 'Ignored', ['x'], []).widget, data: undefined },
      widget('b', '', ['x'], [[1]]),
    ]);

    expect(csv).toContain('Widget,Table');
    expect(csv).not.toContain('Ignored');
  });

  it('returns an empty string when nothing has data', () => {
    expect(toDashboardCSV([])).toBe('');
  });
});

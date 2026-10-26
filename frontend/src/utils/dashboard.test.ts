import { describe, expect, it } from 'vitest';
import { GRID_COLS, getNextWidgetY, normalizeLayout, widgetToLayout } from './dashboard';
import type { Widget } from '../types';

function widget(overrides: Partial<Widget>): Widget {
  return {
    id: 'w1',
    dashboard_id: 'd1',
    query_id: 'q1',
    widget_type: 'chart',
    config: {},
    position_x: 0,
    position_y: 0,
    width: 4,
    height: 4,
    ...overrides,
  };
}

describe('getNextWidgetY', () => {
  it('returns 0 for no widgets', () => {
    expect(getNextWidgetY([])).toBe(0);
    expect(getNextWidgetY(undefined)).toBe(0);
    expect(getNextWidgetY(null)).toBe(0);
  });

  it('returns the bottom edge of the lowest widget', () => {
    const widgets = [
      widget({ id: 'a', position_y: 0, height: 4 }),
      widget({ id: 'b', position_y: 6, height: 3 }),
      widget({ id: 'c', position_y: 2, height: 2 }),
    ];
    expect(getNextWidgetY(widgets)).toBe(9);
  });

  it('falls back to safe defaults for invalid values', () => {
    const widgets = [
      widget({ id: 'a', position_y: Number.NaN, height: Number.NaN }),
      widget({ id: 'b', position_y: 1, height: 2 }),
    ];
    expect(getNextWidgetY(widgets)).toBe(4);
  });
});

describe('normalizeLayout', () => {
  it('fills defaults', () => {
    expect(normalizeLayout({})).toEqual({ x: 0, y: 0, w: 4, h: 4 });
  });

  it('clamps width to the grid', () => {
    expect(normalizeLayout({ x: 0, y: 0, w: 99, h: 4 }).w).toBe(GRID_COLS);
  });

  it('keeps widgets inside the right edge', () => {
    const layout = normalizeLayout({ x: 10, y: 0, w: 6, h: 4 });
    expect(layout.x).toBe(GRID_COLS - 6);
    expect(layout.x + layout.w).toBeLessThanOrEqual(GRID_COLS);
  });

  it('removes negative values', () => {
    expect(normalizeLayout({ x: -5, y: -2, w: 0, h: 0 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('floors fractional values', () => {
    expect(normalizeLayout({ x: 1.9, y: 2.9, w: 3.9, h: 4.9 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });
});

describe('widgetToLayout', () => {
  it('uses the widget id and saved geometry', () => {
    expect(widgetToLayout(widget({ id: 'abc', position_x: 2, position_y: 3, width: 5, height: 6 }))).toEqual({
      i: 'abc',
      x: 2,
      y: 3,
      w: 5,
      h: 6,
    });
  });
});

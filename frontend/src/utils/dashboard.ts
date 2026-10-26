import type { Widget } from '../types';

export const GRID_COLS = 12;
export const DEFAULT_WIDGET_WIDTH = 4;
export const DEFAULT_WIDGET_HEIGHT = 4;

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

/** Bottom edge of the lowest widget, used to append new widgets below. */
export function getNextWidgetY(widgets: Widget[] | null | undefined): number {
  if (!Array.isArray(widgets) || widgets.length === 0) return 0;
  return widgets.reduce((bottom, widget) => {
    const y = Number.isFinite(widget.position_y) ? widget.position_y : 0;
    const height =
      Number.isFinite(widget.height) && widget.height > 0
        ? widget.height
        : DEFAULT_WIDGET_HEIGHT;
    return Math.max(bottom, y + height);
  }, 0);
}

/** Keeps a saved layout inside the 12-column grid and free of negative values. */
export function normalizeLayout(input: Partial<WidgetLayout>): WidgetLayout {
  const w = clampInt(input.w ?? DEFAULT_WIDGET_WIDTH, 1, GRID_COLS);
  const h = clampInt(input.h ?? DEFAULT_WIDGET_HEIGHT, 1, 100);
  const x = clampInt(input.x ?? 0, 0, GRID_COLS - w);
  const y = clampInt(input.y ?? 0, 0, Number.MAX_SAFE_INTEGER);
  return { x, y, w, h };
}

/** Converts a stored widget into a safe grid layout item. */
export function widgetToLayout(widget: Widget): WidgetLayout & { i: string } {
  return {
    i: widget.id,
    ...normalizeLayout({
      x: widget.position_x,
      y: widget.position_y,
      w: widget.width,
      h: widget.height,
    }),
  };
}

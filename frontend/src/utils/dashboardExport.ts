import type { WidgetData } from '../types';
import { csvEscape, toCSV } from './csv';
import { widgetTitle } from './widgetConfig';

/**
 * Builds a single CSV for every widget that currently has data. Each section
 * starts with a `Widget,<title>` row and a blank line, which keeps the export
 * readable in spreadsheets without merging unrelated schemas into one table.
 */
export function toDashboardCSV(widgets: WidgetData[]): string {
  const sections = widgets
    .filter((widget) => Array.isArray(widget.data?.columns) && widget.data.columns.length > 0)
    .map((widget) =>
      [`Widget,${csvEscape(widgetTitle(widget.widget))}`, '', toCSV(widget.data)].join('\r\n'),
    );

  return sections.join('\r\n\r\n');
}

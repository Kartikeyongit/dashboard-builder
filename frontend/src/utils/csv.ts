import type { QueryResult } from '../types';

/** Escapes a single CSV cell. Objects are serialized so nested JSON survives. */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Converts a query result into RFC 4180-style CSV with CRLF line endings. */
export function toCSV(result?: QueryResult | null): string {
  if (!result || !Array.isArray(result.columns) || result.columns.length === 0) {
    return '';
  }
  const header = result.columns.map(csvEscape).join(',');
  const rows = (Array.isArray(result.rows) ? result.rows : []).map((row) =>
    (Array.isArray(row) ? row : []).map(csvEscape).join(',')
  );
  return [header, ...rows].join('\r\n');
}

/** Makes a filename safe on Windows, macOS, and Linux. */
export function safeFilename(name: string, fallback = 'export'): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  return cleaned || fallback;
}

/**
 * Triggers a CSV download in the browser. The UTF-8 BOM keeps Excel happy with
 * non-ASCII data. This is a no-op outside a document context (e.g. tests).
 */
export function downloadCSV(filename: string, csv: string): void {
  if (!csv || typeof document === 'undefined') return;
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

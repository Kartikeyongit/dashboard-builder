/** Helpers for sorting, filtering, and exporting ad-hoc query results. */

export type SortDirection = 'asc' | 'desc';

export interface ResultSort {
  column: number;
  direction: SortDirection;
}

/** Renders a cell the same way the results grid does. */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Case-insensitive contains match across every cell in a row. */
export function filterRows(rows: unknown[][], term: string): unknown[][] {
  const needle = term.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    (Array.isArray(row) ? row : []).some((cell) => formatCell(cell).toLowerCase().includes(needle)),
  );
}

/**
 * Compares two cells. Empty cells sort last in both directions; numeric-looking
 * strings compare numerically so "10" comes after "9".
 */
export function compareCells(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);

  const aText = formatCell(a);
  const bText = formatCell(b);
  if (aText.trim() !== '' && bText.trim() !== '') {
    const aNumber = Number(aText);
    const bNumber = Number(bText);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }
  }
  return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
}

/** Stable sort by one column. Nulls stay last regardless of direction. */
export function sortRows(rows: unknown[][], sort: ResultSort | null): unknown[][] {
  if (!sort) return rows;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = left.row[sort.column];
      const b = right.row[sort.column];
      const aEmpty = a === null || a === undefined;
      const bEmpty = b === null || b === undefined;
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) return left.index - right.index;
        return aEmpty ? 1 : -1;
      }
      const result = compareCells(a, b);
      if (result === 0) return left.index - right.index;
      return sort.direction === 'asc' ? result : -result;
    })
    .map((entry) => entry.row);
}

/** Filter, then sort. Exposed so the preview and CSV export stay identical. */
export function prepareRows(
  rows: unknown[][],
  options: { term?: string; sort?: ResultSort | null } = {},
): unknown[][] {
  return sortRows(filterRows(rows, options.term ?? ''), options.sort ?? null);
}

/** Tab-separated text for the clipboard. */
export function toTSV(columns: string[], rows: unknown[][]): string {
  const header = columns.map((column) => column.replace(/\t/g, ' ')).join('\t');
  const body = rows.map((row) =>
    (Array.isArray(row) ? row : [])
      .map((cell) => formatCell(cell).replace(/\t/g, ' ').replace(/\r?\n/g, ' '))
      .join('\t'),
  );
  return [header, ...body].join('\n');
}

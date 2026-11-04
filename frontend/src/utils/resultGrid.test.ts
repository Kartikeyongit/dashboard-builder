import { describe, expect, it } from 'vitest';
import {
  compareCells,
  filterRows,
  formatCell,
  prepareRows,
  sortRows,
  toTSV,
} from './resultGrid';

const rows: unknown[][] = [
  [3, 'Zebra', null],
  [1, 'apple', { nested: true }],
  [2, 'Banana', 'x'],
];

describe('resultGrid', () => {
  it('formats nulls and objects for display', () => {
    expect(formatCell(null)).toBe('');
    expect(formatCell(undefined)).toBe('');
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
    expect(formatCell(false)).toBe('false');
  });

  it('filters across every column, case-insensitively', () => {
    expect(filterRows(rows, 'banana').map((row) => row[0])).toEqual([2]);
    expect(filterRows(rows, 'nested').map((row) => row[0])).toEqual([1]);
    expect(filterRows(rows, '   ')).toHaveLength(3);
    expect(filterRows(rows, 'missing')).toHaveLength(0);
  });

  it('sorts numbers numerically and nulls last in both directions', () => {
    expect(sortRows(rows, { column: 0, direction: 'asc' }).map((row) => row[0])).toEqual([1, 2, 3]);
    expect(sortRows(rows, { column: 0, direction: 'desc' }).map((row) => row[0])).toEqual([3, 2, 1]);

    const withNulls = [[null], [10], [2], [null]];
    expect(sortRows(withNulls, { column: 0, direction: 'asc' }).map((row) => row[0])).toEqual([
      2,
      10,
      null,
      null,
    ]);
    expect(sortRows(withNulls, { column: 0, direction: 'desc' }).map((row) => row[0])).toEqual([
      10,
      2,
      null,
      null,
    ]);
  });

  it('sorts numeric-looking text by value, not lexically', () => {
    const text = [['9'], ['10'], ['1']];
    expect(sortRows(text, { column: 0, direction: 'asc' }).map((row) => row[0])).toEqual([
      '1',
      '9',
      '10',
    ]);
  });

  it('keeps equal values stable', () => {
    const stableRows = [
      ['a', 1],
      ['a', 2],
      ['a', 3],
    ];
    expect(sortRows(stableRows, { column: 0, direction: 'desc' }).map((row) => row[1])).toEqual([
      1, 2, 3,
    ]);
  });

  it('combines filter and sort for previews and exports', () => {
    const prepared = prepareRows(rows, { term: 'a', sort: { column: 0, direction: 'asc' } });
    expect(prepared.map((row) => row[0])).toEqual([1, 2, 3]);
    expect(prepareRows(rows, { term: 'banana' }).map((row) => row[0])).toEqual([2]);
  });

  it('compares numbers, booleans, and text', () => {
    expect(compareCells(1, 2)).toBeLessThan(0);
    expect(compareCells(false, true)).toBeLessThan(0);
    expect(compareCells('a', 'b')).toBeLessThan(0);
    expect(compareCells(null, 1)).toBeGreaterThan(0);
  });

  it('builds tab-separated clipboard text', () => {
    const tsv = toTSV(['n', 'name', 'meta'], [[1, 'a\tb', null]]);
    expect(tsv).toBe('n\tname\tmeta\n1\ta b\t');
  });
});

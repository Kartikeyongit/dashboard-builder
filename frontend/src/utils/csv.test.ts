import { describe, expect, it } from 'vitest';
import { csvEscape, safeFilename, toCSV } from './csv';

describe('csvEscape', () => {
  it('leaves plain values alone', () => {
    expect(csvEscape('paid')).toBe('paid');
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape(false)).toBe('false');
  });

  it('quotes commas, quotes, and newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('treats null and undefined as empty cells', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('serializes objects as JSON', () => {
    expect(csvEscape({ a: 1 })).toBe('"{""a"":1}"');
  });
});

describe('toCSV', () => {
  it('builds a header and rows with CRLF endings', () => {
    const csv = toCSV({
      columns: ['status', 'total'],
      rows: [
        ['paid', 10],
        ['pending', 2.5],
      ],
    });
    expect(csv).toBe('status,total\r\npaid,10\r\npending,2.5');
  });

  it('escapes headers and cells', () => {
    const csv = toCSV({ columns: ['name, full'], rows: [['Ada "Lovelace"']] });
    expect(csv).toBe('"name, full"\r\n"Ada ""Lovelace"""');
  });

  it('returns an empty string without columns', () => {
    expect(toCSV(undefined)).toBe('');
    expect(toCSV({ columns: [], rows: [] })).toBe('');
  });
});

describe('safeFilename', () => {
  it('replaces characters that are invalid on common filesystems', () => {
    expect(safeFilename('Weekly / revenue: Q1?')).toBe('Weekly - revenue- Q1-');
  });

  it('falls back when the name is empty', () => {
    expect(safeFilename('   ', 'dashboard')).toBe('dashboard');
    expect(safeFilename('...', 'dashboard')).toBe('dashboard');
  });
});

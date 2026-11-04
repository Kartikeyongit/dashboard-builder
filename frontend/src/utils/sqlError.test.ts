import { describe, expect, it } from 'vitest';
import { lineFromPosition, parseSqlError } from './sqlError';

describe('sqlError', () => {
  it('strips driver prefixes and SQLSTATE codes', () => {
    const parsed = parseSqlError('pq: ERROR: relation "orders" does not exist (SQLSTATE 42P01)');
    expect(parsed.message).toBe('relation "orders" does not exist');
    expect(parsed.hint).toContain('Browse the schema');
  });

  it('explains syntax errors', () => {
    const parsed = parseSqlError('syntax error at or near "slect"');
    expect(parsed.hint).toContain('filter placeholders');
  });

  it('extracts a LINE number from PostgreSQL output', () => {
    const parsed = parseSqlError('syntax error at or near "from"\nLINE 3: from users');
    expect(parsed.line).toBe(3);
  });

  it('converts a character position into a line number', () => {
    const sql = 'select *\nfrom users\nwhere id = 1';
    expect(lineFromPosition(sql, 1)).toBe(1);
    expect(lineFromPosition(sql, 11)).toBe(2);
    expect(lineFromPosition(sql, sql.length)).toBe(3);
    expect(lineFromPosition(sql, 0)).toBeUndefined();
  });

  it('uses the SQL text when the driver reports a position', () => {
    const sql = 'select *\nfrom users\nwhere nope = 1';
    const parsed = parseSqlError('syntax error at position 24', sql);
    expect(parsed.line).toBe(3);
  });

  it('explains timeouts and connectivity problems', () => {
    expect(parseSqlError('canceling statement due to statement timeout').hint).toContain('timeout');
    expect(parseSqlError('connection refused').hint).toContain('unreachable');
  });

  it('handles an empty message', () => {
    expect(parseSqlError(undefined).message).toContain('failed without a message');
  });
});

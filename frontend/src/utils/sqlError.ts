/**
 * Turns raw database errors into something a person can act on. Postgres
 * prefixes driver errors with `pq:` / `ERROR:` and appends a SQLSTATE code,
 * which is noise in an editor toast.
 */

export interface FriendlySqlError {
  message: string;
  hint?: string;
  /** 1-based line number when the driver reports one. */
  line?: number;
}

/** Converts a byte/character offset from the driver into a line number. */
export function lineFromPosition(sql: string, position: number): number | undefined {
  if (!sql || !Number.isFinite(position) || position <= 0) return undefined;
  const index = Math.min(Math.floor(position) - 1, sql.length);
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (sql[i] === '\n') line += 1;
  }
  return line;
}

export function parseSqlError(raw: unknown, sql = ''): FriendlySqlError {
  const original = typeof raw === 'string' ? raw : '';
  const message = original
    .trim()
    .replace(/^pq:\s*/i, '')
    .replace(/^error:\s*/i, '')
    .replace(/\s*\(SQLSTATE [A-Z0-9]+\)\s*$/i, '')
    .trim();

  if (!message) {
    return { message: 'The query failed without a message. Try running it again.' };
  }

  const lower = message.toLowerCase();
  let hint: string | undefined;
  if (lower.includes('syntax error')) {
    hint =
      'Check the SQL near the reported token. Dashboard filter placeholders only substitute in View mode.';
  } else if (lower.includes('relation') && lower.includes('does not exist')) {
    hint = 'That table is not visible to this datasource. Browse the schema to check its name.';
  } else if (lower.includes('column') && lower.includes('does not exist')) {
    hint = 'Check the column name, or qualify it with a table alias.';
  } else if (lower.includes('permission denied')) {
    hint = 'The datasource user does not have access to this object.';
  } else if (
    lower.includes('statement timeout') ||
    lower.includes('context deadline exceeded') ||
    lower.includes('timeout')
  ) {
    hint = 'Increase the timeout, or narrow the query with a filter or LIMIT.';
  } else if (
    lower.includes('connection refused') ||
    lower.includes('too many clients') ||
    lower.includes('connect')
  ) {
    hint = 'The datasource is unreachable. Test the connection from the datasource page.';
  } else if (lower.includes('division by zero')) {
    hint = 'Guard the denominator with NULLIF(denominator, 0).';
  }

  let line: number | undefined;
  const lineMatch = message.match(/LINE\s+(\d+)\s*:/i);
  if (lineMatch) {
    line = Number(lineMatch[1]);
  } else {
    const positionMatch = message.match(/at position (\d+)/i) ?? message.match(/position:\s*(\d+)/i);
    if (positionMatch) line = lineFromPosition(sql, Number(positionMatch[1]));
  }

  return { message, hint, line };
}

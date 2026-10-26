package datasource

import (
	"fmt"
	"strings"
)

// Only read-only statement types are allowed. The database transaction is also
// opened read-only, so this is defense in depth rather than the only barrier.
var allowedLeadingKeywords = map[string]bool{
	"select":   true,
	"with":     true,
	"explain":  true,
	"show":     true,
	"describe": true,
	"desc":     true,
	"table":    true,
	"values":   true,
}

var dangerousKeywords = []string{
	"into outfile", "into dumpfile", "load_file", "load data",
	"pg_sleep(", "sleep(", "benchmark(", "dblink", "lo_import", "lo_export",
	"copy ", "\\copy",
}

// ValidateSQL normalizes a single read-only statement and rejects anything that
// is not safe to send to a datasource. It deliberately does not wrap the query:
// wrapping breaks CTEs, window functions, ORDER BY, and other valid SQL.
func ValidateSQL(sqlText string) (string, error) {
	normalized := strings.TrimSpace(sqlText)
	if normalized == "" {
		return "", fmt.Errorf("SQL text is required")
	}

	// Allow one trailing semicolon, but reject multiple statements.
	normalized = strings.TrimRight(normalized, " \t\r\n;")
	if normalized == "" {
		return "", fmt.Errorf("SQL text is required")
	}
	if hasStatementSeparator(normalized) {
		return "", fmt.Errorf("only a single SQL statement is allowed")
	}

	keyword := leadingKeyword(normalized)
	if keyword == "" || (!allowedLeadingKeywords[keyword] && !strings.HasPrefix(normalized, "(")) {
		return "", fmt.Errorf("only read-only SELECT/WITH/EXPLAIN/SHOW statements are allowed")
	}

	lower := strings.ToLower(normalized)
	for _, kw := range dangerousKeywords {
		if strings.Contains(lower, kw) {
			return "", fmt.Errorf("disallowed SQL construct detected: %s", strings.TrimSpace(kw))
		}
	}

	return normalized, nil
}

// leadingKeyword returns the first SQL keyword, skipping whitespace and comments.
func leadingKeyword(sql string) string {
	i := 0
	for i < len(sql) {
		// Skip whitespace.
		for i < len(sql) && (sql[i] == ' ' || sql[i] == '\t' || sql[i] == '\n' || sql[i] == '\r') {
			i++
		}
		if i >= len(sql) {
			return ""
		}
		// Skip line comments.
		if i+1 < len(sql) && sql[i] == '-' && sql[i+1] == '-' {
			for i < len(sql) && sql[i] != '\n' {
				i++
			}
			continue
		}
		// Skip block comments (including nested comments).
		if i+1 < len(sql) && sql[i] == '/' && sql[i+1] == '*' {
			depth := 1
			i += 2
			for i < len(sql) && depth > 0 {
				if i+1 < len(sql) && sql[i] == '/' && sql[i+1] == '*' {
					depth++
					i += 2
				} else if i+1 < len(sql) && sql[i] == '*' && sql[i+1] == '/' {
					depth--
					i += 2
				} else {
					i++
				}
			}
			continue
		}
		break
	}

	start := i
	for i < len(sql) {
		ch := sql[i]
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' {
			i++
			continue
		}
		break
	}
	if start == i {
		return ""
	}
	return strings.ToLower(sql[start:i])
}

// hasStatementSeparator reports whether a semicolon appears outside strings,
// quoted identifiers, and comments.
func hasStatementSeparator(sql string) bool {
	for i := 0; i < len(sql); i++ {
		switch sql[i] {
		case '\'', '"', '`':
			i = skipQuoted(sql, i, sql[i])
		case '-':
			if i+1 < len(sql) && sql[i+1] == '-' {
				for i < len(sql) && sql[i] != '\n' {
					i++
				}
			}
		case '/':
			if i+1 < len(sql) && sql[i+1] == '*' {
				depth := 1
				i += 2
				for i < len(sql) && depth > 0 {
					if i+1 < len(sql) && sql[i] == '/' && sql[i+1] == '*' {
						depth++
						i += 2
					} else if i+1 < len(sql) && sql[i] == '*' && sql[i+1] == '/' {
						depth--
						i += 2
					} else {
						i++
					}
				}
			}
		case '$':
			if end, ok := dollarQuotedEnd(sql, i); ok {
				i = end
			}
		case ';':
			return true
		}
	}
	return false
}

// skipQuoted returns the index of the closing quote. SQL escapes quotes by
// doubling them; MySQL also accepts a backslash escape, which we honor.
func skipQuoted(sql string, start int, quote byte) int {
	for i := start + 1; i < len(sql); i++ {
		if sql[i] == '\\' {
			i++
			continue
		}
		if sql[i] == quote {
			if i+1 < len(sql) && sql[i+1] == quote {
				i++
				continue
			}
			return i
		}
	}
	return len(sql) - 1
}

// dollarQuotedEnd handles PostgreSQL dollar-quoted strings such as $$...$$ or
// $tag$...$tag$. It returns false for positional parameters like $1.
func dollarQuotedEnd(sql string, start int) (int, bool) {
	if start >= len(sql) || sql[start] != '$' {
		return 0, false
	}
	i := start + 1
	tagStart := i
	for i < len(sql) {
		ch := sql[i]
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_' {
			i++
			continue
		}
		break
	}
	if i >= len(sql) || sql[i] != '$' {
		return 0, false
	}
	tag := sql[tagStart:i]
	if tag != "" {
		first := tag[0]
		if !((first >= 'a' && first <= 'z') || (first >= 'A' && first <= 'Z') || first == '_') {
			return 0, false
		}
	}
	delimiter := sql[start : i+1]
	bodyStart := i + 1
	closeAt := strings.Index(sql[bodyStart:], delimiter)
	if closeAt < 0 {
		return len(sql) - 1, true
	}
	return bodyStart + closeAt + len(delimiter) - 1, true
}

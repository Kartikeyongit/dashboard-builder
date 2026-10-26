package datasource

import (
	"fmt"
	"strings"
)

// SubstituteFilterParams replaces {{filter_id}} placeholders with bound
// parameters and returns the rewritten SQL plus the argument list.
//
// Values are never interpolated into the SQL string, so filter input cannot
// change the statement structure. Placeholders inside strings, quoted
// identifiers, and comments are left untouched.
//
// Postgres uses $1, $2, ... and reuses a position when the same filter appears
// more than once. MySQL uses ? and appends one argument per occurrence.
func SubstituteFilterParams(sqlText string, values map[string]interface{}, dialect string) (string, []interface{}, error) {
	var b strings.Builder
	b.Grow(len(sqlText))

	args := make([]interface{}, 0, len(values))
	positions := make(map[string]int)
	postgres := dialect == "postgres"

	for i := 0; i < len(sqlText); {
		switch sqlText[i] {
		case '\'', '"', '`':
			end := skipQuoted(sqlText, i, sqlText[i])
			if end < i {
				end = len(sqlText) - 1
			}
			b.WriteString(sqlText[i : end+1])
			i = end + 1
			continue
		case '-':
			if i+1 < len(sqlText) && sqlText[i+1] == '-' {
				end := strings.IndexByte(sqlText[i:], '\n')
				if end < 0 {
					b.WriteString(sqlText[i:])
					return b.String(), args, nil
				}
				end += i
				b.WriteString(sqlText[i : end+1])
				i = end + 1
				continue
			}
		case '/':
			if i+1 < len(sqlText) && sqlText[i+1] == '*' {
				end := findBlockCommentEnd(sqlText, i)
				b.WriteString(sqlText[i : end+1])
				i = end + 1
				continue
			}
		case '$':
			// Preserve PostgreSQL dollar-quoted strings such as $$...$$.
			if end, ok := dollarQuotedEnd(sqlText, i); ok {
				b.WriteString(sqlText[i : end+1])
				i = end + 1
				continue
			}
		}

		if sqlText[i] == '{' && i+1 < len(sqlText) && sqlText[i+1] == '{' {
			closeAt := strings.Index(sqlText[i+2:], "}}")
			if closeAt < 0 {
				return "", nil, fmt.Errorf("unterminated filter placeholder")
			}
			name := strings.TrimSpace(sqlText[i+2 : i+2+closeAt])
			if !isValidFilterName(name) {
				return "", nil, fmt.Errorf("invalid filter placeholder %q", name)
			}
			value, ok := values[name]
			if !ok {
				return "", nil, fmt.Errorf("no value provided for filter %q", name)
			}

			if postgres {
				if pos, seen := positions[name]; seen {
					b.WriteString(fmt.Sprintf("$%d", pos))
				} else {
					args = append(args, value)
					positions[name] = len(args)
					b.WriteString(fmt.Sprintf("$%d", len(args)))
				}
			} else {
				args = append(args, value)
				b.WriteString("?")
			}

			i += closeAt + 4 // "{{" + name + "}}"
			continue
		}

		b.WriteByte(sqlText[i])
		i++
	}

	return b.String(), args, nil
}

func isValidFilterName(name string) bool {
	if name == "" || len(name) > 64 {
		return false
	}
	for i := 0; i < len(name); i++ {
		ch := name[i]
		letter := (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
		digit := ch >= '0' && ch <= '9'
		if i == 0 {
			if !letter && ch != '_' {
				return false
			}
			continue
		}
		if !letter && !digit && ch != '_' {
			return false
		}
	}
	return true
}

func findBlockCommentEnd(sql string, start int) int {
	depth := 1
	i := start + 2
	for i < len(sql) && depth > 0 {
		if i+1 < len(sql) && sql[i] == '/' && sql[i+1] == '*' {
			depth++
			i += 2
			continue
		}
		if i+1 < len(sql) && sql[i] == '*' && sql[i+1] == '/' {
			depth--
			i += 2
			continue
		}
		i++
	}
	if i > len(sql) {
		return len(sql) - 1
	}
	return i - 1
}

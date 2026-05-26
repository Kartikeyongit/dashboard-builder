package datasource

import (
	"fmt"
	"strings"

	"github.com/xwb1989/sqlparser"
)

var dangerousKeywords = []string{
	"INTO OUTFILE", "INTO DUMPFILE", "LOAD_FILE", "SLEEP(", "BENCHMARK(",
	"EXECUTE", "EXEC ", "CALL ", "DO ", "HANDLER ",
}

func ValidateSQL(sqlText string, maxRows int) (string, error) {
	// Trim whitespace and trailing semicolon
	sqlText = strings.TrimSpace(strings.TrimRight(sqlText, ";"))

	// Check dangerous keywords
	lower := strings.ToLower(sqlText)
	for _, kw := range dangerousKeywords {
		if strings.Contains(lower, strings.ToLower(kw)) {
			return "", fmt.Errorf("dangerous keyword detected: %s", kw)
		}
	}

	// Try to parse – if it fails, still accept if it starts with SELECT (we'll wrap it)
	_, err := sqlparser.Parse(sqlText)
	if err != nil {
		// Fallback: if it doesn't start with SELECT, reject
		if !strings.HasPrefix(lower, "select") {
			return "", fmt.Errorf("only SELECT statements are allowed")
		}
		// We'll still wrap it, but log a warning
	}

	// Enforce row limit by wrapping in a subquery
	safeSQL := fmt.Sprintf("SELECT * FROM (%s) AS subquery LIMIT %d", sqlText, maxRows)
	return safeSQL, nil
}
package datasource

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

// QueryResult holds the structure of an executed query.
type QueryResult struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

// ExecuteQuery runs a user query against a datasource within a sandboxed context.
// args are bound parameters (never interpolated SQL).
func (pm *PoolManager) ExecuteQuery(ctx context.Context, ds *model.Datasource, sqlText string, maxRows, timeoutMs int, args ...interface{}) (*QueryResult, error) {
	safeSQL, err := ValidateSQL(sqlText)
	if err != nil {
		return nil, err
	}

	maxRows = clampMaxRows(maxRows)
	timeoutMs = clampTimeout(timeoutMs)

	execCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	pool, err := pm.GetPool(execCtx, ds)
	if err != nil {
		return nil, err
	}

	switch p := pool.(type) {
	case *pgxpool.Pool:
		return executeOnPostgres(execCtx, p, safeSQL, maxRows, timeoutMs, args...)
	case *sql.DB:
		return executeOnMySQL(execCtx, p, safeSQL, maxRows, args...)
	default:
		return nil, fmt.Errorf("unsupported datasource type")
	}
}

// clampMaxRows keeps a caller-supplied limit inside a safe range. The service
// layer also normalizes limits, but the executor must not trust its callers.
func clampMaxRows(maxRows int) int {
	if maxRows <= 0 {
		return 1000
	}
	if maxRows > 10000 {
		return 10000
	}
	return maxRows
}

func clampTimeout(timeoutMs int) int {
	if timeoutMs < 1000 {
		return 30000
	}
	if timeoutMs > 60000 {
		return 60000
	}
	return timeoutMs
}

func executeOnPostgres(ctx context.Context, pool *pgxpool.Pool, sqlText string, maxRows, timeoutMs int, args ...interface{}) (*QueryResult, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	// Rollback is a no-op after a successful commit, so this is safe either way.
	defer tx.Rollback(ctx)

	// Read-only plus a server-side timeout protects the target database even if
	// the client disappears or the Go context is not honoured promptly.
	if _, err := tx.Exec(ctx, "SET TRANSACTION READ ONLY"); err != nil {
		return nil, fmt.Errorf("set read-only transaction: %w", err)
	}
	if _, err := tx.Exec(ctx, fmt.Sprintf("SET LOCAL statement_timeout = %d", timeoutMs)); err != nil {
		return nil, fmt.Errorf("set statement timeout: %w", err)
	}

	rows, err := tx.Query(ctx, sqlText, args...)
	if err != nil {
		return nil, fmt.Errorf("query execution: %w", err)
	}
	defer rows.Close()

	fields := rows.FieldDescriptions()
	columns := make([]string, len(fields))
	for i, fd := range fields {
		columns[i] = string(fd.Name)
	}

	resultRows := make([][]interface{}, 0, minInt(maxRows, 256))
	for rows.Next() {
		if len(resultRows) >= maxRows {
			break
		}
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("row scan: %w", err)
		}
		row := make([]interface{}, len(values))
		for i, v := range values {
			row[i] = sanitizeValue(v)
		}
		resultRows = append(resultRows, row)
	}
	// Close before committing: an unread result set keeps the connection busy
	// and makes COMMIT fail (especially on MySQL).
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &QueryResult{Columns: columns, Rows: resultRows}, nil
}

func executeOnMySQL(ctx context.Context, db *sql.DB, sqlText string, maxRows int, args ...interface{}) (*QueryResult, error) {
	// ReadOnly makes the server reject writes. There is deliberately no
	// non-read-only fallback: failing closed is the whole point.
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin read-only transaction: %w", err)
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, sqlText, args...)
	if err != nil {
		return nil, fmt.Errorf("query execution: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	resultRows := make([][]interface{}, 0, minInt(maxRows, 256))
	for rows.Next() {
		if len(resultRows) >= maxRows {
			break
		}
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}
		row := make([]interface{}, len(columns))
		for i, v := range values {
			row[i] = sanitizeValue(v)
		}
		resultRows = append(resultRows, row)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &QueryResult{Columns: columns, Rows: resultRows}, nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func sanitizeValue(v interface{}) interface{} {
	// Convert byte slices to string for JSON
	switch val := v.(type) {
	case []byte:
		return string(val)
	case time.Time:
		return val.Format(time.RFC3339)
	default:
		return v
	}
}

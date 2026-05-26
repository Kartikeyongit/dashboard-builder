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
func (pm *PoolManager) ExecuteQuery(ctx context.Context, ds *model.Datasource, sqlText string, maxRows, timeoutMs int) (*QueryResult, error) {
	// Validate and enforce row limit
	safeSQL, err := ValidateSQL(sqlText, maxRows)
	if err != nil {
		return nil, err
	}

	// Apply timeout
	execCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	pool, err := pm.GetPool(execCtx, ds)
	if err != nil {
		return nil, err
	}

	switch p := pool.(type) {
	case *pgxpool.Pool:
		return executeOnPostgres(execCtx, p, safeSQL)
	case *sql.DB:
		return executeOnMySQL(execCtx, p, safeSQL)
	default:
		return nil, fmt.Errorf("unsupported datasource type")
	}
}

func executeOnPostgres(ctx context.Context, pool *pgxpool.Pool, sql string) (*QueryResult, error) {
	// Use a read-only transaction
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Set transaction to READ ONLY
	_, err = tx.Exec(ctx, "SET TRANSACTION READ ONLY")
	if err != nil {
		return nil, err
	}

	rows, err := tx.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("query execution: %w", err)
	}
	defer rows.Close()

	// Read column descriptions
	fields := rows.FieldDescriptions()
	columns := make([]string, len(fields))
	for i, fd := range fields {
		columns[i] = string(fd.Name)
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("row scan: %w", err)
		}
		// Convert values to JSON-friendly types
		row := make([]interface{}, len(values))
		for i, v := range values {
			row[i] = sanitizeValue(v)
		}
		resultRows = append(resultRows, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Commit the read-only transaction (just to release locks, not necessary but clean)
	tx.Commit(ctx)
	return &QueryResult{Columns: columns, Rows: resultRows}, nil
}

func executeOnMySQL(ctx context.Context, db *sql.DB, sqlText string) (*QueryResult, error) {
	// Try a read‑only transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		// Fallback to simple query
		return executeMySQLSimple(ctx, db, sqlText)
	}

	_, err = tx.ExecContext(ctx, "SET TRANSACTION READ ONLY")
	if err != nil {
		tx.Rollback()
		return executeMySQLSimple(ctx, db, sqlText)
	}

	rows, err := tx.QueryContext(ctx, sqlText)
	if err != nil {
		tx.Rollback()
		return executeMySQLSimple(ctx, db, sqlText)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			tx.Rollback()
			return nil, err
		}
		row := make([]interface{}, len(columns))
		for i, v := range values {
			row[i] = sanitizeValue(v)
		}
		resultRows = append(resultRows, row)
	}
	if err := rows.Err(); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit the read‑only transaction (releases resources)
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &QueryResult{Columns: columns, Rows: resultRows}, nil
}

// Fallback when MySQL doesn't support transactions or the driver is limited
func executeMySQLSimple(ctx context.Context, db *sql.DB, sqlText string) (*QueryResult, error) {
	rows, err := db.QueryContext(ctx, sqlText)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	resultRows := make([][]interface{}, 0)
	for rows.Next() {
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
	return &QueryResult{Columns: columns, Rows: resultRows}, rows.Err()
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
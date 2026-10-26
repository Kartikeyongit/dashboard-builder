//go:build integration

package datasource

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Run with:
//
//	TEST_DB_URL=postgres://... go test -tags=integration ./internal/datasource -run TestSubstituteFilterParamsIntegration -v
func TestSubstituteFilterParamsIntegration(t *testing.T) {
	url := os.Getenv("TEST_DB_URL")
	if url == "" {
		t.Skip("TEST_DB_URL is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	sqlText := `SELECT COUNT(*) FROM (
		SELECT generate_series('2026-01-01'::date, '2026-01-05'::date, '1 day') AS day
	) s WHERE s.day >= {{start_date}} AND s.day < {{end_date}}`

	rewritten, args, err := SubstituteFilterParams(sqlText, map[string]interface{}{
		"start_date": "2026-01-02",
		"end_date":   "2026-01-04",
	}, "postgres")
	if err != nil {
		t.Fatalf("substitute: %v", err)
	}
	if len(args) != 2 {
		t.Fatalf("args = %#v", args)
	}

	var count int
	if err := pool.QueryRow(ctx, rewritten, args...).Scan(&count); err != nil {
		t.Fatalf("query: %v", err)
	}
	if count != 2 {
		t.Fatalf("count = %d, want 2", count)
	}
}

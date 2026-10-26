package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
)

type fakeQueryExecutor struct {
	mu        sync.Mutex
	calls     map[string]int
	active    int
	maxActive int
	delay     time.Duration
	errors    map[string]error
}

func newFakeQueryExecutor() *fakeQueryExecutor {
	return &fakeQueryExecutor{
		calls:  make(map[string]int),
		errors: make(map[string]error),
	}
}

func (f *fakeQueryExecutor) ExecuteSavedQueryWithParams(ctx context.Context, id, orgID string, values map[string]interface{}) (*datasource.QueryResult, error) {
	f.mu.Lock()
	f.calls[id]++
	f.active++
	if f.active > f.maxActive {
		f.maxActive = f.active
	}
	delay := f.delay
	execErr := f.errors[id]
	f.mu.Unlock()

	defer func() {
		f.mu.Lock()
		f.active--
		f.mu.Unlock()
	}()

	if delay > 0 {
		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	if execErr != nil {
		return nil, execErr
	}
	return &datasource.QueryResult{
		Columns: []string{"query"},
		Rows:    [][]interface{}{{id}},
	}, nil
}

func (f *fakeQueryExecutor) callCount(id string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls[id]
}

func (f *fakeQueryExecutor) peakConcurrency() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.maxActive
}

func TestExecuteUniqueQueriesDeduplicates(t *testing.T) {
	exec := newFakeQueryExecutor()

	outcomes := executeUniqueQueries(
		context.Background(),
		exec,
		"org-1",
		[]string{"query-a", "query-a", "query-b", "query-a"},
		nil,
		4,
	)

	if len(outcomes) != 2 {
		t.Fatalf("got %d outcomes, want 2 unique queries", len(outcomes))
	}
	if got := exec.callCount("query-a"); got != 1 {
		t.Fatalf("query-a executed %d times, want 1", got)
	}
	if got := exec.callCount("query-b"); got != 1 {
		t.Fatalf("query-b executed %d times, want 1", got)
	}
}

func TestExecuteUniqueQueriesRunsInParallelWithBound(t *testing.T) {
	exec := newFakeQueryExecutor()
	exec.delay = 40 * time.Millisecond

	ids := []string{"q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"}
	start := time.Now()
	outcomes := executeUniqueQueries(context.Background(), exec, "org-1", ids, nil, 3)
	elapsed := time.Since(start)

	if len(outcomes) != len(ids) {
		t.Fatalf("got %d outcomes, want %d", len(outcomes), len(ids))
	}
	if peak := exec.peakConcurrency(); peak > 3 {
		t.Fatalf("peak concurrency = %d, want <= 3", peak)
	} else if peak < 2 {
		t.Fatalf("peak concurrency = %d, expected parallel execution", peak)
	}
	// 8 queries at 40ms each, three at a time, is ~120ms. Sequential would be
	// ~320ms. Leave generous headroom for slow CI machines.
	if elapsed > 280*time.Millisecond {
		t.Fatalf("queries took %v; expected parallel execution", elapsed)
	}
}

func TestExecuteUniqueQueriesIsolatesErrors(t *testing.T) {
	exec := newFakeQueryExecutor()
	exec.errors["bad"] = errors.New("query failed")

	outcomes := executeUniqueQueries(
		context.Background(),
		exec,
		"org-1",
		[]string{"good", "bad"},
		nil,
		2,
	)

	if outcomes["bad"].err == nil {
		t.Fatal("expected the failing query to report an error")
	}
	if outcomes["good"].err != nil {
		t.Fatalf("healthy query failed: %v", outcomes["good"].err)
	}
	if outcomes["good"].result == nil {
		t.Fatal("healthy query did not return a result")
	}
}

func TestExecuteUniqueQueriesEmptyList(t *testing.T) {
	outcomes := executeUniqueQueries(context.Background(), newFakeQueryExecutor(), "org-1", nil, nil, 4)
	if len(outcomes) != 0 {
		t.Fatalf("got %d outcomes, want 0", len(outcomes))
	}
}

package service

import (
	"testing"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
)

func testResult(rows int) *datasource.QueryResult {
	result := &datasource.QueryResult{Columns: []string{"value"}}
	for i := 0; i < rows; i++ {
		result.Rows = append(result.Rows, []interface{}{i})
	}
	return result
}

func TestResultCacheGetSet(t *testing.T) {
	cache := NewResultCache(time.Minute)
	result := testResult(1)

	cache.Set("key", "query-1", "datasource-1", result)

	got, ok := cache.Get("key")
	if !ok {
		t.Fatal("expected a cache hit")
	}
	if got != result {
		t.Fatal("expected the cached result")
	}
	if cache.Len() != 1 {
		t.Fatalf("len = %d, want 1", cache.Len())
	}
}

func TestResultCacheExpiry(t *testing.T) {
	cache := NewResultCache(time.Minute)
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	cache.now = func() time.Time { return now }

	cache.Set("key", "query-1", "datasource-1", testResult(1))
	now = now.Add(time.Minute)

	if _, ok := cache.Get("key"); ok {
		t.Fatal("expected an expired entry to miss")
	}
	if cache.Len() != 0 {
		t.Fatalf("len = %d, want 0 after expiry", cache.Len())
	}
}

func TestResultCacheInvalidation(t *testing.T) {
	cache := NewResultCache(time.Minute)
	cache.Set("q1-ds1", "query-1", "datasource-1", testResult(1))
	cache.Set("q1-ds2", "query-1", "datasource-2", testResult(1))
	cache.Set("q2-ds1", "query-2", "datasource-1", testResult(1))

	cache.InvalidateQuery("query-1")
	if cache.Len() != 1 {
		t.Fatalf("len = %d, want 1 after query invalidation", cache.Len())
	}
	if _, ok := cache.Get("q2-ds1"); !ok {
		t.Fatal("unrelated query entry was evicted")
	}

	cache.Set("q1-ds1", "query-1", "datasource-1", testResult(1))
	cache.Set("q1-ds2", "query-1", "datasource-2", testResult(1))
	cache.InvalidateDatasource("datasource-1")
	if cache.Len() != 1 {
		t.Fatalf("len = %d, want 1 after datasource invalidation", cache.Len())
	}
	if _, ok := cache.Get("q1-ds2"); !ok {
		t.Fatal("entry from another datasource was evicted")
	}
}

func TestResultCacheDisabled(t *testing.T) {
	cache := NewResultCache(0)
	cache.Set("key", "query-1", "datasource-1", testResult(1))

	if _, ok := cache.Get("key"); ok {
		t.Fatal("a disabled cache must always miss")
	}
}

func TestResultCacheSkipsLargeResults(t *testing.T) {
	cache := NewResultCache(time.Minute)
	cache.maxRows = 2

	cache.Set("key", "query-1", "datasource-1", testResult(3))
	if cache.Len() != 0 {
		t.Fatalf("len = %d, want 0 for an oversized result", cache.Len())
	}
}

func TestResultCacheEvictsWhenFull(t *testing.T) {
	cache := NewResultCache(time.Minute)
	cache.maxEntries = 2

	cache.Set("a", "query-a", "datasource-1", testResult(1))
	cache.Set("b", "query-b", "datasource-1", testResult(1))
	cache.Set("c", "query-c", "datasource-1", testResult(1))

	if cache.Len() != 2 {
		t.Fatalf("len = %d, want 2 after eviction", cache.Len())
	}
}

func TestResultCacheKeyIsDeterministic(t *testing.T) {
	first, ok := resultCacheKey("org", "query", map[string]interface{}{
		"country": "US",
		"year":    float64(2026),
	})
	if !ok {
		t.Fatal("expected a cacheable key")
	}

	second, ok := resultCacheKey("org", "query", map[string]interface{}{
		"year":    float64(2026),
		"country": "US",
	})
	if !ok {
		t.Fatal("expected a cacheable key")
	}
	if first != second {
		t.Fatal("map iteration order changed the cache key")
	}

	different, ok := resultCacheKey("org", "query", map[string]interface{}{"country": "UK"})
	if !ok {
		t.Fatal("expected a cacheable key")
	}
	if first == different {
		t.Fatal("different filter values produced the same cache key")
	}
}

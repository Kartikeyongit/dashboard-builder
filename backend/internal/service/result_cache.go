package service

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
)

const (
	defaultResultCacheEntries = 128
	defaultResultCacheMaxRows = 2000
)

type resultCacheEntry struct {
	result       *datasource.QueryResult
	queryID      string
	datasourceID string
	expiresAt    time.Time
}

// ResultCache stores successful saved-query results for a short time. It is
// intentionally in-process: the free single-instance deployment needs no
// Redis, and a miss simply re-runs the query. Entries are invalidated when
// their query or datasource is edited or deleted.
type ResultCache struct {
	mu         sync.Mutex
	entries    map[string]resultCacheEntry
	ttl        time.Duration
	maxEntries int
	maxRows    int
	now        func() time.Time
}

func NewResultCache(ttl time.Duration) *ResultCache {
	return &ResultCache{
		entries:    make(map[string]resultCacheEntry),
		ttl:        ttl,
		maxEntries: defaultResultCacheEntries,
		maxRows:    defaultResultCacheMaxRows,
		now:        time.Now,
	}
}

// Get returns a cached result. Expired entries are removed on access.
func (c *ResultCache) Get(key string) (*datasource.QueryResult, bool) {
	if c == nil || c.ttl <= 0 || key == "" {
		return nil, false
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	entry, ok := c.entries[key]
	if !ok {
		return nil, false
	}
	if !c.now().Before(entry.expiresAt) {
		delete(c.entries, key)
		return nil, false
	}
	return entry.result, true
}

// Set stores a successful result. Very large results are skipped so a few
// wide queries cannot grow the cache without bound.
func (c *ResultCache) Set(key, queryID, datasourceID string, result *datasource.QueryResult) {
	if c == nil || c.ttl <= 0 || key == "" || result == nil {
		return
	}
	if c.maxRows > 0 && len(result.Rows) > c.maxRows {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if len(c.entries) >= c.maxEntries {
		c.evictLocked()
	}
	c.entries[key] = resultCacheEntry{
		result:       result,
		queryID:      queryID,
		datasourceID: datasourceID,
		expiresAt:    c.now().Add(c.ttl),
	}
}

// InvalidateQuery drops every cached result produced by a saved query.
func (c *ResultCache) InvalidateQuery(queryID string) {
	if c == nil || queryID == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, entry := range c.entries {
		if entry.queryID == queryID {
			delete(c.entries, key)
		}
	}
}

// InvalidateDatasource drops every cached result that used a datasource.
func (c *ResultCache) InvalidateDatasource(datasourceID string) {
	if c == nil || datasourceID == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, entry := range c.entries {
		if entry.datasourceID == datasourceID {
			delete(c.entries, key)
		}
	}
}

// Len reports the number of live entries. It is used by tests.
func (c *ResultCache) Len() int {
	if c == nil {
		return 0
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.entries)
}

// evictLocked removes expired entries first, then the entry closest to expiry.
// Callers must hold c.mu.
func (c *ResultCache) evictLocked() {
	now := c.now()
	for key, entry := range c.entries {
		if !now.Before(entry.expiresAt) {
			delete(c.entries, key)
		}
	}
	if len(c.entries) < c.maxEntries {
		return
	}

	var oldestKey string
	var oldest time.Time
	for key, entry := range c.entries {
		if oldestKey == "" || entry.expiresAt.Before(oldest) {
			oldestKey, oldest = key, entry.expiresAt
		}
	}
	if oldestKey != "" {
		delete(c.entries, oldestKey)
	}
}

// resultCacheKey is deterministic for the same filter values. encoding/json
// sorts map keys, so map iteration order cannot produce different keys.
func resultCacheKey(orgID, queryID string, values map[string]interface{}) (string, bool) {
	encoded, err := json.Marshal(values)
	if err != nil {
		return "", false
	}
	return orgID + "\x00" + queryID + "\x00" + string(encoded), true
}

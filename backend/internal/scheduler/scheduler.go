package scheduler

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/internal/service"
	"github.com/your-org/dashboard-builder/backend/internal/ws"
)

type Scheduler struct {
	queryService   *service.QueryService
	widgetRepo     *repository.WidgetRepo
	dashboardRepo  *repository.DashboardRepo
	poolManager    *datasource.PoolManager
	hub            *ws.Hub
	interval       time.Duration
	widgetLastRun  map[string]time.Time
	widgetInFlight map[string]bool
	mu             sync.Mutex
}

func NewScheduler(queryService *service.QueryService, widgetRepo *repository.WidgetRepo, dashboardRepo *repository.DashboardRepo, poolManager *datasource.PoolManager, hub *ws.Hub) *Scheduler {
	return &Scheduler{
		queryService:   queryService,
		widgetRepo:     widgetRepo,
		dashboardRepo:  dashboardRepo,
		poolManager:    poolManager,
		hub:            hub,
		interval:       5 * time.Second,
		widgetLastRun:  make(map[string]time.Time),
		widgetInFlight: make(map[string]bool),
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				s.tick(ctx)
			}
		}
	}()
}

func (s *Scheduler) tick(ctx context.Context) {
	dashboards, err := s.dashboardRepo.GetAllWithRefresh()
	if err != nil {
		log.Printf("Scheduler: error fetching dashboards: %v", err)
		return
	}
	for _, dash := range dashboards {
		// Do not run queries for dashboards nobody is watching. When a client
		// connects, the initial HTTP load already returns fresh data.
		if s.hub != nil && !s.hub.HasSubscribers(dash.ID) {
			continue
		}

		widgets, err := s.widgetRepo.ListByDashboard(dash.ID)
		if err != nil {
			log.Printf("Scheduler: error listing widgets for dashboard %s: %v", dash.ID, err)
			continue
		}

		for _, widget := range widgets {
			every := effectiveWidgetInterval(widget.RefreshIntervalOverride, dash.RefreshIntervalSec)
			if every <= 0 {
				continue
			}

			s.mu.Lock()
			lastRun, exists := s.widgetLastRun[widget.ID]
			busy := s.widgetInFlight[widget.ID]
			if busy || (exists && time.Since(lastRun) < every) {
				s.mu.Unlock()
				continue
			}
			// Mark before spawning so overlapping ticks cannot start duplicate work.
			s.widgetLastRun[widget.ID] = time.Now()
			s.widgetInFlight[widget.ID] = true
			s.mu.Unlock()

			go s.runWidgetQuery(ctx, dash, widget, every)
		}
	}
}

// effectiveWidgetInterval resolves the per-widget override against the dashboard
// default. nil inherits; 0 means the widget never refreshes.
func effectiveWidgetInterval(override *int, dashboardSeconds int) time.Duration {
	seconds := dashboardSeconds
	if override != nil {
		seconds = *override
	}
	if seconds <= 0 {
		return 0
	}
	return time.Duration(seconds) * time.Second
}

func (s *Scheduler) runWidgetQuery(ctx context.Context, dash *model.Dashboard, widget *model.Widget, every time.Duration) {
	defer func() {
		s.mu.Lock()
		delete(s.widgetInFlight, widget.ID)
		s.mu.Unlock()
	}()

	// Small jitter prevents every widget from hitting the database at once.
	select {
	case <-time.After(time.Duration(rand.Intn(750)) * time.Millisecond):
	case <-ctx.Done():
		return
	}

	// With Redis configured, one worker per widget across all instances.
	// Without it, the in-process inFlight guard above is the lock. The TTL is
	// crash safety only; the lock is released as soon as the query finishes.
	if db.RedisEnabled() {
		lockKey := "scheduler:lock:" + widget.ID
		lockTTL := every
		if lockTTL < 30*time.Second {
			lockTTL = 30 * time.Second
		}
		locked, lockErr := db.RedisClient.SetNX(ctx, lockKey, "1", lockTTL).Result()
		if lockErr != nil {
			log.Printf("Scheduler: lock error for widget %s: %v", widget.ID, lockErr)
		} else if !locked {
			return
		}
		if lockErr == nil && locked {
			defer db.RedisClient.Del(context.Background(), lockKey)
		}
	}

	filterValues := dash.ResolveFilterValues(nil)
	result, err := s.queryService.ExecuteSavedQueryWithParams(ctx, widget.QueryID, dash.OrgID, filterValues)

	update := WidgetPayload{
		Type:     "widget_data",
		WidgetID: widget.ID,
	}
	if err != nil {
		update.Error = err.Error()
	} else {
		update.Data = result
	}

	if db.RedisEnabled() {
		payload, _ := json.Marshal(update)
		if err := db.RedisClient.Publish(ctx, "dashboard:"+dash.ID, payload).Err(); err != nil {
			log.Printf("Scheduler: publish error for dashboard %s: %v", dash.ID, err)
		}
		return
	}

	// Single-instance mode: deliver straight to connected clients.
	if s.hub != nil {
		s.hub.BroadcastToDashboard(dash.ID, update)
	}
}

// Duplicate of ws.WidgetUpdate; to avoid circular import, define locally
type WidgetPayload struct {
	Type     string                  `json:"type"`
	WidgetID string                  `json:"widget_id"`
	Data     *datasource.QueryResult `json:"data,omitempty"`
	Error    string                  `json:"error,omitempty"`
}

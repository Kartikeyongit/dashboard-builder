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
	queryService  *service.QueryService
	widgetRepo    *repository.WidgetRepo
	dashboardRepo *repository.DashboardRepo
	poolManager   *datasource.PoolManager
	hub           *ws.Hub
	interval      time.Duration
	runningJobs   map[string]time.Time
	mu            sync.Mutex
}

func NewScheduler(queryService *service.QueryService, widgetRepo *repository.WidgetRepo, dashboardRepo *repository.DashboardRepo, poolManager *datasource.PoolManager, hub *ws.Hub) *Scheduler {
	return &Scheduler{
		queryService:  queryService,
		widgetRepo:    widgetRepo,
		dashboardRepo: dashboardRepo,
		poolManager:   poolManager,
		hub:           hub,
		interval:      5 * time.Second,
		runningJobs:   make(map[string]time.Time),
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

		s.mu.Lock()
		lastRun, exists := s.runningJobs[dash.ID]
		s.mu.Unlock()
		if exists && time.Since(lastRun) < time.Duration(dash.RefreshIntervalSec)*time.Second {
			continue
		}

		go s.runDashboardQueries(ctx, dash)
	}
}

func (s *Scheduler) runDashboardQueries(ctx context.Context, dash *model.Dashboard) {
	// Small jitter prevents every dashboard from hitting the database at once.
	if dash.RefreshIntervalSec > 1 {
		select {
		case <-time.After(time.Duration(rand.Intn(1500)) * time.Millisecond):
		case <-ctx.Done():
			return
		}
	}

	// One worker per dashboard across all instances. If Redis is unavailable,
	// fall back to the in-process guard below.
	lockKey := "scheduler:lock:" + dash.ID
	lockTTL := time.Duration(dash.RefreshIntervalSec+60) * time.Second
	locked, lockErr := db.RedisClient.SetNX(ctx, lockKey, "1", lockTTL).Result()
	if lockErr != nil {
		log.Printf("Scheduler: lock error for dashboard %s: %v", dash.ID, lockErr)
	} else if !locked {
		return
	}
	if lockErr == nil && locked {
		defer db.RedisClient.Del(context.Background(), lockKey)
	}

	s.mu.Lock()
	s.runningJobs[dash.ID] = time.Now()
	s.mu.Unlock()

	widgets, err := s.widgetRepo.ListByDashboard(dash.ID)
	if err != nil {
		log.Printf("Scheduler: error listing widgets for dashboard %s: %v", dash.ID, err)
		return
	}

	for _, widget := range widgets {
		result, err := s.queryService.ExecuteSavedQuery(ctx, widget.QueryID, dash.OrgID)
		update := WidgetPayload{
			WidgetID: widget.ID,
		}
		if err != nil {
			update.Error = err.Error()
		} else {
			update.Data = result
		}
		update.Type = "widget_data"
		payload, _ := json.Marshal(update)
		if err := db.RedisClient.Publish(ctx, "dashboard:"+dash.ID, payload).Err(); err != nil {
			log.Printf("Scheduler: publish error for dashboard %s: %v", dash.ID, err)
		}
	}
}

// Duplicate of ws.WidgetUpdate; to avoid circular import, define locally
type WidgetPayload struct {
	Type     string                  `json:"type"`
	WidgetID string                  `json:"widget_id"`
	Data     *datasource.QueryResult `json:"data,omitempty"`
	Error    string                  `json:"error,omitempty"`
}

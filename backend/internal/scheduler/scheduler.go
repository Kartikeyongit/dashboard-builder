package scheduler

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type Scheduler struct {
	queryService  *service.QueryService
	widgetRepo    *repository.WidgetRepo
	dashboardRepo *repository.DashboardRepo
	poolManager   *datasource.PoolManager
	interval      time.Duration
	runningJobs   map[string]time.Time
	mu            sync.Mutex
}

func NewScheduler(queryService *service.QueryService, widgetRepo *repository.WidgetRepo, dashboardRepo *repository.DashboardRepo, poolManager *datasource.PoolManager) *Scheduler {
	return &Scheduler{
		queryService:  queryService,
		widgetRepo:    widgetRepo,
		dashboardRepo: dashboardRepo,
		poolManager:   poolManager,
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
				return
			case <-ticker.C:
				s.tick()
			}
		}
	}()
}

func (s *Scheduler) tick() {
	dashboards, err := s.dashboardRepo.GetAllWithRefresh()
	if err != nil {
		log.Printf("Scheduler: error fetching dashboards: %v", err)
		return
	}
	for _, dash := range dashboards {
		s.mu.Lock()
		lastRun, exists := s.runningJobs[dash.ID]
		s.mu.Unlock()
		if exists && time.Since(lastRun) < time.Duration(dash.RefreshIntervalSec)*time.Second {
			continue
		}
		go s.runDashboardQueries(dash)
	}
}

func (s *Scheduler) runDashboardQueries(dash *model.Dashboard) {
	s.mu.Lock()
	s.runningJobs[dash.ID] = time.Now()
	s.mu.Unlock()

	widgets, err := s.widgetRepo.ListByDashboard(dash.ID)
	if err != nil {
		log.Printf("Scheduler: error listing widgets for dashboard %s: %v", dash.ID, err)
		return
	}

	for _, widget := range widgets {
		result, err := s.queryService.ExecuteSavedQuery(context.Background(), widget.QueryID, dash.OrgID)
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
		db.RedisClient.Publish(context.Background(), "dashboard:"+dash.ID, payload)
	}
}

// Duplicate of ws.WidgetUpdate; to avoid circular import, define locally
type WidgetPayload struct {
	Type     string                 `json:"type"`
	WidgetID string                 `json:"widget_id"`
	Data     *datasource.QueryResult `json:"data,omitempty"`
	Error    string                 `json:"error,omitempty"`
}
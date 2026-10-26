package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

// Package‑level types – defined only once here.
type WidgetData struct {
	Widget *model.Widget           `json:"widget"`
	Data   *datasource.QueryResult `json:"data,omitempty"`
	Error  string                  `json:"error,omitempty"`
}

type DashboardFull struct {
	Dashboard *model.Dashboard `json:"dashboard"`
	Widgets   []WidgetData     `json:"widgets"`
}

type WidgetService struct {
	widgetRepo       *repository.WidgetRepo
	dashboardRepo    *repository.DashboardRepo
	queryService     *QueryService
	queryConcurrency int
}

func NewWidgetService(
	widgetRepo *repository.WidgetRepo,
	dashboardRepo *repository.DashboardRepo,
	queryService *QueryService,
	queryConcurrency int,
) *WidgetService {
	if queryConcurrency < 1 {
		queryConcurrency = 1
	}
	if queryConcurrency > 16 {
		queryConcurrency = 16
	}
	return &WidgetService{
		widgetRepo:       widgetRepo,
		dashboardRepo:    dashboardRepo,
		queryService:     queryService,
		queryConcurrency: queryConcurrency,
	}
}

func (s *WidgetService) Create(orgID, dashboardID, queryID, widgetType string, config json.RawMessage, x, y, w, h int) (*model.Widget, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil {
		return nil, err
	}
	if dash == nil {
		return nil, fmt.Errorf("dashboard not found")
	}
	query, err := s.queryService.GetByID(queryID, orgID)
	if err != nil {
		return nil, err
	}
	if query == nil {
		return nil, fmt.Errorf("query not found")
	}

	widget := &model.Widget{
		DashboardID: dashboardID,
		QueryID:     queryID,
		WidgetType:  widgetType,
		Config:      config,
		PositionX:   x,
		PositionY:   y,
		Width:       w,
		Height:      h,
	}
	return s.widgetRepo.Create(widget)
}

func (s *WidgetService) GetByIDForOrg(id, orgID string) (*model.Widget, error) {
	return s.widgetRepo.GetByIDForOrg(id, orgID)
}

// Update verifies that the widget belongs to the dashboard and org before
// writing. It also rejects a query that belongs to another organization.
func (s *WidgetService) Update(orgID, dashboardID string, widget *model.Widget) error {
	existing, err := s.widgetRepo.GetByIDForOrg(widget.ID, orgID)
	if err != nil {
		return err
	}
	if existing == nil || existing.DashboardID != dashboardID {
		return fmt.Errorf("widget not found")
	}
	if widget.QueryID != existing.QueryID {
		query, err := s.queryService.GetByID(widget.QueryID, orgID)
		if err != nil {
			return err
		}
		if query == nil {
			return fmt.Errorf("query not found")
		}
	}
	// The dashboard must not be changed through a widget update.
	widget.DashboardID = existing.DashboardID
	return s.widgetRepo.Update(widget)
}

func (s *WidgetService) Delete(orgID, dashboardID, id string) error {
	return s.widgetRepo.DeleteForOrg(id, dashboardID, orgID)
}

// savedQueryExecutor is the part of QueryService that dashboard loading needs.
// Keeping it as an interface makes the parallel execution logic testable.
type savedQueryExecutor interface {
	ExecuteSavedQueryWithParams(ctx context.Context, id, orgID string, values map[string]interface{}) (*datasource.QueryResult, error)
}

type queryOutcome struct {
	result *datasource.QueryResult
	err    error
}

// executeUniqueQueries runs each distinct query once, with bounded
// concurrency. Widgets that share a saved query share its result, so a
// dashboard pays for the slowest distinct query instead of the sum of every
// widget. Individual query failures are reported per query and never abort the
// rest of the dashboard.
func executeUniqueQueries(
	ctx context.Context,
	exec savedQueryExecutor,
	orgID string,
	queryIDs []string,
	values map[string]interface{},
	concurrency int,
) map[string]queryOutcome {
	outcomes := make(map[string]queryOutcome, len(queryIDs))
	if len(queryIDs) == 0 {
		return outcomes
	}

	unique := make([]string, 0, len(queryIDs))
	seen := make(map[string]struct{}, len(queryIDs))
	for _, id := range queryIDs {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}

	if concurrency < 1 {
		concurrency = 1
	}
	if concurrency > len(unique) {
		concurrency = len(unique)
	}

	results := make([]queryOutcome, len(unique))
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for i, id := range unique {
		wg.Add(1)
		go func(i int, id string) {
			defer wg.Done()

			select {
			case sem <- struct{}{}:
				defer func() { <-sem }()
			case <-ctx.Done():
				results[i].err = ctx.Err()
				return
			}

			result, err := exec.ExecuteSavedQueryWithParams(ctx, id, orgID, values)
			results[i] = queryOutcome{result: result, err: err}
		}(i, id)
	}

	wg.Wait()
	for i, id := range unique {
		outcomes[id] = results[i]
	}
	return outcomes
}

// LoadDashboardWithData loads a dashboard and executes every widget query.
// overrides supplies filter values from the request; filters without an
// override fall back to their configured default.
func (s *WidgetService) LoadDashboardWithData(ctx context.Context, orgID, dashboardID string, overrides map[string]string) (*DashboardFull, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return nil, err
	}

	widgetList, err := s.widgetRepo.ListByDashboard(dashboardID)
	if err != nil {
		return nil, err
	}

	filterValues := dash.ResolveFilterValues(overrides)

	queryIDs := make([]string, 0, len(widgetList))
	for _, w := range widgetList {
		queryIDs = append(queryIDs, w.QueryID)
	}
	outcomes := executeUniqueQueries(ctx, s.queryService, orgID, queryIDs, filterValues, s.queryConcurrency)

	widgetDataList := make([]WidgetData, 0, len(widgetList))
	for _, w := range widgetList {
		wd := WidgetData{Widget: w}
		if outcome, ok := outcomes[w.QueryID]; ok {
			if outcome.err != nil {
				wd.Error = outcome.err.Error()
			} else {
				wd.Data = outcome.result
			}
		}
		widgetDataList = append(widgetDataList, wd)
	}

	return &DashboardFull{
		Dashboard: dash,
		Widgets:   widgetDataList,
	}, nil
}

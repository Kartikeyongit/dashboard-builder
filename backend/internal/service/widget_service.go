package service

import (
	"context"
	"encoding/json"
	"fmt"

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
	widgetRepo    *repository.WidgetRepo
	dashboardRepo *repository.DashboardRepo
	queryService  *QueryService
}

func NewWidgetService(
	widgetRepo *repository.WidgetRepo,
	dashboardRepo *repository.DashboardRepo,
	queryService *QueryService,
) *WidgetService {
	return &WidgetService{
		widgetRepo:    widgetRepo,
		dashboardRepo: dashboardRepo,
		queryService:  queryService,
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

func (s *WidgetService) LoadDashboardWithData(ctx context.Context, orgID, dashboardID string) (*DashboardFull, error) {
	dash, err := s.dashboardRepo.GetByID(dashboardID, orgID)
	if err != nil || dash == nil {
		return nil, err
	}

	widgetList, err := s.widgetRepo.ListByDashboard(dashboardID)
	if err != nil {
		return nil, err
	}

	var widgetDataList []WidgetData
	for _, w := range widgetList {
		wd := WidgetData{Widget: w}
		result, err := s.queryService.ExecuteSavedQuery(ctx, w.QueryID, orgID)
		if err != nil {
			wd.Error = err.Error()
		} else {
			wd.Data = result
		}
		widgetDataList = append(widgetDataList, wd)
	}

	return &DashboardFull{
		Dashboard: dash,
		Widgets:   widgetDataList,
	}, nil
}

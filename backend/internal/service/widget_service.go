package service

import (
	"context"
	"encoding/json"

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

func (s *WidgetService) Create(dashboardID, queryID, widgetType string, config json.RawMessage, x, y, w, h int) (*model.Widget, error) {
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

func (s *WidgetService) GetByID(id string) (*model.Widget, error) {
	return s.widgetRepo.GetByID(id)
}

func (s *WidgetService) Update(id string, widget *model.Widget) error {
	return s.widgetRepo.Update(widget)
}

func (s *WidgetService) Delete(id string) error {
	return s.widgetRepo.Delete(id)
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
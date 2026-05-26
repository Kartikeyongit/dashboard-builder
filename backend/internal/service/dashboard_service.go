package service

import (
	"fmt"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

type DashboardService struct {
	dashboardRepo *repository.DashboardRepo
	widgetRepo    *repository.WidgetRepo
}

func NewDashboardService(dashboardRepo *repository.DashboardRepo, widgetRepo *repository.WidgetRepo) *DashboardService {
	return &DashboardService{dashboardRepo: dashboardRepo, widgetRepo: widgetRepo}
}

func (s *DashboardService) Create(orgID, name string, refreshIntervalSec int, createdBy string) (*model.Dashboard, error) {
	d := &model.Dashboard{
		OrgID:              orgID,
		Name:               name,
		RefreshIntervalSec: refreshIntervalSec,
		CreatedBy:          createdBy,
	}
	return s.dashboardRepo.Create(d)
}

func (s *DashboardService) GetByID(id, orgID string) (*model.Dashboard, error) {
	return s.dashboardRepo.GetByID(id, orgID)
}

func (s *DashboardService) ListByOrg(orgID string) ([]*model.Dashboard, error) {
	return s.dashboardRepo.ListByOrg(orgID)
}

func (s *DashboardService) Update(id, orgID, name string, refreshIntervalSec int) error {
	d, err := s.dashboardRepo.GetByID(id, orgID)
	if err != nil || d == nil {
		return fmt.Errorf("dashboard not found")
	}
	d.Name = name
	d.RefreshIntervalSec = refreshIntervalSec
	return s.dashboardRepo.Update(d)
}

func (s *DashboardService) Delete(id, orgID string) error {
	return s.dashboardRepo.Delete(id, orgID)
}
package service

import (
	"fmt"
	"strings"

	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

const (
	maxDashboardFilters = 20
	maxFilterOptions    = 100
	maxDashboardName    = 255
)

type DashboardService struct {
	dashboardRepo *repository.DashboardRepo
	widgetRepo    *repository.WidgetRepo
}

func NewDashboardService(dashboardRepo *repository.DashboardRepo, widgetRepo *repository.WidgetRepo) *DashboardService {
	return &DashboardService{dashboardRepo: dashboardRepo, widgetRepo: widgetRepo}
}

// NormalizeDashboardFilters validates filter definitions and returns a clean
// copy. IDs become SQL placeholders, so they are restricted to identifiers.
func NormalizeDashboardFilters(filters []model.DashboardFilter) ([]model.DashboardFilter, error) {
	if len(filters) > maxDashboardFilters {
		return nil, fmt.Errorf("too many filters (max %d)", maxDashboardFilters)
	}
	seen := make(map[string]bool, len(filters))
	out := make([]model.DashboardFilter, 0, len(filters))
	for _, f := range filters {
		f.ID = strings.TrimSpace(f.ID)
		f.Label = strings.TrimSpace(f.Label)
		f.Type = strings.TrimSpace(f.Type)
		f.Default = strings.TrimSpace(f.Default)

		if f.ID == "" {
			return nil, fmt.Errorf("filter id is required")
		}
		if !isValidFilterID(f.ID) {
			return nil, fmt.Errorf("invalid filter id %q: use letters, numbers, and underscores", f.ID)
		}
		if seen[f.ID] {
			return nil, fmt.Errorf("duplicate filter id %q", f.ID)
		}
		seen[f.ID] = true

		if f.Label == "" {
			f.Label = f.ID
		}
		switch f.Type {
		case "text", "number", "date", "select":
		default:
			return nil, fmt.Errorf("filter %q has unsupported type %q", f.ID, f.Type)
		}

		options := make([]string, 0, len(f.Options))
		for _, opt := range f.Options {
			opt = strings.TrimSpace(opt)
			if opt != "" {
				options = append(options, opt)
			}
			if len(options) > maxFilterOptions {
				return nil, fmt.Errorf("filter %q has too many options", f.ID)
			}
		}
		if f.Type == "select" && len(options) == 0 {
			return nil, fmt.Errorf("filter %q needs at least one option", f.ID)
		}
		if f.Type == "select" && f.Default != "" && !containsString(options, f.Default) {
			options = append(options, f.Default)
		}
		f.Options = options
		out = append(out, f)
	}
	return out, nil
}

func isValidFilterID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for i := 0; i < len(id); i++ {
		ch := id[i]
		letter := (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
		digit := ch >= '0' && ch <= '9'
		if i == 0 {
			if !letter && ch != '_' {
				return false
			}
			continue
		}
		if !letter && !digit && ch != '_' {
			return false
		}
	}
	return true
}

func containsString(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}

func normalizeDashboardName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", fmt.Errorf("dashboard name is required")
	}
	return truncateName(name), nil
}

// truncateName keeps a name inside the VARCHAR(255) column without splitting a
// multi-byte UTF-8 character.
func truncateName(name string) string {
	if len(name) <= maxDashboardName {
		return name
	}
	runes := []rune(name)
	for len(string(runes)) > maxDashboardName {
		runes = runes[:len(runes)-1]
	}
	return string(runes)
}

func (s *DashboardService) Create(orgID, name string, refreshIntervalSec int, filters []model.DashboardFilter, createdBy string) (*model.Dashboard, error) {
	name, err := normalizeDashboardName(name)
	if err != nil {
		return nil, err
	}
	cleanFilters, err := NormalizeDashboardFilters(filters)
	if err != nil {
		return nil, err
	}
	d := &model.Dashboard{
		OrgID:              orgID,
		Name:               name,
		RefreshIntervalSec: refreshIntervalSec,
		Filters:            cleanFilters,
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

// Update changes a dashboard. A nil filters argument preserves the existing
// definitions, which keeps older clients from wiping them.
func (s *DashboardService) Update(id, orgID, name string, refreshIntervalSec int, filters *[]model.DashboardFilter) error {
	d, err := s.dashboardRepo.GetByID(id, orgID)
	if err != nil || d == nil {
		return fmt.Errorf("dashboard not found")
	}
	name, err = normalizeDashboardName(name)
	if err != nil {
		return err
	}
	d.Name = name
	d.RefreshIntervalSec = refreshIntervalSec
	if filters != nil {
		cleanFilters, err := NormalizeDashboardFilters(*filters)
		if err != nil {
			return err
		}
		d.Filters = cleanFilters
	}
	return s.dashboardRepo.Update(d)
}

func (s *DashboardService) Delete(id, orgID string) error {
	return s.dashboardRepo.Delete(id, orgID)
}

// Duplicate copies a dashboard and its widgets. Saved queries are shared.
func (s *DashboardService) Duplicate(id, orgID, createdBy string) (*model.Dashboard, error) {
	src, err := s.dashboardRepo.GetByID(id, orgID)
	if err != nil {
		return nil, err
	}
	if src == nil {
		return nil, fmt.Errorf("dashboard not found")
	}
	name := truncateName(src.Name + " (copy)")
	dup, err := s.dashboardRepo.Duplicate(id, orgID, createdBy, name)
	if err != nil {
		return nil, err
	}
	if dup == nil {
		return nil, fmt.Errorf("dashboard not found")
	}
	return dup, nil
}

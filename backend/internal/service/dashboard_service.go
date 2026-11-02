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
	// A description is a short blurb for the library card and header.
	maxDashboardDescription = 500
	maxDashboardTags        = 10
	maxDashboardTagLength   = 32
	maxRefreshIntervalSec   = 86400
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
	return truncateRunes(name, maxDashboardName)
}

func truncateRunes(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit])
}

// NormalizeDashboardDescription trims the blurb and keeps it a sane length.
func NormalizeDashboardDescription(description string) string {
	return truncateRunes(strings.TrimSpace(description), maxDashboardDescription)
}

// NormalizeDashboardTags trims, drops empty entries, and removes duplicates so
// the library shows a predictable tag list. Comparison ignores case but the
// first spelling is kept.
func NormalizeDashboardTags(tags []string) ([]string, error) {
	out := make([]string, 0, len(tags))
	seen := make(map[string]bool, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}
		if len([]rune(tag)) > maxDashboardTagLength {
			return nil, fmt.Errorf("tag %q is longer than %d characters", tag, maxDashboardTagLength)
		}
		key := strings.ToLower(tag)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, tag)
		if len(out) > maxDashboardTags {
			return nil, fmt.Errorf("too many tags (max %d)", maxDashboardTags)
		}
	}
	return out, nil
}

func normalizeRefreshInterval(seconds int) (int, error) {
	if seconds < 0 || seconds > maxRefreshIntervalSec {
		return 0, fmt.Errorf("refresh interval must be between 0 and %d seconds", maxRefreshIntervalSec)
	}
	return seconds, nil
}

// CreateDashboardInput carries everything needed to create a dashboard.
type CreateDashboardInput struct {
	OrgID              string
	Name               string
	Description        string
	Tags               []string
	RefreshIntervalSec int
	Filters            []model.DashboardFilter
	CreatedBy          string
}

func (s *DashboardService) Create(in CreateDashboardInput) (*model.Dashboard, error) {
	name, err := normalizeDashboardName(in.Name)
	if err != nil {
		return nil, err
	}
	cleanFilters, err := NormalizeDashboardFilters(in.Filters)
	if err != nil {
		return nil, err
	}
	tags, err := NormalizeDashboardTags(in.Tags)
	if err != nil {
		return nil, err
	}
	refreshIntervalSec, err := normalizeRefreshInterval(in.RefreshIntervalSec)
	if err != nil {
		return nil, err
	}
	d := &model.Dashboard{
		OrgID:              in.OrgID,
		Name:               name,
		Description:        NormalizeDashboardDescription(in.Description),
		Tags:               tags,
		RefreshIntervalSec: refreshIntervalSec,
		Filters:            cleanFilters,
		CreatedBy:          in.CreatedBy,
	}
	return s.dashboardRepo.Create(d)
}

func (s *DashboardService) GetByID(id, orgID string) (*model.Dashboard, error) {
	return s.dashboardRepo.GetByID(id, orgID)
}

func (s *DashboardService) ListByOrg(orgID, userID string) ([]*model.Dashboard, error) {
	return s.dashboardRepo.ListByOrg(orgID, userID)
}

// SetFavorite pins or unpins a dashboard for the current user.
func (s *DashboardService) SetFavorite(id, orgID, userID string, favorite bool) error {
	d, err := s.dashboardRepo.GetByID(id, orgID)
	if err != nil {
		return err
	}
	if d == nil {
		return fmt.Errorf("dashboard not found")
	}
	return s.dashboardRepo.SetFavorite(userID, id, orgID, favorite)
}

// UpdateDashboardInput carries only the fields a caller wants to change. A nil
// field is left untouched, so renaming from a list cannot wipe filters.
type UpdateDashboardInput struct {
	Name               *string
	Description        *string
	RefreshIntervalSec *int
	Tags               *[]string
	Filters            *[]model.DashboardFilter
}

func (s *DashboardService) Update(id, orgID, userID string, in UpdateDashboardInput) (*model.Dashboard, error) {
	d, err := s.dashboardRepo.GetByID(id, orgID)
	if err != nil {
		return nil, err
	}
	if d == nil {
		return nil, fmt.Errorf("dashboard not found")
	}

	if in.Name != nil {
		name, err := normalizeDashboardName(*in.Name)
		if err != nil {
			return nil, err
		}
		d.Name = name
	}
	if in.Description != nil {
		d.Description = NormalizeDashboardDescription(*in.Description)
	}
	if in.Tags != nil {
		tags, err := NormalizeDashboardTags(*in.Tags)
		if err != nil {
			return nil, err
		}
		d.Tags = tags
	}
	if in.RefreshIntervalSec != nil {
		seconds, err := normalizeRefreshInterval(*in.RefreshIntervalSec)
		if err != nil {
			return nil, err
		}
		d.RefreshIntervalSec = seconds
	}
	if in.Filters != nil {
		cleanFilters, err := NormalizeDashboardFilters(*in.Filters)
		if err != nil {
			return nil, err
		}
		d.Filters = cleanFilters
	}

	if err := s.dashboardRepo.Update(d); err != nil {
		return nil, err
	}
	// Re-read so the response carries the per-user favorite flag and the
	// database-assigned updated_at; the list replaces its row with this.
	updated, err := s.dashboardRepo.GetByIDForUser(id, orgID, userID)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return d, nil
	}
	return updated, nil
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

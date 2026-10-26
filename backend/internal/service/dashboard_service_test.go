package service

import (
	"testing"

	"github.com/your-org/dashboard-builder/backend/internal/model"
)

func TestNormalizeDashboardFilters(t *testing.T) {
	got, err := NormalizeDashboardFilters([]model.DashboardFilter{
		{ID: " start_date ", Type: "date", Default: " 2026-01-01 "},
		{ID: "status", Type: "select", Options: []string{" paid ", "", "pending"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d filters, want 2", len(got))
	}
	if got[0].ID != "start_date" || got[0].Label != "start_date" || got[0].Default != "2026-01-01" {
		t.Fatalf("first filter not normalized: %#v", got[0])
	}
	if len(got[1].Options) != 2 || got[1].Options[0] != "paid" {
		t.Fatalf("options not normalized: %#v", got[1].Options)
	}
}

func TestNormalizeDashboardFiltersRejectsInvalidDefinitions(t *testing.T) {
	tests := []struct {
		name    string
		filters []model.DashboardFilter
	}{
		{name: "missing id", filters: []model.DashboardFilter{{Type: "text"}}},
		{name: "bad id", filters: []model.DashboardFilter{{ID: "has space", Type: "text"}}},
		{name: "duplicate id", filters: []model.DashboardFilter{
			{ID: "x", Type: "text"},
			{ID: "x", Type: "text"},
		}},
		{name: "bad type", filters: []model.DashboardFilter{{ID: "x", Type: "json"}}},
		{name: "select without options", filters: []model.DashboardFilter{{ID: "x", Type: "select"}}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NormalizeDashboardFilters(tt.filters); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestNormalizeDashboardFiltersAddsDefaultToSelectOptions(t *testing.T) {
	got, err := NormalizeDashboardFilters([]model.DashboardFilter{
		{ID: "status", Type: "select", Default: "paid", Options: []string{"pending"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !containsString(got[0].Options, "paid") {
		t.Fatalf("default should be present in options: %#v", got[0].Options)
	}
}

func TestNormalizeDashboardName(t *testing.T) {
	if _, err := normalizeDashboardName("   "); err == nil {
		t.Fatal("expected an error for an empty name")
	}
	name, err := normalizeDashboardName("  Revenue  ")
	if err != nil || name != "Revenue" {
		t.Fatalf("name = %q, err = %v", name, err)
	}
}

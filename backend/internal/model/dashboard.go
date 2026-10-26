package model

import (
	"strconv"
	"time"
)

// DashboardFilter defines a named value that queries can reference as
// {{id}}. Values are bound as SQL parameters, never interpolated.
type DashboardFilter struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Type    string   `json:"type"` // text, number, date, select
	Default string   `json:"default,omitempty"`
	Options []string `json:"options,omitempty"`
}

type Dashboard struct {
	ID                 string            `json:"id"`
	OrgID              string            `json:"org_id"`
	Name               string            `json:"name"`
	RefreshIntervalSec int               `json:"refresh_interval_seconds"`
	Filters            []DashboardFilter `json:"filters"`
	CreatedBy          string            `json:"created_by"`
	CreatedAt          time.Time         `json:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at"`
}

// FilterDefaults returns the configured default value for every filter that has
// one. The scheduler and shared views use these when no explicit value is given.
func (d *Dashboard) FilterDefaults() map[string]string {
	out := make(map[string]string, len(d.Filters))
	for _, f := range d.Filters {
		if f.Default != "" {
			out[f.ID] = f.Default
		}
	}
	return out
}

// ResolveFilterValues merges caller overrides with defaults and converts each
// value according to its declared type. An absent override uses the filter's
// default; an explicitly empty override means "no value" and is omitted. This
// distinction lets a user clear a filter that has a default.
func (d *Dashboard) ResolveFilterValues(overrides map[string]string) map[string]interface{} {
	out := make(map[string]interface{}, len(d.Filters))
	for _, f := range d.Filters {
		raw, ok := overrides[f.ID]
		if !ok {
			raw = f.Default
		}
		if raw == "" {
			continue
		}
		if f.Type == "number" {
			if n, err := strconv.ParseFloat(raw, 64); err == nil {
				out[f.ID] = n
				continue
			}
		}
		out[f.ID] = raw
	}
	return out
}

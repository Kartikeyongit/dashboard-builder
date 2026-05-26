package model

import (
	"encoding/json"
	"time"
)

type Widget struct {
	ID                       string          `json:"id"`
	DashboardID              string          `json:"dashboard_id"`
	QueryID                  string          `json:"query_id"`
	WidgetType               string          `json:"widget_type"` // chart, table, metric
	Config                   json.RawMessage `json:"config"`
	PositionX                int             `json:"position_x"`
	PositionY                int             `json:"position_y"`
	Width                    int             `json:"width"`
	Height                   int             `json:"height"`
	RefreshIntervalOverride  *int            `json:"refresh_interval_override,omitempty"`
	CreatedAt                time.Time       `json:"created_at"`
	UpdatedAt                time.Time       `json:"updated_at"`
}
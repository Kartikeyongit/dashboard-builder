package model

import "time"

type Query struct {
	ID           string    `json:"id"`
	OrgID        string    `json:"org_id"`
	DatasourceID string    `json:"datasource_id"`
	Name         string    `json:"name"`
	SQLText      string    `json:"sql_text"`
	MaxRows      int       `json:"max_rows"`
	TimeoutMs    int       `json:"timeout_ms"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
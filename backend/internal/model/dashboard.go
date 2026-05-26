package model

import "time"

type Dashboard struct {
	ID                    string    `json:"id"`
	OrgID                 string    `json:"org_id"`
	Name                  string    `json:"name"`
	RefreshIntervalSec    int       `json:"refresh_interval_seconds"`
	CreatedBy             string    `json:"created_by"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}
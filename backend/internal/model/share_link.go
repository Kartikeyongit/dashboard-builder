package model

import "time"

type ShareLink struct {
	ID           string     `json:"id"`
	DashboardID  string     `json:"dashboard_id"`
	TokenHash    string     `json:"-"`               // never expose
	PasswordHash *string    `json:"-"`               // bcrypt, nil if none
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	CreatedBy    string     `json:"created_by"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
}
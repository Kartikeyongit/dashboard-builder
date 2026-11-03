package model

import "time"

type ShareLink struct {
	ID          string `json:"id"`
	DashboardID string `json:"dashboard_id"`
	TokenHash   string `json:"-"` // never expose
	// TokenEncrypted lets the owner copy a link they created earlier. The
	// lookup path still uses TokenHash, so a database leak alone does not
	// reveal working links without the encryption key.
	TokenEncrypted *string    `json:"-"`
	PasswordHash   *string    `json:"-"` // bcrypt, nil if none
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	CreatedBy      string     `json:"created_by"`
	IsActive       bool       `json:"is_active"`
	CreatedAt      time.Time  `json:"created_at"`
}

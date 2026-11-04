package model

import "time"

// Member is the team-directory view of a user: account fields plus the
// profile settings that make a directory readable.
type Member struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	DisplayName string     `json:"display_name"`
	Timezone    string     `json:"timezone"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// UserSettings holds the small profile preferences a user can edit themselves.
type UserSettings struct {
	UserID      string     `json:"user_id"`
	DisplayName string     `json:"display_name"`
	Timezone    string     `json:"timezone"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty"`
}

// Invite is a one-time onboarding link. Only the hash is used for lookup; the
// encrypted copy lets an admin copy the same link again.
type Invite struct {
	ID             string     `json:"id"`
	OrgID          string     `json:"org_id"`
	Email          string     `json:"email"`
	Role           string     `json:"role"`
	TokenHash      string     `json:"-"`
	TokenEncrypted string     `json:"-"`
	InvitedBy      *string    `json:"invited_by,omitempty"`
	InvitedByEmail string     `json:"invited_by_email,omitempty"`
	ExpiresAt      time.Time  `json:"expires_at"`
	AcceptedAt     *time.Time `json:"accepted_at,omitempty"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	Token          string     `json:"-"`
}

// InvitePreview is the public, minimal view of an invite shown before signup.
type InvitePreview struct {
	OrgName   string    `json:"org_name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expires_at"`
}

// AuditEvent is an append-only record of a team or sharing action. Metadata is
// a small JSON object so new event types do not need new columns.
type AuditEvent struct {
	ID         string         `json:"id"`
	OrgID      string         `json:"org_id"`
	ActorID    *string        `json:"actor_id,omitempty"`
	ActorEmail string         `json:"actor_email,omitempty"`
	Action     string         `json:"action"`
	TargetType string         `json:"target_type"`
	TargetID   *string        `json:"target_id,omitempty"`
	TargetName string         `json:"target_name"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  time.Time      `json:"created_at"`
}

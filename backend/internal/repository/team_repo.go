package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/your-org/dashboard-builder/backend/internal/model"
)

// TeamRepo covers team membership, invites, per-user settings, and the audit
// trail. They share an ownership boundary (an organization), so one repo keeps
// the queries together.
type TeamRepo struct {
	db *sql.DB
}

func NewTeamRepo(db *sql.DB) *TeamRepo {
	return &TeamRepo{db: db}
}

const memberColumns = `u.id, u.email, u.role, COALESCE(s.display_name, ''), COALESCE(s.timezone, 'UTC'), u.last_login_at, u.created_at`

func scanMember(scanner interface{ Scan(...interface{}) error }, m *model.Member) error {
	return scanner.Scan(&m.ID, &m.Email, &m.Role, &m.DisplayName, &m.Timezone, &m.LastLoginAt, &m.CreatedAt)
}

func (r *TeamRepo) ListMembers(orgID string) ([]*model.Member, error) {
	rows, err := r.db.Query(
		`SELECT `+memberColumns+`
		 FROM users u
		 LEFT JOIN user_settings s ON s.user_id = u.id
		 WHERE u.org_id = $1
		 ORDER BY u.created_at ASC`, orgID,
	)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()

	members := make([]*model.Member, 0)
	for rows.Next() {
		member := &model.Member{}
		if err := scanMember(rows, member); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

func (r *TeamRepo) GetMember(id, orgID string) (*model.Member, error) {
	member := &model.Member{}
	err := scanMember(r.db.QueryRow(
		`SELECT `+memberColumns+`
		 FROM users u
		 LEFT JOIN user_settings s ON s.user_id = u.id
		 WHERE u.id = $1 AND u.org_id = $2`, id, orgID,
	), member)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get member: %w", err)
	}
	return member, nil
}

func (r *TeamRepo) CountAdmins(orgID string) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM users WHERE org_id = $1 AND role = 'admin'`, orgID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count admins: %w", err)
	}
	return count, nil
}

func (r *TeamRepo) UpdateRole(id, orgID, role string) error {
	result, err := r.db.Exec(`UPDATE users SET role = $1 WHERE id = $2 AND org_id = $3`, role, id, orgID)
	if err != nil {
		return fmt.Errorf("update role: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *TeamRepo) DeleteMember(id, orgID string) error {
	result, err := r.db.Exec(`DELETE FROM users WHERE id = $1 AND org_id = $2`, id, orgID)
	if err != nil {
		return fmt.Errorf("delete member: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *TeamRepo) GetSettings(userID string) (*model.UserSettings, error) {
	settings := &model.UserSettings{UserID: userID, Timezone: "UTC"}
	var updated sql.NullTime
	err := r.db.QueryRow(
		`SELECT display_name, timezone, updated_at FROM user_settings WHERE user_id = $1`, userID,
	).Scan(&settings.DisplayName, &settings.Timezone, &updated)
	if err == sql.ErrNoRows {
		return settings, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get settings: %w", err)
	}
	if updated.Valid {
		settings.UpdatedAt = &updated.Time
	}
	return settings, nil
}

func (r *TeamRepo) UpsertSettings(userID, displayName, timezone string) (*model.UserSettings, error) {
	settings := &model.UserSettings{UserID: userID}
	var updated time.Time
	err := r.db.QueryRow(
		`INSERT INTO user_settings (user_id, display_name, timezone)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id) DO UPDATE
		 SET display_name = EXCLUDED.display_name,
		     timezone = EXCLUDED.timezone,
		     updated_at = NOW()
		 RETURNING display_name, timezone, updated_at`,
		userID, displayName, timezone,
	).Scan(&settings.DisplayName, &settings.Timezone, &updated)
	if err != nil {
		return nil, fmt.Errorf("update settings: %w", err)
	}
	settings.UpdatedAt = &updated
	return settings, nil
}

func (r *TeamRepo) UpdatePassword(userID, passwordHash string) error {
	_, err := r.db.Exec(`UPDATE users SET password_hash = $1 WHERE id = $2`, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (r *TeamRepo) EmailExists(email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower($1))`, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check email: %w", err)
	}
	return exists, nil
}

const inviteColumns = `id, org_id, email, role, token_hash, token_encrypted, invited_by, expires_at, accepted_at, revoked_at, created_at`

func scanInvite(scanner interface{ Scan(...interface{}) error }, invite *model.Invite) error {
	return scanner.Scan(
		&invite.ID, &invite.OrgID, &invite.Email, &invite.Role, &invite.TokenHash,
		&invite.TokenEncrypted, &invite.InvitedBy, &invite.ExpiresAt, &invite.AcceptedAt,
		&invite.RevokedAt, &invite.CreatedAt,
	)
}

func (r *TeamRepo) CreateInvite(invite *model.Invite) (*model.Invite, error) {
	err := r.db.QueryRow(
		`INSERT INTO org_invites (org_id, email, role, token_hash, token_encrypted, invited_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		invite.OrgID, invite.Email, invite.Role, invite.TokenHash, invite.TokenEncrypted,
		invite.InvitedBy, invite.ExpiresAt,
	).Scan(&invite.ID, &invite.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create invite: %w", err)
	}
	return invite, nil
}

func (r *TeamRepo) RevokePendingInvites(orgID, email string) error {
	_, err := r.db.Exec(
		`UPDATE org_invites
		 SET revoked_at = NOW()
		 WHERE org_id = $1 AND lower(email) = lower($2)
		   AND accepted_at IS NULL AND revoked_at IS NULL`,
		orgID, email,
	)
	if err != nil {
		return fmt.Errorf("revoke pending invites: %w", err)
	}
	return nil
}

func (r *TeamRepo) ListPendingInvites(orgID string) ([]*model.Invite, error) {
	rows, err := r.db.Query(
		`SELECT i.id, i.org_id, i.email, i.role, i.token_hash, i.token_encrypted, i.invited_by,
		        i.expires_at, i.accepted_at, i.revoked_at, i.created_at, COALESCE(u.email, '')
		 FROM org_invites i
		 LEFT JOIN users u ON u.id = i.invited_by
		 WHERE i.org_id = $1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL
		 ORDER BY i.created_at DESC`, orgID,
	)
	if err != nil {
		return nil, fmt.Errorf("list invites: %w", err)
	}
	defer rows.Close()

	invites := make([]*model.Invite, 0)
	for rows.Next() {
		invite := &model.Invite{}
		if err := rows.Scan(
			&invite.ID, &invite.OrgID, &invite.Email, &invite.Role, &invite.TokenHash,
			&invite.TokenEncrypted, &invite.InvitedBy, &invite.ExpiresAt, &invite.AcceptedAt,
			&invite.RevokedAt, &invite.CreatedAt, &invite.InvitedByEmail,
		); err != nil {
			return nil, err
		}
		invites = append(invites, invite)
	}
	return invites, rows.Err()
}

func (r *TeamRepo) GetInviteByTokenHash(hash string) (*model.Invite, error) {
	invite := &model.Invite{}
	err := scanInvite(r.db.QueryRow(
		`SELECT `+inviteColumns+`
		 FROM org_invites
		 WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, hash,
	), invite)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get invite: %w", err)
	}
	return invite, nil
}

func (r *TeamRepo) GetInviteByID(id, orgID string) (*model.Invite, error) {
	invite := &model.Invite{}
	err := scanInvite(r.db.QueryRow(
		`SELECT `+inviteColumns+` FROM org_invites WHERE id = $1 AND org_id = $2`, id, orgID,
	), invite)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get invite by id: %w", err)
	}
	return invite, nil
}

func (r *TeamRepo) GetInvitePreview(hash string) (*model.InvitePreview, error) {
	preview := &model.InvitePreview{}
	err := r.db.QueryRow(
		`SELECT o.name, i.email, i.role, i.expires_at
		 FROM org_invites i
		 JOIN organizations o ON o.id = i.org_id
		 WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL`, hash,
	).Scan(&preview.OrgName, &preview.Email, &preview.Role, &preview.ExpiresAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get invite preview: %w", err)
	}
	return preview, nil
}

// AcceptInvite atomically claims a pending invite. The boolean is false when
// another request won the race or the invite was revoked in the meantime.
func (r *TeamRepo) AcceptInvite(id string) (bool, error) {
	result, err := r.db.Exec(
		`UPDATE org_invites SET accepted_at = NOW()
		 WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, id,
	)
	if err != nil {
		return false, fmt.Errorf("accept invite: %w", err)
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

// ReleaseInvite reopens an invite if account creation failed after the claim.
func (r *TeamRepo) ReleaseInvite(id string) error {
	_, err := r.db.Exec(`UPDATE org_invites SET accepted_at = NULL WHERE id = $1`, id)
	return err
}

func (r *TeamRepo) RevokeInvite(id, orgID string) (bool, error) {
	result, err := r.db.Exec(
		`UPDATE org_invites SET revoked_at = NOW()
		 WHERE id = $1 AND org_id = $2 AND accepted_at IS NULL AND revoked_at IS NULL`, id, orgID,
	)
	if err != nil {
		return false, fmt.Errorf("revoke invite: %w", err)
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

func (r *TeamRepo) CreateAuditEvent(event *model.AuditEvent) error {
	metadata := event.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("marshal audit metadata: %w", err)
	}
	err = r.db.QueryRow(
		`INSERT INTO audit_events (org_id, actor_id, action, target_type, target_id, target_name, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		event.OrgID, event.ActorID, event.Action, event.TargetType, event.TargetID, event.TargetName, payload,
	).Scan(&event.ID, &event.CreatedAt)
	if err != nil {
		return fmt.Errorf("create audit event: %w", err)
	}
	return nil
}

func (r *TeamRepo) ListAuditEvents(orgID string, limit int) ([]*model.AuditEvent, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := r.db.Query(
		`SELECT a.id, a.org_id, a.actor_id, COALESCE(u.email, ''), a.action,
		        a.target_type, a.target_id, a.target_name, a.metadata, a.created_at
		 FROM audit_events a
		 LEFT JOIN users u ON u.id = a.actor_id
		 WHERE a.org_id = $1
		 ORDER BY a.created_at DESC
		 LIMIT $2`, orgID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("list audit events: %w", err)
	}
	defer rows.Close()

	events := make([]*model.AuditEvent, 0)
	for rows.Next() {
		event := &model.AuditEvent{}
		var metadata []byte
		if err := rows.Scan(
			&event.ID, &event.OrgID, &event.ActorID, &event.ActorEmail, &event.Action,
			&event.TargetType, &event.TargetID, &event.TargetName, &metadata, &event.CreatedAt,
		); err != nil {
			return nil, err
		}
		event.Metadata = map[string]any{}
		if len(metadata) > 0 {
			_ = json.Unmarshal(metadata, &event.Metadata)
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

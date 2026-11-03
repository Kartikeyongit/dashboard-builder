package repository

import (
	"database/sql"

	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type ShareLinkRepo struct {
	db *sql.DB
}

func NewShareLinkRepo(db *sql.DB) *ShareLinkRepo {
	return &ShareLinkRepo{db: db}
}

const shareLinkColumns = `id, dashboard_id, token_hash, token_encrypted, password_hash, expires_at, last_used_at, created_by, is_active, created_at`

func scanShareLink(scanner interface{ Scan(...interface{}) error }, sl *model.ShareLink) error {
	return scanner.Scan(
		&sl.ID, &sl.DashboardID, &sl.TokenHash, &sl.TokenEncrypted, &sl.PasswordHash,
		&sl.ExpiresAt, &sl.LastUsedAt, &sl.CreatedBy, &sl.IsActive, &sl.CreatedAt,
	)
}

// Create stores a new share link. The caller supplies both the lookup hash and
// the encrypted raw token (when available) so the owner can copy the link from
// the share manager later.
func (r *ShareLinkRepo) Create(sl *model.ShareLink) (*model.ShareLink, error) {
	err := r.db.QueryRow(
		`INSERT INTO share_links (dashboard_id, token_hash, token_encrypted, password_hash, expires_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 RETURNING id, is_active, created_at`,
		sl.DashboardID, sl.TokenHash, sl.TokenEncrypted, sl.PasswordHash, sl.ExpiresAt, sl.CreatedBy,
	).Scan(&sl.ID, &sl.IsActive, &sl.CreatedAt)
	if err != nil {
		return nil, err
	}
	return sl, nil
}

func (r *ShareLinkRepo) GetByTokenHash(hash string) (*model.ShareLink, error) {
	sl := &model.ShareLink{}
	err := scanShareLink(r.db.QueryRow(
		`SELECT `+shareLinkColumns+`
		 FROM share_links WHERE token_hash = $1 AND is_active = TRUE`, hash,
	), sl)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return sl, err
}

func (r *ShareLinkRepo) GetByID(id, dashboardID string) (*model.ShareLink, error) {
	sl := &model.ShareLink{}
	err := scanShareLink(r.db.QueryRow(
		`SELECT `+shareLinkColumns+`
		 FROM share_links WHERE id = $1 AND dashboard_id = $2`, id, dashboardID,
	), sl)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return sl, err
}

func (r *ShareLinkRepo) Deactivate(id string) error {
	_, err := r.db.Exec(`UPDATE share_links SET is_active = FALSE WHERE id = $1`, id)
	return err
}

func (r *ShareLinkRepo) TouchLastUsed(id string) error {
	_, err := r.db.Exec(`UPDATE share_links SET last_used_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *ShareLinkRepo) ListByDashboard(dashboardID string) ([]*model.ShareLink, error) {
	rows, err := r.db.Query(
		`SELECT `+shareLinkColumns+`
		 FROM share_links WHERE dashboard_id = $1
		 ORDER BY is_active DESC, created_at DESC`, dashboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.ShareLink
	for rows.Next() {
		sl := &model.ShareLink{}
		if err := scanShareLink(rows, sl); err != nil {
			return nil, err
		}
		list = append(list, sl)
	}
	return list, rows.Err()
}

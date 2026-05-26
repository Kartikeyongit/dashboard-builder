package repository

import (
	"database/sql"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

func (r *DashboardRepo) Create(d *model.Dashboard) (*model.Dashboard, error) {
	err := r.db.QueryRow(
		`INSERT INTO dashboards (org_id, name, refresh_interval_seconds, created_by)
		 VALUES ($1,$2,$3,$4) RETURNING id, created_at, updated_at`,
		d.OrgID, d.Name, d.RefreshIntervalSec, d.CreatedBy,
	).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (r *DashboardRepo) GetByID(id, orgID string) (*model.Dashboard, error) {
	d := &model.Dashboard{}
	err := r.db.QueryRow(
		`SELECT id, org_id, name, refresh_interval_seconds, created_by, created_at, updated_at
		 FROM dashboards WHERE id=$1 AND org_id=$2`, id, orgID,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return d, err
}

func (r *DashboardRepo) GetByIDUnscoped(id string) (*model.Dashboard, error) {
	d := &model.Dashboard{}
	err := r.db.QueryRow(
		`SELECT id, org_id, name, refresh_interval_seconds, created_by, created_at, updated_at
		 FROM dashboards WHERE id=$1`, id,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return d, err
}

func (r *DashboardRepo) ListByOrg(orgID string) ([]*model.Dashboard, error) {
	rows, err := r.db.Query(
		`SELECT id, org_id, name, refresh_interval_seconds, created_by, created_at, updated_at
		 FROM dashboards WHERE org_id=$1 ORDER BY updated_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Dashboard
	for rows.Next() {
		d := &model.Dashboard{}
		if err := rows.Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *DashboardRepo) Update(d *model.Dashboard) error {
	_, err := r.db.Exec(
		`UPDATE dashboards SET name=$1, refresh_interval_seconds=$2, updated_at=NOW()
		 WHERE id=$3 AND org_id=$4`,
		d.Name, d.RefreshIntervalSec, d.ID, d.OrgID)
	return err
}

func (r *DashboardRepo) Delete(id, orgID string) error {
	_, err := r.db.Exec(`DELETE FROM dashboards WHERE id=$1 AND org_id=$2`, id, orgID)
	return err
}

func (r *DashboardRepo) GetAllWithRefresh() ([]*model.Dashboard, error) {
	rows, err := r.db.Query(`SELECT id, org_id, name, refresh_interval_seconds, created_by, created_at, updated_at FROM dashboards WHERE refresh_interval_seconds > 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Dashboard
	for rows.Next() {
		d := &model.Dashboard{}
		if err := rows.Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}
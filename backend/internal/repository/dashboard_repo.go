package repository

import (
	"database/sql"
	"encoding/json"

	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type DashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepo(db *sql.DB) *DashboardRepo {
	return &DashboardRepo{db: db}
}

func marshalFilters(filters []model.DashboardFilter) []byte {
	if filters == nil {
		return []byte("[]")
	}
	b, err := json.Marshal(filters)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func scanFilters(raw []byte) []model.DashboardFilter {
	filters := []model.DashboardFilter{}
	if len(raw) == 0 {
		return filters
	}
	if err := json.Unmarshal(raw, &filters); err != nil {
		return []model.DashboardFilter{}
	}
	if filters == nil {
		return []model.DashboardFilter{}
	}
	return filters
}

func (r *DashboardRepo) Create(d *model.Dashboard) (*model.Dashboard, error) {
	err := r.db.QueryRow(
		`INSERT INTO dashboards (org_id, name, refresh_interval_seconds, created_by, filters_json)
		 VALUES ($1,$2,$3,NULLIF($4::text,'')::uuid,$5) RETURNING id, created_at, updated_at`,
		d.OrgID, d.Name, d.RefreshIntervalSec, d.CreatedBy, marshalFilters(d.Filters),
	).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if d.Filters == nil {
		d.Filters = []model.DashboardFilter{}
	}
	return d, nil
}

func (r *DashboardRepo) GetByID(id, orgID string) (*model.Dashboard, error) {
	d := &model.Dashboard{}
	var filtersRaw []byte
	err := r.db.QueryRow(
		`SELECT id, org_id, name, refresh_interval_seconds, filters_json, created_by, created_at, updated_at
		 FROM dashboards WHERE id=$1 AND org_id=$2`, id, orgID,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &filtersRaw, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	d.Filters = scanFilters(filtersRaw)
	return d, nil
}

func (r *DashboardRepo) GetByIDUnscoped(id string) (*model.Dashboard, error) {
	d := &model.Dashboard{}
	var filtersRaw []byte
	err := r.db.QueryRow(
		`SELECT id, org_id, name, refresh_interval_seconds, filters_json, created_by, created_at, updated_at
		 FROM dashboards WHERE id=$1`, id,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &filtersRaw, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	d.Filters = scanFilters(filtersRaw)
	return d, nil
}

func (r *DashboardRepo) ListByOrg(orgID string) ([]*model.Dashboard, error) {
	rows, err := r.db.Query(
		`SELECT id, org_id, name, refresh_interval_seconds, filters_json, created_by, created_at, updated_at
		 FROM dashboards WHERE org_id=$1 ORDER BY updated_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Dashboard
	for rows.Next() {
		d := &model.Dashboard{}
		var filtersRaw []byte
		if err := rows.Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &filtersRaw, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		d.Filters = scanFilters(filtersRaw)
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *DashboardRepo) Update(d *model.Dashboard) error {
	_, err := r.db.Exec(
		`UPDATE dashboards SET name=$1, refresh_interval_seconds=$2, filters_json=$3, updated_at=NOW()
		 WHERE id=$4 AND org_id=$5`,
		d.Name, d.RefreshIntervalSec, marshalFilters(d.Filters), d.ID, d.OrgID)
	return err
}

func (r *DashboardRepo) Delete(id, orgID string) error {
	_, err := r.db.Exec(`DELETE FROM dashboards WHERE id=$1 AND org_id=$2`, id, orgID)
	return err
}

// Duplicate copies a dashboard and all of its widgets in one transaction.
// Queries are shared, not copied, because widgets reference saved queries.
func (r *DashboardRepo) Duplicate(id, orgID, createdBy, name string) (*model.Dashboard, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	d := &model.Dashboard{}
	var filtersRaw []byte
	err = tx.QueryRow(
		`INSERT INTO dashboards (org_id, name, refresh_interval_seconds, created_by, filters_json)
		 SELECT org_id, $3::text, refresh_interval_seconds, NULLIF($4::text,'')::uuid, filters_json
		 FROM dashboards WHERE id=$1 AND org_id=$2
		 RETURNING id, org_id, name, refresh_interval_seconds, filters_json, created_by, created_at, updated_at`,
		id, orgID, name, createdBy,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &filtersRaw, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	d.Filters = scanFilters(filtersRaw)

	_, err = tx.Exec(
		`INSERT INTO widgets (dashboard_id, query_id, widget_type, config_json, position_x, position_y, width, height, refresh_interval_override)
		 SELECT $2::uuid, query_id, widget_type, config_json, position_x, position_y, width, height, refresh_interval_override
		 FROM widgets WHERE dashboard_id=$1`,
		id, d.ID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return d, nil
}

func (r *DashboardRepo) GetAllWithRefresh() ([]*model.Dashboard, error) {
	rows, err := r.db.Query(`SELECT id, org_id, name, refresh_interval_seconds, filters_json, created_by, created_at, updated_at FROM dashboards WHERE refresh_interval_seconds > 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Dashboard
	for rows.Next() {
		d := &model.Dashboard{}
		var filtersRaw []byte
		if err := rows.Scan(&d.ID, &d.OrgID, &d.Name, &d.RefreshIntervalSec, &filtersRaw, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		d.Filters = scanFilters(filtersRaw)
		list = append(list, d)
	}
	return list, rows.Err()
}

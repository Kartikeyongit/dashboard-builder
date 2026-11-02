package repository

import (
	"database/sql"
	"encoding/json"

	"github.com/lib/pq"
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

// dashboardColumns lists the columns shared by every single-dashboard read.
// widget_count is derived so the library can show metadata without a second
// request. ListByOrg adds the per-user favorite flag on top.
const dashboardColumns = `id, org_id, name, description, tags, refresh_interval_seconds, filters_json,
	(SELECT COUNT(*) FROM widgets w WHERE w.dashboard_id = dashboards.id) AS widget_count,
	created_by, created_at, updated_at`

type rowScanner interface {
	Scan(dest ...interface{}) error
}

// scanDashboard reads the dashboardColumns order. When withFavorite is true the
// row must also carry is_favorite immediately after filters_json.
func scanDashboard(row rowScanner, withFavorite bool) (*model.Dashboard, error) {
	d := &model.Dashboard{}
	var filtersRaw []byte
	var tags pq.StringArray

	dest := []interface{}{
		&d.ID, &d.OrgID, &d.Name, &d.Description, &tags,
		&d.RefreshIntervalSec, &filtersRaw,
	}
	if withFavorite {
		dest = append(dest, &d.IsFavorite)
	}
	dest = append(dest, &d.WidgetCount, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt)

	if err := row.Scan(dest...); err != nil {
		return nil, err
	}
	d.Tags = []string(tags)
	if d.Tags == nil {
		d.Tags = []string{}
	}
	d.Filters = scanFilters(filtersRaw)
	return d, nil
}

func (r *DashboardRepo) Create(d *model.Dashboard) (*model.Dashboard, error) {
	if d.Tags == nil {
		d.Tags = []string{}
	}
	err := r.db.QueryRow(
		`INSERT INTO dashboards (org_id, name, description, tags, refresh_interval_seconds, created_by, filters_json)
		 VALUES ($1,$2,$3,$4,$5,NULLIF($6::text,'')::uuid,$7) RETURNING id, created_at, updated_at`,
		d.OrgID, d.Name, d.Description, pq.Array(d.Tags), d.RefreshIntervalSec, d.CreatedBy, marshalFilters(d.Filters),
	).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if d.Filters == nil {
		d.Filters = []model.DashboardFilter{}
	}
	if d.Tags == nil {
		d.Tags = []string{}
	}
	return d, nil
}

func (r *DashboardRepo) GetByID(id, orgID string) (*model.Dashboard, error) {
	row := r.db.QueryRow(
		`SELECT `+dashboardColumns+` FROM dashboards WHERE id=$1 AND org_id=$2`, id, orgID)
	d, err := scanDashboard(row, false)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (r *DashboardRepo) GetByIDUnscoped(id string) (*model.Dashboard, error) {
	row := r.db.QueryRow(
		`SELECT `+dashboardColumns+` FROM dashboards WHERE id=$1`, id)
	d, err := scanDashboard(row, false)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d, nil
}

// dashboardSelectWithFavorite reads one row per dashboard with the viewer's
// favorite flag. Placeholders: $1 user id (empty allowed), $2 org id.
const dashboardSelectWithFavorite = `SELECT d.id, d.org_id, d.name, d.description, d.tags,
	        d.refresh_interval_seconds, d.filters_json,
	        (f.user_id IS NOT NULL) AS is_favorite,
	        (SELECT COUNT(*) FROM widgets w WHERE w.dashboard_id = d.id) AS widget_count,
	        d.created_by, d.created_at, d.updated_at
	 FROM dashboards d
	 LEFT JOIN dashboard_favorites f
	        ON f.dashboard_id = d.id AND f.user_id = NULLIF($1,'')::uuid
	 WHERE d.org_id=$2`

// GetByIDForUser is GetByID plus the per-user favorite flag, used by the
// update response so a rename or settings save does not clear the pin.
func (r *DashboardRepo) GetByIDForUser(id, orgID, userID string) (*model.Dashboard, error) {
	row := r.db.QueryRow(dashboardSelectWithFavorite+` AND d.id=$3`, userID, orgID, id)
	d, err := scanDashboard(row, true)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d, nil
}

// ListByOrg returns the org's dashboards, newest first, with the favorite flag
// for one user. An empty userID simply reports nothing as favorite.
func (r *DashboardRepo) ListByOrg(orgID, userID string) ([]*model.Dashboard, error) {
	rows, err := r.db.Query(
		dashboardSelectWithFavorite+` ORDER BY d.updated_at DESC`, userID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*model.Dashboard{}
	for rows.Next() {
		d, err := scanDashboard(rows, true)
		if err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *DashboardRepo) Update(d *model.Dashboard) error {
	if d.Tags == nil {
		d.Tags = []string{}
	}
	err := r.db.QueryRow(
		`UPDATE dashboards
		 SET name=$1, description=$2, tags=$3, refresh_interval_seconds=$4, filters_json=$5, updated_at=NOW()
		 WHERE id=$6 AND org_id=$7
		 RETURNING updated_at`,
		d.Name, d.Description, pq.Array(d.Tags), d.RefreshIntervalSec, marshalFilters(d.Filters), d.ID, d.OrgID).Scan(&d.UpdatedAt)
	return err
}

// SetFavorite pins or unpins a dashboard for one user. The insert selects the
// dashboard through the org filter so a user cannot favorite another org's row.
func (r *DashboardRepo) SetFavorite(userID, dashboardID, orgID string, favorite bool) error {
	if favorite {
		_, err := r.db.Exec(
			`INSERT INTO dashboard_favorites (user_id, dashboard_id)
			 SELECT $1::uuid, id FROM dashboards WHERE id=$2 AND org_id=$3
			 ON CONFLICT (user_id, dashboard_id) DO NOTHING`,
			userID, dashboardID, orgID)
		return err
	}
	_, err := r.db.Exec(
		`DELETE FROM dashboard_favorites f
		 USING dashboards d
		 WHERE f.dashboard_id = d.id AND f.user_id=$1::uuid AND f.dashboard_id=$2 AND d.org_id=$3`,
		userID, dashboardID, orgID)
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

	row := tx.QueryRow(
		`INSERT INTO dashboards (org_id, name, description, tags, refresh_interval_seconds, created_by, filters_json)
		 SELECT org_id, $3::text, description, tags, refresh_interval_seconds, NULLIF($4::text,'')::uuid, filters_json
		 FROM dashboards WHERE id=$1 AND org_id=$2
		 RETURNING `+dashboardColumns,
		id, orgID, name, createdBy,
	)
	d, err := scanDashboard(row, false)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

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
	rows, err := r.db.Query(
		`SELECT ` + dashboardColumns + ` FROM dashboards WHERE refresh_interval_seconds > 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*model.Dashboard{}
	for rows.Next() {
		d, err := scanDashboard(rows, false)
		if err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

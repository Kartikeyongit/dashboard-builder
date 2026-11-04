package repository

import (
	"database/sql"
	"fmt"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type QueryRepo struct {
	db *sql.DB
}

func NewQueryRepo(db *sql.DB) *QueryRepo {
	return &QueryRepo{db: db}
}

func (r *QueryRepo) Create(q *model.Query) (*model.Query, error) {
	err := r.db.QueryRow(
		`INSERT INTO queries (org_id, datasource_id, name, sql_text, max_rows, timeout_ms, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)
		 RETURNING id, created_at, updated_at`,
		q.OrgID, q.DatasourceID, q.Name, q.SQLText, q.MaxRows, q.TimeoutMs, q.CreatedBy,
	).Scan(&q.ID, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create query: %w", err)
	}
	return q, nil
}

func (r *QueryRepo) GetByID(id, orgID string) (*model.Query, error) {
	q := &model.Query{}
	err := r.db.QueryRow(
		`SELECT id, org_id, datasource_id, name, sql_text, max_rows, timeout_ms, created_by, created_at, updated_at
		 FROM queries WHERE id=$1 AND org_id=$2`, id, orgID,
	).Scan(&q.ID, &q.OrgID, &q.DatasourceID, &q.Name, &q.SQLText, &q.MaxRows, &q.TimeoutMs, &q.CreatedBy, &q.CreatedAt, &q.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return q, nil
}

func (r *QueryRepo) ListByOrg(orgID string) ([]*model.Query, error) {
	rows, err := r.db.Query(
		`SELECT id, org_id, datasource_id, name, sql_text, max_rows, timeout_ms, created_by, created_at, updated_at
		 FROM queries WHERE org_id=$1 ORDER BY updated_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Query
	for rows.Next() {
		q := &model.Query{}
		if err := rows.Scan(&q.ID, &q.OrgID, &q.DatasourceID, &q.Name, &q.SQLText, &q.MaxRows, &q.TimeoutMs, &q.CreatedBy, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, q)
	}
	return list, rows.Err()
}

func (r *QueryRepo) Update(q *model.Query) error {
	_, err := r.db.Exec(
		`UPDATE queries SET datasource_id=$1, name=$2, sql_text=$3, max_rows=$4, timeout_ms=$5, updated_at=NOW()
		 WHERE id=$6 AND org_id=$7`,
		q.DatasourceID, q.Name, q.SQLText, q.MaxRows, q.TimeoutMs, q.ID, q.OrgID)
	return err
}

func (r *QueryRepo) Delete(id, orgID string) error {
	_, err := r.db.Exec(`DELETE FROM queries WHERE id=$1 AND org_id=$2`, id, orgID)
	return err
}

// ListQueryUsage returns every widget and dashboard that references a query.
// Both are scoped to the organization so a guessed ID cannot reveal another
// tenant's dashboard names.
func (r *QueryRepo) ListQueryUsage(queryID, orgID string) (*model.QueryUsage, error) {
	rows, err := r.db.Query(
		`SELECT w.id, w.widget_type, d.id, d.name
		 FROM widgets w
		 JOIN dashboards d ON d.id = w.dashboard_id
		 WHERE w.query_id = $1 AND d.org_id = $2
		 ORDER BY d.name, w.created_at`, queryID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	usage := &model.QueryUsage{Widgets: []model.WidgetUsage{}, Dashboards: []model.UsageRef{}}
	seenDashboard := make(map[string]bool)
	for rows.Next() {
		var widget model.WidgetUsage
		if err := rows.Scan(&widget.WidgetID, &widget.WidgetType, &widget.DashboardID, &widget.DashboardName); err != nil {
			return nil, err
		}
		usage.Widgets = append(usage.Widgets, widget)
		if !seenDashboard[widget.DashboardID] {
			seenDashboard[widget.DashboardID] = true
			usage.Dashboards = append(usage.Dashboards, model.UsageRef{
				ID:   widget.DashboardID,
				Name: widget.DashboardName,
			})
		}
	}
	return usage, rows.Err()
}

// ListDatasourceUsage returns the saved queries that use a datasource plus the
// widgets and dashboards that depend on those queries.
func (r *QueryRepo) ListDatasourceUsage(datasourceID, orgID string) (*model.DatasourceUsage, error) {
	usage := &model.DatasourceUsage{
		Queries:    []model.UsageRef{},
		Widgets:    []model.WidgetUsage{},
		Dashboards: []model.UsageRef{},
	}

	queryRows, err := r.db.Query(
		`SELECT id, name FROM queries
		 WHERE datasource_id = $1 AND org_id = $2
		 ORDER BY name`, datasourceID, orgID)
	if err != nil {
		return nil, err
	}
	for queryRows.Next() {
		var ref model.UsageRef
		if err := queryRows.Scan(&ref.ID, &ref.Name); err != nil {
			queryRows.Close()
			return nil, err
		}
		usage.Queries = append(usage.Queries, ref)
	}
	if err := queryRows.Err(); err != nil {
		queryRows.Close()
		return nil, err
	}
	queryRows.Close()

	widgetRows, err := r.db.Query(
		`SELECT DISTINCT w.id, w.widget_type, d.id, d.name
		 FROM widgets w
		 JOIN queries q ON q.id = w.query_id
		 JOIN dashboards d ON d.id = w.dashboard_id
		 WHERE q.datasource_id = $1 AND q.org_id = $2 AND d.org_id = $2
		 ORDER BY d.name, w.id`, datasourceID, orgID)
	if err != nil {
		return nil, err
	}
	defer widgetRows.Close()

	seenDashboard := make(map[string]bool)
	for widgetRows.Next() {
		var widget model.WidgetUsage
		if err := widgetRows.Scan(&widget.WidgetID, &widget.WidgetType, &widget.DashboardID, &widget.DashboardName); err != nil {
			return nil, err
		}
		usage.Widgets = append(usage.Widgets, widget)
		if !seenDashboard[widget.DashboardID] {
			seenDashboard[widget.DashboardID] = true
			usage.Dashboards = append(usage.Dashboards, model.UsageRef{
				ID:   widget.DashboardID,
				Name: widget.DashboardName,
			})
		}
	}
	return usage, widgetRows.Err()
}

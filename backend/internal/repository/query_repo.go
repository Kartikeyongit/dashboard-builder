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
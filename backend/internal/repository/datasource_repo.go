package repository

import (
	"database/sql"
	"fmt"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type DatasourceRepo struct {
	db *sql.DB
}

func NewDatasourceRepo(db *sql.DB) *DatasourceRepo {
	return &DatasourceRepo{db: db}
}

func (r *DatasourceRepo) Create(ds *model.Datasource) (*model.Datasource, error) {
	ds.ID = "" // let DB generate
	err := r.db.QueryRow(
		`INSERT INTO datasources (org_id, name, type, host, port, db_name, username, encrypted_password, ssl_mode)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, created_at, updated_at`,
		ds.OrgID, ds.Name, ds.Type, ds.Host, ds.Port, ds.DBName, ds.Username, ds.EncryptedPassword, ds.SSLMode,
	).Scan(&ds.ID, &ds.CreatedAt, &ds.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create datasource: %w", err)
	}
	return ds, nil
}

func (r *DatasourceRepo) GetByID(id, orgID string) (*model.Datasource, error) {
	ds := &model.Datasource{}
	err := r.db.QueryRow(
		`SELECT id, org_id, name, type, host, port, db_name, username, encrypted_password, ssl_mode, created_at, updated_at
		 FROM datasources WHERE id = $1 AND org_id = $2`,
		id, orgID,
	).Scan(&ds.ID, &ds.OrgID, &ds.Name, &ds.Type, &ds.Host, &ds.Port, &ds.DBName, &ds.Username,
		&ds.EncryptedPassword, &ds.SSLMode, &ds.CreatedAt, &ds.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get datasource: %w", err)
	}
	return ds, nil
}

func (r *DatasourceRepo) ListByOrg(orgID string) ([]*model.Datasource, error) {
	rows, err := r.db.Query(
		`SELECT id, org_id, name, type, host, port, db_name, username, encrypted_password, ssl_mode, created_at, updated_at
		 FROM datasources WHERE org_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, fmt.Errorf("list datasources: %w", err)
	}
	defer rows.Close()
	var list []*model.Datasource
	for rows.Next() {
		ds := &model.Datasource{}
		err := rows.Scan(&ds.ID, &ds.OrgID, &ds.Name, &ds.Type, &ds.Host, &ds.Port, &ds.DBName, &ds.Username,
			&ds.EncryptedPassword, &ds.SSLMode, &ds.CreatedAt, &ds.UpdatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, ds)
	}
	return list, rows.Err()
}

func (r *DatasourceRepo) Update(ds *model.Datasource) error {
	_, err := r.db.Exec(
		`UPDATE datasources SET name=$1, host=$2, port=$3, db_name=$4, username=$5, encrypted_password=$6, ssl_mode=$7, updated_at=NOW()
		 WHERE id=$8 AND org_id=$9`,
		ds.Name, ds.Host, ds.Port, ds.DBName, ds.Username, ds.EncryptedPassword, ds.SSLMode, ds.ID, ds.OrgID)
	return err
}

func (r *DatasourceRepo) Delete(id, orgID string) error {
	_, err := r.db.Exec(`DELETE FROM datasources WHERE id=$1 AND org_id=$2`, id, orgID)
	return err
}
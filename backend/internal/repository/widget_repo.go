package repository

import (
	"database/sql"
	"encoding/json"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

type WidgetRepo struct {
	db *sql.DB
}

func NewWidgetRepo(db *sql.DB) *WidgetRepo {
	return &WidgetRepo{db: db}
}

func (r *WidgetRepo) Create(w *model.Widget) (*model.Widget, error) {
	var configBytes []byte
	if w.Config != nil {
		configBytes = w.Config
	} else {
		configBytes = json.RawMessage("{}")
	}
	err := r.db.QueryRow(
		`INSERT INTO widgets (dashboard_id, query_id, widget_type, config_json, position_x, position_y, width, height, refresh_interval_override)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, created_at, updated_at`,
		w.DashboardID, w.QueryID, w.WidgetType, configBytes, w.PositionX, w.PositionY, w.Width, w.Height, w.RefreshIntervalOverride,
	).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WidgetRepo) GetByID(id string) (*model.Widget, error) {
	w := &model.Widget{}
	var configBytes []byte
	err := r.db.QueryRow(
		`SELECT id, dashboard_id, query_id, widget_type, config_json, position_x, position_y, width, height, refresh_interval_override, created_at, updated_at
		 FROM widgets WHERE id=$1`, id,
	).Scan(&w.ID, &w.DashboardID, &w.QueryID, &w.WidgetType, &configBytes, &w.PositionX, &w.PositionY, &w.Width, &w.Height, &w.RefreshIntervalOverride, &w.CreatedAt, &w.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	w.Config = json.RawMessage(configBytes)
	return w, err
}

func (r *WidgetRepo) ListByDashboard(dashboardID string) ([]*model.Widget, error) {
	rows, err := r.db.Query(
		`SELECT id, dashboard_id, query_id, widget_type, config_json, position_x, position_y, width, height, refresh_interval_override, created_at, updated_at
		 FROM widgets WHERE dashboard_id=$1 ORDER BY position_y, position_x`, dashboardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Widget
	for rows.Next() {
		w := &model.Widget{}
		var configBytes []byte
		if err := rows.Scan(&w.ID, &w.DashboardID, &w.QueryID, &w.WidgetType, &configBytes, &w.PositionX, &w.PositionY, &w.Width, &w.Height, &w.RefreshIntervalOverride, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		w.Config = json.RawMessage(configBytes)
		list = append(list, w)
	}
	return list, rows.Err()
}

func (r *WidgetRepo) Update(w *model.Widget) error {
	var configBytes []byte
	if w.Config != nil {
		configBytes = w.Config
	} else {
		configBytes = json.RawMessage("{}")
	}
	_, err := r.db.Exec(
		`UPDATE widgets SET query_id=$1, widget_type=$2, config_json=$3, position_x=$4, position_y=$5, width=$6, height=$7, refresh_interval_override=$8, updated_at=NOW()
		 WHERE id=$9`,
		w.QueryID, w.WidgetType, configBytes, w.PositionX, w.PositionY, w.Width, w.Height, w.RefreshIntervalOverride, w.ID)
	return err
}

func (r *WidgetRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM widgets WHERE id=$1`, id)
	return err
}
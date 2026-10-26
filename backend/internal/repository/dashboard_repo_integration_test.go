//go:build integration

package repository

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
	"github.com/your-org/dashboard-builder/backend/internal/model"
)

// Run with:
//
//	TEST_DB_URL=postgres://... go test -tags=integration ./internal/repository -run TestDashboardRepoIntegration -v
//
// The test creates its own org/user/datasource/query rows and removes them
// through the organizations cascade when it finishes.
func TestDashboardRepoIntegration(t *testing.T) {
	url := os.Getenv("TEST_DB_URL")
	if url == "" {
		t.Skip("TEST_DB_URL is not set")
	}
	db, err := sql.Open("postgres", url)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatalf("ping db: %v", err)
	}

	const (
		orgID    = "a1111111-1111-1111-1111-111111111111"
		userID   = "a2222222-2222-2222-2222-222222222222"
		dsID     = "a3333333-3333-3333-3333-333333333333"
		queryID  = "a4444444-4444-4444-4444-444444444444"
		otherOrg = "a9999999-9999-9999-9999-999999999999"
	)

	defer db.Exec(`DELETE FROM organizations WHERE id IN ($1, $2)`, orgID, otherOrg)

	mustExec(t, db, `INSERT INTO organizations (id, name) VALUES ($1, 'Integration Org'), ($2, 'Other Org')
		ON CONFLICT (id) DO NOTHING`, orgID, otherOrg)
	mustExec(t, db, `INSERT INTO users (id, org_id, email, password_hash, role)
		VALUES ($1, $2, 'integration@example.com', 'x', 'editor')
		ON CONFLICT (id) DO NOTHING`, userID, orgID)
	mustExec(t, db, `INSERT INTO datasources (id, org_id, name, type, host, port, db_name, username, encrypted_password)
		VALUES ($1, $2, 'Integration DS', 'postgres', 'localhost', 5432, 'postgres', 'postgres', 'x')
		ON CONFLICT (id) DO NOTHING`, dsID, orgID)
	mustExec(t, db, `INSERT INTO queries (id, org_id, datasource_id, name, sql_text, max_rows, timeout_ms, created_by)
		VALUES ($1, $2, $3, 'Integration Query', 'SELECT 1', 100, 1000, $4)
		ON CONFLICT (id) DO NOTHING`, queryID, orgID, dsID, userID)

	repo := NewDashboardRepo(db)
	widgetRepo := NewWidgetRepo(db)

	created, err := repo.Create(&model.Dashboard{
		OrgID:              orgID,
		Name:               "Filtered Dashboard",
		RefreshIntervalSec: 0,
		CreatedBy:          userID,
		Filters: []model.DashboardFilter{
			{ID: "start_date", Label: "Start date", Type: "date", Default: "2026-01-01"},
		},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if len(created.Filters) != 1 || created.Filters[0].ID != "start_date" {
		t.Fatalf("created filters = %#v", created.Filters)
	}

	fetched, err := repo.GetByID(created.ID, orgID)
	if err != nil || fetched == nil {
		t.Fatalf("get: %v, %v", fetched, err)
	}
	if len(fetched.Filters) != 1 || fetched.Filters[0].Default != "2026-01-01" {
		t.Fatalf("fetched filters = %#v", fetched.Filters)
	}

	if missing, err := repo.GetByID(created.ID, otherOrg); err != nil || missing != nil {
		t.Fatalf("cross-org get = %#v, %v", missing, err)
	}

	fetched.Filters = append(fetched.Filters, model.DashboardFilter{
		ID: "status", Label: "Status", Type: "select", Options: []string{"paid", "pending"},
	})
	if err := repo.Update(fetched); err != nil {
		t.Fatalf("update: %v", err)
	}
	updated, err := repo.GetByID(created.ID, orgID)
	if err != nil || updated == nil {
		t.Fatalf("get after update: %v, %v", updated, err)
	}
	if len(updated.Filters) != 2 || updated.Filters[1].ID != "status" {
		t.Fatalf("updated filters = %#v", updated.Filters)
	}

	_, err = widgetRepo.Create(&model.Widget{
		DashboardID: created.ID,
		QueryID:     queryID,
		WidgetType:  "table",
		Config:      []byte(`{"label":"Integration"}`),
		PositionX:   1,
		PositionY:   2,
		Width:       3,
		Height:      2,
	})
	if err != nil {
		t.Fatalf("create widget: %v", err)
	}

	dup, err := repo.Duplicate(created.ID, orgID, userID, "Filtered Dashboard (copy)")
	if err != nil || dup == nil {
		t.Fatalf("duplicate: %#v, %v", dup, err)
	}
	if dup.ID == created.ID || dup.Name != "Filtered Dashboard (copy)" {
		t.Fatalf("unexpected duplicate: %#v", dup)
	}
	if len(dup.Filters) != 2 || dup.Filters[1].ID != "status" {
		t.Fatalf("duplicate filters = %#v", dup.Filters)
	}

	dupWidgets, err := widgetRepo.ListByDashboard(dup.ID)
	if err != nil {
		t.Fatalf("list duplicate widgets: %v", err)
	}
	if len(dupWidgets) != 1 || dupWidgets[0].QueryID != queryID {
		t.Fatalf("duplicate widgets = %#v", dupWidgets)
	}
	if dupWidgets[0].PositionX != 1 || dupWidgets[0].PositionY != 2 {
		t.Fatalf("duplicate widget layout = %#v", dupWidgets[0])
	}

	if missing, err := repo.Duplicate(created.ID, otherOrg, userID, "nope"); err != nil || missing != nil {
		t.Fatalf("cross-org duplicate = %#v, %v", missing, err)
	}
}

func mustExec(t *testing.T, db *sql.DB, query string, args ...interface{}) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec: %v", err)
	}
}

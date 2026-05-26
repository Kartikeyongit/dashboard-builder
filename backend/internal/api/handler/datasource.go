package handler

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/dashboard-builder/backend/internal/datasource"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type DatasourceService struct {
	repo        *repository.DatasourceRepo
	poolManager *datasource.PoolManager // already present, just expose
	encKey      string
}

func (s *DatasourceService) PoolManager() *datasource.PoolManager {
	return s.poolManager
}

type DatasourceHandler struct {
	dsService *service.DatasourceService
}

func NewDatasourceHandler(dsService *service.DatasourceService) *DatasourceHandler {
	return &DatasourceHandler{dsService: dsService}
}

type CreateDatasourceRequest struct {
	Name     string `json:"name" validate:"required"`
	Type     string `json:"type" validate:"required,oneof=postgres mysql"`
	Host     string `json:"host" validate:"required"`
	Port     int    `json:"port" validate:"required"`
	DBName   string `json:"db_name" validate:"required"`
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
	SSLMode  string `json:"ssl_mode"`
}

func (h *DatasourceHandler) Create(c *fiber.Ctx) error {
	// actually we need orgID; we can get from DB or keep it in JWT claims. For now, use userID to query user's org.
	// Let's assume we fetch user's orgID from the repository. We'll add a quick helper.
	// But to keep it simple, we'll pass orgID from the middleware that stores it after auth.
	// I'll assume we have an orgID in the context. For now, we'll use a temporary solution.
	orgID := c.Locals("orgID").(string) // we'll set this later

	var req CreateDatasourceRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	ds, err := h.dsService.Create(orgID, req.Name, req.Type, req.Host, req.Port, req.DBName, req.Username, req.Password, req.SSLMode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(ds)
}

func (h *DatasourceHandler) List(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	list, err := h.dsService.ListByOrg(orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(list)
}

func (h *DatasourceHandler) Get(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	ds, err := h.dsService.GetByID(id, orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "datasource not found")
	}
	return c.JSON(ds)
}

func (h *DatasourceHandler) Update(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	var req CreateDatasourceRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request")
	}
	err := h.dsService.Update(id, orgID, req.Name, req.Host, req.Port, req.DBName, req.Username, req.Password, req.SSLMode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusOK)
}

func (h *DatasourceHandler) Delete(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	if err := h.dsService.Delete(id, orgID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *DatasourceHandler) TestConnection(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	if err := h.dsService.TestConnection(id, orgID); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, fmt.Sprintf("connection failed: %v", err))
	}
	return c.JSON(fiber.Map{"status": "success"})
}

func (h *DatasourceHandler) GetSchema(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")

	// Fetch datasource to know type
	ds, err := h.dsService.GetByID(id, orgID)
	if err != nil || ds == nil {
		return fiber.NewError(fiber.StatusNotFound, "datasource not found")
	}

	pool, err := h.dsService.PoolManager().GetPool(c.Context(), ds)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	var tables []TableSchema
	switch ds.Type {
	case "postgres":
		tables, err = fetchPostgresSchema(c.Context(), pool.(*pgxpool.Pool))
	case "mysql":
		tables, err = fetchMySQLSchema(c.Context(), pool.(*sql.DB))
	}
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(tables)
}

type TableSchema struct {
	TableName string        `json:"table_name"`
	Columns   []ColumnInfo  `json:"columns"`
}

type ColumnInfo struct {
	Name     string `json:"name"`
	DataType string `json:"data_type"`
}

func fetchPostgresSchema(ctx context.Context, pool *pgxpool.Pool) ([]TableSchema, error) {
	rows, err := pool.Query(ctx, `
		SELECT table_name, column_name, data_type
		FROM information_schema.columns
		WHERE table_schema = 'public'
		ORDER BY table_name, ordinal_position
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	schemaMap := make(map[string][]ColumnInfo)
	for rows.Next() {
		var table, column, dataType string
		if err := rows.Scan(&table, &column, &dataType); err != nil {
			return nil, err
		}
		schemaMap[table] = append(schemaMap[table], ColumnInfo{Name: column, DataType: dataType})
	}
	var result []TableSchema
	for table, cols := range schemaMap {
		result = append(result, TableSchema{TableName: table, Columns: cols})
	}
	return result, nil
}

func fetchMySQLSchema(ctx context.Context, db *sql.DB) ([]TableSchema, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
		FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE()
		ORDER BY TABLE_NAME, ORDINAL_POSITION
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	schemaMap := make(map[string][]ColumnInfo)
	for rows.Next() {
		var table, column, dataType string
		if err := rows.Scan(&table, &column, &dataType); err != nil {
			return nil, err
		}
		schemaMap[table] = append(schemaMap[table], ColumnInfo{Name: column, DataType: dataType})
	}
	var result []TableSchema
	for table, cols := range schemaMap {
		result = append(result, TableSchema{TableName: table, Columns: cols})
	}
	return result, nil
}
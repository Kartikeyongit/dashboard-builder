package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type QueryHandler struct {
	queryService *service.QueryService
}

func NewQueryHandler(queryService *service.QueryService) *QueryHandler {
	return &QueryHandler{queryService: queryService}
}

type CreateQueryRequest struct {
	DatasourceID string `json:"datasource_id"`
	Name         string `json:"name"`
	SQLText      string `json:"sql_text"`
	MaxRows      int    `json:"max_rows"`
	TimeoutMs    int    `json:"timeout_ms"`
}

func (h *QueryHandler) Create(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)

	var req CreateQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	// Defaults
	if req.MaxRows == 0 {
		req.MaxRows = 1000
	}
	if req.TimeoutMs == 0 {
		req.TimeoutMs = 30000
	}
	q, err := h.queryService.Create(orgID, req.DatasourceID, req.Name, req.SQLText, req.MaxRows, req.TimeoutMs, userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(q)
}

func (h *QueryHandler) Get(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	q, err := h.queryService.GetByID(id, orgID)
	if err != nil || q == nil {
		return fiber.NewError(fiber.StatusNotFound, "query not found")
	}
	return c.JSON(q)
}

func (h *QueryHandler) List(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	queries, err := h.queryService.ListByOrg(orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(queries)
}

func (h *QueryHandler) Update(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	var req CreateQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if err := h.queryService.Update(id, orgID, req.DatasourceID, req.Name, req.SQLText, req.MaxRows, req.TimeoutMs); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusOK)
}

func (h *QueryHandler) Delete(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	if err := h.queryService.Delete(id, orgID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *QueryHandler) ExecuteSaved(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	result, err := h.queryService.ExecuteSavedQuery(c.Context(), id, orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(result)
}

type ExecuteAdHocRequest struct {
	DatasourceID string `json:"datasource_id"`
	SQLText      string `json:"sql_text"`
	MaxRows      int    `json:"max_rows"`
	TimeoutMs    int    `json:"timeout_ms"`
}

func (h *QueryHandler) ExecuteAdHoc(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	var req ExecuteAdHocRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if req.MaxRows == 0 {
		req.MaxRows = 1000
	}
	if req.TimeoutMs == 0 {
		req.TimeoutMs = 30000
	}
	result, err := h.queryService.ExecuteAdHoc(c.Context(), orgID, req.DatasourceID, req.SQLText, req.MaxRows, req.TimeoutMs)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(result)
}
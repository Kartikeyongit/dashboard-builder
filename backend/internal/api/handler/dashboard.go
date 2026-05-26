package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type DashboardHandler struct {
	dashboardService *service.DashboardService
}

func NewDashboardHandler(dashboardService *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

type CreateDashboardRequest struct {
	Name                string `json:"name"`
	RefreshIntervalSec  int    `json:"refresh_interval_seconds"`
}

func (h *DashboardHandler) Create(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)
	var req CreateDashboardRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	dash, err := h.dashboardService.Create(orgID, req.Name, req.RefreshIntervalSec, userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(dash)
}

func (h *DashboardHandler) List(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	list, err := h.dashboardService.ListByOrg(orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(list)
}

func (h *DashboardHandler) Get(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	dash, err := h.dashboardService.GetByID(id, orgID)
	if err != nil || dash == nil {
		return fiber.NewError(fiber.StatusNotFound, "dashboard not found")
	}
	return c.JSON(dash)
}

func (h *DashboardHandler) Update(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	var req CreateDashboardRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if err := h.dashboardService.Update(id, orgID, req.Name, req.RefreshIntervalSec); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusOK)
}

func (h *DashboardHandler) Delete(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	id := c.Params("id")
	if err := h.dashboardService.Delete(id, orgID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
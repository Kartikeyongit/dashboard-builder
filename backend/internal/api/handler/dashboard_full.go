package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type DashboardFullHandler struct {
	widgetService *service.WidgetService
}

func NewDashboardFullHandler(widgetService *service.WidgetService) *DashboardFullHandler {
	return &DashboardFullHandler{widgetService: widgetService}
}

func (h *DashboardFullHandler) GetFull(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	dashboardID := c.Params("id")
	full, err := h.widgetService.LoadDashboardWithData(c.Context(), orgID, dashboardID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	}
	return c.JSON(full)
}
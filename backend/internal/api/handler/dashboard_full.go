package handler

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type DashboardFullHandler struct {
	widgetService *service.WidgetService
}

func NewDashboardFullHandler(widgetService *service.WidgetService) *DashboardFullHandler {
	return &DashboardFullHandler{widgetService: widgetService}
}

// filterOverrides reads filter values from query params prefixed with "f_".
// The prefix keeps filter params from colliding with other query options.
func filterOverrides(c *fiber.Ctx) map[string]string {
	overrides := make(map[string]string)
	c.Context().QueryArgs().VisitAll(func(key, value []byte) {
		name := string(key)
		if !strings.HasPrefix(name, "f_") {
			return
		}
		id := strings.TrimPrefix(name, "f_")
		if id == "" {
			return
		}
		overrides[id] = string(value)
	})
	return overrides
}

func (h *DashboardFullHandler) GetFull(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	dashboardID := c.Params("id")
	full, err := h.widgetService.LoadDashboardWithData(c.Context(), orgID, dashboardID, filterOverrides(c))
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	}
	return c.JSON(full)
}

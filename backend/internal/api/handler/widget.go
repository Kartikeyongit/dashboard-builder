package handler

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type WidgetHandler struct {
	widgetService *service.WidgetService
}

func NewWidgetHandler(widgetService *service.WidgetService) *WidgetHandler {
	return &WidgetHandler{widgetService: widgetService}
}

type CreateWidgetRequest struct {
	QueryID    string          `json:"query_id"`
	WidgetType string          `json:"widget_type"`
	Config     json.RawMessage `json:"config"`
	PositionX  int             `json:"position_x"`
	PositionY  int             `json:"position_y"`
	Width      int             `json:"width"`
	Height     int             `json:"height"`
}

func (h *WidgetHandler) Create(c *fiber.Ctx) error {
	dashboardID := c.Params("dashboardId")
	var req CreateWidgetRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	widget, err := h.widgetService.Create(dashboardID, req.QueryID, req.WidgetType, req.Config, req.PositionX, req.PositionY, req.Width, req.Height)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(widget)
}

func (h *WidgetHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		QueryID    *string         `json:"query_id,omitempty"`
		WidgetType *string         `json:"widget_type,omitempty"`
		Config     json.RawMessage `json:"config,omitempty"`
		PositionX  *int            `json:"position_x,omitempty"`
		PositionY  *int            `json:"position_y,omitempty"`
		Width      *int            `json:"width,omitempty"`
		Height     *int            `json:"height,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	widget, err := h.widgetService.GetByID(id)
	if err != nil || widget == nil {
		return fiber.NewError(fiber.StatusNotFound, "widget not found")
	}
	if req.QueryID != nil {
		widget.QueryID = *req.QueryID
	}
	if req.WidgetType != nil {
		widget.WidgetType = *req.WidgetType
	}
	if req.Config != nil {
		widget.Config = req.Config
	}
	if req.PositionX != nil {
		widget.PositionX = *req.PositionX
	}
	if req.PositionY != nil {
		widget.PositionY = *req.PositionY
	}
	if req.Width != nil {
		widget.Width = *req.Width
	}
	if req.Height != nil {
		widget.Height = *req.Height
	}
	if err := h.widgetService.Update(id, widget); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.JSON(widget)
}

func (h *WidgetHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.widgetService.Delete(id); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
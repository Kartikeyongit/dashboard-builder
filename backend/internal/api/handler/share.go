package handler

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type ShareHandler struct {
	shareService *service.ShareService
}

func NewShareHandler(shareService *service.ShareService) *ShareHandler {
	return &ShareHandler{shareService: shareService}
}

type CreateShareRequest struct {
	Password  *string `json:"password,omitempty"`
	ExpiresAt *string `json:"expires_at,omitempty"`
}

func (h *ShareHandler) CreateShareLink(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)
	dashboardID := c.Params("id")

	var req CreateShareRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "invalid expires_at format, use ISO8601")
		}
		expiresAt = &t
	}

	token, err := h.shareService.CreateShareLink(orgID, dashboardID, userID, req.Password, expiresAt)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"url":   fmt.Sprintf("http://localhost:5173/view/%s", token),
	})
}

type VerifyPasswordRequest struct {
	Password string `json:"password"`
}

func (h *ShareHandler) GetSharedDashboard(c *fiber.Ctx) error {
	token := c.Params("token")
	full, err := h.shareService.GetDashboardByToken(token, nil)
	if err == service.ErrPasswordRequired {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"password_required": true})
	}
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired share link")
	}
	return c.JSON(full)
}

func (h *ShareHandler) VerifyPassword(c *fiber.Ctx) error {
	token := c.Params("token")
	var req VerifyPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	full, err := h.shareService.GetDashboardByToken(token, &req.Password)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "incorrect password or invalid link")
	}
	return c.JSON(full)
}
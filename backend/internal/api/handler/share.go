package handler

import (
	"os"
	"strings"
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
		"url":   shareURL(c, token),
	})
}

// shareURL builds an absolute link to the public viewer. It prefers the
// configured FRONTEND_URL so links are correct behind a proxy, then falls back
// to the request origin, and finally to local development.
func shareURL(c *fiber.Ctx, token string) string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if base == "" {
		base = strings.TrimSpace(c.Get("Origin"))
	}
	if base == "" {
		scheme := "http"
		if c.Protocol() == "https" {
			scheme = "https"
		}
		base = scheme + "://" + c.Hostname()
	}
	base = strings.TrimRight(base, "/")
	return base + "/view/" + token
}

func (h *ShareHandler) ListShareLinks(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	dashboardID := c.Params("id")

	links, err := h.shareService.ListShareLinks(orgID, dashboardID)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	}

	out := make([]fiber.Map, 0, len(links))
	for _, link := range links {
		url := ""
		if link.Token != "" {
			url = shareURL(c, link.Token)
		}
		out = append(out, fiber.Map{
			"id":                 link.ID,
			"url":                url,
			"password_protected": link.PasswordProtected,
			"expires_at":         link.ExpiresAt,
			"last_used_at":       link.LastUsedAt,
			"created_at":         link.CreatedAt,
			"is_active":          link.IsActive,
			"token_available":    link.Token != "",
		})
	}
	return c.JSON(fiber.Map{"links": out})
}

func (h *ShareHandler) RevokeShareLink(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	dashboardID := c.Params("id")
	shareID := c.Params("shareId")

	if err := h.shareService.RevokeShareLink(orgID, dashboardID, shareID); err != nil {
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

type VerifyPasswordRequest struct {
	Password string `json:"password"`
}

func (h *ShareHandler) GetSharedDashboard(c *fiber.Ctx) error {
	token := c.Params("token")
	full, err := h.shareService.GetDashboardByToken(token, nil, filterOverrides(c))
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
	full, err := h.shareService.GetDashboardByToken(token, &req.Password, filterOverrides(c))
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "incorrect password or invalid link")
	}
	return c.JSON(full)
}

package handler

import (
	"errors"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/api/middleware"
	"github.com/your-org/dashboard-builder/backend/internal/model"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

type TeamHandler struct {
	teamService *service.TeamService
	authService *service.AuthService
}

func NewTeamHandler(teamService *service.TeamService, authService *service.AuthService) *TeamHandler {
	return &TeamHandler{teamService: teamService, authService: authService}
}

func (h *TeamHandler) ListMembers(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	members, err := h.teamService.ListMembers(orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not load members")
	}
	return c.JSON(fiber.Map{"members": members})
}

type inviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *TeamHandler) CreateInvite(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)

	var req inviteRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	invite, token, err := h.teamService.CreateInvite(orgID, userID, req.Email, req.Role)
	if err != nil {
		return teamError(err)
	}
	out := inviteJSON(invite)
	out["url"] = inviteURL(c, token)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"invite": out})
}

func (h *TeamHandler) ListInvites(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	invites, err := h.teamService.ListInvites(orgID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not load invites")
	}
	out := make([]fiber.Map, 0, len(invites))
	for _, invite := range invites {
		item := inviteJSON(invite)
		url := ""
		if invite.Token != "" {
			url = inviteURL(c, invite.Token)
		}
		item["url"] = url
		out = append(out, item)
	}
	return c.JSON(fiber.Map{"invites": out})
}

func (h *TeamHandler) RevokeInvite(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)
	if err := h.teamService.RevokeInvite(orgID, userID, c.Params("id")); err != nil {
		return teamError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

type roleRequest struct {
	Role string `json:"role"`
}

func (h *TeamHandler) UpdateMemberRole(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)

	var req roleRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	member, err := h.teamService.UpdateMemberRole(orgID, userID, c.Params("id"), req.Role)
	if err != nil {
		return teamError(err)
	}
	return c.JSON(member)
}

func (h *TeamHandler) RemoveMember(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)
	if err := h.teamService.RemoveMember(orgID, userID, c.Params("id")); err != nil {
		return teamError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// PreviewInvite is public so the signup page can show which team is inviting.
func (h *TeamHandler) PreviewInvite(c *fiber.Ctx) error {
	preview, err := h.teamService.PreviewInvite(c.Params("token"))
	if err != nil {
		return teamError(err)
	}
	return c.JSON(preview)
}

type acceptInviteRequest struct {
	DisplayName string `json:"display_name"`
	Password    string `json:"password"`
}

func (h *TeamHandler) AcceptInvite(c *fiber.Ctx) error {
	var req acceptInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	user, err := h.teamService.AcceptInvite(c.Params("token"), req.DisplayName, req.Password)
	if err != nil {
		return teamError(err)
	}
	tokens, err := h.authService.IssueTokens(user.ID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not start your session")
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"user":   user,
		"tokens": tokens,
	})
}

func (h *TeamHandler) GetSettings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	settings, err := h.teamService.GetSettings(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not load settings")
	}
	return c.JSON(settings)
}

type settingsRequest struct {
	DisplayName string `json:"display_name"`
	Timezone    string `json:"timezone"`
}

func (h *TeamHandler) UpdateSettings(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)

	var req settingsRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	settings, err := h.teamService.UpdateSettings(orgID, userID, req.DisplayName, req.Timezone)
	if err != nil {
		return teamError(err)
	}
	return c.JSON(settings)
}

type passwordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *TeamHandler) ChangePassword(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	userID := middleware.GetUserID(c)

	var req passwordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if err := h.teamService.ChangePassword(orgID, userID, req.CurrentPassword, req.NewPassword); err != nil {
		return teamError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TeamHandler) ListAudit(c *fiber.Ctx) error {
	orgID := c.Locals("orgID").(string)
	limit := c.QueryInt("limit", 100)
	events, err := h.teamService.ListAudit(orgID, limit)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "could not load activity")
	}
	return c.JSON(fiber.Map{"events": events})
}

func inviteURL(c *fiber.Ctx, token string) string {
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
	return strings.TrimRight(base, "/") + "/register?invite=" + url.QueryEscape(token)
}

func inviteJSON(invite *model.Invite) fiber.Map {
	return fiber.Map{
		"id":               invite.ID,
		"email":            invite.Email,
		"role":             invite.Role,
		"invited_by_email": invite.InvitedByEmail,
		"expires_at":       invite.ExpiresAt,
		"expired":          invite.ExpiresAt.Before(time.Now()),
		"created_at":       invite.CreatedAt,
	}
}

func teamError(err error) error {
	switch {
	case errors.Is(err, service.ErrInviteInvalid):
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrInviteEmailExists):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	case errors.Is(err, service.ErrMemberNotFound):
		return fiber.NewError(fiber.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrLastAdmin), errors.Is(err, service.ErrSelfRemoval):
		return fiber.NewError(fiber.StatusConflict, err.Error())
	case errors.Is(err, service.ErrInvalidRole),
		errors.Is(err, service.ErrInvalidEmail),
		errors.Is(err, service.ErrWeakPassword),
		errors.Is(err, service.ErrCurrentPassword):
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	default:
		return fiber.NewError(fiber.StatusInternalServerError, "request could not be completed")
	}
}

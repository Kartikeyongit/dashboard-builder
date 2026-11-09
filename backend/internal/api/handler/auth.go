package handler

import (
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/service"
)

const minRegisterPasswordLength = 6

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	OrgName  string `json:"org_name" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	// The validator tags above document the contract; enforce it here as well
	// because the router does not run a validation middleware.
	email := strings.ToLower(strings.TrimSpace(req.Email))
	orgName := strings.TrimSpace(req.OrgName)
	if !isValidEmailAddress(email) {
		return fiber.NewError(fiber.StatusBadRequest, "enter a valid email address")
	}
	if len(req.Password) < minRegisterPasswordLength {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 6 characters")
	}
	if orgName == "" {
		return fiber.NewError(fiber.StatusBadRequest, "organization name is required")
	}

	user, tokens, err := h.authService.Register(email, req.Password, orgName)
	if err != nil {
		return fiber.NewError(fiber.StatusConflict, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"user":   user,
		"tokens": tokens,
	})
}

// Matches the browser's deliberately simple check: one @, a dotted domain.
func isValidEmailAddress(email string) bool {
	if email == "" || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return false
	}
	at := strings.LastIndex(email, "@")
	return at > 0 && strings.Contains(email[at+1:], ".")
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	user, tokens, err := h.authService.Login(strings.ToLower(strings.TrimSpace(req.Email)), req.Password)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	return c.JSON(fiber.Map{
		"user":   user,
		"tokens": tokens,
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request")
	}
	tokens, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	return c.JSON(fiber.Map{"tokens": tokens})
}

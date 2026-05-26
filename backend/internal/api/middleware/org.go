package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/repository"
)

func AttachOrgID(c *fiber.Ctx) error {
	userID := GetUserID(c)
	userRepo := repository.NewUserRepo(db.DB)
	user, err := userRepo.GetByID(userID)
	if err != nil || user == nil {
		return fiber.NewError(fiber.StatusUnauthorized, "user not found")
	}
	c.Locals("orgID", user.OrgID)
	return c.Next()
}
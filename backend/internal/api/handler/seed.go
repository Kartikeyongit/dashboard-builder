package handler

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/internal/seed"
)

func SeedHandler(c *fiber.Ctx) error {
	secret := os.Getenv("SEED_SECRET")
	if secret == "" {
		return c.Status(fiber.StatusServiceUnavailable).SendString("Seed endpoint disabled")
	}

	if c.Query("token") != secret {
		return c.Status(fiber.StatusForbidden).SendString("Invalid token")
	}

	encKey := os.Getenv("ENCRYPTION_KEY")
	if err := seed.RunSeed(db.DB, encKey); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Seed failed: " + err.Error())
	}
	return c.SendString("Seed completed successfully")
}
// backend/internal/api/middleware/request_id.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func RequestID() fiber.Handler {
    return func(c *fiber.Ctx) error {
        id := uuid.New().String()
        c.Locals("requestID", id)
        c.Set("X-Request-ID", id)
        return c.Next()
    }
}
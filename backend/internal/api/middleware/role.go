package middleware

import "github.com/gofiber/fiber/v2"

// RequireRole allows only the listed roles through. It must run after
// AuthRequired and AttachOrgID, which populate the "role" local.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok || role == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "authentication required")
		}
		if _, ok := allowed[role]; !ok {
			return fiber.NewError(fiber.StatusForbidden, "you do not have permission to perform this action")
		}
		return c.Next()
	}
}

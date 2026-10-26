package middleware

import (
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	"github.com/golang-jwt/jwt/v4"
)

// AuthRequired – standard JWT from Authorization header (for REST)
func AuthRequired(secret string) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: []byte(secret),
		ContextKey: "user",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		},
	})
}

// AuthRequiredWS – JWT from query parameter "token" (for WebSocket)
func AuthRequiredWS(secret string) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey:  []byte(secret),
		ContextKey:  "user",
		TokenLookup: "query:token", // <-- this is the key change
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
		},
	})
}

// RequireAccessToken rejects refresh tokens on API and WebSocket routes. The
// two token types are signed with the same secret, so the claim is what keeps
// a long-lived refresh token from being usable as an access token.
func RequireAccessToken(c *fiber.Ctx) error {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok || token == nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
	}
	if typ, _ := claims["typ"].(string); typ != "access" {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
	}
	return c.Next()
}

// GetUserID extracts the user ID from the JWT stored in context.
func GetUserID(c *fiber.Ctx) string {
	token := c.Locals("user").(*jwt.Token)
	claims := token.Claims.(jwt.MapClaims)
	return claims["sub"].(string)
}

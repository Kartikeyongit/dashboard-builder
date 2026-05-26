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
        TokenLookup: "query:token",   // <-- this is the key change
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            return fiber.NewError(fiber.StatusUnauthorized, "invalid or expired token")
        },
    })
}

// GetUserID extracts the user ID from the JWT stored in context.
func GetUserID(c *fiber.Ctx) string {
    token := c.Locals("user").(*jwt.Token)
    claims := token.Claims.(jwt.MapClaims)
    return claims["sub"].(string)
}
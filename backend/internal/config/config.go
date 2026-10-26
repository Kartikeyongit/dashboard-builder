package config

import (
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

// Validate checks the security-critical environment values at startup.
// Failing fast is better than running with an empty or weak secret.
func Validate(jwtSecret, encryptionKey string) error {
	if strings.TrimSpace(jwtSecret) == "" {
		return errors.New("JWT_SECRET is required")
	}
	if len(jwtSecret) < 32 {
		return errors.New("JWT_SECRET must be at least 32 characters")
	}

	if strings.TrimSpace(encryptionKey) == "" {
		return errors.New("ENCRYPTION_KEY is required")
	}
	key, err := hex.DecodeString(encryptionKey)
	if err != nil {
		return fmt.Errorf("ENCRYPTION_KEY must be valid hex: %w", err)
	}
	if len(key) != 32 {
		return errors.New("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
	}
	return nil
}

// RequireEnv returns a clear error for a missing required environment variable.
func RequireEnv(name, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", name)
	}
	return nil
}

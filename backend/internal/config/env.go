package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// IntFromEnv reads a positive integer from the environment. Missing or invalid
// values fall back to def.
func IntFromEnv(name string, def int) int {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return def
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return def
	}
	return value
}

// SecondsFromEnv reads a non-negative duration in seconds. Zero is valid and
// is used to disable features such as the query result cache.
func SecondsFromEnv(name string, def time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return def
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return def
	}
	return time.Duration(value) * time.Second
}

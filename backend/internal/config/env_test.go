package config

import (
	"testing"
	"time"
)

func TestIntFromEnv(t *testing.T) {
	t.Setenv("TEST_INT", "")
	if got := IntFromEnv("TEST_INT", 6); got != 6 {
		t.Fatalf("empty value = %d, want default 6", got)
	}

	t.Setenv("TEST_INT", "3")
	if got := IntFromEnv("TEST_INT", 6); got != 3 {
		t.Fatalf("valid value = %d, want 3", got)
	}

	t.Setenv("TEST_INT", "not-a-number")
	if got := IntFromEnv("TEST_INT", 6); got != 6 {
		t.Fatalf("invalid value = %d, want default 6", got)
	}

	t.Setenv("TEST_INT", "0")
	if got := IntFromEnv("TEST_INT", 6); got != 6 {
		t.Fatalf("zero value = %d, want default 6", got)
	}
}

func TestSecondsFromEnv(t *testing.T) {
	t.Setenv("TEST_SECONDS", "")
	if got := SecondsFromEnv("TEST_SECONDS", 15*time.Second); got != 15*time.Second {
		t.Fatalf("empty value = %v, want 15s", got)
	}

	t.Setenv("TEST_SECONDS", "30")
	if got := SecondsFromEnv("TEST_SECONDS", 15*time.Second); got != 30*time.Second {
		t.Fatalf("valid value = %v, want 30s", got)
	}

	t.Setenv("TEST_SECONDS", "0")
	if got := SecondsFromEnv("TEST_SECONDS", 15*time.Second); got != 0 {
		t.Fatalf("zero value = %v, want 0", got)
	}

	t.Setenv("TEST_SECONDS", "-5")
	if got := SecondsFromEnv("TEST_SECONDS", 15*time.Second); got != 15*time.Second {
		t.Fatalf("negative value = %v, want default 15s", got)
	}
}

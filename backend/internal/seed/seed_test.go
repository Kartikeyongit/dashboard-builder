package seed

import "testing"

func TestParsePostgresURL(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		host    string
		port    int
		dbName  string
		user    string
		pass    string
		sslMode string
	}{
		{
			name:    "explicit disable",
			raw:     "postgres://app:secret@localhost:5432/dashboard?sslmode=disable",
			host:    "localhost",
			port:    5432,
			dbName:  "dashboard",
			user:    "app",
			pass:    "secret",
			sslMode: "disable",
		},
		{
			name:    "local defaults to disable",
			raw:     "postgres://app:secret@127.0.0.1:5433/dashboard",
			host:    "127.0.0.1",
			port:    5433,
			dbName:  "dashboard",
			user:    "app",
			pass:    "secret",
			sslMode: "disable",
		},
		{
			name:    "hosted defaults to require",
			raw:     "postgres://app:secret@db.example.neon.tech/dashboard",
			host:    "db.example.neon.tech",
			port:    5432,
			dbName:  "dashboard",
			user:    "app",
			pass:    "secret",
			sslMode: "require",
		},
		{
			name:    "explicit verify-full wins",
			raw:     "postgres://app:secret@db.example.neon.tech/dashboard?sslmode=verify-full",
			host:    "db.example.neon.tech",
			port:    5432,
			dbName:  "dashboard",
			user:    "app",
			pass:    "secret",
			sslMode: "verify-full",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			host, port, dbName, user, pass, sslMode, err := parsePostgresURL(tt.raw)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if host != tt.host || port != tt.port || dbName != tt.dbName || user != tt.user || pass != tt.pass || sslMode != tt.sslMode {
				t.Fatalf(
					"got host=%q port=%d db=%q user=%q pass=%q ssl=%q, want host=%q port=%d db=%q user=%q pass=%q ssl=%q",
					host, port, dbName, user, pass, sslMode,
					tt.host, tt.port, tt.dbName, tt.user, tt.pass, tt.sslMode,
				)
			}
		})
	}
}

func TestResolveDemoPassword(t *testing.T) {
	localURL := "postgres://app:secret@localhost:5432/dashboard?sslmode=disable"
	hostedURL := "postgres://app:secret@db.example.neon.tech/dashboard?sslmode=require"

	t.Run("local database uses default", func(t *testing.T) {
		got, err := resolveDemoPassword(localURL, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != defaultDemoPassword {
			t.Fatalf("got %q, want %q", got, defaultDemoPassword)
		}
	})

	t.Run("hosted database rejects default", func(t *testing.T) {
		if _, err := resolveDemoPassword(hostedURL, ""); err == nil {
			t.Fatal("expected an error for a hosted database without SEED_DEMO_PASSWORD")
		}
	})

	t.Run("hosted database accepts override", func(t *testing.T) {
		got, err := resolveDemoPassword(hostedURL, "a-strong-demo-password")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != "a-strong-demo-password" {
			t.Fatalf("got %q, want the override", got)
		}
	})

	t.Run("short override is rejected", func(t *testing.T) {
		if _, err := resolveDemoPassword(localURL, "short"); err == nil {
			t.Fatal("expected an error for a short SEED_DEMO_PASSWORD")
		}
	})

	t.Run("local database accepts override", func(t *testing.T) {
		got, err := resolveDemoPassword(localURL, "local-demo-password")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != "local-demo-password" {
			t.Fatalf("got %q, want the override", got)
		}
	})
}

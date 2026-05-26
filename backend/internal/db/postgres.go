package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect(databaseURL string) error {
	var err error
	DB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open db: %w", err)
	}
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping db: %w", err)
	}
	log.Println("Connected to PostgreSQL")
	return nil
}

func RunMigrations() error {
	dir := os.Getenv("MIGRATIONS_DIR")
	if dir == "" {
		// Fallback to the directory relative to this source file (local dev)
		_, b, _, _ := runtime.Caller(0)
		basePath := filepath.Dir(b)
		dir = filepath.Join(basePath, "migrations")
	}
	// Ensure migration tracking table exists
	_, err := DB.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY
	)`)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations: %w", err)
	}

	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read migrations dir: %w", err)
	}

	var upFiles []string
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".up.sql") {
			upFiles = append(upFiles, f.Name())
		}
	}
	sort.Strings(upFiles)

	for _, fileName := range upFiles {
		version := strings.TrimSuffix(fileName, ".up.sql")
		var exists bool
		err := DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		content, err := os.ReadFile(filepath.Join(dir, fileName))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", version, err)
		}
		_, err = DB.Exec(string(content))
		if err != nil {
			return fmt.Errorf("migration %s failed: %w", version, err)
		}
		_, err = DB.Exec(`INSERT INTO schema_migrations (version) VALUES ($1)`, version)
		if err != nil {
			return fmt.Errorf("failed to record migration %s: %w", version, err)
		}
		log.Printf("Applied migration: %s", version)
	}
	return nil
}
package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/your-org/dashboard-builder/backend/internal/config"
	"github.com/your-org/dashboard-builder/backend/internal/seed"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	encKey := os.Getenv("ENCRYPTION_KEY")

	// Fail with the name of the offending variable instead of a generic
	// "odd length hex string" from deep inside the seed.
	if err := config.RequireEnv("DB_URL", dbURL); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}
	if err := config.ValidateEncryptionKey(encKey); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	conn, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	if err := seed.RunSeed(conn, encKey); err != nil {
		log.Fatal(err)
	}
	log.Println("Seed completed!")
}

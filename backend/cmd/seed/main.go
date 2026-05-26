package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/your-org/dashboard-builder/backend/internal/seed"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	encKey := os.Getenv("ENCRYPTION_KEY")

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
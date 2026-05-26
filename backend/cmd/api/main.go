package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/your-org/dashboard-builder/backend/internal/api"
	"github.com/your-org/dashboard-builder/backend/internal/db"
	"github.com/your-org/dashboard-builder/backend/pkg/logger"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	// Initialize structured logger
	logger.Init()

	dbURL := os.Getenv("DB_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	encryptionKey := os.Getenv("ENCRYPTION_KEY")
	redisURL := os.Getenv("REDIS_URL")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Connect to PostgreSQL
	if err := db.Connect(dbURL); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	// Run migrations
	if err := db.RunMigrations(); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Connect to Redis
	if err := db.ConnectRedis(redisURL); err != nil {
		log.Fatalf("Redis connection failed: %v", err)
	}

	// Setup Fiber app
	app := fiber.New()
	api.SetupRoutes(app, jwtSecret, encryptionKey)

	// Health checks
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	app.Get("/readyz", func(c *fiber.Ctx) error {
		if err := db.DB.Ping(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).SendString("db not reachable")
		}
		if err := db.RedisClient.Ping(context.Background()).Err(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).SendString("redis not reachable")
		}
		return c.SendStatus(fiber.StatusOK)
	})

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Fatal(err)
	}

	// Cleanup
	// The pool manager is created inside SetupRoutes, we need to hold a reference to it
	// For simplicity, we'll add a global pool manager or pass it back.
	// Here we assume the pool manager is accessible; in production you'd refactor to return it.
	// For now, we'll skip explicit pool manager shutdown (will be closed with app shutdown).
	db.DB.Close()
	db.RedisClient.Close()
}
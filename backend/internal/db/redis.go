package db

import (
	"context"
	"log"
	"strings"

	"github.com/redis/go-redis/v9"
)

// RedisClient is nil when REDIS_URL is not configured. In that mode the app
// uses in-process pub/sub and an in-process scheduler lock, which is correct
// for a single backend instance (including the free Render tier).
var RedisClient *redis.Client

// RedisEnabled reports whether a Redis connection is configured.
func RedisEnabled() bool {
	return RedisClient != nil
}

func ConnectRedis(redisURL string) error {
	redisURL = strings.TrimSpace(redisURL)
	if redisURL == "" {
		RedisClient = nil
		log.Println("REDIS_URL not set: using in-process pub/sub (single-instance mode)")
		return nil
	}

	// If no scheme is present, prepend "redis://"
	if !strings.Contains(redisURL, "://") {
		redisURL = "redis://" + redisURL
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return err
	}
	RedisClient = redis.NewClient(opts)
	return RedisClient.Ping(context.Background()).Err()
}

// CloseRedis closes the client if one is configured.
func CloseRedis() {
	if RedisClient != nil {
		_ = RedisClient.Close()
		RedisClient = nil
	}
}

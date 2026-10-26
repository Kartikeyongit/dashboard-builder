package db

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient is nil when REDIS_URL is not configured. In that mode the app
// uses in-process pub/sub and an in-process scheduler lock, which is correct
// for a single backend instance (including the free Render tier).
var RedisClient *redis.Client

// RedisEnabled reports whether a working Redis connection is configured.
func RedisEnabled() bool {
	return RedisClient != nil
}

// ConnectRedis connects to Redis if redisURL is non-empty. Redis is optional:
// an empty value means single-instance mode. If the URL is present but Redis
// cannot be reached, the client is discarded and an error is returned so the
// caller can log it and continue without Redis.
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

	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		// Do not leave a broken client behind: RedisEnabled() must stay false
		// so the rest of the app uses the in-process fallbacks.
		_ = client.Close()
		RedisClient = nil
		return err
	}

	RedisClient = client
	return nil
}

// CloseRedis closes the client if one is configured.
func CloseRedis() {
	if RedisClient != nil {
		_ = RedisClient.Close()
		RedisClient = nil
	}
}

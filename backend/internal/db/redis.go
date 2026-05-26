package db

import (
    "context"
    "strings"
    "github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func ConnectRedis(redisURL string) error {
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
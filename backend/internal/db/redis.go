package db

import (
    "context"
    "github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func ConnectRedis(redisURL string) error {
    opts, err := redis.ParseURL(redisURL)
    if err != nil {
        return err
    }
    RedisClient = redis.NewClient(opts)
    return RedisClient.Ping(context.Background()).Err()
}
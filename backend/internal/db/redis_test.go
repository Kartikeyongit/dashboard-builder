package db

import "testing"

func TestConnectRedisEmptyIsDisabled(t *testing.T) {
	previous := RedisClient
	t.Cleanup(func() { RedisClient = previous })

	RedisClient = nil
	if err := ConnectRedis("   "); err != nil {
		t.Fatalf("empty REDIS_URL should be allowed, got: %v", err)
	}
	if RedisEnabled() {
		t.Fatal("expected Redis to be disabled")
	}
	// Closing when disabled must be a no-op.
	CloseRedis()
}

func TestConnectRedisRejectsInvalidURL(t *testing.T) {
	previous := RedisClient
	t.Cleanup(func() { RedisClient = previous })

	RedisClient = nil
	if err := ConnectRedis("://not-a-url"); err == nil {
		t.Fatal("expected an error for an invalid Redis URL")
	}
}

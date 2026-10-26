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
	if RedisEnabled() {
		t.Fatal("a failed connection must not leave Redis enabled")
	}
}

func TestConnectRedisUnreachableDisablesClient(t *testing.T) {
	previous := RedisClient
	t.Cleanup(func() { RedisClient = previous })

	RedisClient = nil
	// Port 1 on localhost is not a Redis server, so the ping fails quickly.
	// The app must fall back to single-instance mode instead of keeping a
	// broken client (this is the stale-URL case on Render).
	if err := ConnectRedis("redis://127.0.0.1:1"); err == nil {
		t.Fatal("expected an error for an unreachable Redis")
	}
	if RedisEnabled() {
		t.Fatal("a failed connection must not leave Redis enabled")
	}
}

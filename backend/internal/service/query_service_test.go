package service

import "testing"

func TestNormalizeQueryLimits(t *testing.T) {
	tests := []struct {
		name        string
		maxRows     int
		timeoutMs   int
		wantRows    int
		wantTimeout int
	}{
		{name: "zero uses defaults", maxRows: 0, timeoutMs: 0, wantRows: DefaultMaxRows, wantTimeout: DefaultTimeoutMs},
		{name: "negative uses defaults", maxRows: -5, timeoutMs: -1, wantRows: DefaultMaxRows, wantTimeout: DefaultTimeoutMs},
		{name: "caps rows", maxRows: 1_000_000, timeoutMs: 5000, wantRows: MaxAllowedRows, wantTimeout: 5000},
		{name: "caps timeout", maxRows: 100, timeoutMs: 999_999, wantRows: 100, wantTimeout: MaxAllowedTimeoutMs},
		{name: "minimum timeout", maxRows: 100, timeoutMs: 1, wantRows: 100, wantTimeout: MinAllowedTimeoutMs},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rows, timeout := NormalizeQueryLimits(tt.maxRows, tt.timeoutMs)
			if rows != tt.wantRows {
				t.Fatalf("rows = %d, want %d", rows, tt.wantRows)
			}
			if timeout != tt.wantTimeout {
				t.Fatalf("timeout = %d, want %d", timeout, tt.wantTimeout)
			}
		})
	}
}

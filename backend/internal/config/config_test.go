package config

import (
	"strings"
	"testing"
)

func TestValidate(t *testing.T) {
	validKey := strings.Repeat("ab", 32)

	tests := []struct {
		name     string
		jwt      string
		key      string
		wantErr  bool
		errMatch string
	}{
		{name: "valid", jwt: strings.Repeat("j", 32), key: validKey},
		{name: "empty jwt", jwt: "", key: validKey, wantErr: true, errMatch: "JWT_SECRET is required"},
		{name: "short jwt", jwt: "short", key: validKey, wantErr: true, errMatch: "at least 32"},
		{name: "empty key", jwt: strings.Repeat("j", 32), key: "", wantErr: true, errMatch: "ENCRYPTION_KEY is required"},
		{name: "invalid hex", jwt: strings.Repeat("j", 32), key: "not-hex", wantErr: true, errMatch: "valid hex"},
		{name: "short key", jwt: strings.Repeat("j", 32), key: "abcd", wantErr: true, errMatch: "64 hex"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.jwt, tt.key)
			if tt.wantErr && err == nil {
				t.Fatal("expected an error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.errMatch != "" && (err == nil || !strings.Contains(err.Error(), tt.errMatch)) {
				t.Fatalf("expected error containing %q, got %v", tt.errMatch, err)
			}
		})
	}
}

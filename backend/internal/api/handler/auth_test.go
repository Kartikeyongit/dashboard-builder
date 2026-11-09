package handler

import "testing"

func TestIsValidEmailAddress(t *testing.T) {
	tests := []struct {
		email string
		want  bool
	}{
		{"admin@acme.com", true},
		{"reader+dashboards@sub.example.co.uk", true},
		{"", false},
		{"admin", false},
		{"admin@acme", false},
		{"admin @acme.com", false},
		{"@acme.com", false},
		{"admin@.com", false},
	}

	for _, test := range tests {
		if got := isValidEmailAddress(test.email); got != test.want {
			t.Errorf("isValidEmailAddress(%q) = %v, want %v", test.email, got, test.want)
		}
	}
}

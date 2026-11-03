package scheduler

import (
	"testing"
	"time"
)

func TestEffectiveWidgetInterval(t *testing.T) {
	pointer := func(v int) *int { return &v }

	tests := []struct {
		name      string
		override  *int
		dashboard int
		want      time.Duration
	}{
		{name: "inherits dashboard", override: nil, dashboard: 60, want: 60 * time.Second},
		{name: "override wins", override: pointer(15), dashboard: 60, want: 15 * time.Second},
		{name: "zero never refreshes", override: pointer(0), dashboard: 60, want: 0},
		{name: "zero dashboard never refreshes", override: nil, dashboard: 0, want: 0},
		{name: "override on zero dashboard runs", override: pointer(30), dashboard: 0, want: 30 * time.Second},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := effectiveWidgetInterval(tc.override, tc.dashboard); got != tc.want {
				t.Fatalf("effectiveWidgetInterval() = %v, want %v", got, tc.want)
			}
		})
	}
}

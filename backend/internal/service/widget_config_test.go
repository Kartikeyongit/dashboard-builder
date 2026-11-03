package service

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeWidgetType(t *testing.T) {
	for _, input := range []string{"chart", "table", "metric", " chart "} {
		if _, err := NormalizeWidgetType(input); err != nil {
			t.Fatalf("NormalizeWidgetType(%q) returned error: %v", input, err)
		}
	}
	if _, err := NormalizeWidgetType("gauge"); err == nil {
		t.Fatal("expected unknown widget type to fail")
	}
}

func TestNormalizeWidgetLayout(t *testing.T) {
	x, y, w, h, err := NormalizeWidgetLayout(1, 2, 6, 4)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if x != 1 || y != 2 || w != 6 || h != 4 {
		t.Fatalf("layout changed: %d %d %d %d", x, y, w, h)
	}

	// Zero sizes fall back to the default 4x4 instead of failing.
	x, y, w, h, err = NormalizeWidgetLayout(0, 0, 0, 0)
	if err != nil {
		t.Fatalf("default layout returned error: %v", err)
	}
	if x != 0 || y != 0 || w != 4 || h != 4 {
		t.Fatalf("unexpected defaults: %d %d %d %d", x, y, w, h)
	}

	invalid := []struct {
		x, y, w, h int
	}{
		{0, 0, 13, 4},    // wider than the grid
		{10, 0, 4, 4},    // overflows the right edge
		{-1, 0, 4, 4},    // negative column
		{0, -1, 4, 4},    // negative row
		{0, 0, 4, 41},    // too tall
		{0, 20000, 4, 4}, // absurd row
	}
	for _, tc := range invalid {
		if _, _, _, _, err := NormalizeWidgetLayout(tc.x, tc.y, tc.w, tc.h); err == nil {
			t.Fatalf("expected layout %+v to fail", tc)
		}
	}
}

func TestNormalizeWidgetRefreshOverride(t *testing.T) {
	if override, err := NormalizeWidgetRefreshOverride(nil); err != nil || override != nil {
		t.Fatalf("nil override should stay nil, got %v err %v", override, err)
	}
	never := 0
	override, err := NormalizeWidgetRefreshOverride(&never)
	if err != nil || override == nil || *override != 0 {
		t.Fatalf("zero override should be preserved, got %v err %v", override, err)
	}
	valid := 30
	override, err = NormalizeWidgetRefreshOverride(&valid)
	if err != nil || override == nil || *override != 30 {
		t.Fatalf("valid override changed, got %v err %v", override, err)
	}
	for _, invalid := range []int{1, 4, 86401, -5} {
		value := invalid
		if _, err := NormalizeWidgetRefreshOverride(&value); err == nil {
			t.Fatalf("expected override %d to fail", invalid)
		}
	}
}

func TestNormalizeWidgetConfigChart(t *testing.T) {
	raw := json.RawMessage(`{
		"chartType": " bar ",
		"title": "  Revenue  ",
		"palette": "ocean",
		"showLegend": true,
		"showLabels": false,
		"numberFormat": "currency",
		"unknown": "drop me",
		"threshold": {"value": 10, "direction": "below", "tone": "warning"}
	}`)
	got, err := NormalizeWidgetConfig("chart", raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var fields map[string]interface{}
	if err := json.Unmarshal(got, &fields); err != nil {
		t.Fatalf("invalid JSON output: %v", err)
	}
	if fields["chartType"] != "bar" || fields["title"] != "Revenue" || fields["palette"] != "ocean" {
		t.Fatalf("values not normalized: %#v", fields)
	}
	if _, ok := fields["unknown"]; ok {
		t.Fatalf("unknown key was stored: %#v", fields)
	}
	if _, ok := fields["threshold"]; ok {
		// Thresholds only apply to metrics.
		t.Fatalf("chart config kept a threshold: %#v", fields)
	}
}

func TestNormalizeWidgetConfigDropsTypeSpecificKeys(t *testing.T) {
	raw := json.RawMessage(`{"density": "compact", "chartType": "pie", "title": "T"}`)
	got, err := NormalizeWidgetConfig("table", raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var fields map[string]interface{}
	if err := json.Unmarshal(got, &fields); err != nil {
		t.Fatalf("invalid JSON output: %v", err)
	}
	if fields["density"] != "compact" || fields["title"] != "T" {
		t.Fatalf("table config lost valid fields: %#v", fields)
	}
	if _, ok := fields["chartType"]; ok {
		t.Fatalf("table config kept chartType: %#v", fields)
	}
}

func TestNormalizeWidgetConfigMetric(t *testing.T) {
	raw := json.RawMessage(`{
		"label": "Active users",
		"prefix": "$",
		"suffix": "k",
		"decimals": 2,
		"threshold": {"value": 100, "direction": "above", "tone": "success"}
	}`)
	got, err := NormalizeWidgetConfig("metric", raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var fields map[string]interface{}
	if err := json.Unmarshal(got, &fields); err != nil {
		t.Fatalf("invalid JSON output: %v", err)
	}
	threshold, ok := fields["threshold"].(map[string]interface{})
	if !ok {
		t.Fatalf("threshold missing: %#v", fields)
	}
	if threshold["value"] != float64(100) || threshold["direction"] != "above" || threshold["tone"] != "success" {
		t.Fatalf("threshold not normalized: %#v", threshold)
	}
	if fields["decimals"] != float64(2) {
		t.Fatalf("decimals not preserved: %#v", fields)
	}
}

func TestNormalizeWidgetConfigThresholdDefaults(t *testing.T) {
	got, err := NormalizeWidgetConfig("metric", json.RawMessage(`{"threshold": {"value": 5}}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var fields map[string]interface{}
	if err := json.Unmarshal(got, &fields); err != nil {
		t.Fatalf("invalid JSON output: %v", err)
	}
	threshold := fields["threshold"].(map[string]interface{})
	if threshold["direction"] != "above" || threshold["tone"] != "danger" {
		t.Fatalf("threshold defaults missing: %#v", threshold)
	}
}

func TestNormalizeWidgetConfigRejectsInvalid(t *testing.T) {
	tests := []struct {
		name       string
		widgetType string
		raw        string
	}{
		{name: "not an object", widgetType: "chart", raw: `[]`},
		{name: "bad chart type", widgetType: "chart", raw: `{"chartType":"radar"}`},
		{name: "bad palette", widgetType: "chart", raw: `{"palette":"rainbow"}`},
		{name: "bad number format", widgetType: "metric", raw: `{"numberFormat":"money"}`},
		{name: "bad density", widgetType: "table", raw: `{"density":"huge"}`},
		{name: "bad visible columns", widgetType: "table", raw: `{"visibleColumns":"a"}`},
		{name: "bad decimals", widgetType: "metric", raw: `{"decimals":9}`},
		{name: "threshold without value", widgetType: "metric", raw: `{"threshold":{"tone":"danger"}}`},
		{name: "bad threshold tone", widgetType: "metric", raw: `{"threshold":{"value":1,"tone":"purple"}}`},
		{name: "too large", widgetType: "chart", raw: `{"title":"` + strings.Repeat("a", maxWidgetConfigBytes) + `"}`},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := NormalizeWidgetConfig(tc.widgetType, json.RawMessage(tc.raw)); err == nil {
				t.Fatal("expected error, got nil")
			}
		})
	}
}

func TestNormalizeWidgetConfigEmpty(t *testing.T) {
	got, err := NormalizeWidgetConfig("chart", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(got) != "{}" {
		t.Fatalf("empty config should be {}, got %s", got)
	}
}

func TestNormalizeWidgetConfigVisibleColumns(t *testing.T) {
	raw := json.RawMessage(`{"visibleColumns": ["name", " name ", "", "Country"]}`)
	got, err := NormalizeWidgetConfig("table", raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var fields struct {
		VisibleColumns []string `json:"visibleColumns"`
	}
	if err := json.Unmarshal(got, &fields); err != nil {
		t.Fatalf("invalid JSON output: %v", err)
	}
	if len(fields.VisibleColumns) != 2 || fields.VisibleColumns[0] != "name" || fields.VisibleColumns[1] != "Country" {
		t.Fatalf("visible columns not cleaned: %#v", fields.VisibleColumns)
	}
}

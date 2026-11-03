package service

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Widget config is user-editable JSON. The API validates and normalizes it so
// the renderer can trust enum values and types without defensive code in every
// component. Unknown keys are dropped instead of stored, which keeps saved
// configs small and predictable.
const (
	maxWidgetConfigBytes = 16 * 1024
	maxWidgetTitle       = 120
	maxWidgetDescription = 280
	maxWidgetAxisTitle   = 60
	maxWidgetLabel       = 120
	maxWidgetAffix       = 16
	maxWidgetTableCols   = 80
	maxWidgetColumnKey   = 120
	maxWidgetDecimals    = 6
	maxWidgetHeight      = 40
	maxWidgetY           = 10000
	minWidgetRefreshSec  = 5
	maxWidgetRefreshSec  = 86400
)

var allowedWidgetTypes = map[string]struct{}{
	"chart":  {},
	"table":  {},
	"metric": {},
}

var allowedChartTypes = map[string]struct{}{
	"bar":        {},
	"hbar":       {},
	"stackedBar": {},
	"line":       {},
	"area":       {},
	"pie":        {},
	"donut":      {},
	"scatter":    {},
}

var allowedNumberFormats = map[string]struct{}{
	"auto":     {},
	"integer":  {},
	"decimal":  {},
	"currency": {},
	"percent":  {},
	"compact":  {},
	"duration": {},
}

var allowedPalettes = map[string]struct{}{
	"default": {},
	"ocean":   {},
	"warm":    {},
	"forest":  {},
	"mono":    {},
}

var allowedTableDensity = map[string]struct{}{
	"normal":  {},
	"compact": {},
}

var allowedThresholdDirections = map[string]struct{}{
	"above": {},
	"below": {},
}

var allowedThresholdTones = map[string]struct{}{
	"success": {},
	"warning": {},
	"danger":  {},
}

// NormalizeWidgetType validates the widget kind.
func NormalizeWidgetType(widgetType string) (string, error) {
	widgetType = strings.TrimSpace(widgetType)
	if _, ok := allowedWidgetTypes[widgetType]; !ok {
		return "", fmt.Errorf("widget_type must be chart, table, or metric")
	}
	return widgetType, nil
}

// NormalizeWidgetLayout keeps widgets inside the 12-column grid and rejects
// nonsensical sizes before they reach the database.
func NormalizeWidgetLayout(x, y, w, h int) (int, int, int, int, error) {
	if w <= 0 {
		w = 4
	}
	if h <= 0 {
		h = 4
	}
	if w > 12 {
		return 0, 0, 0, 0, fmt.Errorf("widget width must be between 1 and 12 columns")
	}
	if h > maxWidgetHeight {
		return 0, 0, 0, 0, fmt.Errorf("widget height must be between 1 and %d rows", maxWidgetHeight)
	}
	if x < 0 || y < 0 {
		return 0, 0, 0, 0, fmt.Errorf("widget position cannot be negative")
	}
	if y > maxWidgetY {
		return 0, 0, 0, 0, fmt.Errorf("widget row is too large")
	}
	if x+w > 12 {
		return 0, 0, 0, 0, fmt.Errorf("widget must fit within the 12-column grid")
	}
	return x, y, w, h, nil
}

// NormalizeWidgetRefreshOverride validates a per-widget refresh interval.
// nil means "inherit the dashboard interval"; 0 means "never refresh".
func NormalizeWidgetRefreshOverride(seconds *int) (*int, error) {
	if seconds == nil {
		return nil, nil
	}
	value := *seconds
	if value == 0 {
		return &value, nil
	}
	if value < minWidgetRefreshSec || value > maxWidgetRefreshSec {
		return nil, fmt.Errorf("widget refresh interval must be 0 or between %d and %d seconds", minWidgetRefreshSec, maxWidgetRefreshSec)
	}
	return &value, nil
}

// NormalizeWidgetConfig validates the type-specific config object.
func NormalizeWidgetConfig(widgetType string, raw json.RawMessage) (json.RawMessage, error) {
	if len(raw) == 0 {
		return json.RawMessage("{}"), nil
	}
	if len(raw) > maxWidgetConfigBytes {
		return nil, fmt.Errorf("widget config is too large (max %d bytes)", maxWidgetConfigBytes)
	}

	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || fields == nil {
		return nil, fmt.Errorf("widget config must be a JSON object")
	}

	out := map[string]interface{}{}
	if err := takeText(fields, out, "title", maxWidgetTitle); err != nil {
		return nil, err
	}
	if err := takeText(fields, out, "description", maxWidgetDescription); err != nil {
		return nil, err
	}
	if err := takeEnum(fields, out, "numberFormat", allowedNumberFormats, "number format"); err != nil {
		return nil, err
	}

	switch widgetType {
	case "chart":
		if err := takeEnum(fields, out, "chartType", allowedChartTypes, "chart type"); err != nil {
			return nil, err
		}
		if err := takeBool(fields, out, "showLegend"); err != nil {
			return nil, err
		}
		if err := takeBool(fields, out, "showLabels"); err != nil {
			return nil, err
		}
		if err := takeBool(fields, out, "showGrid"); err != nil {
			return nil, err
		}
		if err := takeText(fields, out, "xAxisTitle", maxWidgetAxisTitle); err != nil {
			return nil, err
		}
		if err := takeText(fields, out, "yAxisTitle", maxWidgetAxisTitle); err != nil {
			return nil, err
		}
		if err := takeEnum(fields, out, "palette", allowedPalettes, "color palette"); err != nil {
			return nil, err
		}
	case "table":
		if err := takeStringList(fields, out, "visibleColumns", maxWidgetTableCols, maxWidgetColumnKey); err != nil {
			return nil, err
		}
		if err := takeEnum(fields, out, "density", allowedTableDensity, "table density"); err != nil {
			return nil, err
		}
		if err := takeBool(fields, out, "pinFirstColumn"); err != nil {
			return nil, err
		}
	case "metric":
		if err := takeText(fields, out, "label", maxWidgetLabel); err != nil {
			return nil, err
		}
		if err := takeText(fields, out, "prefix", maxWidgetAffix); err != nil {
			return nil, err
		}
		if err := takeText(fields, out, "suffix", maxWidgetAffix); err != nil {
			return nil, err
		}
		if err := takeIntRange(fields, out, "decimals", 0, maxWidgetDecimals); err != nil {
			return nil, err
		}
		if err := takeThreshold(fields, out); err != nil {
			return nil, err
		}
	}

	return json.Marshal(out)
}

func takeText(fields map[string]json.RawMessage, out map[string]interface{}, key string, limit int) error {
	raw, ok := fields[key]
	if !ok {
		return nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return fmt.Errorf("config.%s must be a string", key)
	}
	out[key] = truncateRunes(strings.TrimSpace(value), limit)
	return nil
}

func takeEnum(fields map[string]json.RawMessage, out map[string]interface{}, key string, allowed map[string]struct{}, label string) error {
	raw, ok := fields[key]
	if !ok {
		return nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return fmt.Errorf("config.%s must be a string", key)
	}
	value = strings.TrimSpace(value)
	if _, ok := allowed[value]; !ok {
		return fmt.Errorf("unknown %s %q", label, value)
	}
	out[key] = value
	return nil
}

func takeBool(fields map[string]json.RawMessage, out map[string]interface{}, key string) error {
	raw, ok := fields[key]
	if !ok {
		return nil
	}
	var value bool
	if err := json.Unmarshal(raw, &value); err != nil {
		return fmt.Errorf("config.%s must be a boolean", key)
	}
	out[key] = value
	return nil
}

func takeIntRange(fields map[string]json.RawMessage, out map[string]interface{}, key string, min, max int) error {
	raw, ok := fields[key]
	if !ok {
		return nil
	}
	var value int
	if err := json.Unmarshal(raw, &value); err != nil {
		return fmt.Errorf("config.%s must be a whole number", key)
	}
	if value < min || value > max {
		return fmt.Errorf("config.%s must be between %d and %d", key, min, max)
	}
	out[key] = value
	return nil
}

func takeStringList(fields map[string]json.RawMessage, out map[string]interface{}, key string, maxItems, maxLen int) error {
	raw, ok := fields[key]
	if !ok {
		return nil
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return fmt.Errorf("config.%s must be a list of column names", key)
	}
	clean := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = truncateRunes(strings.TrimSpace(value), maxLen)
		if value == "" {
			continue
		}
		lower := strings.ToLower(value)
		if _, ok := seen[lower]; ok {
			continue
		}
		seen[lower] = struct{}{}
		clean = append(clean, value)
		if len(clean) > maxItems {
			return fmt.Errorf("config.%s has too many columns (max %d)", key, maxItems)
		}
	}
	out[key] = clean
	return nil
}

func takeThreshold(fields map[string]json.RawMessage, out map[string]interface{}) error {
	raw, ok := fields["threshold"]
	if !ok {
		return nil
	}
	var threshold struct {
		Value     *float64 `json:"value"`
		Direction string   `json:"direction"`
		Tone      string   `json:"tone"`
	}
	if err := json.Unmarshal(raw, &threshold); err != nil || threshold.Value == nil {
		return fmt.Errorf("config.threshold must include a numeric value")
	}
	if threshold.Direction == "" {
		threshold.Direction = "above"
	}
	if _, ok := allowedThresholdDirections[threshold.Direction]; !ok {
		return fmt.Errorf("unknown threshold direction %q", threshold.Direction)
	}
	if threshold.Tone == "" {
		threshold.Tone = "danger"
	}
	if _, ok := allowedThresholdTones[threshold.Tone]; !ok {
		return fmt.Errorf("unknown threshold tone %q", threshold.Tone)
	}
	out["threshold"] = map[string]interface{}{
		"value":     *threshold.Value,
		"direction": threshold.Direction,
		"tone":      threshold.Tone,
	}
	return nil
}

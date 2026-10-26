package model

import "testing"

func TestFilterDefaults(t *testing.T) {
	d := &Dashboard{Filters: []DashboardFilter{
		{ID: "start_date", Default: "2026-01-01"},
		{ID: "status"},
	}}
	got := d.FilterDefaults()
	if len(got) != 1 || got["start_date"] != "2026-01-01" {
		t.Fatalf("FilterDefaults() = %#v", got)
	}
}

func TestResolveFilterValues(t *testing.T) {
	d := &Dashboard{Filters: []DashboardFilter{
		{ID: "start_date", Type: "date", Default: "2026-01-01"},
		{ID: "limit", Type: "number", Default: "10"},
		{ID: "status", Type: "select", Options: []string{"paid", "pending"}},
	}}

	got := d.ResolveFilterValues(map[string]string{
		"limit":  "25",
		"status": "paid",
	})

	if got["start_date"] != "2026-01-01" {
		t.Fatalf("start_date = %#v, want default", got["start_date"])
	}
	if got["limit"] != float64(25) {
		t.Fatalf("limit = %#v (%T), want float64(25)", got["limit"], got["limit"])
	}
	if got["status"] != "paid" {
		t.Fatalf("status = %#v", got["status"])
	}
}

func TestResolveFilterValuesExplicitEmptyOverridesDefault(t *testing.T) {
	d := &Dashboard{Filters: []DashboardFilter{
		{ID: "status", Type: "select", Default: "paid", Options: []string{"paid", "pending"}},
	}}

	got := d.ResolveFilterValues(map[string]string{"status": ""})
	if _, ok := got["status"]; ok {
		t.Fatalf("explicit empty should omit the filter, got %#v", got["status"])
	}
}

func TestResolveFilterValuesOmitsMissingAndInvalidNumbers(t *testing.T) {
	d := &Dashboard{Filters: []DashboardFilter{
		{ID: "required"},
		{ID: "amount", Type: "number"},
	}}

	got := d.ResolveFilterValues(map[string]string{"amount": "not-a-number"})

	if _, ok := got["required"]; ok {
		t.Fatal("missing filter should be omitted so substitution can report it")
	}
	// Invalid numbers fall back to the raw string; the driver decides whether
	// the value is acceptable, but the SQL stays parameterized either way.
	if got["amount"] != "not-a-number" {
		t.Fatalf("amount = %#v", got["amount"])
	}
}

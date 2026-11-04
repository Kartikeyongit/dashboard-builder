package model

// UsageRef is a lightweight reference used by dependency dialogs.
type UsageRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// WidgetUsage describes one widget that depends on a query or datasource.
type WidgetUsage struct {
	WidgetID      string `json:"widget_id"`
	WidgetType    string `json:"widget_type"`
	DashboardID   string `json:"dashboard_id"`
	DashboardName string `json:"dashboard_name"`
}

// QueryUsage is returned by the query usage endpoint. Dashboards are derived
// from the widgets that reference the query.
type QueryUsage struct {
	Widgets    []WidgetUsage `json:"widgets"`
	Dashboards []UsageRef    `json:"dashboards"`
}

// DatasourceUsage is returned before a datasource is deleted. A datasource is
// in use when any saved query points at it; widgets and dashboards are derived
// from those queries so the UI can explain the full blast radius.
type DatasourceUsage struct {
	Queries    []UsageRef    `json:"queries"`
	Widgets    []WidgetUsage `json:"widgets"`
	Dashboards []UsageRef    `json:"dashboards"`
}

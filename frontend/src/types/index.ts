export interface User {
  id: string;
  org_id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RegisterRequest {
  email: string;
  password: string;
  org_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Datasource {
  id: string;
  org_id: string;
  name: string;
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  db_name: string;
  username: string;
  ssl_mode: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDatasourcePayload {
  name: string;
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  db_name: string;
  username: string;
  password?: string;
  ssl_mode?: string;
}

export interface Query {
  id: string;
  org_id: string;
  datasource_id: string;
  name: string;
  sql_text: string;
  max_rows: number;
  timeout_ms: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQueryPayload {
  datasource_id: string;
  name: string;
  sql_text: string;
  max_rows?: number;
  timeout_ms?: number;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
}

export interface TableSchema {
  table_name: string;
  columns: { name: string; data_type: string }[];
}

export type DashboardFilterType = 'text' | 'number' | 'date' | 'select';

export interface DashboardFilter {
  id: string;
  label: string;
  type: DashboardFilterType;
  default?: string;
  options?: string[];
}

export type DashboardFilterValues = Record<string, string>;

export type WidgetType = 'chart' | 'table' | 'metric';

export type ChartType =
  | 'bar'
  | 'hbar'
  | 'stackedBar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter';

export type NumberFormat =
  | 'auto'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percent'
  | 'compact'
  | 'duration';

export type WidgetPalette = 'default' | 'ocean' | 'warm' | 'forest' | 'mono';

export type TableDensity = 'normal' | 'compact';

export type ThresholdDirection = 'above' | 'below';

export type ThresholdTone = 'success' | 'warning' | 'danger';

export interface MetricThreshold {
  value: number;
  direction: ThresholdDirection;
  tone: ThresholdTone;
}

/**
 * Type-specific widget configuration. The backend validates and drops unknown
 * keys, so every property here is optional and safe to omit.
 */
export interface WidgetConfig {
  /** Custom title shown above the widget in the editor and viewer. */
  title?: string;
  description?: string;
  numberFormat?: NumberFormat;

  // Chart
  chartType?: ChartType;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  xAxisTitle?: string;
  yAxisTitle?: string;
  palette?: WidgetPalette;

  // Table
  visibleColumns?: string[];
  density?: TableDensity;
  pinFirstColumn?: boolean;

  // Metric
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  threshold?: MetricThreshold;
}

export interface Dashboard {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  tags?: string[];
  refresh_interval_seconds: number;
  filters?: DashboardFilter[];
  is_favorite?: boolean;
  widget_count?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  dashboard_id: string;
  query_id: string;
  widget_type: WidgetType;
  config: WidgetConfig | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  /** Omitted/null = inherit the dashboard interval; 0 = never refresh. */
  refresh_interval_override?: number | null;
}

export interface DashboardFull {
  dashboard: Dashboard;
  widgets: WidgetData[];
}

export interface WidgetData {
  widget: Widget;
  data?: QueryResult;
  error?: string;
}
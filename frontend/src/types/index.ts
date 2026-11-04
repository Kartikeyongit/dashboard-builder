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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cell values are dynamic and come straight from the datasource
  rows: any[][];
  /** Wall-clock time spent in the target database, when reported. */
  duration_ms?: number;
}

export interface UsageRef {
  id: string;
  name: string;
}

export interface WidgetUsage {
  widget_id: string;
  widget_type: string;
  dashboard_id: string;
  dashboard_name: string;
}

export interface QueryUsage {
  widgets: WidgetUsage[];
  dashboards: UsageRef[];
}

export interface DatasourceUsage {
  queries: UsageRef[];
  widgets: WidgetUsage[];
  dashboards: UsageRef[];
}

export interface TestConnectionResult {
  status: string;
  latency_ms?: number;
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

export interface ShareLink {
  id: string;
  url: string;
  password_protected: boolean;
  expires_at?: string | null;
  last_used_at?: string | null;
  created_at: string;
  is_active: boolean;
  /** False for links created before encrypted token storage; they cannot be copied. */
  token_available: boolean;
}

export interface WidgetData {
  widget: Widget;
  data?: QueryResult;
  error?: string;
}

export type TeamRole = 'admin' | 'editor' | 'viewer';

export interface Member {
  id: string;
  email: string;
  role: TeamRole;
  display_name: string;
  timezone: string;
  last_login_at?: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  display_name: string;
  timezone: string;
  updated_at?: string;
}

export interface Invite {
  id: string;
  email: string;
  role: TeamRole;
  invited_by_email?: string;
  expires_at: string;
  expired: boolean;
  created_at: string;
  /** Empty when the encrypted token could not be recovered. */
  url: string;
}

export interface InvitePreview {
  org_name: string;
  email: string;
  role: TeamRole;
  expires_at: string;
}

export interface AuditEvent {
  id: string;
  org_id: string;
  actor_id?: string | null;
  actor_email?: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  target_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AcceptInviteRequest {
  display_name: string;
  password: string;
}
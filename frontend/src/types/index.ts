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

export interface Dashboard {
  id: string;
  org_id: string;
  name: string;
  refresh_interval_seconds: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: string;
  dashboard_id: string;
  query_id: string;
  widget_type: 'chart' | 'table' | 'metric';
  config: any;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  refresh_interval_override?: number;
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
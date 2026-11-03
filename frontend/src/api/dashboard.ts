import client from './client';
import type {
  Dashboard,
  DashboardFilter,
  DashboardFilterValues,
  DashboardFull,
  Widget,
  WidgetConfig,
  WidgetType,
} from '../types';

export interface CreateDashboardPayload {
  name: string;
  description?: string;
  tags?: string[];
  refresh_interval_seconds?: number;
  filters?: DashboardFilter[];
}

export interface UpdateDashboardPayload {
  name?: string;
  description?: string;
  tags?: string[];
  refresh_interval_seconds?: number;
  filters?: DashboardFilter[];
}

/** Filter values travel as f_<id> query params so links are shareable. */
function filterParams(filters?: DashboardFilterValues) {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([id, value]) => {
    if (value !== undefined && value !== null) {
      params[`f_${id}`] = value;
    }
  });
  return Object.keys(params).length > 0 ? params : undefined;
}

export const dashboardAPI = {
  list: () => client.get<Dashboard[]>('/dashboards'),
  get: (id: string) => client.get<Dashboard>(`/dashboards/${id}`),
  create: (data: CreateDashboardPayload) => client.post<Dashboard>('/dashboards', data),
  update: (id: string, data: UpdateDashboardPayload) => client.put(`/dashboards/${id}`, data),
  delete: (id: string) => client.delete(`/dashboards/${id}`),
  duplicate: (id: string) => client.post<Dashboard>(`/dashboards/${id}/duplicate`),
  /** Favorites are idempotent: PUT pins, DELETE unpins. */
  setFavorite: (id: string, favorite: boolean) =>
    favorite ? client.put(`/dashboards/${id}/favorite`) : client.delete(`/dashboards/${id}/favorite`),
  getFull: (id: string, filters?: DashboardFilterValues) =>
    client.get<DashboardFull>(`/dashboards/${id}/full`, { params: filterParams(filters) }),
};

export const widgetAPI = {
  create: (dashboardId: string, data: CreateWidgetPayload) =>
    client.post<Widget>(`/dashboards/${dashboardId}/widgets`, data),
  update: (dashboardId: string, widgetId: string, data: UpdateWidgetPayload) =>
    client.put<Widget>(`/dashboards/${dashboardId}/widgets/${widgetId}`, data),
  delete: (dashboardId: string, widgetId: string) =>
    client.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`),
};

export interface CreateWidgetPayload {
  query_id: string;
  widget_type: WidgetType;
  config?: WidgetConfig;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  /** Omit to inherit the dashboard interval; 0 disables refresh. */
  refresh_interval_override?: number | null;
}

export interface UpdateWidgetPayload {
  query_id?: string;
  widget_type?: WidgetType;
  config?: WidgetConfig;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  /** Explicit null clears an override back to "inherit". */
  refresh_interval_override?: number | null;
}

import client from './client';
import type {
  Dashboard,
  DashboardFilter,
  DashboardFilterValues,
  DashboardFull,
  Widget,
} from '../types';

export interface CreateDashboardPayload {
  name: string;
  refresh_interval_seconds?: number;
  filters?: DashboardFilter[];
}

export interface UpdateDashboardPayload {
  name?: string;
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
  getFull: (id: string, filters?: DashboardFilterValues) =>
    client.get<DashboardFull>(`/dashboards/${id}/full`, { params: filterParams(filters) }),
};

export const widgetAPI = {
  create: (dashboardId: string, data: CreateWidgetPayload) =>
    client.post<Widget>(`/dashboards/${dashboardId}/widgets`, data),
  update: (dashboardId: string, widgetId: string, data: Partial<CreateWidgetPayload>) =>
    client.put<Widget>(`/dashboards/${dashboardId}/widgets/${widgetId}`, data),
  delete: (dashboardId: string, widgetId: string) =>
    client.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`),
};

export interface CreateWidgetPayload {
  query_id: string;
  widget_type: 'chart' | 'table' | 'metric';
  config?: any;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
}

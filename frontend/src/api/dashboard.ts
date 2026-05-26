import client from './client';
import type { Dashboard, DashboardFull, Widget } from '../types';

export const dashboardAPI = {
  list: () => client.get<Dashboard[]>('/dashboards'),
  get: (id: string) => client.get<Dashboard>(`/dashboards/${id}`),
  create: (data: { name: string; refresh_interval_seconds?: number }) =>
    client.post<Dashboard>('/dashboards', data),
  update: (id: string, data: { name?: string; refresh_interval_seconds?: number }) =>
    client.put(`/dashboards/${id}`, data),
  delete: (id: string) => client.delete(`/dashboards/${id}`),
  getFull: (id: string) => client.get<DashboardFull>(`/dashboards/${id}/full`),
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

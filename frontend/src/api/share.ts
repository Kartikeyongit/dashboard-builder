import client from './client';
import type { DashboardFull } from '../types';

export const shareAPI = {
  create: (dashboardId: string, data: { password?: string; expires_at?: string }) =>
    client.post<{ token: string; url: string }>(`/dashboards/${dashboardId}/share`, data),
  getShared: (token: string) =>
    client.get<DashboardFull | { password_required: true }>(`/share/${token}`),
  verifyPassword: (token: string, password: string) =>
    client.post<DashboardFull>(`/share/${token}/verify`, { password }),
};

import client from './client';
import type { DashboardFull, ShareLink } from '../types';
import { searchFromFilterValues } from '../utils/filters';
import type { DashboardFilterValues } from '../types';

/** Adds `f_*` filter params to a public share request. */
const withFilters = (path: string, filters?: DashboardFilterValues): string => {
  const query = filters ? searchFromFilterValues(filters) : '';
  return query ? `${path}?${query}` : path;
};

export const shareAPI = {
  create: (dashboardId: string, data: { password?: string; expires_at?: string }) =>
    client.post<{ token: string; url: string }>(`/dashboards/${dashboardId}/share`, data),
  list: (dashboardId: string) =>
    client.get<{ links: ShareLink[] }>(`/dashboards/${dashboardId}/shares`),
  revoke: (dashboardId: string, shareId: string) =>
    client.delete(`/dashboards/${dashboardId}/shares/${shareId}`),
  getShared: (token: string, filters?: DashboardFilterValues) =>
    client.get<DashboardFull | { password_required: true }>(
      withFilters(`/share/${token}`, filters),
    ),
  verifyPassword: (token: string, password: string, filters?: DashboardFilterValues) =>
    client.post<DashboardFull>(withFilters(`/share/${token}/verify`, filters), { password }),
};

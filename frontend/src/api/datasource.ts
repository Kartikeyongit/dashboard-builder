import client from './client';
import type { Datasource, CreateDatasourcePayload } from '../types';

export const datasourceAPI = {
  list: () => client.get<Datasource[]>('/datasources'),
  get: (id: string) => client.get<Datasource>(`/datasources/${id}`),
  create: (data: CreateDatasourcePayload) => client.post<Datasource>('/datasources', data),
  update: (id: string, data: CreateDatasourcePayload) => client.put(`/datasources/${id}`, data),
  delete: (id: string) => client.delete(`/datasources/${id}`),
  test: (id: string) => client.post<{ status: string }>(`/datasources/${id}/test`),
};

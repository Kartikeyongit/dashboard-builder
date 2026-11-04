import client from './client';
import type {
  CreateDatasourcePayload,
  Datasource,
  DatasourceUsage,
  TableSchema,
  TestConnectionResult,
} from '../types';

export const datasourceAPI = {
  list: () => client.get<Datasource[]>('/datasources'),
  get: (id: string) => client.get<Datasource>(`/datasources/${id}`),
  create: (data: CreateDatasourcePayload) => client.post<Datasource>('/datasources', data),
  update: (id: string, data: CreateDatasourcePayload) => client.put(`/datasources/${id}`, data),
  delete: (id: string) => client.delete(`/datasources/${id}`),
  test: (id: string) => client.post<TestConnectionResult>(`/datasources/${id}/test`),
  /** Probes settings before they are saved. */
  testConfig: (data: CreateDatasourcePayload) =>
    client.post<TestConnectionResult>('/datasources/test', data),
  getSchema: (id: string) => client.get<TableSchema[]>(`/datasources/${id}/schema`),
  usage: (id: string) => client.get<DatasourceUsage>(`/datasources/${id}/usage`),
};

/** Kept for existing imports; the schema browser now lives on datasourceAPI. */
export const datasourceAPIWithSchema = {
  getSchema: (id: string) => datasourceAPI.getSchema(id),
};

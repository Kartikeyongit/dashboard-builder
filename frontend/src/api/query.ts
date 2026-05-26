import client from './client';
import type { Query, CreateQueryPayload, QueryResult } from '../types';

export const queryAPI = {
  list: () => client.get<Query[]>('/queries'),
  get: (id: string) => client.get<Query>(`/queries/${id}`),
  create: (data: CreateQueryPayload) => client.post<Query>('/queries', data),
  update: (id: string, data: CreateQueryPayload) => client.put(`/queries/${id}`, data),
  delete: (id: string) => client.delete(`/queries/${id}`),
  executeSaved: (id: string) => client.post<QueryResult>(`/queries/${id}/execute`),
  executeAdHoc: (data: { datasource_id: string; sql_text: string; max_rows?: number; timeout_ms?: number }) =>
    client.post<QueryResult>('/queries/execute', data),
};

export const datasourceAPIWithSchema = {
  getSchema: (id: string) => client.get<any[]>(`/datasources/${id}/schema`),
};

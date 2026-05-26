import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { datasourceAPI } from '../api/datasource';
import type { Datasource, CreateDatasourcePayload } from '../types';

interface DatasourceState {
  items: Datasource[];
  loading: boolean;
  error: string | null;
}

const initialState: DatasourceState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchDatasources = createAsyncThunk('datasources/fetchAll', async () => {
  const res = await datasourceAPI.list();
  return Array.isArray(res.data) ? res.data : [];
});

export const createDatasource = createAsyncThunk('datasources/create', async (payload: CreateDatasourcePayload) => {
  const res = await datasourceAPI.create(payload);
  return res.data;
});

export const updateDatasource = createAsyncThunk(
  'datasources/update',
  async ({ id, data }: { id: string; data: CreateDatasourcePayload }) => {
    await datasourceAPI.update(id, data);
    return { id, data }; // we'll merge changes later
  }
);

export const deleteDatasource = createAsyncThunk('datasources/delete', async (id: string) => {
  await datasourceAPI.delete(id);
  return id;
});

export const testDatasourceConnection = createAsyncThunk('datasources/test', async (id: string) => {
  await datasourceAPI.test(id);
  return id;
});

const datasourceSlice = createSlice({
  name: 'datasources',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatasources.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDatasources.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchDatasources.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Failed'; })
      .addCase(createDatasource.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateDatasource.fulfilled, (state, action) => {
        const index = state.items.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.data };
        }
      })
      .addCase(deleteDatasource.fulfilled, (state, action) => {
        state.items = state.items.filter(d => d.id !== action.payload);
      });
  },
});

export default datasourceSlice.reducer;

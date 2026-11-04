import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { datasourceAPI } from '../api/datasource';
import type { Datasource, CreateDatasourcePayload } from '../types';
import { apiErrorMessage } from '../utils/apiError';

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

export const createDatasource = createAsyncThunk<
  Datasource,
  CreateDatasourcePayload,
  { rejectValue: string }
>('datasources/create', async (payload, { rejectWithValue }) => {
  try {
    const res = await datasourceAPI.create(payload);
    return res.data;
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err, 'Could not create the datasource.'));
  }
});

export const updateDatasource = createAsyncThunk<
  { id: string; data: CreateDatasourcePayload },
  { id: string; data: CreateDatasourcePayload },
  { rejectValue: string }
>('datasources/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    await datasourceAPI.update(id, data);
    return { id, data };
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err, 'Could not update the datasource.'));
  }
});

export const deleteDatasource = createAsyncThunk('datasources/delete', async (id: string) => {
  await datasourceAPI.delete(id);
  return id;
});

export const testDatasourceConnection = createAsyncThunk<
  { id: string; latencyMs?: number },
  string,
  { rejectValue: string }
>('datasources/test', async (id, { rejectWithValue }) => {
  try {
    const res = await datasourceAPI.test(id);
    return { id, latencyMs: res.data.latency_ms };
  } catch (err) {
    return rejectWithValue(apiErrorMessage(err, 'Connection failed.'));
  }
});

const datasourceSlice = createSlice({
  name: 'datasources',
  initialState,
  reducers: {
    hideDatasource: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(d => d.id !== action.payload);
    },
    restoreDatasource: (state, action: PayloadAction<Datasource>) => {
      if (!state.items.some(d => d.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
  },
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

export const {
  hideDatasource,
  restoreDatasource,
} = datasourceSlice.actions;

export default datasourceSlice.reducer;

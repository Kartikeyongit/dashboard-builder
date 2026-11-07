import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { queryAPI } from '../api/query';
import type { Query, CreateQueryPayload } from '../types';

interface QueryState {
  items: Query[];
  loading: boolean;
  /** True once the library has been fetched, even if the request failed. */
  loaded: boolean;
  error: string | null;
}

const initialState: QueryState = {
  items: [],
  loading: false,
  loaded: false,
  error: null,
};

export const fetchQueries = createAsyncThunk('queries/fetchAll', async () => {
  const res = await queryAPI.list();
  return Array.isArray(res.data) ? res.data : [];
});

export const createQuery = createAsyncThunk('queries/create', async (data: CreateQueryPayload) => {
  const res = await queryAPI.create(data);
  return res.data;
});

export const updateQuery = createAsyncThunk('queries/update', async ({ id, data }: { id: string; data: CreateQueryPayload }) => {
  await queryAPI.update(id, data);
  return { id, data };
});

export const deleteQuery = createAsyncThunk('queries/delete', async (id: string) => {
  await queryAPI.delete(id);
  return id;
});

const querySlice = createSlice({
  name: 'queries',
  initialState,
  reducers: {
    hideQuery: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(q => q.id !== action.payload);
    },
    restoreQuery: (state, action: PayloadAction<Query>) => {
      if (!state.items.some(q => q.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueries.pending, (state) => {
        state.loading = true;
        state.loaded = false;
        state.error = null;
      })
      .addCase(fetchQueries.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload;
      })
      .addCase(fetchQueries.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.error.message ?? null;
      })
      .addCase(createQuery.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(updateQuery.fulfilled, (state, action) => {
        const idx = state.items.findIndex(q => q.id === action.payload.id);
        if (idx !== -1) Object.assign(state.items[idx], action.payload.data);
      })
      .addCase(deleteQuery.fulfilled, (state, action) => {
        state.items = state.items.filter(q => q.id !== action.payload);
      });
  },
});

export const {
  hideQuery,
  restoreQuery,
} = querySlice.actions;

export default querySlice.reducer;

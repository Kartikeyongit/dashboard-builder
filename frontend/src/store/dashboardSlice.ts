import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardAPI } from '../api/dashboard';
import type { CreateDashboardPayload, UpdateDashboardPayload } from '../api/dashboard';
import type { Dashboard, DashboardFilterValues, DashboardFull, WidgetData } from '../types';

interface DashboardState {
  list: Dashboard[];
  currentFull: DashboardFull | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  list: [],
  currentFull: null,
  loading: false,
  error: null,
};

const normalizeDashboardFull = (dashboardFull: DashboardFull): DashboardFull => ({
  ...dashboardFull,
  widgets: Array.isArray(dashboardFull.widgets) ? dashboardFull.widgets : [],
});

export const fetchDashboards = createAsyncThunk('dashboards/fetchAll', async () => {
  const res = await dashboardAPI.list();
  return Array.isArray(res.data) ? res.data : [];
});

export const createDashboard = createAsyncThunk('dashboards/create', async (data: CreateDashboardPayload) => {
  const res = await dashboardAPI.create(data);
  return res.data;
});

export const updateDashboard = createAsyncThunk(
  'dashboards/update',
  async ({ id, data }: { id: string; data: UpdateDashboardPayload }) => {
    const res = await dashboardAPI.update(id, data);
    return res.data;
  },
);

export const setDashboardFavorite = createAsyncThunk(
  'dashboards/favorite',
  async ({ id, favorite }: { id: string; favorite: boolean }) => {
    await dashboardAPI.setFavorite(id, favorite);
    return { id, favorite };
  },
);

export const duplicateDashboard = createAsyncThunk('dashboards/duplicate', async (id: string) => {
  const res = await dashboardAPI.duplicate(id);
  return res.data;
});

export const deleteDashboard = createAsyncThunk('dashboards/delete', async (id: string) => {
  await dashboardAPI.delete(id);
  return id;
});

export interface LoadDashboardFullArg {
  id: string;
  filters?: DashboardFilterValues;
}

export const loadDashboardFull = createAsyncThunk(
  'dashboards/loadFull',
  async (arg: string | LoadDashboardFullArg) => {
    const id = typeof arg === 'string' ? arg : arg.id;
    const filters = typeof arg === 'string' ? undefined : arg.filters;
    const res = await dashboardAPI.getFull(id, filters);
    return normalizeDashboardFull(res.data);
  }
);

const dashboardSlice = createSlice({
  name: 'dashboards',
  initialState,
  reducers: {
    clearCurrentFull: (state) => { state.currentFull = null; },
    /** Optimistically hides a dashboard during the delete undo window. */
    hideDashboard: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter(d => d.id !== action.payload);
    },
    /** Puts a dashboard back when the user undoes a delete. */
    restoreDashboard: (state, action: PayloadAction<Dashboard>) => {
      if (!state.list.some(d => d.id === action.payload.id)) {
        state.list.unshift(action.payload);
      }
    },
    addWidgetToCurrent: (state, action: PayloadAction<WidgetData>) => {
      if (state.currentFull) {
        if (!Array.isArray(state.currentFull.widgets)) state.currentFull.widgets = [];
        state.currentFull.widgets.push(action.payload);
      }
    },
    removeWidgetFromCurrent: (state, action: PayloadAction<string>) => {
      if (state.currentFull) {
        const widgets = Array.isArray(state.currentFull.widgets) ? state.currentFull.widgets : [];
        state.currentFull.widgets = widgets.filter(
          w => w.widget.id !== action.payload
        );
      }
    },
    updateWidgetData: (state, action: PayloadAction<{ widget_id: string; data?: any; error?: string }>) => {
      if (state.currentFull) {
        const widgets = Array.isArray(state.currentFull.widgets) ? state.currentFull.widgets : [];
        const wd = widgets.find(w => w.widget.id === action.payload.widget_id);
        if (wd) {
          if (action.payload.data !== undefined) wd.data = action.payload.data;
          if (action.payload.error !== undefined) wd.error = action.payload.error;
        }
      }
    },
    updateWidgetLayout: (state, action: PayloadAction<{ widget_id: string; position_x: number; position_y: number; width: number; height: number }>) => {
      if (state.currentFull) {
        const widgets = Array.isArray(state.currentFull.widgets) ? state.currentFull.widgets : [];
        const wd = widgets.find(w => w.widget.id === action.payload.widget_id);
        if (wd) {
          wd.widget.position_x = action.payload.position_x;
          wd.widget.position_y = action.payload.position_y;
          wd.widget.width = action.payload.width;
          wd.widget.height = action.payload.height;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboards.pending, (state) => { state.loading = true; })
      .addCase(fetchDashboards.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchDashboards.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? null; })
      .addCase(loadDashboardFull.pending, (state) => { state.loading = true; })
      .addCase(loadDashboardFull.fulfilled, (state, action) => { state.loading = false; state.currentFull = action.payload; })
      .addCase(loadDashboardFull.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? null; })
      .addCase(createDashboard.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateDashboard.fulfilled, (state, action) => {
        const idx = state.list.findIndex(d => d.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
        if (state.currentFull && state.currentFull.dashboard.id === action.payload.id) {
          state.currentFull.dashboard = { ...state.currentFull.dashboard, ...action.payload };
        }
      })
      .addCase(setDashboardFavorite.pending, (state, action) => {
        const d = state.list.find(item => item.id === action.meta.arg.id);
        if (d) d.is_favorite = action.meta.arg.favorite;
      })
      .addCase(setDashboardFavorite.fulfilled, (state, action) => {
        const d = state.list.find(item => item.id === action.payload.id);
        if (d) d.is_favorite = action.payload.favorite;
      })
      .addCase(setDashboardFavorite.rejected, (state, action) => {
        const d = state.list.find(item => item.id === action.meta.arg.id);
        if (d) d.is_favorite = !action.meta.arg.favorite;
      })
      .addCase(duplicateDashboard.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.list = state.list.filter(d => d.id !== action.payload);
      });
  },
});

export const {
  clearCurrentFull,
  hideDashboard,
  restoreDashboard,
  addWidgetToCurrent,
  removeWidgetFromCurrent,
  updateWidgetData,
  updateWidgetLayout,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

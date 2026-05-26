import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardAPI } from '../api/dashboard';
import type { Dashboard, DashboardFull, WidgetData } from '../types';

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

export const createDashboard = createAsyncThunk('dashboards/create', async (data: { name: string }) => {
  const res = await dashboardAPI.create(data);
  return res.data;
});

export const deleteDashboard = createAsyncThunk('dashboards/delete', async (id: string) => {
  await dashboardAPI.delete(id);
  return id;
});

export const loadDashboardFull = createAsyncThunk('dashboards/loadFull', async (id: string) => {
  const res = await dashboardAPI.getFull(id);
  return normalizeDashboardFull(res.data);
});

const dashboardSlice = createSlice({
  name: 'dashboards',
  initialState,
  reducers: {
    clearCurrentFull: (state) => { state.currentFull = null; },
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
      .addCase(createDashboard.fulfilled, (state, action) => { state.list.push(action.payload); })
      .addCase(deleteDashboard.fulfilled, (state, action) => {
        state.list = state.list.filter(d => d.id !== action.payload);
      });
  },
});

export const {
  clearCurrentFull,
  addWidgetToCurrent,
  removeWidgetFromCurrent,
  updateWidgetData,
  updateWidgetLayout,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

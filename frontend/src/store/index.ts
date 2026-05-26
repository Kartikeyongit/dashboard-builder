import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import datasourceReducer from './datasourceSlice';
import queryReducer from './querySlice';
import dashboardReducer from './dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    datasources: datasourceReducer,
    queries: queryReducer,
    dashboards: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * A toast action is stored as a serializable reference. The handler itself lives
 * in `utils/toastActions` so the Redux store never holds functions.
 */
export interface ToastAction {
  label: string;
  actionId: string;
  payload?: unknown;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
  /** How long the toast stays on screen. Defaults to 4000ms. */
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(input: Omit<Toast, 'id'>) {
        return {
          payload: {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            ...input,
          },
        };
      },
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;

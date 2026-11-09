import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { authAPI } from '../api/auth';
import { teamAPI } from '../api/team';
import { apiErrorMessage } from '../utils/apiError';
import type { AcceptInviteRequest, User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitializing: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isInitializing: true,
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      return response.data.user;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err, 'Registration failed'));
    }
  }
);

interface AcceptTeamInviteArgs extends AcceptInviteRequest {
  token: string;
}

export const acceptTeamInvite = createAsyncThunk(
  'auth/acceptInvite',
  async ({ token, ...data }: AcceptTeamInviteArgs, { rejectWithValue }) => {
    try {
      const response = await teamAPI.acceptInvite(token, data);
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      return response.data.user;
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err, 'Could not accept the invite'));
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (data: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(data);
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      return response.data.user;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return rejectWithValue('Email or password is incorrect.');
      }
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        return rejectWithValue('Too many attempts. Wait a moment and try again.');
      }
      return rejectWithValue(apiErrorMessage(err, 'Login failed'));
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
});

export const restoreAuth = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return null;
  }
  try {
    const response = await authAPI.getMe();
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return rejectWithValue('Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    // Accept an invite link
    builder.addCase(acceptTeamInvite.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(acceptTeamInvite.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isInitializing = false;
    });
    builder.addCase(acceptTeamInvite.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
    });
    // Restore auth on startup
    builder.addCase(restoreAuth.pending, (state) => {
      state.isInitializing = true;
    });
    builder.addCase(restoreAuth.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isInitializing = false;
    });
    builder.addCase(restoreAuth.rejected, (state) => {
      state.user = null;
      state.isInitializing = false;
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;

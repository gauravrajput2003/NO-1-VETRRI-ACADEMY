import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { loginAPI, logoutAPI, getMeAPI } from '../../services/api';
import { setToken, setRefreshToken, setUserData, clearAuthData, getToken } from '../../services/storage';
import { connectSocket, disconnectSocket } from '../../services/socket';

// ─── Async Thunks ──────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ role, identifier, password }, { rejectWithValue }) => {
    try {
      const roleCandidates = role ? [role] : [null];
      let lastErrorMessage = 'Login failed';

      for (const candidateRole of roleCandidates) {
        try {
          const { data } = await loginAPI(candidateRole, identifier, password);
          if (data.success) {
            await setToken(data.token);
            if (data.refreshToken) await setRefreshToken(data.refreshToken);
            await setUserData(data.user);
            // Connect socket after login
            connectSocket(data.user._id, data.user.role);
            return data;
          }

          lastErrorMessage = data.message || lastErrorMessage;
        } catch (error) {
          if (error.response) {
            if (error.response.status === 429) {
              return rejectWithValue(
                error.response?.data?.message || 'Too many login attempts. Please try again after 15 minutes.'
              );
            }
            lastErrorMessage = error.response?.data?.message || lastErrorMessage;
            return rejectWithValue(lastErrorMessage);
          }

          throw error;
        }
      }

      return rejectWithValue(lastErrorMessage);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Network error. Please try again.'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    // Do not block logout on network/API availability.
    logoutAPI().catch(() => {});
    disconnectSocket();
    await clearAuthData();
    return true;
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      if (!token) return rejectWithValue('No token');

      const { data } = await getMeAPI();
      if (data.success) {
        await setUserData(data.user);
        connectSocket(data.user._id, data.user.role);
        return data.user;
      }
      return rejectWithValue('Failed to fetch user');
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Session expired'
      );
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    initialLoading: true, // For app startup check
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setInitialLoadingDone: (state) => {
      state.initialLoading = false;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Persisted auth state can restore a stale loading flag if the app was
      // backgrounded or closed during a request.
      .addCase(REHYDRATE, (state, action) => {
        if (action.key === 'auth') {
          state.loading = false;
          state.error = null;
        }
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if thunk errors for any reason, force local sign-out state.
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      // Fetch Me (app startup)
      .addCase(fetchCurrentUser.pending, (state) => {
        state.initialLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.initialLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.initialLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { clearError, setInitialLoadingDone, updateUser } = authSlice.actions;
export default authSlice.reducer;

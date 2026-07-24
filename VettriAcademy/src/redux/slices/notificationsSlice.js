import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getNotificationsAPI,
  getUnreadNotificationCountAPI,
  markNotificationReadAPI,
  markAllNotificationsReadAPI,
  deleteNotificationAPI,
} from '../../services/api';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (page = 1, { rejectWithValue }) => {
    try {
      const { data } = await getNotificationsAPI(page, 20);
      return {
        notifications: data.notifications || [],
        page: data.page ?? page,
        hasMore: Boolean(data.hasMore),
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load notifications');
    }
  }
);

export const fetchUnreadNotificationCount = createAsyncThunk('notifications/fetchUnread', async () => {
  const { data } = await getUnreadNotificationCountAPI();
  return data.count;
});

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id) => {
  await markNotificationReadAPI(id);
  return id;
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async () => {
  await markAllNotificationsReadAPI();
  return true;
});

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { getState, rejectWithValue }) => {
    try {
      const existing = getState().notifications.list.find((n) => n._id === id);
      await deleteNotificationAPI(id);
      return { id, wasUnread: existing ? !existing.isRead : false };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notification');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
    loading: false,
    page: 1,
    hasMore: false,
  },
  reducers: {
    addNotification: (state, action) => {
      state.list.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { notifications, page, hasMore } = action.payload;
        if (page === 1) {
          state.list = notifications;
        } else {
          const existingIds = new Set(state.list.map((n) => n._id));
          const fresh = notifications.filter((n) => !existingIds.has(n._id));
          state.list = [...state.list, ...fresh];
        }
        state.page = page;
        state.hasMore = hasMore;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(fetchUnreadNotificationCount.fulfilled, (state, action) => { state.unreadCount = action.payload; })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.list = state.list.map((n) => n._id === action.payload ? { ...n, isRead: true } : n);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.list = state.list.map((n) => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { id, wasUnread } = action.payload;
        state.list = state.list.filter((n) => n._id !== id);
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;

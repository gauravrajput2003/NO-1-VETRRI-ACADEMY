import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getNotificationsAPI, getUnreadNotificationCountAPI, markNotificationReadAPI, markAllNotificationsReadAPI } from '../../services/api';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getNotificationsAPI();
    return data.notifications;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load notifications');
  }
});

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

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
    loading: false,
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
      .addCase(fetchNotifications.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(fetchUnreadNotificationCount.fulfilled, (state, action) => { state.unreadCount = action.payload; })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.list = state.list.map((n) => n._id === action.payload ? { ...n, isRead: true } : n);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.list = state.list.map((n) => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  listDoubtsAPI,
  getDoubtDetailAPI,
  getDoubtDashboardMetricsAPI,
  createDoubtAPI,
  addDoubtReplyAPI,
  updateDoubtStatusAPI,
  reassignDoubtTeachersAPI,
} from '../../services/api';

export const fetchDoubts = createAsyncThunk('doubts/fetchList', async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await listDoubtsAPI(params);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch doubts');
  }
});

export const fetchDoubtMetrics = createAsyncThunk('doubts/fetchMetrics', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getDoubtDashboardMetricsAPI();
    return data.metrics;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch metrics');
  }
});

export const fetchDoubtDetail = createAsyncThunk('doubts/fetchDetail', async (id, { rejectWithValue }) => {
  try {
    const { data } = await getDoubtDetailAPI(id);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch doubt detail');
  }
});

export const createDoubt = createAsyncThunk('doubts/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await createDoubtAPI(payload);
    return data.doubt;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create doubt');
  }
});

export const postDoubtReply = createAsyncThunk('doubts/reply', async ({ doubtId, payload }, { rejectWithValue }) => {
  try {
    const { data } = await addDoubtReplyAPI(doubtId, payload);
    return { doubtId, reply: data.reply };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to send reply');
  }
});

export const patchDoubtStatus = createAsyncThunk('doubts/status', async ({ doubtId, status }, { rejectWithValue }) => {
  try {
    const { data } = await updateDoubtStatusAPI(doubtId, status);
    return { doubtId, status: data.status };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update status');
  }
});

export const patchDoubtAssignment = createAsyncThunk('doubts/assign', async ({ doubtId, assignedTeachers }, { rejectWithValue }) => {
  try {
    await reassignDoubtTeachersAPI(doubtId, assignedTeachers);
    return { doubtId, assignedTeachers };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to assign teachers');
  }
});

const doubtsSlice = createSlice({
  name: 'doubts',
  initialState: {
    list: [],
    pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    metrics: null,
    currentDoubt: null,
    replies: [],
    loadingList: false,
    loadingDetail: false,
    loadingMetrics: false,
    creating: false,
    replying: false,
    error: null,
  },
  reducers: {
    clearDoubtDetail: (state) => {
      state.currentDoubt = null;
      state.replies = [];
      state.loadingDetail = false;
      state.error = null;
    },
    upsertRealtimeReply: (state, action) => {
      const reply = action.payload;
      if (!reply || !reply._id) return;
      const idx = state.replies.findIndex((r) => String(r._id) === String(reply._id));
      if (idx === -1) {
        state.replies.push(reply);
        state.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else {
        state.replies[idx] = { ...state.replies[idx], ...reply };
      }
    },
    applyRealtimeStatus: (state, action) => {
      const { doubtId, status } = action.payload || {};
      if (!doubtId || !status) return;
      state.list = state.list.map((d) => (d._id === doubtId ? { ...d, status } : d));
      if (state.currentDoubt && state.currentDoubt._id === doubtId) {
        state.currentDoubt = { ...state.currentDoubt, status };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoubts.pending, (state) => {
        state.loadingList = true;
        state.error = null;
      })
      .addCase(fetchDoubts.fulfilled, (state, action) => {
        state.loadingList = false;
        state.list = action.payload.doubts || [];
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchDoubts.rejected, (state, action) => {
        state.loadingList = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchDoubtMetrics.pending, (state) => {
        state.loadingMetrics = true;
      })
      .addCase(fetchDoubtMetrics.fulfilled, (state, action) => {
        state.loadingMetrics = false;
        state.metrics = action.payload;
      })
      .addCase(fetchDoubtMetrics.rejected, (state) => {
        state.loadingMetrics = false;
      })
      .addCase(fetchDoubtDetail.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })
      .addCase(fetchDoubtDetail.fulfilled, (state, action) => {
        state.loadingDetail = false;
        state.currentDoubt = action.payload.doubt;
        state.replies = action.payload.replies || [];
      })
      .addCase(fetchDoubtDetail.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(createDoubt.pending, (state) => {
        state.creating = true;
      })
      .addCase(createDoubt.fulfilled, (state, action) => {
        state.creating = false;
        state.list.unshift(action.payload);
      })
      .addCase(createDoubt.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(postDoubtReply.pending, (state) => {
        state.replying = true;
      })
      .addCase(postDoubtReply.fulfilled, (state, action) => {
        state.replying = false;
        const reply = action.payload.reply;
        if (reply) {
          const idx = state.replies.findIndex((r) => String(r._id) === String(reply._id));
          if (idx === -1) {
            state.replies.push(reply);
            state.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } else {
            state.replies[idx] = { ...state.replies[idx], ...reply };
          }
        }
      })
      .addCase(postDoubtReply.rejected, (state, action) => {
        state.replying = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(patchDoubtStatus.fulfilled, (state, action) => {
        const { doubtId, status } = action.payload;
        state.list = state.list.map((d) => (d._id === doubtId ? { ...d, status } : d));
        if (state.currentDoubt && state.currentDoubt._id === doubtId) {
          state.currentDoubt = { ...state.currentDoubt, status };
        }
      });
  },
});

export const { clearDoubtDetail, upsertRealtimeReply, applyRealtimeStatus } = doubtsSlice.actions;

export default doubtsSlice.reducer;

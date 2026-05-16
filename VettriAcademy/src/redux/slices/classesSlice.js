import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getTodayClassesAPI, getUpcomingClassesAPI, getSchedulesAPI, getClassDetailsAPI, joinClassAPI } from '../../services/api';

export const fetchTodayClasses = createAsyncThunk('classes/fetchToday', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTodayClassesAPI();
    return data.classes;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load classes');
  }
});

export const fetchUpcomingClasses = createAsyncThunk('classes/fetchUpcoming', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getUpcomingClassesAPI();
    return data.classes;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load classes');
  }
});

export const fetchSchedules = createAsyncThunk('classes/fetchSchedules', async (params, { rejectWithValue }) => {
  try {
    const { data } = await getSchedulesAPI(params);
    return { schedules: data.schedules, total: data.total };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load schedules');
  }
});

export const fetchClassDetails = createAsyncThunk('classes/fetchDetails', async (classId, { rejectWithValue }) => {
  try {
    const { data } = await getClassDetailsAPI(classId);
    return data.class;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load class');
  }
});

export const joinClass = createAsyncThunk('classes/join', async (classId, { rejectWithValue }) => {
  try {
    const { data } = await joinClassAPI(classId);
    return data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to join class');
  }
});

const classesSlice = createSlice({
  name: 'classes',
  initialState: {
    todayClasses: [],
    upcomingClasses: [],
    schedules: [],
    currentClass: null,
    total: 0,
    loading: false,
    error: null,
    joinResult: null,
  },
  reducers: {
    clearClassError: (state) => { state.error = null; },
    clearJoinResult: (state) => { state.joinResult = null; },
    updateClassStatus: (state, action) => {
      const { classId, status } = action.payload;
      const updateStatus = (list) => list.map((c) =>
        c._id === classId ? { ...c, status } : c
      );
      state.todayClasses = updateStatus(state.todayClasses);
      state.upcomingClasses = updateStatus(state.upcomingClasses);
      state.schedules = updateStatus(state.schedules);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayClasses.pending, (state) => { state.loading = true; })
      .addCase(fetchTodayClasses.fulfilled, (state, action) => { state.loading = false; state.todayClasses = action.payload; })
      .addCase(fetchTodayClasses.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchUpcomingClasses.fulfilled, (state, action) => { state.upcomingClasses = action.payload; })
      .addCase(fetchSchedules.pending, (state) => { state.loading = true; })
      .addCase(fetchSchedules.fulfilled, (state, action) => { state.loading = false; state.schedules = action.payload.schedules; state.total = action.payload.total; })
      .addCase(fetchSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchClassDetails.fulfilled, (state, action) => { state.currentClass = action.payload; })
      .addCase(joinClass.fulfilled, (state, action) => { state.joinResult = action.payload; })
      .addCase(joinClass.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearClassError, clearJoinResult, updateClassStatus } = classesSlice.actions;
export default classesSlice.reducer;

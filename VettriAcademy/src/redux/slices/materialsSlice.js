import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getStudentMaterialsAPI, getMaterialPreviewAPI, getMaterialDownloadAPI } from '../../services/api';

export const fetchMaterials = createAsyncThunk('materials/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getStudentMaterialsAPI();
    return data.materials;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load materials');
  }
});

export const fetchPreviewUrl = createAsyncThunk('materials/fetchPreview', async (id, { rejectWithValue }) => {
  try {
    const { data } = await getMaterialPreviewAPI(id);
    return { 
      id, 
      url: data.url, 
      type: data.type,
      mimeType: data.mimeType,
      storageType: data.storageType,
    };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Material is locked');
  }
});

export const fetchDownloadUrl = createAsyncThunk('materials/fetchDownload', async (id, { rejectWithValue }) => {
  try {
    const { data } = await getMaterialDownloadAPI(id);
    return {
      id,
      url: data.url,
      type: data.type,
      resourceType: data.resourceType,
      metadata: data.metadata,
    };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Download is restricted');
  }
});

const materialsSlice = createSlice({
  name: 'materials',
  initialState: {
    list: [],
    currentPreviewUrl: null,
    currentDownloadUrl: null,
    loading: false,
    previewLoading: false,
    downloadLoading: false,
    error: null,
  },
  reducers: {
    clearMaterialError: (state) => { state.error = null; },
    unlockMaterial: (state, action) => {
      const { materialId } = action.payload;
      state.list = state.list.map((m) =>
        m._id === materialId ? { ...m, isLocked: false } : m
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => { state.loading = true; })
      .addCase(fetchMaterials.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchMaterials.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchPreviewUrl.pending, (state) => { state.previewLoading = true; })
      .addCase(fetchPreviewUrl.fulfilled, (state, action) => { state.currentPreviewUrl = action.payload; state.previewLoading = false; })
      .addCase(fetchPreviewUrl.rejected, (state, action) => { state.error = action.payload; state.previewLoading = false; })
      .addCase(fetchDownloadUrl.pending, (state) => { state.downloadLoading = true; })
      .addCase(fetchDownloadUrl.fulfilled, (state, action) => { state.currentDownloadUrl = action.payload; state.downloadLoading = false; })
      .addCase(fetchDownloadUrl.rejected, (state, action) => { state.error = action.payload; state.downloadLoading = false; });
  },
});

export const { clearMaterialError, unlockMaterial } = materialsSlice.actions;
export default materialsSlice.reducer;

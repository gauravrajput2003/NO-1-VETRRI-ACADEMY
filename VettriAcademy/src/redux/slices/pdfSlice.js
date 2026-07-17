import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  savePdfProgressAPI,
  getPdfProgressAPI,
  addBookmarkAPI,
  removeBookmarkAPI,
  getMaterialBookmarksAPI,
  getAllBookmarksAPI,
  addNoteAPI,
  updateNoteAPI,
  deleteNoteAPI,
  getMaterialNotesAPI,
  trackPdfOpenAPI,
  trackPdfCloseAPI,
  getTeacherPdfAnalyticsAPI,
  getMaterialAnalyticsAPI,
} from '../../services/api';

// ─── Async Thunks ──────────────────────────────────────────────────────────────

// Progress
export const fetchProgress = createAsyncThunk(
  'pdf/fetchProgress',
  async (materialId, { rejectWithValue }) => {
    try {
      const { data } = await getPdfProgressAPI(materialId);
      return { materialId, progress: data.progress };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const saveProgress = createAsyncThunk(
  'pdf/saveProgress',
  async ({ materialId, lastPage, totalPages }, { rejectWithValue }) => {
    try {
      const { data } = await savePdfProgressAPI({ materialId, lastPage, totalPages });
      return { materialId, progress: data.progress };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Bookmarks
export const fetchBookmarks = createAsyncThunk(
  'pdf/fetchBookmarks',
  async (materialId, { rejectWithValue }) => {
    try {
      const { data } = await getMaterialBookmarksAPI(materialId);
      return { materialId, bookmarks: data.bookmarks };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchAllBookmarks = createAsyncThunk(
  'pdf/fetchAllBookmarks',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getAllBookmarksAPI();
      return data.bookmarks;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addBookmark = createAsyncThunk(
  'pdf/addBookmark',
  async ({ materialId, pageNumber, label }, { rejectWithValue }) => {
    try {
      const { data } = await addBookmarkAPI({ materialId, pageNumber, label });
      return { materialId, bookmark: data.bookmark };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const removeBookmark = createAsyncThunk(
  'pdf/removeBookmark',
  async ({ bookmarkId, materialId }, { rejectWithValue }) => {
    try {
      await removeBookmarkAPI(bookmarkId);
      return { bookmarkId, materialId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Notes
export const fetchNotes = createAsyncThunk(
  'pdf/fetchNotes',
  async (materialId, { rejectWithValue }) => {
    try {
      const { data } = await getMaterialNotesAPI(materialId);
      return { materialId, notes: data.notes };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const addNote = createAsyncThunk(
  'pdf/addNote',
  async ({ materialId, pageNumber, noteText, color }, { rejectWithValue }) => {
    try {
      const { data } = await addNoteAPI({ materialId, pageNumber, noteText, color });
      return { materialId, note: data.note };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateNote = createAsyncThunk(
  'pdf/updateNote',
  async ({ noteId, materialId, noteText, color }, { rejectWithValue }) => {
    try {
      const { data } = await updateNoteAPI(noteId, { noteText, color });
      return { materialId, note: data.note };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteNote = createAsyncThunk(
  'pdf/deleteNote',
  async ({ noteId, materialId }, { rejectWithValue }) => {
    try {
      await deleteNoteAPI(noteId);
      return { noteId, materialId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Analytics
export const trackOpen = createAsyncThunk(
  'pdf/trackOpen',
  async ({ materialId, deviceType }, { rejectWithValue }) => {
    try {
      const { data } = await trackPdfOpenAPI({ materialId, deviceType });
      return data.sessionId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const trackClose = createAsyncThunk(
  'pdf/trackClose',
  async ({ sessionId, lastPage, totalTimeSpent, completedPercentage }, { rejectWithValue }) => {
    try {
      await trackPdfCloseAPI({ sessionId, lastPage, totalTimeSpent, completedPercentage });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchTeacherAnalytics = createAsyncThunk(
  'pdf/fetchTeacherAnalytics',
  async (period, { rejectWithValue }) => {
    try {
      const { data } = await getTeacherPdfAnalyticsAPI({ period });
      return data.analytics;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchMaterialAnalytics = createAsyncThunk(
  'pdf/fetchMaterialAnalytics',
  async (materialId, { rejectWithValue }) => {
    try {
      const { data } = await getMaterialAnalyticsAPI(materialId);
      return { materialId, data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────────

const pdfSlice = createSlice({
  name: 'pdf',
  initialState: {
    progress: {},          // { [materialId]: { lastPage, totalPages, completedPercentage } }
    bookmarks: {},         // { [materialId]: [...bookmarks] }
    allBookmarks: [],      // All user bookmarks across materials
    notes: {},             // { [materialId]: [...notes] }
    analytics: {
      summary: null,
      materialDetails: {},
    },
    currentSessionId: null,
    offlineFiles: {},      // { [materialId]: { localPath, downloadedAt, fileSize } }
    loading: {
      progress: false,
      bookmarks: false,
      notes: false,
      analytics: false,
    },
    error: null,
  },
  reducers: {
    clearPdfState: (state) => {
      state.progress = {};
      state.bookmarks = {};
      state.allBookmarks = [];
      state.notes = {};
      state.analytics = { summary: null, materialDetails: {} };
      state.currentSessionId = null;
      state.error = null;
    },
    setOfflineFile: (state, action) => {
      const { materialId, localPath, fileSize } = action.payload;
      state.offlineFiles[materialId] = {
        localPath,
        downloadedAt: new Date().toISOString(),
        fileSize,
      };
    },
    removeOfflineFile: (state, action) => {
      delete state.offlineFiles[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Progress
      .addCase(fetchProgress.pending, (state) => {
        state.loading.progress = true;
      })
      .addCase(fetchProgress.fulfilled, (state, action) => {
        state.loading.progress = false;
        if (action.payload.progress) {
          state.progress[action.payload.materialId] = action.payload.progress;
        }
      })
      .addCase(fetchProgress.rejected, (state, action) => {
        state.loading.progress = false;
        state.error = action.payload;
      })
      .addCase(saveProgress.fulfilled, (state, action) => {
        if (action.payload.progress) {
          state.progress[action.payload.materialId] = action.payload.progress;
        }
      })

      // Bookmarks
      .addCase(fetchBookmarks.pending, (state) => {
        state.loading.bookmarks = true;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.loading.bookmarks = false;
        state.bookmarks[action.payload.materialId] = action.payload.bookmarks;
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.loading.bookmarks = false;
        state.error = action.payload;
      })
      .addCase(fetchAllBookmarks.pending, (state) => {
        state.loading.bookmarks = true;
      })
      .addCase(fetchAllBookmarks.fulfilled, (state, action) => {
        state.loading.bookmarks = false;
        state.allBookmarks = action.payload;
      })
      .addCase(fetchAllBookmarks.rejected, (state, action) => {
        state.loading.bookmarks = false;
        state.error = action.payload;
      })
      .addCase(addBookmark.fulfilled, (state, action) => {
        const { materialId, bookmark } = action.payload;
        if (!state.bookmarks[materialId]) state.bookmarks[materialId] = [];
        state.bookmarks[materialId].push(bookmark);
      })
      .addCase(removeBookmark.fulfilled, (state, action) => {
        const { bookmarkId, materialId } = action.payload;
        if (state.bookmarks[materialId]) {
          state.bookmarks[materialId] = state.bookmarks[materialId].filter(
            (b) => b._id !== bookmarkId
          );
        }
        state.allBookmarks = state.allBookmarks.filter((b) => b._id !== bookmarkId);
      })

      // Notes
      .addCase(fetchNotes.pending, (state) => {
        state.loading.notes = true;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading.notes = false;
        state.notes[action.payload.materialId] = action.payload.notes;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading.notes = false;
        state.error = action.payload;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        const { materialId, note } = action.payload;
        if (!state.notes[materialId]) state.notes[materialId] = [];
        state.notes[materialId].push(note);
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        const { materialId, note } = action.payload;
        if (state.notes[materialId]) {
          const idx = state.notes[materialId].findIndex((n) => n._id === note._id);
          if (idx !== -1) state.notes[materialId][idx] = note;
        }
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        const { noteId, materialId } = action.payload;
        if (state.notes[materialId]) {
          state.notes[materialId] = state.notes[materialId].filter(
            (n) => n._id !== noteId
          );
        }
      })

      // Analytics
      .addCase(trackOpen.fulfilled, (state, action) => {
        state.currentSessionId = action.payload;
      })
      .addCase(fetchTeacherAnalytics.pending, (state) => {
        state.loading.analytics = true;
      })
      .addCase(fetchTeacherAnalytics.fulfilled, (state, action) => {
        state.loading.analytics = false;
        state.analytics.summary = action.payload;
      })
      .addCase(fetchTeacherAnalytics.rejected, (state, action) => {
        state.loading.analytics = false;
        state.error = action.payload;
      })
      .addCase(fetchMaterialAnalytics.fulfilled, (state, action) => {
        state.analytics.materialDetails[action.payload.materialId] = action.payload.data;
      });
  },
});

export const { clearPdfState, setOfflineFile, removeOfflineFile, clearError } =
  pdfSlice.actions;

export default pdfSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { uploadDirectFile, publishDirectFile } from '../../services/directCloudinaryUpload';
import {
  getTeacherDashboardAPI, getTeacherStudentsAPI, getTeacherMaterialsAPI,
  enterScoreAPI, getRecentScoresAPI, goLiveAPI, endClassAPI,
  toggleMaterialLockAPI, getTeacherGradingAPI, applyTeacherLeaveAPI,
  getTeacherLeavesAPI, getTeacherPermissionsAPI,
  getClassLiveMonitorAPI, sendClassMessageAPI,
  deleteTeacherMaterialAPI,
  editTeacherMaterialAPI,
  getTeacherSalaryCurrentMonthAPI, getTeacherSalaryHistoryAPI,
  updateTeacherCompensationAPI,
  confirmMaterialUploadAPI, deleteStorageUploadAPI,
} from '../../services/api';

export const fetchTeacherDashboard = createAsyncThunk('teacher/fetchDashboard', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherDashboardAPI();
    return data;   
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load dashboard');
  }
}); 

export const fetchTeacherStudents = createAsyncThunk('teacher/fetchStudents', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherStudentsAPI();
    return data.students;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load students');
  }
});

export const fetchTeacherMaterials = createAsyncThunk('teacher/fetchMaterials', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherMaterialsAPI();
    return data.materials;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load materials');
  }
});

export const uploadMaterial = createAsyncThunk('teacher/uploadMaterial', async ({ file, metadata, onProgress }, { rejectWithValue, getState }) => {
  try {
    const data = await publishDirectFile(file, metadata, { ownerId: getState().auth.user?._id, purpose: 'material', onProgress });
    return data.material;
  } catch (err) { return rejectWithValue(err.response?.data?.message || err.message || 'Failed to upload material'); }
});

export const uploadMaterialDraft = createAsyncThunk('teacher/uploadMaterialDraft', async (file, { rejectWithValue, getState }) => {
  try { return await uploadDirectFile(file, { ownerId: getState().auth.user?._id }); }
  catch (err) { return rejectWithValue(err.message || 'Failed to upload draft for preview'); }
});

export const confirmMaterialUpload = createAsyncThunk('teacher/confirmMaterialUpload', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await confirmMaterialUploadAPI(payload);
    return data.material;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to publish material');
  }
});

export const deleteMaterialDraft = createAsyncThunk('teacher/deleteMaterialDraft', async (draft, { rejectWithValue }) => {
  try {
    await deleteStorageUploadAPI({
      publicId: draft.publicId,
      resourceType: draft.resourceType,
      storageType: draft.storageType || 'cloudinary',
    });
    return draft.publicId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete draft');
  }
});

export const deleteMaterial = createAsyncThunk('teacher/deleteMaterial', async (materialId, { rejectWithValue }) => {
  try {
    const res = await deleteTeacherMaterialAPI(materialId);
    // Backend returns { success: true, message: 'Deletion request submitted for admin approval.' }
    // But we need the updated material with approvalStatus: 'pending_delete'
    // Since the backend doesn't return the material, we'll return an object with the ID and the new status
    return { materialId, approvalStatus: 'pending_delete' };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete material');
  }
});

export const editMaterial = createAsyncThunk('teacher/editMaterial', async ({ materialId, data, file, onProgress }, { rejectWithValue, getState }) => {
  try {
    if (file) return (await publishDirectFile(file, { ...data, materialId }, { ownerId: getState().auth.user?._id, onProgress })).material;
    const res = await editTeacherMaterialAPI(materialId, data);
    return res.data.material;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to edit material');
  }
});

export const submitScore = createAsyncThunk('teacher/submitScore', async (scoreData, { rejectWithValue }) => {
  try {
    const { data } = await enterScoreAPI(scoreData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit score');
  }
});

export const fetchRecentScores = createAsyncThunk('teacher/fetchRecentScores', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getRecentScoresAPI();
    return data.scores;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load scores');
  }
});

export const startLiveClass = createAsyncThunk('teacher/goLive', async ({ classId, meetLink, meetLinkType }, { rejectWithValue }) => {
  try {
    const { data } = await goLiveAPI(classId, meetLink, meetLinkType);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to start class');
  }
});

export const endLiveClass = createAsyncThunk('teacher/endClass', async (classId, { rejectWithValue }) => {
  try {
    const { data } = await endClassAPI(classId);
    return { classId, ...data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to end class');
  }
});

export const fetchLiveMonitorData = createAsyncThunk('teacher/fetchLiveMonitorData', async (classId, { rejectWithValue }) => {
  try {
    const { data } = await getClassLiveMonitorAPI(classId);
    return data.class;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load live monitor');
  }
});

export const sendLiveClassMessage = createAsyncThunk('teacher/sendLiveClassMessage', async ({ classId, message }, { rejectWithValue }) => {
  try {
    const { data } = await sendClassMessageAPI(classId, message);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send message');
  }
});

export const toggleLock = createAsyncThunk('teacher/toggleLock', async ({ materialId, studentId, unlock, lockedForAll }, { rejectWithValue }) => {
  try {
    const { data } = await toggleMaterialLockAPI(materialId, studentId, unlock, lockedForAll);
    return { materialId, ...data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to toggle lock');
  }
});

export const fetchGrading = createAsyncThunk('teacher/fetchGrading', async ({ month, year }, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherGradingAPI(month, year);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'No grading data');
  }
});

export const applyLeave = createAsyncThunk('teacher/applyLeave', async (leaveData, { rejectWithValue }) => {
  try {
    const { data } = await applyTeacherLeaveAPI(leaveData);
    return data.leave;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to apply leave');
  }
});

export const fetchLeaves = createAsyncThunk('teacher/fetchLeaves', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherLeavesAPI();
    return data.leaves;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load leaves');
  }
});

export const updateCompensationStatus = createAsyncThunk('teacher/updateCompensationStatus', async ({ leaveId, status }, { rejectWithValue }) => {
  try {
    const { data } = await updateTeacherCompensationAPI(leaveId, { status });
    return data.leave;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update compensation status');
  }
});

export const fetchPermissions = createAsyncThunk('teacher/fetchPermissions', async (teacherId, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherPermissionsAPI(teacherId);
    return data.permissions;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load permissions');
  }
});

export const fetchCurrentSalary = createAsyncThunk('teacher/fetchCurrentSalary', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherSalaryCurrentMonthAPI();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load salary');
  }
});

export const fetchSalaryHistory = createAsyncThunk('teacher/fetchSalaryHistory', async (_, { rejectWithValue }) => {
  try {
    const { data } = await getTeacherSalaryHistoryAPI();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load salary history');
  }
});

const teacherSlice = createSlice({
  name: 'teacher',
  initialState: {
    dashboard: null,
    students: [],
    materials: [],
    recentScores: [],
    grading: null,
    leaves: [],
    permissions: null,
    currentSalary: null,
    salaryHistory: [],
    salaryConfig: null,
    currentLiveClass: null,
    liveMonitor: null,
    liveLoading: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearTeacherError: (state) => { state.error = null; },
    updatePermissions: (state, action) => { state.permissions = { ...state.permissions, ...action.payload }; },
    clearLiveMonitor: (state) => {
      state.currentLiveClass = null;
      state.liveMonitor = null;
      state.liveLoading = false;
    },
    applyLiveStudentJoined: (state, action) => {
      const { classId, studentId, studentName, joinedAt } = action.payload;
      if (!state.liveMonitor || state.liveMonitor._id !== classId) return;
      const exists = state.liveMonitor.joinedStudents?.some((s) => s._id?.toString() === studentId?.toString());
      if (!exists) {
        state.liveMonitor.joinedStudents = [
          { _id: studentId, name: studentName, joinedAt: joinedAt || new Date().toISOString(), status: 'present' },
          ...(state.liveMonitor.joinedStudents || []),
        ];
        state.liveMonitor.studentsJoined = (state.liveMonitor.studentsJoined || 0) + 1;
        state.liveMonitor.pendingStudents = (state.liveMonitor.pendingStudents || []).filter((s) => s._id?.toString() !== studentId?.toString());
      }
    },
    applyLiveStudentLeft: (state, action) => {
      const { classId, studentId } = action.payload;
      if (!state.liveMonitor || state.liveMonitor._id !== classId) return;
      state.liveMonitor.joinedStudents = (state.liveMonitor.joinedStudents || []).filter((s) => s._id?.toString() !== studentId?.toString());
      state.liveMonitor.studentsJoined = Math.max(0, state.liveMonitor.joinedStudents.length);
    },
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
      .addCase(fetchTeacherDashboard.pending, (state) => { state.loading = true; })
      .addCase(fetchTeacherDashboard.fulfilled, (state, action) => { state.loading = false; state.dashboard = action.payload; })
      .addCase(fetchTeacherDashboard.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Students
      .addCase(fetchTeacherStudents.pending, (state) => { state.loading = true; })
      .addCase(fetchTeacherStudents.fulfilled, (state, action) => { state.loading = false; state.students = action.payload; })
      .addCase(fetchTeacherStudents.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Materials
      .addCase(fetchTeacherMaterials.fulfilled, (state, action) => { state.materials = action.payload; })
      .addCase(uploadMaterial.pending, (state) => { state.loading = true; })
      .addCase(uploadMaterial.fulfilled, (state, action) => { 
        state.loading = false; 
        state.materials.unshift(action.payload); 
      })
      .addCase(uploadMaterial.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
      })
      .addCase(confirmMaterialUpload.pending, (state) => { state.loading = true; })
      .addCase(confirmMaterialUpload.fulfilled, (state, action) => {
        state.loading = false;
        state.materials.unshift(action.payload);
      })
      .addCase(confirmMaterialUpload.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        const { materialId, approvalStatus } = action.payload;
        const index = state.materials.findIndex((m) => m._id === materialId);
        if (index !== -1) {
          // Update the material's approvalStatus to 'pending_delete' so the "⏳ Pending" badge shows
          state.materials[index] = { ...state.materials[index], approvalStatus };
        }
      })
      .addCase(editMaterial.fulfilled, (state, action) => {
        const index = state.materials.findIndex(m => m._id === action.payload._id);
        if (index !== -1) {
          state.materials[index] = action.payload;
        }
      })
      // Scores
      .addCase(submitScore.fulfilled, (state) => { /* Toast handled in component */ })
      .addCase(submitScore.rejected, (state, action) => { state.error = action.payload; })
      .addCase(fetchRecentScores.fulfilled, (state, action) => { state.recentScores = action.payload; })
      // Go Live / End
      .addCase(startLiveClass.fulfilled, (state, action) => {
        state.currentLiveClass = action.payload?.class || null;
      })
      .addCase(startLiveClass.rejected, (state, action) => { state.error = action.payload; })
      .addCase(endLiveClass.fulfilled, (state) => {
        state.currentLiveClass = null;
        state.liveMonitor = null;
      })
      // Lock toggle
      .addCase(toggleLock.fulfilled, (state, action) => {
        const updated = action.payload?.material;
        if (!updated?._id) return;
        const index = state.materials.findIndex((m) => m._id === updated._id);
        if (index !== -1) state.materials[index] = updated;
      })
      // Grading
      .addCase(fetchGrading.fulfilled, (state, action) => { state.grading = action.payload; })
      // Leaves
      .addCase(applyLeave.fulfilled, (state, action) => { state.leaves.unshift(action.payload); })
      .addCase(fetchLeaves.fulfilled, (state, action) => { state.leaves = action.payload; })
      .addCase(updateCompensationStatus.fulfilled, (state, action) => {
        const index = state.leaves.findIndex(l => l._id === action.payload._id);
        if (index !== -1) {
          state.leaves[index] = action.payload;
        }
        if (state.dashboard?.pendingCompensationLeaves) {
          const dashIndex = state.dashboard.pendingCompensationLeaves.findIndex(l => l._id === action.payload._id);
          if (dashIndex !== -1) {
            state.dashboard.pendingCompensationLeaves[dashIndex] = action.payload;
          }
          // Do not remove it, as it needs to stay until admin approves
          // The count remains the same
        }
      })
      // Permissions
      .addCase(fetchPermissions.fulfilled, (state, action) => { state.permissions = action.payload; })
      // Salary
      .addCase(fetchCurrentSalary.fulfilled, (state, action) => {
        state.currentSalary = action.payload.salary;
        state.salaryConfig = action.payload.salaryConfig || null;
      })
      .addCase(fetchSalaryHistory.fulfilled, (state, action) => {
        state.salaryHistory = action.payload.salaryHistory || [];
        state.salaryConfig = action.payload.salaryConfig || state.salaryConfig;
      })
      // Live monitor
      .addCase(fetchLiveMonitorData.pending, (state) => { state.liveLoading = true; })
      .addCase(fetchLiveMonitorData.fulfilled, (state, action) => {
        state.liveLoading = false;
        state.liveMonitor = action.payload;
      })
      .addCase(fetchLiveMonitorData.rejected, (state, action) => {
        state.liveLoading = false;
        state.error = action.payload;
      })
      .addCase(sendLiveClassMessage.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearTeacherError, updatePermissions, clearLiveMonitor, applyLiveStudentJoined, applyLiveStudentLeft } = teacherSlice.actions;
export default teacherSlice.reducer;

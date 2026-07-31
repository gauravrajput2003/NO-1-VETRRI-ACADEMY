import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAdminStatsAPI, getAdminStudentsAPI, updateStudentAPI,
  deleteStudentAPI, getAdminTeachersAPI, approveTeacherAPI, updateTeacherAPI, deleteTeacherAPI,
  getAdminFeesAPI, updateFeeStatusAPI, createFeeRecordAPI, getFeesAnalyticsAPI,
  getStudentFeeDirectoryAPI, getStudentFeeHistoryAPI, recordFeePaymentAPI,
  getAdminLeavesAPI, updateLeaveStatusAPI,
  getAdminCoursesAPI, createCourseAPI, updateCourseAPI,
  getAdmissionsAPI, updateAdmissionAPI,
  getEnquiriesAPI, updateEnquiryAPI,
  getBestTeacherAPI, gradeTeacherAPI,
  createAnnouncementAPI, deleteAnnouncementAPI,
  getLiveMonitorAPI,
  getAdminMaterialsAPI, deleteAdminMaterialAPI, toggleAdminMaterialLockAPI,
  getPendingMaterialsAPI, getAdminMaterialPreviewAPI, approveMaterialAPI, rejectMaterialAPI,
  directEditMaterialAPI, uploadAdminMaterialAPI,
  getLibraryAccessListAPI, approveLibraryAccessAPI, revokeLibraryAccessAPI,
  getAdminFoldersAPI,
  approveAdminLeaveCompensationAPI,
} from '../../services/api';

// ─── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchAdminStats = createAsyncThunk('admin/fetchStats', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminStatsAPI(); return data.stats; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load stats'); }
});

export const fetchAdminStudents = createAsyncThunk('admin/fetchStudents', async (params, { rejectWithValue }) => {
  try { const { data } = await getAdminStudentsAPI(params); return { students: data.students, pagination: data.pagination }; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const editStudent = createAsyncThunk('admin/editStudent', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateStudentAPI(id, updates); return data.student; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const deleteStudent = createAsyncThunk('admin/deleteStudent', async (id, { rejectWithValue }) => {
  try { await deleteStudentAPI(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminTeachers = createAsyncThunk('admin/fetchTeachers', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminTeachersAPI(); return data.teachers; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const editTeacher = createAsyncThunk('admin/editTeacher', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateTeacherAPI(id, updates); return data.teacher; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const approveTeacher = createAsyncThunk('admin/approveTeacher', async ({ id, isApproved }, { rejectWithValue }) => {
  try { const { data } = await approveTeacherAPI(id, isApproved); return data.teacher; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const deleteTeacher = createAsyncThunk('admin/deleteTeacher', async (id, { rejectWithValue }) => {
  try { await deleteTeacherAPI(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminFees = createAsyncThunk('admin/fetchFees', async (params, { rejectWithValue }) => {
  try { const { data } = await getAdminFeesAPI(params); return { fees: data.fees, summary: data.summary }; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminFeesAnalytics = createAsyncThunk('admin/fetchFeesAnalytics', async (params, { rejectWithValue }) => {
  try { const { data } = await getFeesAnalyticsAPI(params); return data.analytics; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateFee = createAsyncThunk('admin/updateFee', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateFeeStatusAPI(id, updates); return data.fee; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const createFee = createAsyncThunk('admin/createFee', async (feeData, { rejectWithValue }) => {
  try { const { data } = await createFeeRecordAPI(feeData); return data.fee; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchStudentFeeDirectory = createAsyncThunk('admin/fetchStudentFeeDirectory', async (params, { rejectWithValue }) => {
  try { const { data } = await getStudentFeeDirectoryAPI(params); return data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchStudentFeeHistory = createAsyncThunk('admin/fetchStudentFeeHistory', async (studentId, { rejectWithValue }) => {
  try { const { data } = await getStudentFeeHistoryAPI(studentId); return data.history; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const recordFeePayment = createAsyncThunk('admin/recordFeePayment', async (paymentData, { rejectWithValue }) => {
  try { const { data } = await recordFeePaymentAPI(paymentData); return data.fee; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminLeaves = createAsyncThunk('admin/fetchLeaves', async (params, { rejectWithValue }) => {
  try { const { data } = await getAdminLeavesAPI(params); return data.leaves; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateLeave = createAsyncThunk('admin/updateLeave', async ({ id, status, adminRemarks }, { rejectWithValue }) => {
  try { const { data } = await updateLeaveStatusAPI(id, { status, adminRemarks }); return data.leave; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const approveCompensation = createAsyncThunk('admin/approveCompensation', async (id, { rejectWithValue }) => {
  try { const { data } = await approveAdminLeaveCompensationAPI(id); return data.leave; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to approve compensation'); }
});

export const fetchCourses = createAsyncThunk('admin/fetchCourses', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminCoursesAPI(); return data.courses; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const addCourse = createAsyncThunk('admin/addCourse', async (courseData, { rejectWithValue }) => {
  try { const { data } = await createCourseAPI(courseData); return data.course; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const editCourse = createAsyncThunk('admin/editCourse', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateCourseAPI(id, updates); return data.course; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdmissions = createAsyncThunk('admin/fetchAdmissions', async (params, { rejectWithValue }) => {
  try { const { data } = await getAdmissionsAPI(params); return { admissions: data.admissions, pagination: data.pagination }; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateAdmission = createAsyncThunk('admin/updateAdmission', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateAdmissionAPI(id, updates); return data.admission; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchEnquiries = createAsyncThunk('admin/fetchEnquiries', async (_, { rejectWithValue }) => {
  try { const { data } = await getEnquiriesAPI(); return data.enquiries; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateEnquiry = createAsyncThunk('admin/updateEnquiry', async ({ id, updates }, { rejectWithValue }) => {
  try { const { data } = await updateEnquiryAPI(id, updates); return data.enquiry; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchBestTeacher = createAsyncThunk('admin/fetchBestTeacher', async (_, { rejectWithValue }) => {
  try { const { data } = await getBestTeacherAPI(); return data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const submitTeacherGrade = createAsyncThunk('admin/gradeTeacher', async (gradeData, { rejectWithValue }) => {
  try { const { data } = await gradeTeacherAPI(gradeData); return data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const createAnnouncement = createAsyncThunk('admin/createAnnouncement', async (annData, { rejectWithValue }) => {
  try { const { data } = await createAnnouncementAPI(annData); return data.announcement; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const removeAnnouncement = createAsyncThunk('admin/removeAnnouncement', async (id, { rejectWithValue }) => {
  try { await deleteAnnouncementAPI(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchLiveMonitor = createAsyncThunk('admin/fetchLiveMonitor', async (_, { rejectWithValue }) => {
  try { const { data } = await getLiveMonitorAPI(); return data; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminMaterials = createAsyncThunk('admin/fetchMaterials', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminMaterialsAPI(); return data.materials; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const deleteAdminMaterial = createAsyncThunk('admin/deleteMaterial', async (id, { rejectWithValue }) => {
  try { await deleteAdminMaterialAPI(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const toggleAdminMaterialLock = createAsyncThunk('admin/toggleMaterialLock', async ({ id, lockedForAll }, { rejectWithValue }) => {
  try { 
    const { data } = await toggleAdminMaterialLockAPI(id, lockedForAll); 
    return data.material; 
  }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchPendingMaterials = createAsyncThunk('admin/fetchPendingMaterials', async (_, { rejectWithValue }) => {
  try { const { data } = await getPendingMaterialsAPI(); return data.materials; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchAdminMaterialPreview = createAsyncThunk('admin/fetchMaterialPreview', async ({ id, pendingReplacement = false }, { rejectWithValue }) => {
  try {
    const { data } = await getAdminMaterialPreviewAPI(id, pendingReplacement);
    return {
      id,
      url: data.url,
      type: data.type,
      mimeType: data.mimeType,
      storageType: data.storageType,
      resourceType: data.resourceType,
      extension: data.extension,
      filename: data.filename,
      isPendingReplacement: data.isPendingReplacement,
    };
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Failed to load preview');
  }
});

export const approvePendingMaterial = createAsyncThunk('admin/approvePendingMaterial', async (id, { rejectWithValue }) => {
  try { await approveMaterialAPI(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const rejectPendingMaterial = createAsyncThunk('admin/rejectPendingMaterial', async ({ id, reviewNotes }, { rejectWithValue }) => {
  try { await rejectMaterialAPI(id, reviewNotes); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const editAdminMaterial = createAsyncThunk('admin/editAdminMaterial', async ({ id, data }, { rejectWithValue }) => {
  try { const response = await directEditMaterialAPI(id, data); return response.data.material; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const uploadAdminMaterial = createAsyncThunk('admin/uploadAdminMaterial', async (formData, { rejectWithValue }) => {
  try { const { data } = await uploadAdminMaterialAPI(formData); return data.material; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchLibraryAccess = createAsyncThunk('admin/fetchLibraryAccess', async (_, { rejectWithValue }) => {
  try { const { data } = await getLibraryAccessListAPI(); return data.libraryAccessList; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const approveAccess = createAsyncThunk('admin/approveAccess', async (teacherId, { rejectWithValue }) => {
  try { const { data } = await approveLibraryAccessAPI(teacherId); return data.access; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const revokeAccess = createAsyncThunk('admin/revokeAccess', async ({ teacherId, notes }, { rejectWithValue }) => {
  try { const { data } = await revokeLibraryAccessAPI(teacherId, notes); return data.access; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const fetchFolders = createAsyncThunk('admin/fetchFolders', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminFoldersAPI(); return data.folders; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

// ─── Slice ─────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    students: [], studentsPagination: null,
    teachers: [],
    fees: [],
    studentFeeDirectory: [],
    studentFeeDirectoryTotal: 0,
    studentFeeHistory: [],
    feeSummary: null,
    feeAnalytics: null,
    leaves: [],
    courses: [],
    admissions: [], admissionsPagination: null,
    enquiries: [],
    bestTeacher: null,
    liveMonitor: null,
    materials: [],
    pendingMaterials: [],
    currentPreviewUrl: null,
    libraryAccessList: [],
    folders: [],
    loading: false,
    previewLoading: false,
    error: null,
  },
  reducers: {
    clearAdminError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminStats.fulfilled, (state, a) => { state.loading = false; state.stats = a.payload; })
      .addCase(fetchAdminStats.rejected, (state, a) => { state.loading = false; state.error = a.payload; })

      .addCase(fetchAdminStudents.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminStudents.fulfilled, (state, a) => { state.loading = false; state.students = a.payload.students || []; state.studentsPagination = a.payload.pagination; })
      .addCase(fetchAdminStudents.rejected, (state, a) => { state.loading = false; state.error = a.payload; console.warn('fetchAdminStudents failed:', a.payload); })
      .addCase(editStudent.fulfilled, (state, a) => { state.students = state.students.map((s) => s._id === a.payload._id ? a.payload : s); })
      .addCase(deleteStudent.fulfilled, (state, a) => {
        state.students = state.students.filter((s) => s._id !== a.payload);
        if (state.studentsPagination?.total) state.studentsPagination.total -= 1;
      })

      .addCase(fetchAdminTeachers.fulfilled, (state, a) => { state.teachers = a.payload; })
      .addCase(editTeacher.fulfilled, (state, a) => { state.teachers = state.teachers.map((t) => t._id === a.payload._id ? a.payload : t); })
      .addCase(approveTeacher.fulfilled, (state, a) => { state.teachers = state.teachers.map((t) => t._id === a.payload._id ? a.payload : t); })
      .addCase(deleteTeacher.fulfilled, (state, a) => { state.teachers = state.teachers.filter((t) => t._id !== a.payload); })

      .addCase(fetchAdminFees.fulfilled, (state, a) => { state.fees = a.payload.fees; state.feeSummary = a.payload.summary; })
      .addCase(fetchStudentFeeDirectory.fulfilled, (state, a) => {
        state.studentFeeDirectory = a.payload.students;
        state.studentFeeDirectoryTotal = a.payload.total;
      })
      .addCase(fetchStudentFeeHistory.fulfilled, (state, a) => {
        state.studentFeeHistory = a.payload;
      })
      .addCase(fetchAdminFeesAnalytics.fulfilled, (state, a) => { state.feeAnalytics = a.payload; })
      .addCase(updateFee.fulfilled, (state, a) => { state.fees = state.fees.map((f) => f._id === a.payload._id ? a.payload : f); })
      .addCase(createFee.fulfilled, (state, a) => { state.fees.unshift(a.payload); })

      .addCase(fetchAdminLeaves.fulfilled, (state, a) => { state.leaves = a.payload; })
      .addCase(updateLeave.fulfilled, (state, a) => { state.leaves = state.leaves.map((l) => l._id === a.payload?._id ? a.payload : l); })
      .addCase(approveCompensation.fulfilled, (state, a) => { state.leaves = state.leaves.map((l) => l._id === a.payload?._id ? a.payload : l); })

      .addCase(fetchCourses.fulfilled, (state, a) => { state.courses = a.payload; })
      .addCase(addCourse.fulfilled, (state, a) => { state.courses.push(a.payload); })
      .addCase(editCourse.fulfilled, (state, a) => { state.courses = state.courses.map((c) => c._id === a.payload._id ? a.payload : c); })

      .addCase(fetchAdmissions.fulfilled, (state, a) => { state.admissions = a.payload.admissions; state.admissionsPagination = a.payload.pagination; })
      .addCase(updateAdmission.fulfilled, (state, a) => { state.admissions = state.admissions.map((ad) => ad._id === a.payload._id ? a.payload : ad); })

      .addCase(fetchEnquiries.fulfilled, (state, a) => { state.enquiries = a.payload; })
      .addCase(updateEnquiry.fulfilled, (state, a) => { state.enquiries = state.enquiries.map((e) => e._id === a.payload._id ? a.payload : e); })

      .addCase(fetchBestTeacher.fulfilled, (state, a) => { state.bestTeacher = a.payload; })

      .addCase(fetchLiveMonitor.fulfilled, (state, a) => { state.liveMonitor = a.payload; })

      .addCase(removeAnnouncement.fulfilled, (state) => { /* Refetch in component */ })
      
      .addCase(fetchAdminMaterials.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminMaterials.fulfilled, (state, a) => { state.loading = false; state.materials = a.payload; })
      .addCase(fetchAdminMaterials.rejected, (state, a) => { state.loading = false; state.error = a.payload; })
      
      .addCase(deleteAdminMaterial.fulfilled, (state, a) => { state.materials = state.materials.filter(m => m._id !== a.payload); })
      .addCase(toggleAdminMaterialLock.fulfilled, (state, a) => { 
        state.materials = state.materials.map(m => m._id === a.payload._id ? a.payload : m); 
      })
      .addCase(fetchPendingMaterials.fulfilled, (state, a) => { state.pendingMaterials = a.payload; })
      .addCase(fetchAdminMaterialPreview.pending, (state) => { state.previewLoading = true; })
      .addCase(fetchAdminMaterialPreview.fulfilled, (state, a) => { state.currentPreviewUrl = a.payload; state.previewLoading = false; })
      .addCase(fetchAdminMaterialPreview.rejected, (state, a) => { state.error = a.payload; state.previewLoading = false; })
      .addCase(approvePendingMaterial.fulfilled, (state, a) => { state.pendingMaterials = state.pendingMaterials.filter(m => m._id !== a.payload); })
      .addCase(rejectPendingMaterial.fulfilled, (state, a) => { state.pendingMaterials = state.pendingMaterials.filter(m => m._id !== a.payload); })
      .addCase(editAdminMaterial.fulfilled, (state, a) => { state.materials = state.materials.map((m) => m._id === a.payload?._id ? a.payload : m); })
      .addCase(uploadAdminMaterial.fulfilled, (state, a) => { if(a.payload) state.materials.unshift(a.payload); })
      .addCase(fetchLibraryAccess.fulfilled, (state, a) => { state.libraryAccessList = a.payload; })
      .addCase(approveAccess.fulfilled, (state, a) => { 
         const idx = state.libraryAccessList.findIndex(t => t._id === a.payload.teacher);
         if(idx !== -1) state.libraryAccessList[idx].libraryAccess = a.payload;
      })
      .addCase(revokeAccess.fulfilled, (state, a) => { 
         const idx = state.libraryAccessList.findIndex(t => t._id === a.payload.teacher);
         if(idx !== -1) state.libraryAccessList[idx].libraryAccess = a.payload;
      })
      .addCase(fetchFolders.fulfilled, (state, a) => { state.folders = a.payload; });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;

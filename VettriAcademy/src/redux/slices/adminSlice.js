import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getAdminStatsAPI, getAdminStudentsAPI, updateStudentAPI,
  getAdminTeachersAPI, approveTeacherAPI,
  getAdminFeesAPI, updateFeeStatusAPI, createFeeRecordAPI, getFeesAnalyticsAPI,
  getAdminLeavesAPI, updateLeaveStatusAPI,
  getAdminCoursesAPI, createCourseAPI, updateCourseAPI,
  getAdmissionsAPI, updateAdmissionAPI,
  getEnquiriesAPI, updateEnquiryAPI,
  getBestTeacherAPI, gradeTeacherAPI,
  createAnnouncementAPI, deleteAnnouncementAPI,
  getLiveMonitorAPI,
  getAdminMaterialsAPI, deleteAdminMaterialAPI, toggleAdminMaterialLockAPI,
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

export const fetchAdminTeachers = createAsyncThunk('admin/fetchTeachers', async (_, { rejectWithValue }) => {
  try { const { data } = await getAdminTeachersAPI(); return data.teachers; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const approveTeacher = createAsyncThunk('admin/approveTeacher', async ({ id, isApproved }, { rejectWithValue }) => {
  try { const { data } = await approveTeacherAPI(id, isApproved); return data.teacher; }
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

export const fetchAdminLeaves = createAsyncThunk('admin/fetchLeaves', async (params, { rejectWithValue }) => {
  try { const { data } = await getAdminLeavesAPI(params); return data.leaves; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
});

export const updateLeave = createAsyncThunk('admin/updateLeave', async ({ id, status, adminRemarks }, { rejectWithValue }) => {
  try { const { data } = await updateLeaveStatusAPI(id, { status, adminRemarks }); return data.leave; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
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

// ─── Slice ─────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    students: [], studentsPagination: null,
    teachers: [],
    fees: [], feeSummary: null,
    feeAnalytics: null,
    leaves: [],
    courses: [],
    admissions: [], admissionsPagination: null,
    enquiries: [],
    bestTeacher: null,
    liveMonitor: null,
    materials: [],
    loading: false,
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

      .addCase(fetchAdminTeachers.fulfilled, (state, a) => { state.teachers = a.payload; })
      .addCase(approveTeacher.fulfilled, (state, a) => { state.teachers = state.teachers.map((t) => t._id === a.payload._id ? a.payload : t); })

      .addCase(fetchAdminFees.fulfilled, (state, a) => { state.fees = a.payload.fees; state.feeSummary = a.payload.summary; })
      .addCase(fetchAdminFeesAnalytics.fulfilled, (state, a) => { state.feeAnalytics = a.payload; })
      .addCase(updateFee.fulfilled, (state, a) => { state.fees = state.fees.map((f) => f._id === a.payload._id ? a.payload : f); })
      .addCase(createFee.fulfilled, (state, a) => { state.fees.unshift(a.payload); })

      .addCase(fetchAdminLeaves.fulfilled, (state, a) => { state.leaves = a.payload; })
      .addCase(updateLeave.fulfilled, (state, a) => { state.leaves = state.leaves.map((l) => l._id === a.payload?._id ? a.payload : l); })

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
      });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;

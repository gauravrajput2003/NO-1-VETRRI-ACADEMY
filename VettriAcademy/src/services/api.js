import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getToken, getRefreshToken, setToken, clearAuthData } from './storage';

// ─── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 
    'Content-Type': 'application/json',
  },
}); 

// ─── Navigation reference (set from RootNavigator) ─────────────────────────────
let navigationRef = null;
export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

// ─── Request Interceptor — attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401, refresh token ──────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue parallel requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        if (data.success && data.token) {
          await setToken(data.token);
          processQueue(null, data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        }

        throw new Error('Refresh failed');
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Token expired and refresh failed — logout
        await clearAuthData();
        // Navigation to login will be handled by Redux auth state change
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── API Methods ───────────────────────────────────────────────────────────────

// Auth
export const loginAPI = (role, identifier, password) =>
  api.post(`/auth/login/${role}`, { identifier, password });

export const registerAPI = (data) =>
  api.post('/auth/register', data);

export const logoutAPI = () =>
  api.post('/auth/logout');

export const getMeAPI = () =>
  api.get('/auth/me');

export const getCoursesMetaAPI = () =>
  api.get('/auth/courses/meta');

export const refreshTokenAPI = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken });

// AI Assistant
export const askVettriAiAPI = (question) =>
  api.post('/ai/ask', { question });

// Student
export const getStudentDashboardAPI = () =>
  api.get('/student/dashboard');

export const getStudentMaterialsAPI = () =>
  api.get('/student/materials');

export const getMaterialPreviewAPI = (id) =>
  api.get(`/student/materials/${id}/preview`);

export const getMaterialDownloadAPI = (id) =>
  api.get(`/student/materials/${id}/download`);

export const getStudentScoresAPI = () =>
  api.get('/student/scores');

export const getStudentAttendanceAPI = () =>
  api.get('/student/attendance');

export const getStudentScheduleAPI = () =>
  api.get('/student/schedule');

export const getStudentFeesAPI = () =>
  api.get('/student/fees');

export const getStudentNotificationsAPI = () =>
  api.get('/student/notifications');

export const applyStudentLeaveAPI = (data) =>
  api.post('/student/leave', data);

export const getStudentLeavesAPI = () =>
  api.get('/student/leave');

export const submitAdmissionFormAPI = (data) =>
  api.post('/student/admission-form', data);

// Classes
export const getSchedulesAPI = (params) =>
  api.get('/classes/schedule', { params });

export const getTodayClassesAPI = () =>
  api.get('/classes/today');

export const getUpcomingClassesAPI = () =>
  api.get('/classes/upcoming');

export const getCalendarDataAPI = (month, year) =>
  api.get('/classes/calendar', { params: { month, year } });

export const getClassDetailsAPI = (id) =>
  api.get(`/classes/${id}/details`);

export const getClassAttendanceAPI = (id) =>
  api.get(`/classes/${id}/attendance`);

export const joinClassAPI = (id) =>
  api.post(`/classes/${id}/join`);

// Chat
export const getConversationsAPI = () =>
  api.get('/chat/conversations');

export const getMessagesAPI = (conversationId, page = 1) =>
  api.get(`/chat/messages/${conversationId}`, { params: { page, limit: 20 } });

export const sendMessageAPI = (receiverId, message) =>
  api.post('/chat/send', { receiverId, message });

export const markAsReadAPI = (conversationId) =>
  api.patch(`/chat/read/${conversationId}`);

export const getUnreadCountAPI = () =>
  api.get('/chat/unread-count');

// Notifications
export const getNotificationsAPI = () =>
  api.get('/notifications');

export const getUnreadNotificationCountAPI = () =>
  api.get('/notifications/unread-count');

export const markNotificationReadAPI = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsReadAPI = () =>
  api.patch('/notifications/read-all');

// Profile
export const getProfileAPI = () =>
  api.get('/profile');

export const updateProfileAPI = (data) =>
  api.patch('/profile', data);

export const changePasswordAPI = (currentPassword, newPassword) =>
  api.patch('/profile/password', { currentPassword, newPassword });

// Announcements
export const getAnnouncementsAPI = (params) =>
  api.get('/announcements', { params });

// Courses (public)
export const getCoursesAPI = () =>
  api.get('/courses');

// Attendance
export const getMyLoginLogsAPI = (params) =>
  api.get('/attendance/login/my-logs', { params });

export const getLoginStreakAPI = (userId) =>
  api.get(`/attendance/login/streak/${userId}`);

export const getStudentClassAttendanceAPI = (userId, params) =>
  api.get(`/attendance/student/${userId}/class`, { params });

// ─── Teacher ───────────────────────────────────────────────────────────────────

export const getTeacherDashboardAPI = () =>
  api.get('/teacher/dashboard');

export const getTeacherStudentsAPI = () =>
  api.get('/teacher/students');

export const createLiveClassAPI = (data) =>
  api.post('/teacher/live-class', data);

export const completeLiveClassAPI = (id) =>
  api.put(`/teacher/live-class/${id}/complete`);

export const getTeacherMaterialsAPI = () =>
  api.get('/teacher/materials');

export const uploadTeacherMaterialAPI = (formData) =>
  api.post('/teacher/materials', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

export const deleteTeacherMaterialAPI = (id) =>
  api.delete(`/teacher/materials/${id}`);

export const editTeacherMaterialAPI = (id, data) =>
  api.put(`/teacher/materials/${id}`, data);

export const toggleMaterialLockAPI = (id, studentId, unlock, lockedForAll) =>
  api.put(`/teacher/materials/${id}/lock`, { studentId, unlock, lockedForAll });

export const enterScoreAPI = (data) =>
  api.post('/teacher/scores', data);

export const getRecentScoresAPI = () =>
  api.get('/teacher/scores/recent');

export const markAttendanceAPI = (data) =>
  api.post('/teacher/attendance', data);

export const getTeacherGradingAPI = (month, year) =>
  api.get(`/teacher/grading/${month}/${year}`);

export const applyTeacherLeaveAPI = (data) =>
  api.post('/teacher/leave', data);

export const getTeacherLeavesAPI = () =>
  api.get('/teacher/leave');

export const getTeacherSalaryCurrentMonthAPI = () =>
  api.get('/teacher/salary/current-month');

export const getTeacherSalaryHistoryAPI = () =>
  api.get('/teacher/salary/history');

export const getTeacherSalarySlipAPI = (teacherId, monthYear) =>
  api.get(`/teacher/salary/${teacherId}/${encodeURIComponent(monthYear)}/slip`, { responseType: 'arraybuffer' });

// Training Videos — Teacher
export const getTrainingVideosAPI = (params) =>
  api.get('/training-videos', { params });

export const markVideoCompleteAPI = (id, watchDuration) =>
  api.patch(`/training-videos/${id}/complete`, { watchDuration });

export const updateWatchProgressAPI = (id, watchDuration, currentPosition) =>
  api.patch(`/training-videos/${id}/progress`, { watchDuration, currentPosition });

export const getIncompleteMandatoryCountAPI = () =>
  api.get('/training-videos/incomplete-mandatory');

// Training Videos — Admin
export const getAdminTrainingVideosAPI = (params) =>
  api.get('/training-videos/admin/all', { params });

export const uploadTrainingVideoByUrlAPI = (data) =>
  api.post('/training-videos/url', data);

// File upload uses native fetch (NOT axios) because axios's default Content-Type: application/json
// header conflicts with multipart/form-data in React Native — fetch handles boundaries correctly.
export const uploadTrainingVideoFileAPI = async (formData) => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/training-videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type here — fetch/XHR sets multipart/form-data + boundary automatically
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Upload failed');
    err.response = { data, status: response.status };
    throw err;
  }
  return { data };
};

export const editTrainingVideoAPI = (id, data) =>
  api.put(`/training-videos/${id}`, data);

export const toggleTrainingVideoStatusAPI = (id) =>
  api.patch(`/training-videos/${id}/toggle`);

export const deleteAdminTrainingVideoAPI = (id) =>
  api.delete(`/training-videos/${id}`);

export const reorderTrainingVideosAPI = (items) =>
  api.post('/training-videos/reorder', { items });

export const getTrainingProgressMatrixAPI = () =>
  api.get('/training-videos/progress');

// Classes — Teacher actions
export const goLiveAPI = (id, meetLink, meetLinkType) =>
  api.post(`/classes/${id}/go-live`, { meetLink, meetLinkType });

export const endClassAPI = (id) =>
  api.post(`/classes/${id}/end`);

export const getClassLiveMonitorAPI = (id) =>
  api.get(`/classes/${id}/live-monitor`);

export const sendClassMessageAPI = (id, message) =>
  api.post(`/classes/${id}/message`, { message });

export const uploadRecordingAPI = (id, recordingUrl) =>
  api.patch(`/classes/${id}/recording`, { recordingUrl });

export const getCloudinarySignAPI = () =>
  api.post('/classes/upload/sign');

// Chat — File upload
export const sendChatFileAPI = (formData) =>
  api.post('/chat/send-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

export const deleteChatMessageAPI = (id) =>
  api.delete(`/chat/message/${id}`);

// Teacher permissions
export const getTeacherPermissionsAPI = (teacherId) =>
  api.get(`/profile/permissions/teacher/${teacherId}`);

// ─── Admin ─────────────────────────────────────────────────────────────────────

// Dashboard stats
export const getAdminStatsAPI = () =>
  api.get('/admin/stats');

// Students management
export const getAdminStudentsAPI = (params) =>
  api.get('/admin/students', { params });

export const updateStudentAPI = (id, data) =>
  api.put(`/admin/students/${id}`, data);

// Teachers management
export const getAdminTeachersAPI = () =>
  api.get('/admin/teachers');

export const approveTeacherAPI = (id, isApproved) =>
  api.put(`/admin/teachers/${id}/approve`, { isApproved });

export const getAdminSalaryDashboardAPI = (params) =>
  api.get('/admin/salaries', { params });

export const processTeacherSalaryAPI = (data) =>
  api.post('/admin/salary/process', data);

export const uploadSalaryProofAPI = async (formData) => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/admin/salary/upload-proof`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Upload failed');
    err.response = { data, status: response.status };
    throw err;
  }
  return { data };
};

export const processAllSalariesAPI = (data) =>
  api.post('/admin/salary/process-all', data);

export const getSalaryReportsAPI = (params) =>
  api.get('/admin/salary/reports', { params });

export const setTeacherSalaryConfigAPI = (teacherId, data) =>
  api.post(`/admin/teacher/${teacherId}/salary-config`, data);

// Fees management
export const getAdminFeesAPI = (params) =>
  api.get('/admin/fees', { params });

export const updateFeeStatusAPI = (id, data) =>
  api.put(`/admin/fees/${id}`, data);

export const recordFeePaymentAPI = (data) =>
  api.post('/admin/fees/record-payment', data);

export const createFeeRecordAPI = (data) =>
  api.post('/admin/fees', data);

export const updateStudentFeeSettingsAPI = (studentId, data) =>
  api.post(`/admin/student/${studentId}/fee-settings`, data);

export const getStudentFeeDetailsAPI = (studentId) =>
  api.get(`/admin/student/${studentId}/fees`);

export const getFeesAnalyticsAPI = (params) =>
  api.get('/admin/fees/analytics', { params });

export const sendFeeRemindersAPI = () =>
  api.post('/notifications/send-fee-reminders');

// Admissions
export const getAdmissionsAPI = (params) =>
  api.get('/admin/admissions', { params });

export const updateAdmissionAPI = (id, data) =>
  api.put(`/admin/admissions/${id}`, data);

// Enquiries
export const getEnquiriesAPI = () =>
  api.get('/admin/enquiries');

export const updateEnquiryAPI = (id, data) =>
  api.put(`/admin/enquiries/${id}`, data);

// Leave management (admin)
export const getAdminLeavesAPI = (params) =>
  api.get('/admin/leaves', { params });

export const updateLeaveStatusAPI = (id, data) =>
  api.put(`/admin/leaves/${id}`, data);

// Materials (admin)
export const getAdminMaterialsAPI = () =>
  api.get('/admin/materials');

export const deleteAdminMaterialAPI = (id) =>
  api.delete(`/admin/materials/${id}`);

export const toggleAdminMaterialLockAPI = (id, lockedForAll) =>
  api.put(`/admin/materials/${id}/lock`, { lockedForAll });

// Best teacher / grading
export const getBestTeacherAPI = () =>
  api.get('/admin/best-teacher');

export const getAdminStudentMarksAPI = (params) =>
  api.get('/admin/student-marks', { params });

export const getAdminTopRankersAPI = (params) =>
  api.get('/admin/top-rankers', { params });

export const gradeTeacherAPI = (data) =>
  api.post('/admin/grade-teacher', data);

// Course management
export const getAdminCoursesAPI = () =>
  api.get('/admin/courses');

export const createCourseAPI = (data) =>
  api.post('/admin/courses', data);

export const updateCourseAPI = (id, data) =>
  api.put(`/admin/courses/${id}`, data);

// Announcements (admin)
export const createAnnouncementAPI = (data) =>
  api.post('/announcements', data);

export const updateAnnouncementAPI = (id, data) =>
  api.patch(`/announcements/${id}`, data);

export const deleteAnnouncementAPI = (id) =>
  api.delete(`/announcements/${id}`);

export const getActiveAnnouncementsAPI = () =>
  api.get('/announcements/active');

export const markAnnouncementReadAPI = (id) =>
  api.post(`/announcements/${id}/read`);

// Class scheduling (admin)
export const createScheduleAPI = (data) =>
  api.post('/classes/schedule', data);

export const updateScheduleAPI = (id, data) =>
  api.patch(`/classes/schedule/${id}`, data);

export const cancelScheduleAPI = (id) =>
  api.delete(`/classes/schedule/${id}`);

export const generateYearScheduleAPI = (data) =>
  api.post('/classes/generate-year', data);

// Live monitor (admin)
export const getLiveMonitorAPI = () =>
  api.get('/classes/live-monitor');

// Login logs
export const getLoginLogsAPI = (params) =>
  api.get('/attendance/login/logs', { params });

// ─── Download Center ──────────────────────────────────────────────────────────

export const getDownloadResourcesAPI = (params) =>
  api.get('/downloads/resources', { params });

export const getNcertResourcesAPI = (params) =>
  api.get('/downloads/ncert', { params });

// ─── PDF Module ────────────────────────────────────────────────────────────────

// PDF Progress
export const savePdfProgressAPI = (data) =>
  api.post('/pdf/progress', data);

export const getPdfProgressAPI = (materialId) =>
  api.get(`/pdf/progress/${materialId}`);

// PDF Bookmarks
export const addBookmarkAPI = (data) =>
  api.post('/pdf/bookmarks', data);

export const removeBookmarkAPI = (id) =>
  api.delete(`/pdf/bookmarks/${id}`);

export const getMaterialBookmarksAPI = (materialId) =>
  api.get(`/pdf/bookmarks/${materialId}`);

export const getAllBookmarksAPI = () =>
  api.get('/pdf/bookmarks/all');

// PDF Notes
export const addNoteAPI = (data) =>
  api.post('/pdf/notes', data);

export const updateNoteAPI = (id, data) =>
  api.put(`/pdf/notes/${id}`, data);

export const deleteNoteAPI = (id) =>
  api.delete(`/pdf/notes/${id}`);

export const getMaterialNotesAPI = (materialId) =>
  api.get(`/pdf/notes/${materialId}`);

export const getPageNotesAPI = (materialId, page) =>
  api.get(`/pdf/notes/${materialId}/${page}`);

// PDF Analytics
export const trackPdfOpenAPI = (data) =>
  api.post('/pdf/analytics/open', data);

export const trackPdfCloseAPI = (data) =>
  api.post('/pdf/analytics/close', data);

export const getTeacherPdfAnalyticsAPI = (params) =>
  api.get('/pdf/analytics/teacher', { params });

export const getMaterialAnalyticsAPI = (materialId) =>
  api.get(`/pdf/analytics/material/${materialId}`);

// Signed PDF URL
export const getSignedPdfUrlAPI = (materialId) =>
  api.get(`/pdf/signed-url/${materialId}`);

export default api;

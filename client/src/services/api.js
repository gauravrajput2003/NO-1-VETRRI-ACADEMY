import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request: attach token ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response: handle 401 with refresh ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          if (data.success) {
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login/student';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginUser = (role, data) => api.post(`/auth/login/${role}`, data);
export const registerStudent = (data) => api.post('/auth/register', { role: 'student', ...data });
export const logoutUser = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.patch('/profile', data);
export const updateAvatar = (formData) => api.patch('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const changePassword = (data) => api.patch('/profile/password', data);

// ─── Classes ──────────────────────────────────────────────────────────────────
export const createSchedule = (data) => api.post('/classes/schedule', data);
export const getSchedules = (params) => api.get('/classes/schedule', { params });
export const getTodayClasses = () => api.get('/classes/today');
export const getUpcomingClasses = () => api.get('/classes/upcoming');
export const getCalendarData = (params) => api.get('/classes/calendar', { params });
export const getClassDetails = (id) => api.get(`/classes/${id}/details`);
export const goLive = (id, data) => api.post(`/classes/${id}/go-live`, data);
export const joinClass = (id) => api.post(`/classes/${id}/join`);
export const endClass = (id) => api.post(`/classes/${id}/end`);
export const uploadRecording = (id, data) => api.patch(`/classes/${id}/recording`, data);
export const getClassAttendance = (id) => api.get(`/classes/${id}/attendance`);
export const updateSchedule = (id, data) => api.patch(`/classes/schedule/${id}`, data);
export const cancelSchedule = (id, data) => api.delete(`/classes/schedule/${id}`, { data });
export const generateYearSchedule = (data) => api.post('/classes/generate-year', data);
export const getLiveMonitor = (params) => api.get('/classes/live-monitor', { params });
export const manualAttendance = (data) => api.post('/classes/attendance/manual', data);
export const getUploadSignature = (data) => api.post('/classes/upload/sign', data);

// ─── Training Videos ─────────────────────────────────────────────────────────
export const uploadTrainingVideo = (formData) => api.post('/training-videos', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getTrainingVideos = () => api.get('/training-videos');
export const markVideoComplete = (id, data) => api.patch(`/training-videos/${id}/complete`, data);
export const updateVideoProgress = (id, data) => api.patch(`/training-videos/${id}/progress`, data);
export const deleteTrainingVideo = (id) => api.delete(`/training-videos/${id}`);
export const getTrainingProgress = () => api.get('/training-videos/progress');
export const getIncompleteMandatoryCount = () => api.get('/training-videos/incomplete-mandatory');

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const getConversations = () => api.get('/chat/conversations');
export const getMessages = (conversationId, params) => api.get(`/chat/messages/${conversationId}`, { params });
export const sendMessage = (data) => api.post('/chat/send', data);
export const sendFile = (formData) => api.post('/chat/send-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const markAsRead = (conversationId) => api.patch(`/chat/read/${conversationId}`);
export const getChatUnreadCount = () => api.get('/chat/unread-count');
export const deleteMessage = (id) => api.delete(`/chat/message/${id}`);
export const getChatLogs = (params) => api.get('/chat/logs', { params });

// ─── Attendance ───────────────────────────────────────────────────────────────
export const getMyLoginLogs = (params) => api.get('/attendance/login/my-logs', { params });
export const getAllLoginLogs = (params) => api.get('/attendance/login/all', { params });
export const getTodayLogins = () => api.get('/attendance/login/today');
export const getLoginStreak = (userId) => api.get(`/attendance/login/streak/${userId}`);
export const getStudentClassAttendanceData = (userId, params) => api.get(`/attendance/student/${userId}/class`, { params });

// ─── Reports (for PDF/Excel export) ─────────────────────────────────────────
export const getStudentAttendanceReport = (id, params) => api.get(`/attendance/reports/student/${id}/attendance`, { params });
export const getTeacherStudentsReport = (id, params) => api.get(`/attendance/reports/teacher/${id}/students`, { params });
export const getAdminAttendanceReport = (params) => api.get('/attendance/reports/admin/attendance', { params });
export const getMonthlyAttendanceSummary = (params) => api.get('/attendance/reports/admin/monthly-summary', { params });

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = () => api.get('/notifications');
export const getNotificationUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// ─── Announcements ────────────────────────────────────────────────────────────
export const getAnnouncements = () => api.get('/announcements');
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) => api.patch(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// ─── Demo Bookings ────────────────────────────────────────────────────────────
export const createDemoBooking = (data) => api.post('/demo', data);
export const getDemoBookings = (params) => api.get('/demo', { params });
export const updateDemoBooking = (id, data) => api.patch(`/demo/${id}`, data);

// ─── Teacher Permissions ──────────────────────────────────────────────────────
export const getAllTeacherPermissions = () => api.get('/profile/permissions/teachers');
export const getTeacherPermissions = (teacherId) => api.get(`/profile/permissions/teacher/${teacherId}`);
export const updateTeacherPermissions = (teacherId, data) => api.patch(`/profile/permissions/teacher/${teacherId}`, data);

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/stats');
export const getAllStudents = (params) => api.get('/admin/students', { params });
export const getAllTeachers = (params) => api.get('/admin/teachers', { params });
export const updateStudent = (id, data) => api.put(`/admin/students/${id}`, data);
export const approveTeacher = (id) => api.put(`/admin/teachers/${id}/approve`);
export const getFeesOverview = () => api.get('/admin/fees');
export const updateFeeStatus = (id, data) => api.put(`/admin/fees/${id}`, data);
export const createFeeRecord = (data) => api.post('/admin/fees', data);
export const sendFeeReminder = (id) => api.post(`/admin/fees/${id}/reminder`);
export const getAdmissions = () => api.get('/admin/admissions');
export const updateAdmission = (id, data) => api.put(`/admin/admissions/${id}`, data);
export const getAllLeaves = () => api.get('/admin/leaves');
export const updateLeaveStatus = (id, data) => api.put(`/admin/leaves/${id}`, data);
export const getBestTeacher = () => api.get('/admin/best-teacher');
export const gradeTeacher = (data) => api.post('/admin/grade-teacher', data);

// ─── Student ──────────────────────────────────────────────────────────────────
export const getStudentDashboard = () => api.get('/student/dashboard');
export const getStudentMaterials = () => api.get('/student/materials');
export const getStudentScores = () => api.get('/student/scores');
export const getStudentFees = () => api.get('/student/fees');
export const applyStudentLeave = (data) => api.post('/student/leave', data);
export const getStudentLeaves = () => api.get('/student/leave');

// ─── Teacher ──────────────────────────────────────────────────────────────────
export const getTeacherDashboard = () => api.get('/teacher/dashboard');
export const getMyStudents = () => api.get('/teacher/students');
export const uploadMaterial = (formData) => api.post('/teacher/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getTeacherMaterials = () => api.get('/teacher/materials');
export const toggleMaterialLock = (id, data) => api.put(`/teacher/materials/${id}/lock`, data);
export const enterExamScore = (data) => api.post('/teacher/scores', data);
export const getRecentTeacherScores = (params) => api.get('/teacher/scores/recent', { params });
export const markAttendance = (data) => api.post('/teacher/attendance', data);
export const getMonthlyGrading = (month, year) => api.get(`/teacher/grading/${month}/${year}`);
export const applyLeave = (data) => api.post('/teacher/leave', data);
export const getTeacherLeaves = () => api.get('/teacher/leave');

// ─── Vettri AI ───────────────────────────────────────────────────────────────
export const askVettriAI = (question) => api.post('/ai/ask', { question });

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export const getWeeklyLeaderboard = (params) => api.get('/leaderboard/weekly', { params });
export const getMyLeaderboardRank = () => api.get('/leaderboard/my-rank');

// ─── Enquiries ────────────────────────────────────────────────────────────────
export const getEnquiries = (params) => api.get('/enquiries', { params });
export const updateEnquiry = (id, data) => api.patch(`/enquiries/${id}`, data);

// ─── Teacher Grading (admin) ──────────────────────────────────────────────────
export const getAllTeacherGradings = (params) => api.get('/teacher-grading', { params });
export const submitTeacherGrading = (data) => api.post('/teacher-grading', data);

export default api;

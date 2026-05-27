// ─── API Configuration
const PROD_API_ORIGIN = 'https://no-1-vetrri-academy.onrender.com';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || `${PROD_API_ORIGIN}/api`;
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || PROD_API_ORIGIN;

// ─── Storage Keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  TOKEN: '@vettri_token',
  REFRESH_TOKEN: '@vettri_refresh_token',
  USER: '@vettri_user',
  THEME: '@vettri_theme',
  LANGUAGE: '@vettri_language',
  BIOMETRIC_ENABLED: '@vettri_biometric',
};

// ─── User Roles ────────────────────────────────────────────────────────────────
export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

// ─── Class Status ──────────────────────────────────────────────────────────────
export const CLASS_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ─── Fee Status ────────────────────────────────────────────────────────────────
export const FEE_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
};

// ─── Attendance Status ─────────────────────────────────────────────────────────
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

// ─── Material Types ────────────────────────────────────────────────────────────
export const MATERIAL_TYPES = {
  PDF: 'pdf',
  PPT: 'ppt',
  VIDEO: 'video',
  IMAGE: 'image',
};

// ─── Notification Types ────────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  NEW_SCORE: 'new_score',
  NEW_MATERIAL: 'new_material',
  CLASS_REMINDER: 'class_reminder',
  CLASS_STARTING: 'class_starting',
  LEAVE_UPDATE: 'leave_update',
  FEE_REMINDER: 'fee_reminder',
  CHAT: 'chat',
  ANNOUNCEMENT: 'announcement',
  MATERIAL_UNLOCKED: 'material_unlocked',
  RECORDING_AVAILABLE: 'recording_available',
};

// ─── Course Categories ─────────────────────────────────────────────────────────
export const COURSE_CATEGORIES = [
  'CBSE',
  'State Board',
  'Engineering',
  'Arts & Science',
  'Language',
  'Competitive',
];

// ─── Boards ────────────────────────────────────────────────────────────────────
export const BOARDS = [
  'CBSE',
  'State Board',
  'Arts College',
  'Eng College',
  'TNPSC',
  'TRB',
  'TET',
];

// ─── DiceBear Avatar ───────────────────────────────────────────────────────────
export const getDiceBearUrl = (userId) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;

// ─── Pagination ────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;

// ─── App Info ──────────────────────────────────────────────────────────────────
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'No.1 Vettri Academy';

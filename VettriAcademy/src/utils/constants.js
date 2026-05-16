import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── API Configuration 
const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  if (!hostUri) return '';

  return hostUri
    .replace(/^https?:\/\//, '')
    .split(':')[0]
    .split('/')[0]
    .trim();
};

const getWebHost = () => {
  if (typeof window === 'undefined') return '';

  const hostname = window.location?.hostname?.trim();
  if (!hostname) return '';

  return hostname;
};

const getApiHost = () => {
  const explicitHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (explicitHost) return explicitHost;

  if (Platform.OS === 'web') {
    return getWebHost() || 'localhost';
  }

  return (
    getExpoHost() ||
    Platform.select({
      android: '10.0.2.2',
      ios: 'localhost',
      default: 'localhost',
    })
  );
};

const API_HOST = getApiHost();
const API_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL?.trim() || 'http';

export const API_BASE_URL = `${API_PROTOCOL}://${API_HOST}:5000/api`;
export const SOCKET_URL = `${API_PROTOCOL}://${API_HOST}:5000`;

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

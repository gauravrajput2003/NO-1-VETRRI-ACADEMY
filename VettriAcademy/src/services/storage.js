import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import { warnDev } from '../utils/logger';

// ─── Token Management ──────────────────────────────────────────────────────────

export const setToken = async (token) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    warnDev('Error saving token:', error.message);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    warnDev('Error getting token:', error.message);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    warnDev('Error removing token:', error.message);
  }
};

// ─── Refresh Token Management ──────────────────────────────────────────────────

export const setRefreshToken = async (token) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    warnDev('Error saving refresh token:', error.message);
  }
};

export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    warnDev('Error getting refresh token:', error.message);
    return null;
  }
};

export const removeRefreshToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    warnDev('Error removing refresh token:', error.message);
  }
};

// ─── User Data ──────────────────────────────────────────────────────────────────

export const setUserData = async (user) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    warnDev('Error saving user data:', error.message);
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    warnDev('Error getting user data:', error.message);
    return null;
  }
};

// ─── Clear All Auth Data ────────────────────────────────────────────────────────

export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  } catch (error) {
    warnDev('Error clearing auth data:', error.message);
  }
};

// ─── Theme Preference ──────────────────────────────────────────────────────────

export const setThemePreference = async (theme) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    warnDev('Error saving theme:', error.message);
  }
};

export const getThemePreference = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch (error) {
    return 'light';
  }
};

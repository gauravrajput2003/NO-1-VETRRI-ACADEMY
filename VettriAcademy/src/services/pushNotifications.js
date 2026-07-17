/**
 * ─── Push Notifications Service ──────────────────────────────────────────────
 *
 * Handles:
 * 1. Android notification channel setup (HIGH importance — heads-up banners)
 * 2. Expo push token registration + saving to backend
 * 3. Local OS notifications (e.g. download-complete banners)
 *
 * Both push notifications (from backend via Expo's push API) and local
 * notifications (scheduled client-side) share the same Android channel
 * so they behave identically: heads-up banner, sound, vibration.
 *
 * iOS note: scheduleNotificationAsync with trigger:null fires immediately
 * and appears in the system notification center. When the app is in the
 * foreground on iOS, the handler below ensures it still shows (shouldShowAlert:true).
 * No separate permission is needed beyond what's requested via requestPermissionsAsync.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Foreground notification display handler ──────────────────────────────────
// Makes notifications visible even when the app is open (critical for iOS).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android channel ID (shared by push + local notifications) ───────────────
export const NOTIFICATION_CHANNEL_ID = 'vettri-default';

/**
 * Create/update the Android notification channel.
 * HIGH importance = heads-up popup banner with sound (same as Swiggy/Zomato).
 * Safe to call multiple times — Android is idempotent for existing channels.
 * No-op on iOS.
 */
export const configurePushChannels = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Vettri Academy Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF4F8B',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

/**
 * Request notification permissions, configure channel, and return the
 * Expo push token string (e.g. "ExponentPushToken[xxxxxx]").
 * Returns null if permissions are denied or token retrieval fails.
 */
export const registerForPushNotifications = async () => {
  await configurePushChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return null;
  }

  try {
    // projectId from app.json → extra.eas.projectId
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data; // e.g. "ExponentPushToken[xxx]"
  } catch (e) {
    console.warn('[Push] Failed to get push token:', e.message);
    return null;
  }
};

/**
 * Fire an immediate local OS notification when a file finishes downloading.
 * - Appears in the system notification tray / status bar
 * - Works even when the app is backgrounded
 * - Tapping it triggers the 'download_complete' branch in the notification
 *   response listener in RootNavigator.jsx, which opens the file
 *
 * @param {string} filename  Display name shown in the notification body
 * @param {string} fileUri   Local file URI (documentDirectory path) stored in
 *                           notification data so the tap handler can open it
 */
export const scheduleDownloadCompleteNotification = async (filename, fileUri) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Download Complete ✅',
        body: `${filename} downloaded successfully. Tap to open.`,
        data: { type: 'download_complete', fileUri },
        sound: 'default',
        // Android: use the shared HIGH-importance channel
        ...(Platform.OS === 'android' && {
          channelId: NOTIFICATION_CHANNEL_ID,
        }),
      },
      trigger: null, // fires immediately
    });
  } catch (e) {
    // Never crash the download flow over a notification failure
    console.warn('[Push] Could not schedule download notification:', e.message);
  }
};

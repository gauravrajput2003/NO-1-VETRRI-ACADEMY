import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { Colors } from '../utils/colors';
import { lightTheme, darkTheme } from '../utils/theme';
import { fetchCurrentUser } from '../redux/slices/authSlice';
import { onNotification, onSocketEvent } from '../services/socket';
import { addNotification } from '../redux/slices/notificationsSlice';
import { addIncomingMessage } from '../redux/slices/chatSlice';
import { updateClassStatus } from '../redux/slices/classesSlice';
import {
  registerForPushNotifications,
} from '../services/pushNotifications';
import { savePushTokenAPI } from '../services/api';
import { resolveNotificationTarget } from '../utils/notificationNavigation';

import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';
import AdminNavigator from './AdminNavigator';
import AIAssistantDrawer from '../components/AIAssistantDrawer';

// Navigation ref for imperative navigation from notification taps
const navigationRef = React.createRef();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, initialLoading, user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  // Track token-refresh subscription so we can clean it up
  const tokenRefreshSub = useRef(null);

  // Attempt to restore session on app start
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // ─── Push notification setup (runs once after authentication) ──────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token && !cancelled) {
          // Save token to backend
          await savePushTokenAPI(token).catch((e) =>
            console.warn('[Push] Could not save token to server:', e.message)
          );
        }
      } catch (e) {
        console.warn('[Push] Registration failed:', e.message);
      }
    })();

    // Listen for token refreshes (Expo rotates tokens occasionally)
    tokenRefreshSub.current = Notifications.addPushTokenListener(async ({ data: newToken }) => {
      if (newToken) {
        await savePushTokenAPI(newToken).catch((e) =>
          console.warn('[Push] Token refresh save failed:', e.message)
        );
      }
    });

    return () => {
      cancelled = true;
      tokenRefreshSub.current?.remove();
      tokenRefreshSub.current = null;
    };
  }, [isAuthenticated, user]);

  // ─── Unified notification response listener ────────────────────────────────
  // Handles ALL notification taps in one place to avoid listener conflicts.
  // Distinguishes type via notification data payload:
  //   { type: 'download_complete', fileUri }  → open the downloaded file
  //   everything else → resolveNotificationTarget + navigate
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data || {};

        if (data.type === 'download_complete' && data.fileUri) {
          // Open the downloaded file using expo-sharing (shows native open-with dialog)
          try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(data.fileUri);
            }
          } catch (e) {
            console.warn('[Push] Could not open downloaded file:', e.message);
          }
        } else {
          const { screen, params } = resolveNotificationTarget({ data });
          setTimeout(() => {
            navigationRef.current?.navigate(screen, params);
          }, 500);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Global socket event listeners (active when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Notification listener (Socket.io now, FCM-ready)
    const unsubNotif = onNotification((notif) => {
      dispatch(addNotification(notif));
      Toast.show({
        type: 'info',
        text1: notif.title || 'Notification',
        text2: notif.message || '',
        onPress: () => {
          Toast.hide();
          const { screen, params } = resolveNotificationTarget(notif);
          navigationRef.current?.navigate(screen, params);
        },
      });
    });

    // Chat message listener (global — for badge count updates)
    const unsubChat = onSocketEvent('chat:message', (msg) => {
      dispatch(addIncomingMessage(msg));
    });

    // Class status listeners
    const unsubClassStart = onSocketEvent('class:started', (data) => {
      dispatch(updateClassStatus({ classId: data.classId, status: 'live' }));
    });

    const unsubClassEnd = onSocketEvent('class:ended', (data) => {
      dispatch(updateClassStatus({ classId: data.classId, status: 'completed' }));
    });

    const unsubClassCancel = onSocketEvent('class:cancelled', (data) => {
      dispatch(updateClassStatus({ classId: data.classId, status: 'cancelled' }));
    });

    return () => {
      unsubNotif();
      unsubChat();
      unsubClassStart();
      unsubClassEnd();
      unsubClassCancel();
    };
  }, [isAuthenticated, user, dispatch]);

  // Show loading while checking auth state
  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? Colors.navy : Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Preserve React Navigation defaults (including fonts) and only override color tokens.
  const navTheme = isDark
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          ...darkTheme.colors,
          primary: Colors.primary,
          background: Colors.background.dark,
          card: Colors.card.dark,
          text: Colors.text.dark,
          border: Colors.navyLight,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          ...lightTheme.colors,
          primary: Colors.primary,
          background: Colors.background.light,
          card: Colors.card.light,
          text: Colors.text.light,
          border: Colors.gray,
        },
      };

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? Colors.navy : Colors.white} />
      {isAuthenticated && user ? (
        // Role-based navigation
        user.role === 'student' ? <StudentNavigator /> :
        user.role === 'teacher' ? <TeacherNavigator /> :
        user.role === 'admin' ? <AdminNavigator /> :
        <StudentNavigator />
      ) : (
        <AuthNavigator />
      )}
      {isAuthenticated && user && <AIAssistantDrawer />}
    </NavigationContainer>
  );
}

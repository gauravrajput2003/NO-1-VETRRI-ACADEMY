import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { Colors } from '../utils/colors';
import { lightTheme, darkTheme } from '../utils/theme';
import { fetchCurrentUser } from '../redux/slices/authSlice';
import { onNotification, onSocketEvent } from '../services/socket';
import { addNotification } from '../redux/slices/notificationsSlice';
import { addIncomingMessage } from '../redux/slices/chatSlice';
import { updateClassStatus } from '../redux/slices/classesSlice';

import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';
import AdminNavigator from './AdminNavigator';
import AIAssistantDrawer from '../components/AIAssistantDrawer';

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, initialLoading, user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  // Attempt to restore session on app start
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Global socket event listeners (active when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Notification listener (Socket.io now, FCM-ready)
    const unsubNotif = onNotification((notif) => {
      dispatch(addNotification(notif));
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
    <NavigationContainer theme={navTheme}>
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

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../utils/colors';
import { toggleAI } from '../redux/slices/uiSlice';
import AnnouncementButton from './announcements/AnnouncementButton';
import NotificationButton from './NotificationButton';

export default function HeaderActions() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { unreadCount } = useSelector((s) => s.notifications);
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin');
  const openAnnouncements = () => {
    if (navigation.getState?.()?.routeNames?.includes('Announcements')) return navigation.navigate('Announcements');
    let parent = navigation.getParent?.();
    while (parent) {
      if (parent.getState?.()?.routeNames?.includes('Home')) return parent.navigate('Home', { screen: 'Announcements' });
      parent = parent.getParent?.();
    }
  };
  const openNotifications = () => {
    const currentState = navigation.getState?.();
    if (currentState?.routeNames?.includes('Notifications')) {
      navigation.navigate('Notifications');
      return;
    }

    const parentNav = navigation.getParent?.();
    const parentState = parentNav?.getState?.();
    if (parentState?.routeNames?.includes('Profile')) {
      parentNav.navigate('Profile', { screen: 'Notifications' });
      return;
    }
    if (parentState?.routeNames?.includes('Home')) {
      parentNav.navigate('Home', { screen: 'Notifications' });
      return;
    }
    if (parentState?.routeNames?.includes('Notifications')) {
      parentNav.navigate('Notifications');
    }
  };

  return (
    <View style={styles.container}>
      {!isAdmin && <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
        <Ionicons name="sparkles" size={22} color={Colors.hotPink} />
      </TouchableOpacity>}
      
      <AnnouncementButton onPress={openAnnouncements} />
      <NotificationButton onPress={openNotifications} unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    gap: 8,
  },
  aiBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderRadius: 20,
  },
  notifBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.hotPink,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

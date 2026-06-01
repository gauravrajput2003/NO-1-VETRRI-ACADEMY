import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../utils/colors';
import { toggleAI } from '../redux/slices/uiSlice';

export default function HeaderActions() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { unreadCount } = useSelector((s) => s.notifications);
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
      <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
        <Ionicons name="sparkles" size={22} color={Colors.hotPink} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.notifBtn} onPress={openNotifications}>
        <Ionicons name="notifications-outline" size={24} color={Colors.hotPink} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  aiBtn: {
    padding: 8,
    marginRight: 4,
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderRadius: 20,
  },
  notifBtn: {
    padding: 8,
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

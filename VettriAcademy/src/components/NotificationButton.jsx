import React from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native';

export default function NotificationButton({ onPress, unreadCount = 0 }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open notifications" onPress={onPress} activeOpacity={0.8} style={styles.button}>
    <Image source={require('../../assets/notification-bell-red.png')} style={styles.image} resizeMode="contain" />
    {unreadCount > 0 && <View style={styles.badge}><Text style={styles.count}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
  </TouchableOpacity>;
}
const styles = StyleSheet.create({
  button: { width: 44, height: 44, flexShrink: 0, position: 'relative' },
  image: { width: 44, height: 44, borderRadius: 22 },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 3, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  count: { color: '#B91C1C', fontSize: 10, fontWeight: '800' },
});

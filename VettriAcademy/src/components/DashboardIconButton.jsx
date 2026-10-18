import React from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native';

const ICONS = {
  ai: { source: require('../../assets/student-ai.png'), label: 'Open AI assistant' },
  chat: { source: require('../../assets/chat-anggara.png'), label: 'Chat with admin' },
};

export default function DashboardIconButton({ icon, onPress, unreadCount = 0 }) {
  const { source, label } = ICONS[icon];
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={styles.button} onPress={onPress} activeOpacity={0.8}>
    <Image source={source} style={styles.image} resizeMode="contain" />
    {unreadCount > 0 && <View style={styles.badge}><Text style={styles.count}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  image: { width: 28, height: 28 },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 3, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  count: { color: '#B91C1C', fontSize: 10, fontWeight: '800' },
});

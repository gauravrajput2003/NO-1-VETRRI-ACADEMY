import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AnnouncementButton({ onPress }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open announcements" onPress={onPress} activeOpacity={0.8} style={styles.button}>
    <Ionicons name="megaphone" size={24} color="#DC2626" />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' } });

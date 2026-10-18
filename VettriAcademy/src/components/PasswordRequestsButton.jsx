import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPasswordRequestsAPI } from '../services/api';

export default function PasswordRequestsButton({ onPress }) {
  const [count, setCount] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true, running = false;
    const refresh = async () => {
      if (running || !active) return;
      running = true;
      try { const { data } = await getPasswordRequestsAPI({ limit: 1, status: 'pending' }); if (active) setCount(data.pendingCount || 0); }
      catch { /* Retain the last known count during a temporary outage. */ }
      finally { running = false; }
    };
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, []));
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Password Requests, ' + count + ' pending'} style={s.card} onPress={onPress}>
    <View style={s.icon}><Ionicons name="key-outline" size={26} color="#FF4F8B" /></View>
    <View style={{ flex: 1 }}><Text style={s.title}>Password Requests</Text><Text style={s.sub}>Help students and teachers sign in</Text></View>
    {count > 0 && <View style={s.badge}><Text style={s.count}>{count > 99 ? '99+' : count}</Text></View>}
    <Ionicons name="chevron-forward" size={20} color="#FFF" />
  </TouchableOpacity>;
}
const s = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#102A43', padding: 16, borderRadius: 18, minHeight: 88 },
  icon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontWeight: '800', fontSize: 17 }, sub: { color: '#B8CFDD', fontSize: 12, lineHeight: 18, marginTop: 4 },
  badge: { backgroundColor: '#FF4F8B', minWidth: 26, minHeight: 26, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, count: { color: '#FFF', fontWeight: '800' } });

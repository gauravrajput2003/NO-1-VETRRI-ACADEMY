import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { getActiveAnnouncementsAPI, markAnnouncementReadAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';

export default function AnnouncementsInboxScreen({ navigation }) {
  const insets = useSafeAreaInsets(), bottomPadding = useBottomTabBarPadding();
  const dark = useSelector(s => s.ui.theme === 'dark');
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [marking, setMarking] = useState(null);
  const text = dark ? '#F8FAFC' : '#102A43';
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems((await getActiveAnnouncementsAPI({ includeRead: 'true' })).data.announcements || []); }
    catch (e) { setError(e.response?.data?.message || 'Unable to load announcements. Please retry.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); const timer = setInterval(load, 60000); return () => clearInterval(timer); }, [load]));
  const markRead = async (id) => {
    if (marking) return;
    setMarking(id); setError('');
    try { await markAnnouncementReadAPI(id); setItems(rows => rows.map(row => row._id === id ? { ...row, isRead: true } : row)); }
    catch (e) { setError(e.response?.data?.message || 'Could not mark this announcement as read.'); }
    finally { setMarking(null); }
  };
  return <View style={{ flex: 1, backgroundColor: dark ? '#0F172A' : '#F4F7FB', paddingTop: insets.top }}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="Back to dashboard" accessibilityRole="button" style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={text} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={[styles.title, { color: text }]}>Announcements</Text><Text style={{ color: dark ? '#CBD5E1' : '#526578', fontSize: 13 }}>Notices from admin · Last 7 days</Text></View>
    </View>
    <Text style={[styles.note, { color: dark ? '#CBD5E1' : '#526578' }]}>Read notices stay here until they expire. Announcements are automatically removed seven days after posting.</Text>
    {!!error && <View style={styles.error}><Text accessibilityRole="alert" style={{ color: '#991B1B' }}>{error}</Text><TouchableOpacity style={styles.read} onPress={load}><Text style={styles.readText}>Retry</Text></TouchableOpacity></View>}
    {loading && !items.length ? <ActivityIndicator size="large" color="#0F766E" style={{ marginTop: 40 }} /> : <FlatList
      data={items} keyExtractor={item => item._id} refreshing={loading} onRefresh={load}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 24, flexGrow: 1 }}
      renderItem={({ item }) => <View style={{ marginBottom: 16 }}>
        <AnnouncementCard ann={item} />
        <View style={styles.footer}><Text style={{ flex: 1, color: dark ? '#CBD5E1' : '#526578', fontSize: 12 }}>Expires {new Date(+new Date(item.createdAt) + 7 * 86400000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          {item.isRead ? <Text style={styles.readText}>Read ✓</Text> : <TouchableOpacity accessibilityRole="button" style={styles.read} disabled={!!marking} onPress={() => markRead(item._id)}><Text style={styles.readText}>{marking === item._id ? 'Saving…' : 'Mark as read'}</Text></TouchableOpacity>}
        </View>
      </View>}
      ListEmptyComponent={!error && <View style={styles.empty}><Ionicons name="megaphone-outline" size={48} color="#0F766E" /><Text style={[styles.title, { color: text, marginTop: 14 }]}>No announcements</Text><Text style={{ color: dark ? '#CBD5E1' : '#526578', marginTop: 8 }}>New notices from admin will appear here.</Text></View>}
    />}
  </View>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 22, fontWeight: '800' }, note: { paddingHorizontal: 20, marginBottom: 20, fontSize: 13, lineHeight: 20 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }, read: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, backgroundColor: '#DFF5F1' }, readText: { color: '#0F766E', fontWeight: '700', fontSize: 12 }, error: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: '#FEE2E2', gap: 8 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 70 } });

import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { createAnnouncement, removeAnnouncement } from '../../redux/slices/adminSlice';
import { getAnnouncementsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';

export default function AnnouncementsScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [showForm, setShowForm] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', targetRole: 'all', isPinned: false });

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadAnnouncements = async () => {
    try { const { data } = await getAnnouncementsAPI(); setAnnouncements(data.announcements || []); } catch {}
  };
  useEffect(() => { loadAnnouncements(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.content) { Toast.show({ type: 'error', text1: 'Title and content required' }); return; }
    const r = await dispatch(createAnnouncement(form));
    if (createAnnouncement.fulfilled.match(r)) {
      Toast.show({ type: 'success', text1: 'Announcement Created 📢' });
      setShowForm(false);
      setForm({ title: '', content: '', targetRole: 'all', isPinned: false });
      loadAnnouncements();
    }
  };

  const handleDelete = async (id) => {
    await dispatch(removeAnnouncement(id));
    Toast.show({ type: 'success', text1: 'Removed' });
    loadAnnouncements();
  };

  const targetRoles = ['all', 'student', 'teacher'];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.createText}>New Announcement</Text>
      </TouchableOpacity>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={announcements} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                {item.isPinned && <Text style={styles.pinBadge}>📌 Pinned</Text>}
                <Text style={[styles.cardTitle, { color: textColor }]}>{item.title}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardContent, { color: textSec }]} numberOfLines={3}>{item.content}</Text>
            <View style={styles.cardMeta}>
              <Text style={[styles.metaText, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
              <View style={[styles.targetBadge, { backgroundColor: Colors.info + '18' }]}>
                <Text style={[styles.targetText, { color: Colors.info }]}>@{item.targetRole}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="megaphone-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No announcements</Text></View>}
        refreshing={false} onRefresh={loadAnnouncements}
      />

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, paddingBottom: Math.max(40, bottomPadding) }]}> 
            <Text style={[styles.modalTitle, { color: textColor }]}>New Announcement</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Title" placeholderTextColor={Colors.mediumGray} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Content" placeholderTextColor={Colors.mediumGray} multiline value={form.content} onChangeText={(v) => setForm({ ...form, content: v })} />
            <Text style={[styles.label, { color: textColor }]}>Target</Text>
            <View style={styles.roleRow}>
              {targetRoles.map((r) => (
                <TouchableOpacity key={r} style={[styles.roleChip, form.targetRole === r && styles.roleActive]} onPress={() => setForm({ ...form, targetRole: r })}>
                  <Text style={[styles.roleText, form.targetRole === r && { color: Colors.white }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.pinToggle} onPress={() => setForm({ ...form, isPinned: !form.isPinned })}>
              <Ionicons name={form.isPinned ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />
              <Text style={[styles.pinText, { color: textColor }]}>Pin this announcement</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}><Text style={styles.confirmBtnText}>Publish</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.pink, margin: 16, borderRadius: 12, paddingVertical: 14 },
  createText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  pinBadge: { fontSize: 11, color: Colors.gold, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardContent: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaText: { fontSize: 12 },
  targetBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  targetText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '10' },
  roleActive: { backgroundColor: Colors.primary },
  roleText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  pinText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

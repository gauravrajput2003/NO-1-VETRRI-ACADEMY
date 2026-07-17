import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { fetchCourses, addCourse, editCourse } from '../../redux/slices/adminSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


export default function CourseManagementScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { courses, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ title: '', category: '', description: '', duration: '', fee: '' });

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchCourses()); }, []);

  const handleSubmit = async () => {
    if (!form.title) { Toast.show({ type: 'error', text1: 'Title required' }); return; }
    const data = { ...form, fee: form.fee ? parseInt(form.fee) : undefined };
    const r = editMode
      ? await dispatch(editCourse({ id: editMode, updates: data }))
      : await dispatch(addCourse(data));
    if ((editMode ? editCourse : addCourse).fulfilled.match(r)) {
      Toast.show({ type: 'success', text1: editMode ? 'Course Updated' : 'Course Created ✅' });
      setShowForm(false); setEditMode(null);
      setForm({ title: '', category: '', description: '', duration: '', fee: '' });
    }
  };

  const openEdit = (c) => {
    setEditMode(c._id);
    setForm({ title: c.title || '', category: c.category || '', description: c.description || '', duration: c.duration || '', fee: c.fee?.toString() || '' });
    setShowForm(true);
  };

  const categoryColors = { academic: '#6C5CE7', competitive: '#E17055', language: '#00B894', skill: '#0984E3' };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.addBtn} onPress={() => { setEditMode(null); setForm({ title: '', category: '', description: '', duration: '', fee: '' }); setShowForm(true); }}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addText}>Add Course</Text>
      </TouchableOpacity>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={courses} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: cardBg }]} onPress={() => openEdit(item)}>
            <View style={[styles.catBadge, { backgroundColor: (categoryColors[item.category] || Colors.primary) + '18' }]}>
              <Text style={[styles.catText, { color: categoryColors[item.category] || Colors.primary }]}>{item.category || 'general'}</Text>
            </View>
            <Text style={[styles.cTitle, { color: textColor }]}>{item.title}</Text>
            {item.description && <Text style={[styles.cDesc, { color: textSec }]} numberOfLines={2}>{item.description}</Text>}
            <View style={styles.cMeta}>
              {item.duration && <Text style={[styles.cMetaText, { color: textSec }]}>⏱ {item.duration}</Text>}
              {item.fee && <Text style={[styles.cMetaText, { color: Colors.success }]}>₹{item.fee}/mo</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="layers-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No courses</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchCourses())}
      />

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, paddingBottom: Math.max(40, bottomPadding) }]}> 
            <Text style={[styles.modalTitle, { color: textColor }]}>{editMode ? 'Edit' : 'New'} Course</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Course Title *" placeholderTextColor={Colors.mediumGray} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Category (academic/competitive/language)" placeholderTextColor={Colors.mediumGray} value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} />
            <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Description" placeholderTextColor={Colors.mediumGray} multiline value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Duration" placeholderTextColor={Colors.mediumGray} value={form.duration} onChangeText={(v) => setForm({ ...form, duration: v })} />
              <TextInput style={[styles.input, styles.halfInput, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Fee (₹)" placeholderTextColor={Colors.mediumGray} keyboardType="numeric" value={form.fee} onChangeText={(v) => setForm({ ...form, fee: v })} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}><Text style={styles.confirmText}>{editMode ? 'Update' : 'Create'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.pink, margin: 16, borderRadius: 12, paddingVertical: 14 },
  addText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  catText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cTitle: { fontSize: 17, fontWeight: '600' },
  cDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  cMetaText: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

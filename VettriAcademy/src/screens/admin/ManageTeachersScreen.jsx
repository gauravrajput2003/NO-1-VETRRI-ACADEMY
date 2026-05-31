import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getInitials, formatDate } from '../../utils/formatters';
import { fetchAdminTeachers, approveTeacher } from '../../redux/slices/adminSlice';
import { registerAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function ManageTeachersScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { teachers, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    qualification: '',
    subjects: '',
    experience: '',
    teacherBio: '',
  });

  useEffect(() => { dispatch(fetchAdminTeachers()); }, []);

  const handleApprove = (teacher) => {
    const action = teacher.isApproved ? 'suspend' : 'approve';
    Alert.alert(`${action} ${teacher.name}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        const r = await dispatch(approveTeacher({ id: teacher._id, isApproved: !teacher.isApproved }));
        if (approveTeacher.fulfilled.match(r)) Toast.show({ type: 'success', text1: `Teacher ${!teacher.isApproved ? 'Approved ✅' : 'Suspended ❌'}` });
      }},
    ]);
  };

  const handleCreateTeacher = async () => {
    if (!createData.name || !createData.mobile || !createData.email || !createData.password) {
      Toast.show({ type: 'error', text1: 'Name, mobile, email and password are required' });
      return;
    }

    try {
      await registerAPI({
        role: 'teacher',
        name: createData.name.trim(),
        mobile: createData.mobile.trim(),
        email: createData.email.trim(),
        password: createData.password,
        qualification: createData.qualification.trim() || undefined,
        subjects: createData.subjects
          ? createData.subjects.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        experience: createData.experience.trim() || undefined,
        teacherBio: createData.teacherBio.trim() || undefined,
      });

      Toast.show({ type: 'success', text1: 'Teacher account created ✅' });
      setShowCreateModal(false);
      setCreateData({
        name: '',
        mobile: '',
        email: '',
        password: '',
        qualification: '',
        subjects: '',
        experience: '',
        teacherBio: '',
      });
      dispatch(fetchAdminTeachers());
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Create failed', text2: err.response?.data?.message || 'Unable to create teacher' });
    }
  };

  const renderTeacher = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={[styles.avatar, { backgroundColor: item.isApproved ? '#00B894' : Colors.warning }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]}>{item.displayName || item.name}</Text>
        <Text style={[styles.detail, { color: textSec }]}>📞 {item.mobile} • 📧 {item.email || 'N/A'}</Text>
        <Text style={[styles.detail, { color: textSec }]}>Joined {formatDate(item.createdAt)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.isApproved ? Colors.success + '18' : Colors.warning + '18' }]}>
          <Ionicons name={item.isApproved ? 'checkmark-circle' : 'time'} size={14} color={item.isApproved ? Colors.success : Colors.warning} />
          <Text style={[styles.statusText, { color: item.isApproved ? Colors.success : Colors.warning }]}>{item.isApproved ? 'APPROVED' : 'PENDING'}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.isApproved ? Colors.error + '14' : Colors.success + '14' }]} onPress={() => handleApprove(item)}>
        <Ionicons name={item.isApproved ? 'close-circle' : 'checkmark-circle'} size={24} color={item.isApproved ? Colors.error : Colors.success} />
      </TouchableOpacity>
    </View>
  );

  const filteredTeachers = teachers.filter((teacher) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      (teacher.name || '').toLowerCase().includes(query)
      || (teacher.displayName || '').toLowerCase().includes(query)
      || (teacher.mobile || '').toLowerCase().includes(query)
      || (teacher.email || '').toLowerCase().includes(query)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="person-add-outline" size={18} color={Colors.white} />
        <Text style={styles.addBtnText}>Add Teacher</Text>
      </TouchableOpacity>
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}> 
        <Ionicons name="search-outline" size={19} color={Colors.mediumGray} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search teacher by name, mobile, email..."
          placeholderTextColor={Colors.mediumGray}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <Text style={[styles.count, { color: textSec }]}>{filteredTeachers.length} teachers</Text>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={filteredTeachers} keyExtractor={(i) => i._id} renderItem={renderTeacher}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No teachers</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchAdminTeachers())}
      />

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]} contentContainerStyle={{ padding: 24, paddingBottom: Math.max(40, bottomPadding) }}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Add Teacher Account</Text>

            <Text style={[styles.label, { color: textColor }]}>Name *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.name} onChangeText={(v) => setCreateData({ ...createData, name: v })} placeholder="Teacher name" placeholderTextColor={Colors.mediumGray} />

            <Text style={[styles.label, { color: textColor }]}>Mobile *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.mobile} onChangeText={(v) => setCreateData({ ...createData, mobile: v })} placeholder="Mobile number" placeholderTextColor={Colors.mediumGray} keyboardType="phone-pad" />

            <Text style={[styles.label, { color: textColor }]}>Email *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.email} onChangeText={(v) => setCreateData({ ...createData, email: v })} placeholder="Email" placeholderTextColor={Colors.mediumGray} autoCapitalize="none" />

            <Text style={[styles.label, { color: textColor }]}>Password *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.password} onChangeText={(v) => setCreateData({ ...createData, password: v })} placeholder="Set login password" placeholderTextColor={Colors.mediumGray} secureTextEntry />

            <Text style={[styles.label, { color: textColor }]}>Qualification</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.qualification} onChangeText={(v) => setCreateData({ ...createData, qualification: v })} placeholder="e.g. M.Sc Mathematics" placeholderTextColor={Colors.mediumGray} />

            <Text style={[styles.label, { color: textColor }]}>Subjects</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.subjects} onChangeText={(v) => setCreateData({ ...createData, subjects: v })} placeholder="Comma separated (Maths, Science)" placeholderTextColor={Colors.mediumGray} />

            <Text style={[styles.label, { color: textColor }]}>Experience</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.experience} onChangeText={(v) => setCreateData({ ...createData, experience: v })} placeholder="e.g. 5 years" placeholderTextColor={Colors.mediumGray} />

            <Text style={[styles.label, { color: textColor }]}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.teacherBio} onChangeText={(v) => setCreateData({ ...createData, teacherBio: v })} placeholder="Teacher bio" placeholderTextColor={Colors.mediumGray} multiline />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreateTeacher}><Text style={styles.confirmText}>Create</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 12, backgroundColor: Colors.pink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  addBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, borderRadius: 12, paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: '#E5E7EB', ...Shadows.light },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  count: { paddingHorizontal: 20, fontSize: 13, marginTop: 8, marginBottom: 2 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.light },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  actionBtn: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textArea: { height: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getInitials } from '../../utils/formatters';
import { fetchAdminStudents, editStudent } from '../../redux/slices/adminSlice';
import { registerAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


const BOARD_OPTIONS = ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET'];
const GRADE_OPTIONS = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG'];

export default function ManageStudentsScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { students, studentsPagination, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});
  const [editGradeQuery, setEditGradeQuery] = useState('');
  const [showEditGradeSuggestions, setShowEditGradeSuggestions] = useState(false);
  const [editBoardQuery, setEditBoardQuery] = useState('');
  const [showEditBoardSuggestions, setShowEditBoardSuggestions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ name: '', mobile: '', email: '', password: '', grade: '', board: '' });
  const [createGradeQuery, setCreateGradeQuery] = useState('');
  const [showCreateGradeSuggestions, setShowCreateGradeSuggestions] = useState(false);
  const [createBoardQuery, setCreateBoardQuery] = useState('');
  const [showCreateBoardSuggestions, setShowCreateBoardSuggestions] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchAdminStudents({ search })); }, [search]);

  const filterBoards = (query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return BOARD_OPTIONS;
    return BOARD_OPTIONS.filter((board) => board.toLowerCase().includes(q));
  };

  const filterGrades = (query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return GRADE_OPTIONS;
    return GRADE_OPTIONS.filter((grade) => grade.toLowerCase().includes(q));
  };

  const createGradeSuggestions = filterGrades(createGradeQuery);
  const editGradeSuggestions = filterGrades(editGradeQuery);
  const createBoardSuggestions = filterBoards(createBoardQuery);
  const editBoardSuggestions = filterBoards(editBoardQuery);

  const handleEdit = async () => {
    const result = await dispatch(editStudent({ id: editModal._id, updates: editData }));
    if (editStudent.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Student Updated ✅' });
      setEditModal(null);
      setEditGradeQuery('');
      setShowEditGradeSuggestions(false);
      setEditBoardQuery('');
      setShowEditBoardSuggestions(false);
    } else {
      Toast.show({ type: 'error', text1: 'Failed', text2: result.payload });
    }
  };

  const handleCreate = async () => {
    if (!createData.name || !createData.mobile || !createData.password) {
      Toast.show({ type: 'error', text1: 'Name, mobile and password are required' });
      return;
    }
    try {
      await registerAPI({
        role: 'student',
        name: createData.name.trim(),
        mobile: createData.mobile.trim(),
        email: createData.email.trim() || undefined,
        password: createData.password,
        grade: createData.grade.trim() || undefined,
        board: createData.board.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Student account created ✅' });
      setShowCreateModal(false);
      setCreateData({ name: '', mobile: '', email: '', password: '', grade: '', board: '' });
      setCreateGradeQuery('');
      setShowCreateGradeSuggestions(false);
      setCreateBoardQuery('');
      setShowCreateBoardSuggestions(false);
      dispatch(fetchAdminStudents({ search }));
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Create failed', text2: err.response?.data?.message || 'Unable to create student' });
    }
  };

  const toggleActive = (student) => {
    Alert.alert(student.isActive ? 'Deactivate' : 'Activate', `${student.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => dispatch(editStudent({ id: student._id, updates: { isActive: !student.isActive } })) },
    ]);
  };

  const renderStudent = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardBg }, !item.isActive && styles.inactive]}>
      <View style={[styles.avatar, { backgroundColor: item.isActive ? Colors.primary : Colors.mediumGray }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]}>{item.displayName || item.name}</Text>
        <Text style={[styles.detail, { color: textSec }]}>Grade {item.grade || 'N/A'} • {item.board || 'N/A'}</Text>
        <Text style={[styles.detail, { color: textSec }]}>📞 {item.mobile || 'N/A'} • 📧 {item.email || 'N/A'}</Text>
        <Text style={[styles.detail, { color: Colors.primary }]}>💳 Fee {item.feeAmount ? `₹${Number(item.feeAmount).toLocaleString('en-IN')}` : 'Not set'} • Due {item.feeDueDate || 1} • {item.feeFrequency || 'monthly'}</Text>
        {item.course && <Text style={[styles.detail, { color: Colors.primary }]}>📚 {item.course?.title || 'N/A'}</Text>}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => {
          setEditModal(item);
          setEditData({ grade: item.grade || '', board: item.board || '', feeAmount: item.feeAmount || '', feeFrequency: item.feeFrequency || 'monthly', feeDueDate: item.feeDueDate || 1, feeNotes: item.feeNotes || '' });
          setEditGradeQuery(item.grade || '');
          setShowEditGradeSuggestions(false);
          setEditBoardQuery(item.board || '');
          setShowEditBoardSuggestions(false);
        }}>
          <Ionicons name="create-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleActive(item)}>
          <Ionicons name={item.isActive ? 'eye-outline' : 'eye-off-outline'} size={22} color={item.isActive ? Colors.success : Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.addBtn} onPress={() => {
        setCreateGradeQuery(createData.grade || '');
        setShowCreateGradeSuggestions(false);
        setCreateBoardQuery(createData.board || '');
        setShowCreateBoardSuggestions(false);
        setShowCreateModal(true);
      }}>
        <Ionicons name="person-add-outline" size={18} color={Colors.white} />
        <Text style={styles.addBtnText}>Add Student</Text>
      </TouchableOpacity>
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
        <Ionicons name="search-outline" size={20} color={Colors.mediumGray} />
        <TextInput style={[styles.searchInput, { color: textColor }]} placeholder="Search by name, mobile, email..." placeholderTextColor={Colors.mediumGray} value={search} onChangeText={setSearch} />
      </View>
      <Text style={[styles.count, { color: textSec }]}>{studentsPagination?.total || students.length} students</Text>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={students} keyExtractor={(i) => i._id} renderItem={renderStudent} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(24, bottomPadding) }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="school-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No students found</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchAdminStudents({ search }))}
      />

      <Modal visible={!!editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            onScroll={onTabBarScroll}
            scrollEventThrottle={16}
            style={[styles.modalContent, styles.modalScrollable, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]}
            contentContainerStyle={{ padding: 24, paddingBottom: Math.max(40, bottomPadding) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>Edit {editModal?.name}</Text>
            <Text style={[styles.label, { color: textColor }]}>Grade</Text>
            <View style={styles.boardAutocompleteWrap}>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                value={editGradeQuery}
                onChangeText={(v) => {
                  setEditGradeQuery(v);
                  setEditData({ ...editData, grade: v });
                  setShowEditGradeSuggestions(true);
                }}
                onFocus={() => setShowEditGradeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEditGradeSuggestions(false), 120)}
                placeholder="Search grade (e.g. 10th)"
                placeholderTextColor={Colors.mediumGray}
              />
              {showEditGradeSuggestions && editGradeSuggestions.length > 0 && (
                <ScrollView style={styles.boardDropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {editGradeSuggestions.map((grade) => (
                    <TouchableOpacity
                      key={`edit-grade-${grade}`}
                      style={styles.boardOption}
                      onPress={() => {
                        setEditGradeQuery(grade);
                        setEditData({ ...editData, grade });
                        setShowEditGradeSuggestions(false);
                      }}
                    >
                      <Text style={styles.boardOptionText}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <Text style={[styles.label, { color: textColor }]}>Board</Text>
            <View style={styles.boardAutocompleteWrap}>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                value={editBoardQuery}
                onChangeText={(v) => {
                  setEditBoardQuery(v);
                  setEditData({ ...editData, board: v });
                  setShowEditBoardSuggestions(true);
                }}
                onFocus={() => setShowEditBoardSuggestions(true)}
                onBlur={() => setTimeout(() => setShowEditBoardSuggestions(false), 120)}
                placeholder="Search board (e.g. CBSE)"
                placeholderTextColor={Colors.mediumGray}
              />
              {showEditBoardSuggestions && editBoardSuggestions.length > 0 && (
                <ScrollView style={styles.boardDropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {editBoardSuggestions.map((board) => (
                    <TouchableOpacity
                      key={`edit-${board}`}
                      style={styles.boardOption}
                      onPress={() => {
                        setEditBoardQuery(board);
                        setEditData({ ...editData, board });
                        setShowEditBoardSuggestions(false);
                      }}
                    >
                      <Text style={styles.boardOptionText}>{board}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <Text style={[styles.label, { color: textColor }]}>Fee Amount</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={String(editData.feeAmount ?? '')} onChangeText={(v) => setEditData({ ...editData, feeAmount: v })} placeholder="e.g. 5000" placeholderTextColor={Colors.mediumGray} keyboardType="numeric" />
            <Text style={[styles.label, { color: textColor }]}>Fee Frequency</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.feeFrequency} onChangeText={(v) => setEditData({ ...editData, feeFrequency: v })} placeholder="monthly / quarterly / yearly" placeholderTextColor={Colors.mediumGray} />
            <Text style={[styles.label, { color: textColor }]}>Fee Due Date</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={String(editData.feeDueDate ?? 1)} onChangeText={(v) => setEditData({ ...editData, feeDueDate: v })} placeholder="1-31" placeholderTextColor={Colors.mediumGray} keyboardType="numeric" />
            <Text style={[styles.label, { color: textColor }]}>Fee Notes</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.feeNotes} onChangeText={(v) => setEditData({ ...editData, feeNotes: v })} placeholder="Optional note" placeholderTextColor={Colors.mediumGray} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleEdit}><Text style={styles.confirmText}>Save</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            onScroll={onTabBarScroll}
            scrollEventThrottle={16}
            style={[styles.modalContent, styles.modalScrollable, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]}
            contentContainerStyle={{ padding: 24, paddingBottom: Math.max(40, bottomPadding) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>Add Student Account</Text>
            <Text style={[styles.label, { color: textColor }]}>Name *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.name} onChangeText={(v) => setCreateData({ ...createData, name: v })} placeholder="Student name" placeholderTextColor={Colors.mediumGray} />
            <Text style={[styles.label, { color: textColor }]}>Mobile *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.mobile} onChangeText={(v) => setCreateData({ ...createData, mobile: v })} placeholder="Mobile number" placeholderTextColor={Colors.mediumGray} keyboardType="phone-pad" />
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.email} onChangeText={(v) => setCreateData({ ...createData, email: v })} placeholder="Email (optional)" placeholderTextColor={Colors.mediumGray} autoCapitalize="none" />
            <Text style={[styles.label, { color: textColor }]}>Password *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={createData.password} onChangeText={(v) => setCreateData({ ...createData, password: v })} placeholder="Set login password" placeholderTextColor={Colors.mediumGray} secureTextEntry />
            <Text style={[styles.label, { color: textColor }]}>Grade</Text>
            <View style={styles.boardAutocompleteWrap}>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                value={createGradeQuery}
                onChangeText={(v) => {
                  setCreateGradeQuery(v);
                  setCreateData({ ...createData, grade: v });
                  setShowCreateGradeSuggestions(true);
                }}
                onFocus={() => setShowCreateGradeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCreateGradeSuggestions(false), 120)}
                placeholder="Search grade (e.g. 10th)"
                placeholderTextColor={Colors.mediumGray}
              />
              {showCreateGradeSuggestions && createGradeSuggestions.length > 0 && (
                <ScrollView style={styles.boardDropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {createGradeSuggestions.map((grade) => (
                    <TouchableOpacity
                      key={`create-grade-${grade}`}
                      style={styles.boardOption}
                      onPress={() => {
                        setCreateGradeQuery(grade);
                        setCreateData({ ...createData, grade });
                        setShowCreateGradeSuggestions(false);
                      }}
                    >
                      <Text style={styles.boardOptionText}>{grade}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <Text style={[styles.label, { color: textColor }]}>Board</Text>
            <View style={styles.boardAutocompleteWrap}>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                value={createBoardQuery}
                onChangeText={(v) => {
                  setCreateBoardQuery(v);
                  setCreateData({ ...createData, board: v });
                  setShowCreateBoardSuggestions(true);
                }}
                onFocus={() => setShowCreateBoardSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCreateBoardSuggestions(false), 120)}
                placeholder="Search board (e.g. CBSE)"
                placeholderTextColor={Colors.mediumGray}
              />
              {showCreateBoardSuggestions && createBoardSuggestions.length > 0 && (
                <ScrollView style={styles.boardDropdown} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {createBoardSuggestions.map((board) => (
                    <TouchableOpacity
                      key={`create-${board}`}
                      style={styles.boardOption}
                      onPress={() => {
                        setCreateBoardQuery(board);
                        setCreateData({ ...createData, board });
                        setShowCreateBoardSuggestions(false);
                      }}
                    >
                      <Text style={styles.boardOptionText}>{board}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}><Text style={styles.confirmText}>Create</Text></TouchableOpacity>
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
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12, paddingHorizontal: 14, gap: 8, ...Shadows.light },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  count: { paddingHorizontal: 20, fontSize: 13, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.light },
  inactive: { opacity: 0.6 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 12, marginTop: 2 },
  actions: { gap: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalScrollable: { maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  boardAutocompleteWrap: { position: 'relative' },
  boardDropdown: {
    marginTop: 6,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  boardOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  boardOptionText: { fontSize: 14, color: '#1F2D3D', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

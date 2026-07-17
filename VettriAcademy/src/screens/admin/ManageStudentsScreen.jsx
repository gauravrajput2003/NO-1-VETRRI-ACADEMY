import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity as RNTouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../utils/colors';
import { getInitials } from '../../utils/formatters';
import { fetchAdminStudents, editStudent, deleteStudent } from '../../redux/slices/adminSlice';
import { registerAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

// Plain touchable — no particle effect. Used for structural/utility controls
// (back button, view button) where a celebration animation doesn't belong.
const TouchableOpacity = RNTouchableOpacity;

// Celebratory touchable — reserved for the two "positive action" buttons
// (Add Student, Edit / Save) so the particle burst actually means something
// instead of firing on every tap in the UI.
const CelebrateTouchable = (props) => {
  const { particleCount = 18, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

const BOARD_OPTIONS = ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET'];
const GRADE_OPTIONS = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG'];

const B = {
  pink: '#FF4F8B',
  teal: '#20C7C9',
  tealDeep: '#149A9C',
  gold: '#F6C453',
  purple: '#7C3AED',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  white: '#FFFFFF',
  text: '#111827',
  sec: '#6B7280',
  border: '#E5E7EB',
};

// ---------------------------------------------------------------------------
// Responsive scaling — same approach used across the app: derive every size
// from the *current* window width/height (via the hook, so it reacts to
// rotation and split-screen), scaled against a 375x812 reference device and
// dampened so it doesn't blow up on tablets.
// ---------------------------------------------------------------------------
const BASE_WIDTH = 375;

function useResponsive() {
  const { width, height } = useWindowDimensions();
  const widthScale = width / BASE_WIDTH;
  const moderateScale = (size, factor = 0.5) => size + (widthScale * size - size) * factor;
  const scaleFont = (size) => Math.round(PixelRatio.roundToNearestPixel(moderateScale(size, 0.3)));

  const isCompactHeader = width <= 400;
  const isTablet = width >= 768;
  const numColumns = width >= 1000 ? 3 : width >= 700 ? 2 : 1;

  return { width, height, moderateScale, scaleFont, isCompactHeader, isTablet, numColumns };
}

export default function ManageStudentsScreen({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { students, studentsPagination, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r.width, r.height]);
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewModal, setViewModal] = useState(null);
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

  const textColor = isDark ? Colors.text.dark : Colors.text.light;

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

  const handleDeleteStudent = (student) => {
    Alert.alert(
      `Delete ${student.name}?`,
      'This will permanently delete this student and related data from the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteStudent(student._id));
            if (deleteStudent.fulfilled.match(result)) {
              Toast.show({ type: 'success', text1: 'Student deleted from database' });
            } else {
              Toast.show({ type: 'error', text1: 'Delete failed', text2: result.payload || 'Unable to delete student' });
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.studentCard, !item.isActive && styles.studentCardInactive]}
      onPress={() => setViewModal(item)}
    >
      <View style={styles.studentTopRow}>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{(item.displayName || item.name).split(' ')[0]}</Text>
          <Text style={styles.detail} numberOfLines={1}>Grade {item.grade || 'N/A'} • {item.board || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.pageShell}>
        {/* Header: padding comes from useSafeAreaInsets (not SafeAreaView),
            which reports the correct top inset even with a translucent
            status bar on Android — this is what stops the header from
            drawing under the clock/battery row.
            Background is a pink → teal brand gradient; back button and add
            button are deliberately the same size and sit at opposite ends
            for visual symmetry. */}
        <LinearGradient
          colors={[B.pink, B.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.2 }}
          style={[styles.headerSurface, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.simpleHeader}>
            <View style={styles.headerSide}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={() => {
                  if (navigation?.canGoBack?.()) navigation.goBack();
                  else navigation?.navigate?.('Home');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={r.scaleFont(20)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* minWidth: 0 is the key fix — without it, a flex child can
                refuse to shrink below its content size, which is what was
                forcing "Students" to collapse into "...". */}
            <View style={styles.headerCenter}>
              <Text style={styles.simpleHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
                Students
              </Text>
            </View>

            {/* Same footprint as the back button on the opposite side, so
                the header reads as symmetric rather than lopsided. Always
                icon-only and sized up so it reads clearly as the primary
                "add" action. */}
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
              <CelebrateTouchable
                style={styles.circleBtn}
                onPress={() => {
                  setCreateGradeQuery(createData.grade || '');
                  setShowCreateGradeSuggestions(false);
                  setCreateBoardQuery(createData.board || '');
                  setShowCreateBoardSuggestions(false);
                  setShowCreateModal(true);
                }}
                accessibilityLabel="Add student"
              >
                <LinearGradient colors={['#FFFFFF', '#FFE8F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Ionicons name="add" size={r.scaleFont(26)} color={B.pink} />
              </CelebrateTouchable>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.toolbar, searchFocused && styles.toolbarFocused]}>
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search-outline" size={18} color={searchFocused ? B.pink : B.sec} />
            <TextInput
              style={[styles.searchInput, { color: B.text }]}
              placeholder="enter name phone and email"
              placeholderTextColor={B.sec}
              value={search}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <Text style={styles.count}>{studentsPagination?.total || students.length} students</Text>

        <FlatList
          key={r.numColumns} // force re-layout when column count changes (rotation/tablet)
          numColumns={r.numColumns}
          columnWrapperStyle={r.numColumns > 1 ? styles.columnWrapper : undefined}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          data={students}
          keyExtractor={(i) => i._id}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="school-outline" size={48} color={B.sec} /><Text style={[styles.emptyText, { color: B.sec }]}>No students found</Text></View>}
          refreshing={loading}
          onRefresh={() => dispatch(fetchAdminStudents({ search }))}
        />
      </View>

      <Modal visible={!!viewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.viewModalContent]}>
            <View style={styles.viewModalHeader}>
              <LinearGradient colors={[B.pink, B.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewModalAvatar}>
                <Text style={styles.viewModalAvatarText}>{getInitials(viewModal?.name || '')}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewModalName}>{viewModal?.displayName || viewModal?.name}</Text>
                <View style={[styles.viewStatusPill, viewModal?.isActive ? styles.viewStatusActive : styles.viewStatusInactive]}>
                  <View style={[styles.viewStatusDot, { backgroundColor: viewModal?.isActive ? B.teal : B.sec }]} />
                  <Text style={styles.viewStatusText}>{viewModal?.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setViewModal(null)} style={styles.viewCloseBtn}>
                <Ionicons name="close" size={20} color={B.sec} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(24, bottomPadding) }}>
              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Contact</Text>
                <View style={styles.viewRow}>
                  <Ionicons name="call-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>{viewModal?.mobile || 'Not provided'}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Ionicons name="mail-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>{viewModal?.email || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Academics</Text>
                <View style={styles.viewRow}>
                  <Ionicons name="school-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>Grade {viewModal?.grade || 'N/A'}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Ionicons name="book-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>{viewModal?.board || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Fees</Text>
                <View style={styles.viewRow}>
                  <Ionicons name="cash-outline" size={18} color={B.pink} />
                  <Text style={styles.viewRowText}>{viewModal?.feeAmount ? `₹${viewModal.feeAmount}` : 'Not set'}{viewModal?.feeFrequency ? ` / ${viewModal.feeFrequency}` : ''}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Ionicons name="calendar-outline" size={18} color={B.pink} />
                  <Text style={styles.viewRowText}>Due on day {viewModal?.feeDueDate || 1} of the cycle</Text>
                </View>
                {!!viewModal?.feeNotes && (
                  <View style={styles.viewRow}>
                    <Ionicons name="document-text-outline" size={18} color={B.pink} />
                    <Text style={styles.viewRowText}>{viewModal.feeNotes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setViewModal(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={() => {
                  const item = viewModal;
                  setViewModal(null);
                  handleDeleteStudent(item);
                }}
              >
                <Text style={styles.deleteModalBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  const item = viewModal;
                  setViewModal(null);
                  setEditModal(item);
                  setEditData({ grade: item.grade || '', board: item.board || '', feeAmount: item.feeAmount || '', feeFrequency: item.feeFrequency || 'monthly', feeDueDate: item.feeDueDate || 1, feeNotes: item.feeNotes || '' });
                  setEditGradeQuery(item.grade || '');
                  setEditBoardQuery(item.board || '');
                }}
              >
                <Text style={styles.confirmText}>Edit Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

function createStyles(r) {
  const { width, moderateScale, scaleFont, isTablet } = r;
  const horizontalPadding = isTablet ? width * 0.06 : 20;
  const contentMaxWidth = isTablet ? 900 : undefined;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6F8FC' },
    pageShell: { flex: 1 },

    headerSurface: {
      paddingBottom: 10,
      paddingHorizontal: horizontalPadding,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    simpleHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
    // Both sides use the identical fixed width so the header is visually
    // symmetric (back button on the left, add button on the right) — this
    // fixed-width sizing also means neither side fights the center title
    // for space.
    headerSide: { width: moderateScale(48), justifyContent: 'center' },
    // flex:1 + minWidth:0 is the combination that lets this shrink gracefully
    // instead of forcing the title to collapse into "..."
    headerCenter: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
    // Shared shape for both the back button and the add button — same size,
    // same radius, opposite ends of the header.
    circleBtn: {
      width: moderateScale(48),
      height: moderateScale(48),
      borderRadius: moderateScale(24),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    addBtn: {
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 18,
      height: 52,
      minWidth: 150,
      borderRadius: 16,
      shadowColor: B.pink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 5,
    },
    addBtnLabel: { color: B.white, fontSize: scaleFont(15), fontWeight: '800', fontFamily: 'Inter' },
    simpleHeaderTitle: { fontSize: scaleFont(22), fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter' },

    searchBox: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F7', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, gap: 10 },
    searchBoxFocused: { borderColor: '#D1D5DB', shadowOpacity: 0.08 },
    searchInput: { flex: 1, fontSize: scaleFont(16), paddingVertical: 10, fontFamily: 'Inter' },
    toolbar: { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', marginTop: 18, gap: 8 },
    toolbarFocused: {},
    count: { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', fontSize: scaleFont(16), marginTop: 14, marginBottom: 12, fontFamily: 'Inter', color: '#0F766E', fontWeight: '600' },

    columnWrapper: { gap: 14 },
    listContent: { paddingHorizontal: horizontalPadding, paddingBottom: 24, paddingTop: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },

    studentCard: {
      flex: r.numColumns > 1 ? 1 / r.numColumns : undefined,
      borderRadius: 24,
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 12,
      marginBottom: 14,
      gap: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    studentCardInactive: { opacity: 0.6 },
    cardTopMeta: { flexDirection: 'row', justifyContent: 'flex-end' },
    statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F8FAFC' },
    statusDot: { width: 8, height: 8, borderRadius: 999 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: 'Inter' },
    studentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarRing: {
      width: moderateScale(52), height: moderateScale(52), borderRadius: 18,
      backgroundColor: '#ECFEFF',
      borderWidth: 1, borderColor: '#A5F3FC',
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#0891B2', fontSize: scaleFont(19), fontWeight: '800', fontFamily: 'Inter' },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: scaleFont(22), fontWeight: '800', fontFamily: 'Inter', color: '#0F172A' },
    detail: { fontSize: scaleFont(16), marginTop: 5, lineHeight: scaleFont(22), fontFamily: 'Inter', color: '#475569', fontWeight: '700', letterSpacing: 0.1 },

    // View and Edit share one base so they're always identical in height,
    // width (both flex:1 in the same row), radius, and border thickness —
    // only background/text color differ.
    cardActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: moderateScale(48),
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    viewBtn: {
      backgroundColor: '#F8FAFC', borderColor: '#E2E8F0',
    },
    viewBtnText: { color: '#0F172A', fontSize: scaleFont(15.5), fontWeight: '700', fontFamily: 'Inter' },
    editBtn: {
      flex: 1.3,
      borderColor: 'transparent',
      shadowColor: '#FB7185', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 4,
    },
    editBtnText: { color: B.white, fontSize: scaleFont(15.5), fontWeight: '700', fontFamily: 'Inter' },
    deleteBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    deleteBtnText: { color: '#DC2626', fontSize: scaleFont(15.5), fontWeight: '700', fontFamily: 'Inter' },

    viewModalContent: { maxHeight: '82%', paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: B.white, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
    viewModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    viewModalAvatar: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
    viewModalAvatarText: { color: B.white, fontSize: 20, fontWeight: '800', fontFamily: 'Inter' },
    viewModalName: { fontSize: 20, fontWeight: '800', color: B.text, fontFamily: 'Inter', marginBottom: 6 },
    viewStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, borderRadius: 999 },
    viewStatusActive: { backgroundColor: 'rgba(32,199,201,0.14)' },
    viewStatusInactive: { backgroundColor: 'rgba(107,114,128,0.14)' },
    viewStatusDot: { width: 7, height: 7, borderRadius: 4 },
    viewStatusText: { fontSize: 12, fontWeight: '700', color: B.text, fontFamily: 'Inter' },
    viewCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    viewSection: { marginBottom: 18, gap: 10 },
    viewSectionTitle: { fontSize: 13, fontWeight: '800', color: B.sec, fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    viewRowText: { fontSize: 15, color: B.text, fontFamily: 'Inter', flex: 1 },

    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 15, marginTop: 12, fontFamily: 'Inter' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalScrollable: { maxHeight: '88%', maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, fontFamily: 'Inter' },
    label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, fontFamily: 'Inter' },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Inter' },
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
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: B.border },
    cancelText: { fontSize: 15, fontWeight: '600', color: B.sec },
    confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: B.pink },
    confirmText: { fontSize: 15, fontWeight: '700', color: B.white },
    deleteModalBtn: { flex: 1.2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    deleteModalBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  });
}

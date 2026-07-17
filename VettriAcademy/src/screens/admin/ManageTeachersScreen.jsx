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
import { getInitials, formatDate } from '../../utils/formatters';
import { fetchAdminTeachers, approveTeacher, deleteTeacher, editTeacher } from '../../redux/slices/adminSlice';
import { registerAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = RNTouchableOpacity;

const CelebrateTouchable = (props) => {
  const { particleCount = 18, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

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

export default function ManageTeachersScreen({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { teachers, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => createStyles(r), [r.width, r.height]);
  const isDark = theme === 'dark';
  
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({ name: '', mobile: '', email: '', qualification: '', subjects: '', experience: '', teacherBio: '' });
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
    if (!teacher.isApproved) {
      Alert.alert(`Approve ${teacher.name}?`, '', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const result = await dispatch(approveTeacher({ id: teacher._id, isApproved: true }));
            if (approveTeacher.fulfilled.match(result)) {
              Toast.show({ type: 'success', text1: 'Teacher approved successfully' });
            } else {
              Toast.show({ type: 'error', text1: 'Approve failed', text2: result.payload || 'Unable to approve teacher' });
            }
          },
        },
      ]);
      return;
    }

    Alert.alert(`Suspend ${teacher.name}?`, 'This will remove the teacher completely. They will no longer appear in the list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend & Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(deleteTeacher(teacher._id));
          if (deleteTeacher.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: 'Teacher removed successfully' });
          } else {
            Toast.show({ type: 'error', text1: 'Failed', text2: result.payload || 'Unable to remove teacher' });
          }
        },
      },
    ]);
  };

  const handleEditTeacher = async () => {
    if (!editData.name || !editData.mobile || !editData.email) {
      Toast.show({ type: 'error', text1: 'Name, mobile and email are required' });
      return;
    }
    try {
      const updates = { ...editData };
      if (updates.subjects && typeof updates.subjects === 'string') {
        updates.subjects = updates.subjects.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const result = await dispatch(editTeacher({ id: editModal._id, updates }));
      if (editTeacher.fulfilled.match(result)) {
        Toast.show({ type: 'success', text1: 'Teacher updated successfully' });
        setEditModal(null);
      } else {
        Toast.show({ type: 'error', text1: 'Update failed', text2: result.payload || 'Unable to update teacher' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: error.message });
    }
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

      Toast.show({ type: 'success', text1: 'Teacher account created successfully' });
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

  const renderTeacher = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.teacherCard, !item.isApproved && styles.teacherCardPending]}
      onPress={() => setViewModal(item)}
    >
      <View style={styles.cardTopMeta}>
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: item.isApproved ? '#10B981' : '#F59E0B' }]} />
          <Text style={styles.statusText}>{item.isApproved ? 'Approved teacher' : 'Pending approval'}</Text>
        </View>
      </View>

      <View style={styles.teacherTopRow}>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.displayName || item.name}</Text>
          <Text style={styles.detail} numberOfLines={1}>{item.qualification || 'Teacher Profile'}</Text>
          <Text style={styles.metaLine} numberOfLines={1}>
            {(Array.isArray(item.subjects) ? item.subjects.join(', ') : item.subjects) || item.email || item.mobile || 'Details available in profile'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.pageShell}>
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

            <View style={styles.headerCenter}>
              <Text style={styles.simpleHeaderTitle} numberOfLines={1} ellipsizeMode="tail">
                Teachers
              </Text>
            </View>

            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
              <CelebrateTouchable
                style={styles.circleBtn}
                onPress={() => setShowCreateModal(true)}
                accessibilityLabel="Add teacher"
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
              placeholder="Search teachers by name"
              placeholderTextColor={B.sec}
              value={search}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <Text style={styles.count}>{filteredTeachers.length} teachers</Text>

        <FlatList
          key={r.numColumns}
          numColumns={r.numColumns}
          columnWrapperStyle={r.numColumns > 1 ? styles.columnWrapper : undefined}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          data={filteredTeachers}
          keyExtractor={(i) => i._id}
          renderItem={renderTeacher}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={B.sec} /><Text style={[styles.emptyText, { color: B.sec }]}>No teachers found</Text></View>}
          refreshing={loading}
          onRefresh={() => dispatch(fetchAdminTeachers())}
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
                <View style={[styles.viewStatusPill, viewModal?.isApproved ? styles.viewStatusActive : styles.viewStatusPending]}>
                  <View style={[styles.viewStatusDot, { backgroundColor: viewModal?.isApproved ? B.teal : B.gold }]} />
                  <Text style={styles.viewStatusText}>{viewModal?.isApproved ? 'Approved' : 'Pending approval'}</Text>
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
                <Text style={styles.viewSectionTitle}>Professional</Text>
                <View style={styles.viewRow}>
                  <Ionicons name="school-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>{viewModal?.qualification || 'Not provided'}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Ionicons name="book-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>
                    {(Array.isArray(viewModal?.subjects) ? viewModal.subjects.join(', ') : viewModal?.subjects) || 'No subjects added'}
                  </Text>
                </View>
                <View style={styles.viewRow}>
                  <Ionicons name="briefcase-outline" size={18} color={B.teal} />
                  <Text style={styles.viewRowText}>{viewModal?.experience || 'Experience not added'}</Text>
                </View>
              </View>

              <View style={styles.viewSection}>
                <Text style={styles.viewSectionTitle}>Profile</Text>
                <View style={styles.viewRow}>
                  <Ionicons name="calendar-outline" size={18} color={B.pink} />
                  <Text style={styles.viewRowText}>Joined {viewModal?.createdAt ? formatDate(viewModal.createdAt) : 'Unknown date'}</Text>
                </View>
                {!!viewModal?.teacherBio && (
                  <View style={styles.viewRow}>
                    <Ionicons name="document-text-outline" size={18} color={B.pink} />
                    <Text style={styles.viewRowText}>{viewModal.teacherBio}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setViewModal(null)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={() => {
                  const teacher = viewModal;
                  setViewModal(null);
                  Alert.alert(`Delete ${teacher.name}?`, 'This will remove the teacher permanently.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await dispatch(deleteTeacher(teacher._id));
                        Toast.show({ type: 'success', text1: 'Teacher deleted' });
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.deleteModalBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  const teacher = viewModal;
                  if (!teacher.isApproved) {
                    setViewModal(null);
                    handleApprove(teacher);
                  } else {
                    setViewModal(null);
                    setEditModal(teacher);
                    setEditData({
                      name: teacher.name || '',
                      mobile: teacher.mobile || '',
                      email: teacher.email || '',
                      qualification: teacher.qualification || '',
                      subjects: Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : (teacher.subjects || ''),
                      experience: teacher.experience || '',
                      teacherBio: teacher.teacherBio || '',
                    });
                  }
                }}
              >
                <Text style={styles.confirmText}>{!viewModal?.isApproved ? 'Approve' : 'Edit Teacher'}</Text>
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
            
            <Text style={[styles.label, { color: textColor }]}>Name *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.name} onChangeText={(v) => setEditData({ ...editData, name: v })} placeholder="Teacher name" placeholderTextColor={Colors.mediumGray} />
            
            <Text style={[styles.label, { color: textColor }]}>Mobile *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.mobile} onChangeText={(v) => setEditData({ ...editData, mobile: v })} placeholder="Mobile number" placeholderTextColor={Colors.mediumGray} keyboardType="phone-pad" />
            
            <Text style={[styles.label, { color: textColor }]}>Email *</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.email} onChangeText={(v) => setEditData({ ...editData, email: v })} placeholder="Email" placeholderTextColor={Colors.mediumGray} autoCapitalize="none" />
            
            <Text style={[styles.label, { color: textColor }]}>Qualification</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.qualification} onChangeText={(v) => setEditData({ ...editData, qualification: v })} placeholder="e.g. M.Sc Mathematics" placeholderTextColor={Colors.mediumGray} />
            
            <Text style={[styles.label, { color: textColor }]}>Subjects</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.subjects} onChangeText={(v) => setEditData({ ...editData, subjects: v })} placeholder="Comma separated (Maths, Science)" placeholderTextColor={Colors.mediumGray} />
            
            <Text style={[styles.label, { color: textColor }]}>Experience</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.experience} onChangeText={(v) => setEditData({ ...editData, experience: v })} placeholder="e.g. 5 years" placeholderTextColor={Colors.mediumGray} />
            
            <Text style={[styles.label, { color: textColor }]}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} value={editData.teacherBio} onChangeText={(v) => setEditData({ ...editData, teacherBio: v })} placeholder="Teacher bio" placeholderTextColor={Colors.mediumGray} multiline />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleEditTeacher}><Text style={styles.confirmText}>Save</Text></TouchableOpacity>
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
    headerSide: { width: moderateScale(48), justifyContent: 'center' },
    headerCenter: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
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
    simpleHeaderTitle: { fontSize: scaleFont(22), fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter' },

    searchBox: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F7', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, gap: 10 },
    searchBoxFocused: { borderColor: '#D1D5DB', shadowOpacity: 0.08 },
    searchInput: { flex: 1, fontSize: scaleFont(16), paddingVertical: 10, fontFamily: 'Inter' },
    toolbar: { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', marginTop: 18, gap: 8 },
    toolbarFocused: {},
    count: { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', fontSize: scaleFont(16), marginTop: 14, marginBottom: 12, fontFamily: 'Inter', color: '#0F766E', fontWeight: '600' },

    columnWrapper: { gap: 14 },
    listContent: { paddingHorizontal: horizontalPadding, paddingBottom: 24, paddingTop: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },

    teacherCard: {
      flex: r.numColumns > 1 ? 1 / r.numColumns : undefined,
      borderRadius: 24,
      paddingTop: 14,
      paddingHorizontal: 16,
      paddingBottom: 14,
      marginBottom: 14,
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    teacherCardPending: { borderColor: '#FDE68A' },
    cardTopMeta: { flexDirection: 'row', justifyContent: 'flex-end' },
    statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F8FAFC' },
    statusDot: { width: 8, height: 8, borderRadius: 999 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: 'Inter' },
    teacherTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatarRing: {
      width: moderateScale(52), height: moderateScale(52), borderRadius: 18,
      backgroundColor: '#ECFEFF',
      borderWidth: 1, borderColor: '#A5F3FC',
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#0891B2', fontSize: scaleFont(19), fontWeight: '800', fontFamily: 'Inter' },
    info: { flex: 1, minWidth: 0 },
    name: { fontSize: scaleFont(20), fontWeight: '800', fontFamily: 'Inter', color: '#0F172A' },
    detail: { fontSize: scaleFont(13.5), marginTop: 4, lineHeight: scaleFont(19), fontFamily: 'Inter', color: '#475569', fontWeight: '600', letterSpacing: 0.1 },
    metaLine: { fontSize: scaleFont(13), marginTop: 3, lineHeight: scaleFont(18), fontFamily: 'Inter', color: '#64748B', fontWeight: '500' },

    cardActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: moderateScale(44),
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
    viewBtn: {
      backgroundColor: '#F8FAFC', borderColor: '#E2E8F0',
    },
    viewBtnText: { color: '#0F172A', fontSize: scaleFont(14.5), fontWeight: '700', fontFamily: 'Inter' },
    approveBtn: {
      borderColor: 'transparent',
      shadowColor: '#FB7185', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 4,
    },
    approveBtnText: { color: B.white, fontSize: scaleFont(14.5), fontWeight: '700', fontFamily: 'Inter' },
    suspendBtn: {
      backgroundColor: '#FFF1F5',
      borderColor: '#F9A8D4',
    },
    suspendBtnText: { color: B.pink, fontSize: scaleFont(14.5), fontWeight: '700', fontFamily: 'Inter' },

    viewModalContent: { maxHeight: '82%', paddingTop: 20, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: B.white, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
    viewModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    viewModalAvatar: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
    viewModalAvatarText: { color: B.white, fontSize: 20, fontWeight: '800', fontFamily: 'Inter' },
    viewModalName: { fontSize: 20, fontWeight: '800', color: B.text, fontFamily: 'Inter', marginBottom: 6 },
    viewStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, borderRadius: 999 },
    viewStatusActive: { backgroundColor: 'rgba(32,199,201,0.14)' },
    viewStatusPending: { backgroundColor: 'rgba(246,196,83,0.18)' },
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
    textArea: { height: 84, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: B.border },
    cancelText: { fontSize: 15, fontWeight: '600', color: B.sec },
    confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: B.pink },
    confirmText: { fontSize: 15, fontWeight: '700', color: B.white },
    deleteModalBtn: { flex: 1.2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    deleteModalBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  });
}

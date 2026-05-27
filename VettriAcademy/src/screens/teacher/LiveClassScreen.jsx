import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Modal, Animated, RefreshControl, Keyboard, Platform, StatusBar, SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, classStatusColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatScheduledTime, formatDate } from '../../utils/formatters';
import { fetchTodayClasses, fetchSchedules } from '../../redux/slices/classesSlice';
import { startLiveClass } from '../../redux/slices/teacherSlice';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'live', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

const LINK_TYPES = [
  { key: 'googlemeet', label: 'Google Meet', icon: 'videocam' },
  { key: 'zoom', label: 'Zoom', icon: 'tv' },
  { key: 'jitsi', label: 'Jitsi', icon: 'globe' },
  { key: 'other', label: 'Other', icon: 'link' },
];

const validateMeetLink = (url) => {
  if (!url || !url.trim()) return { valid: false, error: '' };
  const trimmed = url.trim().toLowerCase();
  if (trimmed.includes('meet.google.com') || trimmed.includes('zoom.us') || trimmed.includes('jitsi')) {
    return { valid: true, error: '' };
  }
  return { valid: false, error: 'Please use a Google Meet, Zoom, or Jitsi link' };
};

const Header = ({ onBack }) => (
  <View style={styles.headerContainer}>
    <StatusBar barStyle="light-content" backgroundColor="#112B4A" translucent />
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={Colors.white} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>🔴 Go Live</Text>
        <Text style={styles.headerSubtitle}>Manage your live classes</Text>
      </View>
      <View style={styles.headerRightPlaceholder} />
    </View>
  </View>
);

const Tabs = ({ activeTab, onTabChange }) => (
  <View style={styles.tabsContainer}>
    {STATUS_TABS.map((tab) => {
      const isActive = activeTab === tab.key;
      return (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{tab.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const EmptyState = ({ activeTab, isDark }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="videocam-off-outline" size={56} color={Colors.mediumGray} />
    </View>
    <Text style={[styles.emptyTitle, { color: isDark ? Colors.text.dark : Colors.text.light }]}>No classes found</Text>
    <Text style={[styles.emptySubtitle, { color: isDark ? Colors.textSecondary.dark : Colors.mediumGray }]}>
      {activeTab === 'all' ? 'No classes scheduled for today.' : `No ${activeTab} classes available right now.`}
    </Text>
  </View>
);

export default function LiveClassScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { todayClasses, schedules, loading } = useSelector((s) => s.classes);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [meetLink, setMeetLink] = useState('');
  const [meetLinkType, setMeetLinkType] = useState('googlemeet');
  const [isStarting, setIsStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchTodayClasses()),
      dispatch(fetchSchedules({ status: 'scheduled' })),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (route?.params?.classToStart) {
      setSelectedClass(route.params.classToStart);
      setShowModal(true);
    }
  }, [route?.params?.classToStart]);

  const allClasses = [...(todayClasses || []), ...(schedules || [])].reduce((acc, c) => {
    if (!acc.find((x) => x._id === c._id)) acc.push(c);
    return acc;
  }, []);

  const filteredClasses = activeTab === 'all'
    ? allClasses
    : allClasses.filter((c) => c.status === activeTab);

  const linkValidation = validateMeetLink(meetLink);

  const handleGoLive = (cls) => {
    setSelectedClass(cls);
    setMeetLink('');
    setMeetLinkType('googlemeet');
    setShowModal(true);
  };

  const confirmGoLive = async () => {
    if (!linkValidation.valid) {
      Toast.show({ type: 'error', text1: 'Invalid Link', text2: linkValidation.error || 'Please enter a valid meeting link' });
      return;
    }
    Keyboard.dismiss();
    setIsStarting(true);
    try {
      const result = await dispatch(startLiveClass({ classId: selectedClass._id, meetLink: meetLink.trim(), meetLinkType }));
      if (startLiveClass.fulfilled.match(result)) {
        Toast.show({ type: 'success', text1: '🔴 Class is LIVE!', text2: 'Students have been notified' });
        setShowModal(false);
        setMeetLink('');
        dispatch(fetchTodayClasses());
        navigation.navigate('LiveMonitor', {
          classId: selectedClass._id,
          meetLink: meetLink.trim(),
          className: selectedClass.title || selectedClass.subject,
        });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to Start', text2: result.payload || 'Something went wrong' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Network error. Please try again.' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleManageLive = (cls) => {
    navigation.navigate('LiveMonitor', {
      classId: cls._id,
      meetLink: cls.meetLink,
      className: cls.title || cls.subject,
    });
  };

  const getStudentCount = (item) => item.studentIds?.length || item.enrolledStudents?.length || item.students || 0;

  const renderClassCard = ({ item }) => {
    const isLive = item.status === 'live';
    const statusColor = classStatusColors[item.status] || Colors.mediumGray;
    const studentCount = getStudentCount(item);

    return (
      <View style={[styles.card, { backgroundColor: cardBg }, isLive && { borderWidth: 2, borderColor: Colors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            {isLive ? (
              <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, opacity: pulseAnim }]} />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            )}
            <Text style={[styles.statusLabel, { color: statusColor }]}>{item.status?.toUpperCase()}</Text>
          </View>
          <Text style={[styles.dateText, { color: textSec }]}>{formatDate(item.scheduledDate)}</Text>
        </View>

        <Text style={[styles.classTitle, { color: textColor }]}>{item.title || item.subject}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color={textSec} />
          <Text style={[styles.infoText, { color: textSec }]}>
            {formatScheduledTime(item.scheduledTime)} • {item.durationMinutes || 60} min
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color={textSec} />
          <Text style={[styles.infoText, { color: textSec }]}>{studentCount} students enrolled</Text>
        </View>
        {item.course && (
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={14} color={textSec} />
            <Text style={[styles.infoText, { color: textSec }]}>{item.course} {item.grade ? `- ${item.grade}` : ''}</Text>
          </View>
        )}

        {item.status === 'scheduled' && (
          <TouchableOpacity style={styles.goLiveBtn} onPress={() => handleGoLive(item)} activeOpacity={0.8}>
            <Ionicons name="videocam" size={18} color={Colors.white} />
            <Text style={styles.goLiveBtnText}>🔴 GO LIVE</Text>
          </TouchableOpacity>
        )}
        {isLive && (
          <TouchableOpacity style={[styles.goLiveBtn, { backgroundColor: Colors.error }]} onPress={() => handleManageLive(item)} activeOpacity={0.8}>
            <Ionicons name="pulse" size={18} color={Colors.white} />
            <Text style={styles.goLiveBtnText}>MANAGE LIVE CLASS</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Header onBack={() => navigation.goBack()} />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredClasses}
          keyExtractor={(item) => item._id}
          renderItem={renderClassCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={<EmptyState activeTab={activeTab} isDark={isDark} />}
        />
      )}

      {/* ═══ Go Live Modal ═══ */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); setMeetLink(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#152238' : Colors.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>🔴 Start Live Class</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setMeetLink(''); }} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={textSec} />
              </TouchableOpacity>
            </View>

            <View style={[styles.classInfoCard, { backgroundColor: isDark ? Colors.card.dark : Colors.offWhite }]}>
              <Text style={[styles.classInfoTitle, { color: textColor }]}>{selectedClass?.title || selectedClass?.subject}</Text>
              <View style={styles.classInfoRow}>
                <Ionicons name="time-outline" size={14} color={textSec} />
                <Text style={[styles.classInfoText, { color: textSec }]}>{formatScheduledTime(selectedClass?.scheduledTime)}</Text>
              </View>
              <View style={styles.classInfoRow}>
                <Ionicons name="people-outline" size={14} color={textSec} />
                <Text style={[styles.classInfoText, { color: textSec }]}>{getStudentCount(selectedClass || {})} students</Text>
              </View>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={[styles.instructionsTitle, { color: textColor }]}>How to start:</Text>
              {[
                'Open Google Meet on your laptop',
                'Create or start a meeting',
                'Copy the meeting link',
                'Paste it below and tap START CLASS',
                'Students will be notified immediately!',
              ].map((step, i) => (
                <Text key={i} style={[styles.instructionStep, { color: textSec }]}>{i + 1}. {step}</Text>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: textColor }]}>Platform</Text>
            <View style={styles.platformRow}>
              {LINK_TYPES.map((lt) => (
                <TouchableOpacity
                  key={lt.key}
                  style={[styles.platformChip, meetLinkType === lt.key && styles.platformChipActive]}
                  onPress={() => setMeetLinkType(lt.key)}
                >
                  <Ionicons name={lt.icon} size={14} color={meetLinkType === lt.key ? Colors.white : Colors.primary} />
                  <Text style={[styles.platformChipText, meetLinkType === lt.key && { color: Colors.white }]}>{lt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: textColor }]}>Meeting Link *</Text>
            <View style={[styles.inputContainer, { borderColor: meetLink ? (linkValidation.valid ? Colors.success : Colors.error) : (isDark ? Colors.navyLight : Colors.gray) }]}>
              <TextInput
                style={[styles.textInput, { color: textColor }]}
                placeholder="https://meet.google.com/abc-defg-hij"
                placeholderTextColor={Colors.mediumGray}
                value={meetLink}
                onChangeText={setMeetLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {meetLink.length > 0 && linkValidation.valid && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              )}
              {meetLink.length > 0 && !linkValidation.valid && (
                <TouchableOpacity onPress={() => setMeetLink('')}>
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
            {meetLink.length > 0 && !linkValidation.valid && linkValidation.error !== '' && (
              <Text style={styles.errorText}>{linkValidation.error}</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setMeetLink(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, (!meetLink.trim() || !linkValidation.valid || isStarting) && styles.startBtnDisabled]}
                onPress={confirmGoLive}
                disabled={!meetLink.trim() || !linkValidation.valid || isStarting}
                activeOpacity={0.8}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="videocam" size={18} color={Colors.white} />
                    <Text style={styles.startBtnText}>🔴 START CLASS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  headerContainer: {
    backgroundColor: '#112B4A',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tab: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#FF4D8D',
  },
  tabInactive: {
    backgroundColor: 'rgba(255, 77, 141, 0.08)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabTextInactive: {
    color: Colors.mediumGray,
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 120, // Avoid bottom nav overlapping
    flexGrow: 1,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Cards
  card: { borderRadius: 16, padding: 18, marginBottom: 14, ...Shadows.medium },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12 },
  classTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13 },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF4D8D', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  goLiveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalClose: { padding: 4 },
  classInfoCard: { borderRadius: 14, padding: 14, marginBottom: 16 },
  classInfoTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  classInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  classInfoText: { fontSize: 13 },
  instructionsBox: { marginBottom: 16, paddingVertical: 10 },
  instructionsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  instructionStep: { fontSize: 13, lineHeight: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  platformChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,20,147,0.1)' },
  platformChipActive: { backgroundColor: Colors.primary },
  platformChipText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 4, gap: 8 },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 2, marginBottom: 8, marginLeft: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(158,158,158,0.15)' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.mediumGray },
  startBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FF4D8D' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

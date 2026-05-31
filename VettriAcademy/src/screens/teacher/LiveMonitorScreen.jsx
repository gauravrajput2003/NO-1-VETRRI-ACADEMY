import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Modal, Animated, Alert, Linking, ScrollView, Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatRelativeTime, getInitials } from '../../utils/formatters';
import { endLiveClass, fetchLiveMonitorData, sendLiveClassMessage, applyLiveStudentJoined, applyLiveStudentLeft, clearLiveMonitor } from '../../redux/slices/teacherSlice';
import { fetchTodayClasses } from '../../redux/slices/classesSlice';
import { onSocketEvent, joinRoom, leaveRoom, getSocket } from '../../services/socket';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function LiveMonitorScreen({ navigation, route }) {
  const { classId, meetLink, className } = route.params || {};
  const dispatch = useDispatch();
  const { liveMonitor, liveLoading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [showPending, setShowPending] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollRef = useRef(null);

  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  // Pulse animation for LIVE banner
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    anim.start();
    // Fade in content
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
    return () => anim.stop();
  }, []);

  // Fetch monitor data
  const loadMonitor = useCallback(() => {
    if (classId) dispatch(fetchLiveMonitorData(classId));
  }, [classId, dispatch]);

  useEffect(() => { loadMonitor(); }, [loadMonitor]);

  // Socket.io listeners
  useEffect(() => {
    if (!classId) return;
    // Join class room
    joinRoom(`class_${classId}`);

    const unsubJoined = onSocketEvent('student:joined', (data) => {
      if (data.classId === classId) {
        dispatch(applyLiveStudentJoined(data));
      }
    });

    const unsubLeft = onSocketEvent('student:left', (data) => {
      if (data.classId === classId) {
        dispatch(applyLiveStudentLeft(data));
      }
    });

    return () => {
      unsubJoined();
      unsubLeft();
      leaveRoom(`class_${classId}`);
    };
  }, [classId, dispatch]);

  // Polling fallback every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (classId) dispatch(fetchLiveMonitorData(classId));
    }, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [classId, dispatch]);

  const monitor = liveMonitor || {};
  const totalStudents = monitor.totalStudents || 0;
  const joinedCount = monitor.studentsJoined || monitor.joinedStudents?.length || 0;
  const joinedList = monitor.joinedStudents || [];
  const pendingList = monitor.pendingStudents || [];
  const percentage = totalStudents > 0 ? Math.round((joinedCount / totalStudents) * 100) : 0;

  const handleOpenBrowser = () => {
    const link = meetLink || monitor.meetLink;
    if (link) {
      Linking.openURL(link);
      Toast.show({ type: 'info', text1: '📱 Opening Meet', text2: 'Keep your phone mic MUTED to avoid echo' });
    } else {
      Toast.show({ type: 'error', text1: 'No Link', text2: 'Meeting link not available' });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSendingMessage(true);
    try {
      const result = await dispatch(sendLiveClassMessage({ classId, message: message.trim() }));
      if (sendLiveClassMessage.fulfilled.match(result)) {
        Toast.show({ type: 'success', text1: '✅ Message Sent', text2: 'All students have been notified' });
        setMessage('');
        setShowMessageModal(false);
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: result.payload || 'Could not send message' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Network error' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEndClass = () => {
    Alert.alert(
      '⏹️ End Class',
      `End this class? ${joinedCount} students will be marked present based on join time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Class',
          style: 'destructive',
          onPress: async () => {
            setIsEnding(true);
            try {
              const result = await dispatch(endLiveClass(classId));
              if (endLiveClass.fulfilled.match(result)) {
                if (pollRef.current) clearInterval(pollRef.current);
                Toast.show({ type: 'success', text1: '✅ Class Ended', text2: `${joinedCount} students marked present` });
                dispatch(clearLiveMonitor());
                dispatch(fetchTodayClasses());
                navigation.goBack();
              } else {
                Toast.show({ type: 'error', text1: 'Failed', text2: result.payload || 'Could not end class' });
              }
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Network error' });
            } finally {
              setIsEnding(false);
            }
          },
        },
      ]
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { dispatch(clearLiveMonitor()); };
  }, []);

  const renderJoinedStudent = ({ item }) => {
    const initials = getInitials(item.name);
    const colors = ['#00A8AB', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#009688'];
    const avatarColor = colors[item.name?.charCodeAt(0) % colors.length] || Colors.primary;

    return (
      <View style={[styles.studentRow, { backgroundColor: cardBg }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + '25' }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: textColor }]}>{item.name}</Text>
          <Text style={[styles.studentTime, { color: textSec }]}>{formatRelativeTime(item.joinedAt)}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
      </View>
    );
  };

  const renderPendingStudent = ({ item }) => {
    const initials = getInitials(item.name);
    return (
      <View style={[styles.studentRow, { backgroundColor: cardBg }]}>
        <View style={[styles.avatar, { backgroundColor: Colors.mediumGray + '25' }]}>
          <Text style={[styles.avatarText, { color: Colors.mediumGray }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: textColor }]}>{item.name}</Text>
        </View>
        <Ionicons name="time-outline" size={20} color={Colors.mediumGray} />
      </View>
    );
  };

  if (liveLoading && !monitor._id) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: textSec }]}>Loading live class data...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: fadeAnim }]}>
      {/* ═══ LIVE BANNER ═══ */}
      <Animated.View style={[styles.liveBanner, { opacity: pulseAnim }]}>  
        <View style={styles.liveBannerInner}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBannerTitle}>CLASS IS LIVE</Text>
        </View>
        <Text style={styles.liveBannerSub}>
          {joinedCount} out of {totalStudents} students have joined
        </Text>
      </Animated.View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: bottomPadding || 120 }} 
        showsVerticalScrollIndicator={false}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Class info + stats */}
        <View style={[styles.statsCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.statsClassName, { color: textColor }]}>{className || monitor.title}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>{joinedCount}</Text>
              <Text style={[styles.statLabel, { color: textSec }]}>Joined</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? Colors.navyLight : Colors.gray }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: textColor }]}>{totalStudents}</Text>
              <Text style={[styles.statLabel, { color: textSec }]}>Total</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? Colors.navyLight : Colors.gray }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: percentage >= 75 ? Colors.success : percentage >= 50 ? Colors.warning : Colors.error }]}>{percentage}%</Text>
              <Text style={[styles.statLabel, { color: textSec }]}>Attendance</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
          </View>
        </View>

        {/* ═══ Joined Students ═══ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>✅ Joined ({joinedCount})</Text>
          {joinedList.length === 0 ? (
            <View style={[styles.emptySection, { backgroundColor: cardBg }]}>
              <Ionicons name="hourglass-outline" size={32} color={Colors.mediumGray} />
              <Text style={[styles.emptySectionText, { color: textSec }]}>Waiting for students to join...</Text>
            </View>
          ) : (
            joinedList.map((s, i) => (
              <View key={s._id || i}>{renderJoinedStudent({ item: s })}</View>
            ))
          )}
        </View>

        {/* ═══ Pending Students (Collapsible) ═══ */}
        {pendingList.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setShowPending(!showPending)} activeOpacity={0.7}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>🕐 Haven't joined yet ({pendingList.length})</Text>
              <Ionicons name={showPending ? 'chevron-up' : 'chevron-down'} size={20} color={textSec} />
            </TouchableOpacity>
            {showPending && pendingList.map((s, i) => (
              <View key={s._id || i}>{renderPendingStudent({ item: s })}</View>
            ))}
          </View>
        )}

        {/* Phone mic tip */}
        <View style={[styles.tipCard, { backgroundColor: Colors.warning + '15' }]}>
          <Ionicons name="information-circle" size={20} color={Colors.warning} />
          <Text style={[styles.tipText, { color: Colors.warning }]}>
            If you join from phone, keep your mic muted to avoid echo!
          </Text>
        </View>
      </ScrollView>

      {/* ═══ Bottom Action Buttons ═══ */}
      <View style={[styles.bottomActions, { backgroundColor: isDark ? '#152238' : Colors.white }]}>
        <TouchableOpacity style={styles.actionBtnBrowser} onPress={handleOpenBrowser} activeOpacity={0.8}>
          <Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionBtnBrowserText}>Open in Browser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnMessage} onPress={() => setShowMessageModal(true)} activeOpacity={0.8}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnEnd} onPress={handleEndClass} disabled={isEnding} activeOpacity={0.8}>
          {isEnding ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="stop-circle" size={18} color={Colors.white} />
              <Text style={styles.actionBtnEndText}>END</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ═══ Send Message Modal ═══ */}
      <Modal visible={showMessageModal} transparent animationType="slide" onRequestClose={() => setShowMessageModal(false)}>
        <View style={styles.msgModalOverlay}>
          <View style={[styles.msgModalContent, { backgroundColor: isDark ? '#152238' : Colors.white }]}>
            <Text style={[styles.msgModalTitle, { color: textColor }]}>💬 Send Message to All Students</Text>
            <TextInput
              style={[styles.msgInput, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
              placeholder="e.g., Please turn on your cameras!"
              placeholderTextColor={Colors.mediumGray}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.msgActions}>
              <TouchableOpacity style={styles.msgCancelBtn} onPress={() => { setShowMessageModal(false); setMessage(''); }}>
                <Text style={styles.msgCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.msgSendBtn, !message.trim() && { opacity: 0.4 }]}
                onPress={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.msgSendText}>Send to All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, marginTop: 12 },

  // Live Banner
  liveBanner: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  liveBannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.white },
  liveBannerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white, letterSpacing: 1 },
  liveBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  // Stats card
  statsCard: { margin: 16, borderRadius: 16, padding: 18, ...Shadows.medium },
  statsClassName: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 36 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(158,158,158,0.2)', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  // Student rows
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 6, gap: 12, ...Shadows.light },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  studentName: { fontSize: 14, fontWeight: '600' },
  studentTime: { fontSize: 12, marginTop: 2 },

  // Empty section
  emptySection: { borderRadius: 14, padding: 30, alignItems: 'center', ...Shadows.light },
  emptySectionText: { fontSize: 14, marginTop: 10 },

  // Tip card
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 14 },
  tipText: { fontSize: 13, flex: 1, fontWeight: '500' },

  // Bottom actions
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: 28, borderTopWidth: 1, borderTopColor: 'rgba(158,158,158,0.15)',
    ...Shadows.medium,
  },
  actionBtnBrowser: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,20,147,0.1)', borderRadius: 12, paddingVertical: 14 },
  actionBtnBrowserText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  actionBtnMessage: { width: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.info, borderRadius: 12, paddingVertical: 14 },
  actionBtnEnd: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.error, borderRadius: 12, paddingVertical: 14 },
  actionBtnEndText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  // Message Modal
  msgModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  msgModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  msgModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  msgInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  msgActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  msgCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(158,158,158,0.15)' },
  msgCancelText: { fontSize: 15, fontWeight: '600', color: Colors.mediumGray },
  msgSendBtn: { flex: 2, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.pink },
  msgSendText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

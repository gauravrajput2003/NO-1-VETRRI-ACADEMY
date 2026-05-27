import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Colors, classStatusColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatScheduledTime, formatDate } from '../../utils/formatters';
import { fetchClassDetails, joinClass, clearJoinResult } from '../../redux/slices/classesSlice';
import { getClassAttendanceAPI } from '../../services/api';

export default function ClassDetailScreen({ route, navigation }) {
  const { classId } = route.params;
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { currentClass, loading, joinResult } = useSelector((s) => s.classes);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [attendance, setAttendance] = useState(null);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    dispatch(fetchClassDetails(classId));
    loadAttendance();
  }, [classId]);

  useEffect(() => {
    if (joinResult) {
      if (joinResult.meetLink) {
        Toast.show({ type: 'success', text1: 'Joining class...', text2: joinResult.message });
        Linking.openURL(joinResult.meetLink);
      }
      dispatch(clearJoinResult());
    }
  }, [joinResult]);

  const loadAttendance = async () => {
    try {
      const { data } = await getClassAttendanceAPI(classId);
      setAttendance(data.attendance);
    } catch {}
  };

  if (loading || !currentClass) {
    return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const cls = currentClass;
  const isLive = cls.status === 'live';
  const isCompleted = cls.status === 'completed';
  const statusColor = classStatusColors[cls.status] || Colors.mediumGray;

  return (
    <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <LinearGradient colors={isLive ? [Colors.error, '#FF6B6B'] : Colors.gradient.primary} style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          {isLive && <View style={styles.liveDot} />}
          <Text style={styles.statusText}>{cls.status?.toUpperCase()}</Text>
        </View>
        <Text style={styles.headerTitle}>{cls.title || cls.subject}</Text>
        <Text style={styles.headerSub}>
          {formatDate(cls.scheduledDate)} • {formatScheduledTime(cls.scheduledTime)}
        </Text>
      </LinearGradient>

      <View style={{ padding: 16 }}>
        {/* Info Cards */}
        <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Teacher</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{cls.teacherId?.displayName || cls.teacherId?.name || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Subject</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{cls.subject || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Duration</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{cls.durationMinutes || 60} minutes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <Text style={[styles.infoLabel, { color: textSec }]}>Students</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{cls.studentIds?.length || cls.enrolledStudents?.length || 0} enrolled</Text>
          </View>
        </View>

        {/* Description */}
        {cls.description && (
          <View style={[styles.descCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.descTitle, { color: textColor }]}>Description</Text>
            <Text style={[styles.descText, { color: textSec }]}>{cls.description}</Text>
          </View>
        )}

        {/* Join button for live classes */}
        {isLive && (
          <TouchableOpacity style={styles.joinBtn} onPress={() => dispatch(joinClass(classId))}>
            <Ionicons name="videocam" size={22} color={Colors.white} />
            <Text style={styles.joinText}>JOIN LIVE CLASS</Text>
          </TouchableOpacity>
        )}

        {/* Recording for completed */}
        {isCompleted && cls.recordingUrl && (
          <TouchableOpacity style={styles.recordingBtn} onPress={() => Linking.openURL(cls.recordingUrl)}>
            <Ionicons name="play-circle" size={22} color={Colors.info} />
            <Text style={styles.recordingText}>Watch Recording</Text>
          </TouchableOpacity>
        )}

        {/* Attendance */}
        {attendance && (
          <View style={[styles.attCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.attTitle, { color: textColor }]}>Your Attendance</Text>
            <View style={[styles.attBadge, { backgroundColor: attendance.status === 'present' ? Colors.success + '18' : Colors.error + '18' }]}>
              <Ionicons name={attendance.status === 'present' ? 'checkmark-circle' : 'close-circle'} size={18} color={attendance.status === 'present' ? Colors.success : Colors.error} />
              <Text style={{ color: attendance.status === 'present' ? Colors.success : Colors.error, fontWeight: '600' }}>{attendance.status?.toUpperCase()}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingBottom: 30, paddingHorizontal: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.white },
  statusText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 16, ...Shadows.light },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoLabel: { fontSize: 13, width: 80 },
  infoValue: { fontSize: 15, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  descCard: { borderRadius: 14, padding: 16, marginBottom: 16, ...Shadows.light },
  descTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  descText: { fontSize: 14, lineHeight: 20 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.pink, borderRadius: 14, paddingVertical: 16, marginBottom: 16 },
  joinText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  recordingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: Colors.info, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  recordingText: { color: Colors.info, fontSize: 16, fontWeight: '600' },
  attCard: { borderRadius: 14, padding: 16, ...Shadows.light },
  attTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  attBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
});

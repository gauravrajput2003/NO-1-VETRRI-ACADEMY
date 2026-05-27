import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatPercentage } from '../../utils/formatters';
import { getStudentClassAttendanceAPI } from '../../services/api';

export default function AttendanceScreen() {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const now = new Date();
      const res = await getStudentClassAttendanceAPI(user?._id, { month: now.getMonth() + 1, year: now.getFullYear() });
      setData(res.data);
    } catch (err) {
      console.error('Attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const summary = data?.summary || {};
  const records = data?.records || [];

  const statusColors = { present: Colors.success, absent: Colors.error, late: Colors.warning };
  const statusIcons = { present: 'checkmark-circle', absent: 'close-circle', late: 'time' };

  return (
    <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
        <Text style={[styles.summaryTitle, { color: textColor }]}>This Month's Summary</Text>
        <View style={styles.circle}>
          <Text style={styles.circlePct}>{summary.attendancePercent || 0}%</Text>
          <Text style={styles.circleLabel}>Attendance</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={[styles.statNum, { color: textColor }]}>{summary.present || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color={Colors.warning} />
            <Text style={[styles.statNum, { color: textColor }]}>{summary.late || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Late</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={[styles.statNum, { color: textColor }]}>{summary.absent || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="layers-outline" size={20} color={Colors.info} />
            <Text style={[styles.statNum, { color: textColor }]}>{summary.total || 0}</Text>
            <Text style={[styles.statLbl, { color: textSec }]}>Total</Text>
          </View>
        </View>
      </View>

      {/* Records */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Records</Text>
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={Colors.mediumGray} />
          <Text style={[styles.emptyText, { color: textSec }]}>No attendance records</Text>
        </View>
      ) : (
        records.map((r, i) => (
          <View key={i} style={[styles.recordCard, { backgroundColor: cardBg }]}>
            <View style={[styles.statusIcon, { backgroundColor: (statusColors[r.status] || Colors.mediumGray) + '18' }]}>
              <Ionicons name={statusIcons[r.status] || 'help-circle'} size={20} color={statusColors[r.status] || Colors.mediumGray} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recordSubject, { color: textColor }]}>{r.subject}</Text>
              <Text style={[styles.recordDate, { color: textSec }]}>{formatDate(r.date)} • {r.scheduledTime || ''}</Text>
            </View>
            <Text style={[styles.recordStatus, { color: statusColors[r.status] || Colors.mediumGray }]}>
              {r.status?.toUpperCase()}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center', ...Shadows.light },
  summaryTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  circle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  circlePct: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  circleLabel: { fontSize: 11, color: Colors.mediumGray },
  statsGrid: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statItem: { alignItems: 'center', gap: 4 },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLbl: { fontSize: 11 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  recordCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12, ...Shadows.light },
  statusIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recordSubject: { fontSize: 15, fontWeight: '600' },
  recordDate: { fontSize: 12, marginTop: 2 },
  recordStatus: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

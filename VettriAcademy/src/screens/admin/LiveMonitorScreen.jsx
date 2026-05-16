import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatScheduledTime } from '../../utils/formatters';
import { fetchLiveMonitor } from '../../redux/slices/adminSlice';

export default function LiveMonitorScreen() {
  const dispatch = useDispatch();
  const { liveMonitor, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchLiveMonitor()); }, []);

  const classes = liveMonitor?.liveClasses || liveMonitor?.classes || [];

  if (loading) return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.headerBar}>
        <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE NOW</Text></View>
        <Text style={[styles.countText, { color: textSec }]}>{classes.length} class{classes.length !== 1 ? 'es' : ''}</Text>
      </View>

      <FlatList data={classes} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: Colors.error }]}>
            <View style={styles.cardTop}>
              <View style={styles.liveBadge}><View style={styles.smDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
              <Text style={[styles.time, { color: textSec }]}>{formatScheduledTime(item.scheduledTime || item.startedAt)}</Text>
            </View>
            <Text style={[styles.title, { color: textColor }]}>{item.title || item.subject}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={textSec} />
              <Text style={[styles.infoText, { color: textSec }]}>{item.teacherId?.name || item.teacher?.name || 'Teacher'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color={textSec} />
              <Text style={[styles.infoText, { color: textSec }]}>{item.activeStudents || item.studentIds?.length || 0} students</Text>
            </View>
            {item.meetLinkType && (
              <View style={styles.infoRow}>
                <Ionicons name="videocam-outline" size={14} color={Colors.info} />
                <Text style={[styles.infoText, { color: Colors.info }]}>{item.meetLinkType}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="tv-outline" size={56} color={Colors.mediumGray} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Live Classes</Text>
            <Text style={[styles.emptySub, { color: textSec }]}>All classes are currently offline</Text>
          </View>
        }
        refreshing={loading} onRefresh={() => dispatch(fetchLiveMonitor())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.error + '14', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  liveText: { color: Colors.error, fontSize: 13, fontWeight: '700' },
  countText: { fontSize: 14 },
  card: { borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1.5, ...Shadows.light },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  smDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  time: { fontSize: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 4 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, classStatusColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatScheduledTime, formatDate } from '../../utils/formatters';
import { fetchSchedules, joinClass, clearJoinResult } from '../../redux/slices/classesSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function ClassesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { schedules, loading, joinResult, error, total } = useSelector((s) => s.classes);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadClasses = () => {
    const params = filter !== 'all' ? { status: filter } : {};
    dispatch(fetchSchedules(params));
  };

  useEffect(() => { loadClasses(); }, [filter]);

  useEffect(() => {
    if (joinResult) {
      if (joinResult.meetLink) {
        Toast.show({ type: 'success', text1: 'Joined!', text2: joinResult.message });
        Linking.openURL(joinResult.meetLink);
      }
      dispatch(clearJoinResult());
    }
  }, [joinResult]);

  const onRefresh = () => { setRefreshing(true); loadClasses(); setRefreshing(false); };

  const handleJoin = (classId) => {
    dispatch(joinClass(classId));
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'live', label: '🔴 Live' },
    { key: 'completed', label: 'Completed' },
  ];

  const renderClass = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={() => navigation.navigate('ClassDetail', { classId: item._id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: classStatusColors[item.status] + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: classStatusColors[item.status] }]} />
          <Text style={[styles.statusText, { color: classStatusColors[item.status] }]}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={[styles.dateText, { color: textSec }]}>{formatDate(item.scheduledDate)}</Text>
      </View>

      <Text style={[styles.classTitle, { color: textColor }]}>{item.title || item.subject}</Text>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={textSec} />
        <Text style={[styles.infoText, { color: textSec }]}>{item.teacherId?.displayName || item.teacherId?.name || 'Teacher'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color={textSec} />
        <Text style={[styles.infoText, { color: textSec }]}>{formatScheduledTime(item.scheduledTime)} • {item.durationMinutes || 60} min</Text>
      </View>

      {item.status === 'live' && (
        <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoin(item._id)}>
          <Text style={styles.joinText}>🔴 JOIN CLASS</Text>
        </TouchableOpacity>
      )}

      {item.status === 'completed' && item.recordingUrl && (
        <TouchableOpacity style={styles.recordingBtn} onPress={() => Linking.openURL(item.recordingUrl)}>
          <Ionicons name="videocam-outline" size={16} color={Colors.info} />
          <Text style={styles.recordingText}>Watch Recording</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterActiveText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item._id}
          renderItem={renderClass}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.mediumGray} />
              <Text style={[styles.emptyText, { color: textSec }]}>No classes found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,20,147,0.08)' },
  filterActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  filterActiveText: { color: Colors.white },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12 },
  classTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13 },
  joinBtn: { backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  joinText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  recordingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  recordingText: { color: Colors.info, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

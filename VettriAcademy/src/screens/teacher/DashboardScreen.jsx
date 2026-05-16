import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatScheduledTime, formatDate } from '../../utils/formatters';
import { fetchTeacherDashboard } from '../../redux/slices/teacherSlice';
import { fetchTodayClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getAnnouncementsAPI } from '../../services/api';

export default function TeacherDashboard({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { dashboard, loading: teacherLoading } = useSelector((s) => s.teacher);
  const { todayClasses } = useSelector((s) => s.classes);
  const { unreadCount } = useSelector((s) => s.notifications);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadData = useCallback(async () => {
    dispatch(fetchTeacherDashboard());
    dispatch(fetchTodayClasses());
    dispatch(fetchUnreadNotificationCount());
    try {
      const { data } = await getAnnouncementsAPI();
      setAnnouncements(data.announcements?.slice(0, 2) || []);
    } catch {} finally { setRefreshing(false); }
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (teacherLoading && !refreshing) {
    return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const db = dashboard || {};
  const liveClass = todayClasses?.find((c) => c.status === 'live');
  const nextClass = todayClasses?.find((c) => c.status === 'scheduled');

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>
      {/* Welcome */}
      <View style={[styles.header, { backgroundColor: Colors.hotPink }] }>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</Text>
            <Text style={styles.headerName}>{user?.displayName || user?.name} 👋</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
              <Ionicons name="sparkles" size={24} color={Colors.gold} />
              <Text style={styles.aiBtnText}>AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Grid - Premium 4-card layout */}
      <View style={styles.statsGrid}>
        {[
          { icon: 'videocam', color: Colors.pink, value: db.todayClasses || todayClasses?.length || 0, label: 'Today Classes' },
          { icon: 'people', color: '#00B894', value: db.totalStudents || 0, label: 'Students' },
          { icon: 'document-text', color: '#0984E3', value: db.totalMaterials || 0, label: 'Materials' },
          { icon: 'airplane', color: '#FDCB6E', value: db.pendingLeaves || 0, label: 'Pending Leaves' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: Colors.lightGray }]}>
            <View style={[styles.statIconLarge, { backgroundColor: s.color + '20' }]}>
              <Ionicons name={s.icon} size={32} color={s.color} />
            </View>
            <Text style={[styles.statValueLarge, { color: Colors.pink }]}>{s.value}</Text>
            <Text style={[styles.statLabelPremium, { color: Colors.navy }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Live / Next Class Card */}
      {liveClass && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>🔴 Currently Live</Text>
          <TouchableOpacity style={[styles.liveCard, { backgroundColor: Colors.error + '12', borderColor: Colors.error }]} onPress={() => navigation.navigate('LiveClass')}>
            <View style={styles.liveInfo}>
              <Text style={[styles.liveSubject, { color: textColor }]}>{liveClass.subject || liveClass.title}</Text>
              <Text style={[styles.liveTime, { color: textSec }]}>{formatScheduledTime(liveClass.scheduledTime)}</Text>
            </View>
            <View style={styles.liveChip}><Text style={styles.liveChipText}>MANAGE →</Text></View>
          </TouchableOpacity>
        </View>
      )}

      {nextClass && !liveClass && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>📅 Next Class</Text>
          <TouchableOpacity style={[styles.nextCard, { backgroundColor: cardBg }]} onPress={() => navigation.navigate('LiveClass')}>
            <Ionicons name="videocam-outline" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.nextSubject, { color: textColor }]}>{nextClass.subject || nextClass.title}</Text>
              <Text style={[styles.nextTime, { color: textSec }]}>{formatScheduledTime(nextClass.scheduledTime)} • {nextClass.durationMinutes || 60} min</Text>
            </View>
            <TouchableOpacity style={styles.goLiveBtn} onPress={() => navigation.navigate('LiveClass', { classToStart: nextClass })}>
              <Text style={styles.goLiveText}>GO LIVE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions - Premium Carousel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
        </View>
        <FlatList
          data={[
            { id: '1', icon: 'videocam-outline', label: 'Live Class', screen: 'LiveClass', color: '#D63031', bgColor: 'rgba(214, 48, 49, 0.12)' },
            { id: '2', icon: 'calendar-outline', label: 'Schedule', screen: 'Schedule', color: '#6C5CE7', bgColor: 'rgba(108, 92, 231, 0.12)' },
            { id: '3', icon: 'create-outline', label: 'Enter Grades', screen: 'Grades', color: Colors.pink, bgColor: 'rgba(255, 79, 139, 0.12)' },
            { id: '4', icon: 'cloud-upload-outline', label: 'Materials', screen: 'TeacherMaterials', color: '#00B894', bgColor: 'rgba(0, 184, 148, 0.12)' },
            { id: '5', icon: 'people-outline', label: 'Students', screen: 'Students', color: '#0984E3', bgColor: 'rgba(9, 132, 227, 0.12)' },
            { id: '6', icon: 'cash-outline', label: 'Salary', screen: 'Salary', color: Colors.gold, bgColor: 'rgba(255, 215, 0, 0.12)' },
          ]}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          snapToInterval={168}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.carouselCard, { backgroundColor: item.bgColor }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[styles.carouselIconGlow, { backgroundColor: item.color + '15' }]}>
                <View style={[styles.carouselIcon, { backgroundColor: item.color + '25' }]}>
                  <Ionicons name={item.icon} size={36} color={item.color} />
                </View>
              </View>
              <Text style={[styles.carouselLabel, { color: Colors.navy }]}>{item.label}</Text>
              <View style={[styles.carouselArrow, { backgroundColor: item.color + '20' }]}>
                <Ionicons name="arrow-forward" size={14} color={item.color} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>📢 Announcements</Text>
          {announcements.map((a) => (
            <View key={a._id} style={[styles.annCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.annTitle, { color: textColor }]}>{a.title}</Text>
              <Text style={[styles.annText, { color: textSec }]} numberOfLines={2}>{a.content}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 36, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  headerName: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginTop: 2 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 12 },
  aiBtnText: { color: Colors.gold, fontWeight: '700', marginLeft: 4, fontSize: 13 },
  notifBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
  statCard: { width: '48%', borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lightGray, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statIconLarge: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statValueLarge: { fontSize: 32, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  statLabelPremium: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy, letterSpacing: 0.3 },
  
  /* Premium Carousel Styles */
  carouselContent: { paddingHorizontal: 12, paddingRight: 32 },
  carouselCard: { width: 160, height: 200, borderRadius: 28, marginRight: 12, padding: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  carouselIconGlow: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  carouselIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  carouselLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  carouselArrow: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  liveCard: { borderRadius: 14, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveInfo: {},
  liveSubject: { fontSize: 17, fontWeight: '700' },
  liveTime: { fontSize: 13, marginTop: 2 },
  liveChip: { backgroundColor: Colors.error, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  liveChipText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  nextCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, ...Shadows.light },
  nextSubject: { fontSize: 16, fontWeight: '600' },
  nextTime: { fontSize: 13, marginTop: 2 },
  goLiveBtn: { backgroundColor: '#00A8AB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  goLiveText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '31%', borderRadius: 14, padding: 16, alignItems: 'center', ...Shadows.light },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  annCard: { borderRadius: 12, padding: 14, marginBottom: 8, ...Shadows.light },
  annTitle: { fontSize: 15, fontWeight: '600' },
  annText: { fontSize: 13, marginTop: 4 },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Spacing, BorderRadius, Shadows } from '../../utils/theme';
import { formatScheduledTime, formatDate, formatPercentage } from '../../utils/formatters';
import { fetchTodayClasses, fetchUpcomingClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getStudentDashboardAPI, getAnnouncementsAPI } from '../../services/api';

export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { todayClasses } = useSelector((state) => state.classes);
  const { unreadCount } = useSelector((state) => state.notifications);
  const theme = useSelector((state) => state.ui.theme);
  const isDark = theme === 'dark';

  const [dashboard, setDashboard] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, annRes] = await Promise.all([
        getStudentDashboardAPI(),
        getAnnouncementsAPI(),
      ]);
      setDashboard(dashRes.data.dashboard);
      setAnnouncements(annRes.data.announcements?.slice(0, 3) || []);
      dispatch(fetchTodayClasses());
      dispatch(fetchUpcomingClasses());
      dispatch(fetchUnreadNotificationCount());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSecondary = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const todayClass = dashboard?.todayClass || todayClasses?.[0];
  const scores = dashboard?.recentScores || [];
  const leaderboard = dashboard?.leaderboard || [];
  const attendanceSummary = dashboard?.attendanceSummary || [];

  const presentCount = attendanceSummary.find((a) => a._id === 'present')?.count || 0;
  const totalAtt = attendanceSummary.reduce((s, a) => s + a.count, 0);
  const attendancePct = totalAtt > 0 ? ((presentCount / totalAtt) * 100).toFixed(0) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Welcome Header */}
      <View style={[styles.welcomeCard, { backgroundColor: Colors.hotPink }] }>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.headerName}>{user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.welcomeSub}>Let's continue learning today</Text>
          </View>
          <View style={styles.welcomeRight}>
            <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
              <Ionicons name="sparkles" size={24} color={Colors.gold} />
              <Text style={styles.aiBtnText}>AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {user?.loginStreak > 0 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>🔥 {user.loginStreak} day streak</Text>
          </View>
        )}
      </View>

      {/* Quick Stats - Premium 3-card row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.lightGray }]}>
          <View style={[styles.statIconSmall, { backgroundColor: Colors.pink + '20' }]}>
            <Ionicons name="bar-chart-outline" size={28} color={Colors.pink} />
          </View>
          <Text style={[styles.statValue, { color: Colors.pink }]}>
            {scores.length > 0 ? formatPercentage((scores[0].marksObtained / scores[0].maxMarks) * 100) : 'N/A'}
          </Text>
          <Text style={[styles.statLabel, { color: Colors.navy }]}>Latest Score</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.lightGray }]}>
          <View style={[styles.statIconSmall, { backgroundColor: '#00B894' + '20' }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#00B894" />
          </View>
          <Text style={[styles.statValue, { color: Colors.pink }]}>{attendancePct}%</Text>
          <Text style={[styles.statLabel, { color: Colors.navy }]}>Attendance</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.lightGray }]}>
          <View style={[styles.statIconSmall, { backgroundColor: '#0984E3' + '20' }]}>
            <Ionicons name="calendar-outline" size={28} color="#0984E3" />
          </View>
          <Text style={[styles.statValue, { color: Colors.pink }]}>{todayClasses.length}</Text>
          <Text style={[styles.statLabel, { color: Colors.navy }]}>Today</Text>
        </View>
      </View>

      {/* Today's Class */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Today's Class</Text>
        {todayClass ? (
          <TouchableOpacity
            style={[styles.classCard, { backgroundColor: cardBg }]}
            onPress={() => navigation.navigate('ClassDetail', { classId: todayClass._id })}
          >
            <View style={styles.classCardRow}>
              <View style={[styles.statusDot, { backgroundColor: todayClass.status === 'live' ? Colors.error : Colors.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.classTitle, { color: textColor }]}>{todayClass.subject || todayClass.title}</Text>
                <Text style={[styles.classTeacher, { color: textSecondary }]}>
                  {todayClass.teacher?.name || todayClass.teacherId?.displayName || todayClass.teacherId?.name || 'Teacher'}
                </Text>
              </View>
              <View style={styles.classTime}>
                <Text style={[styles.timeText, { color: textColor }]}>
                  {formatScheduledTime(todayClass.scheduledTime)}
                </Text>
                {todayClass.status === 'live' && (
                  <View style={styles.liveChip}>
                    <Text style={styles.liveText}>🔴 LIVE</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Ionicons name="sunny-outline" size={32} color={Colors.gold} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No classes scheduled today</Text>
          </View>
        )}
      </View>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>🏆 Weekly Top Performers</Text>
          <View style={[styles.leaderboardCard, { backgroundColor: cardBg }]}>
            {leaderboard.map((entry, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <View key={idx} style={styles.leaderRow}>
                  <Text style={styles.medal}>{medals[idx]}</Text>
                  <Text style={[styles.leaderName, { color: textColor }]}>{entry._id?.name || 'Student'}</Text>
                  <Text style={[styles.leaderScore, { color: Colors.primary }]}>{entry.totalScore} pts</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>📢 Announcements</Text>
          {announcements.map((ann) => (
            <View key={ann._id} style={[styles.announcementCard, { backgroundColor: cardBg }]}>
              {ann.isPinned && <Ionicons name="pin" size={14} color={Colors.gold} />}
              <Text style={[styles.announcementTitle, { color: textColor }]}>{ann.title}</Text>
              <Text style={[styles.announcementContent, { color: textSecondary }]} numberOfLines={2}>{ann.content}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions - Premium Carousel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
        </View>
        <FlatList
          data={[
            { id: '1', icon: 'chatbubbles-outline', label: 'Discuss', screen: 'Discuss', color: '#0984E3', bgColor: '#EBF5FB' },
            { id: '2', icon: 'wallet-outline', label: 'Fees', screen: 'Fees', color: Colors.gold, bgColor: '#FFFBEA' },
            { id: '3', icon: 'chatbubble-outline', label: 'Chat', screen: 'Chat', color: '#A29BFE', bgColor: '#F9F7FE' },
            { id: '4', icon: 'stats-chart-outline', label: 'Scores', screen: 'ExamScores', color: Colors.pink, bgColor: Colors.lightPink },
          ]}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={156}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.carouselCard, { backgroundColor: item.bgColor }]}
              onPress={() => {
                if (item.screen === 'ExamScores') {
                  navigation.navigate('Profile', { screen: 'ExamScores' });
                } else {
                  navigation.navigate(item.screen);
                }
              }}
            >
              <LinearGradient colors={[item.color + '20', item.color + '08']} style={styles.carouselIconGlow}>
                <View style={[styles.carouselIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={32} color={item.color} />
                </View>
              </LinearGradient>
              <Text style={[styles.carouselLabel, { color: textColor }]}>{item.label}</Text>
              <View style={[styles.carouselArrow, { backgroundColor: item.color + '15' }]}>
                <Ionicons name="arrow-forward" size={14} color={item.color} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeCard: { marginHorizontal: 12, marginTop: 8, borderRadius: 20, padding: 16 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  headerName: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginTop: 2 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  welcomeLeft: { flex: 1, paddingRight: 10 },
  welcomeRight: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', width: 112 },
  welcomeSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  aiBtnText: { color: Colors.gold, fontWeight: '700', marginLeft: 4, fontSize: 13 },
  notifBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.gold, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  streakChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 },
  streakText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 12, marginBottom: 8 },
  statCard: { flex: 1, minHeight: 138, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lightGray, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  statIconSmall: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4, letterSpacing: -0.5, textAlign: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 12, marginTop: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy, letterSpacing: 0.3 },
  
  /* Premium Carousel Styles */
  carouselContent: { paddingHorizontal: 2, paddingRight: 14 },
  carouselCard: { width: 142, height: 176, borderRadius: 22, marginRight: 8, padding: 12, alignItems: 'center', justifyContent: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  carouselIconGlow: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  carouselIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  carouselLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  carouselArrow: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  classCard: { borderRadius: 14, padding: 16, ...Shadows.light },
  classCardRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  classTitle: { fontSize: 16, fontWeight: '600' },
  classTeacher: { fontSize: 13, marginTop: 2 },
  classTime: { alignItems: 'flex-end' },
  timeText: { fontSize: 14, fontWeight: '600' },
  liveChip: { backgroundColor: 'rgba(244,67,54,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  liveText: { fontSize: 11, fontWeight: '700', color: Colors.error },
  emptyCard: { borderRadius: 14, padding: 24, alignItems: 'center', ...Shadows.light },
  emptyText: { fontSize: 14, marginTop: 8 },
  leaderboardCard: { borderRadius: 14, padding: 16, ...Shadows.light },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  medal: { fontSize: 22, width: 36 },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '500' },
  leaderScore: { fontSize: 15, fontWeight: '700' },
  announcementCard: { borderRadius: 12, padding: 14, marginBottom: 10, ...Shadows.light },
  announcementTitle: { fontSize: 15, fontWeight: '600' },
  announcementContent: { fontSize: 13, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionItem: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', ...Shadows.light },
  actionLabel: { fontSize: 12, fontWeight: '500', marginTop: 6 },
});

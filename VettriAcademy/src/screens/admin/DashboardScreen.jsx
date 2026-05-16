import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/formatters';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getAdminStudentMarksAPI, getAdminTopRankersAPI } from '../../services/api';

export default function AdminDashboard({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { stats, loading } = useSelector((s) => s.admin);
  const { unreadCount } = useSelector((s) => s.notifications);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [refreshing, setRefreshing] = useState(false);
  const [topRankers, setTopRankers] = useState([]);
  const [studentMarks, setStudentMarks] = useState([]);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadAdminInsights = useCallback(async () => {
    try {
      const [rankersRes, marksRes] = await Promise.all([
        getAdminTopRankersAPI({}),
        getAdminStudentMarksAPI({ limit: 100 }),
      ]);
      setTopRankers(rankersRes.data?.topRankers || []);
      setStudentMarks(marksRes.data?.marks || []);
    } catch {
      setTopRankers([]);
      setStudentMarks([]);
    }
  }, []);

  const loadData = useCallback(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchUnreadNotificationCount());
    loadAdminInsights();
    setRefreshing(false);
  }, [dispatch, loadAdminInsights]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading && !stats) {
    return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const s = stats || {};

  const statCards = [
    { icon: 'school', value: s.totalStudents || 0, label: 'Students', color: '#6C5CE7', screen: 'ManageStudents' },
    { icon: 'people', value: s.totalTeachers || 0, label: 'Teachers', color: '#00B894', screen: 'ManageTeachers' },
    { icon: 'help-circle', value: s.pendingEnquiries || 0, label: 'Enquiries', color: '#FDCB6E', screen: 'Enquiries' },
    { icon: 'airplane', value: s.pendingLeaves || 0, label: 'Leaves', color: '#E17055', screen: 'AdminLeaves' },
  ];

  const quickActions = [
    { id: '1', icon: 'school-outline', label: 'Students', subtitle: `${s.totalStudents || 0} Active`, screen: 'ManageStudents', color: '#6C5CE7', bgColor: 'rgba(108, 92, 231, 0.12)' },
    { id: '2', icon: 'people-outline', label: 'Teachers', subtitle: `${s.totalTeachers || 0} Active`, screen: 'ManageTeachers', color: '#00B894', bgColor: 'rgba(0, 184, 148, 0.12)' },
    { id: '3', icon: 'wallet-outline', label: 'Fees', subtitle: 'Manage Payments', screen: 'FeeManagement', color: Colors.pink, bgColor: 'rgba(255, 79, 139, 0.12)' },
    { id: '4', icon: 'cash-outline', label: 'Salary', subtitle: 'Monthly Overview', screen: 'SalaryManagement', color: '#6C5CE7', bgColor: 'rgba(108, 92, 231, 0.12)' },
    { id: '5', icon: 'calendar-outline', label: 'Scheduler', subtitle: `${s.totalClasses || 0} Classes`, screen: 'ClassScheduler', color: '#0984E3', bgColor: 'rgba(9, 132, 227, 0.12)' },
    { id: '6', icon: 'videocam-outline', label: 'Training', subtitle: 'Onboarding Videos', screen: 'AdminTrainingVideos', color: '#6C5CE7', bgColor: 'rgba(108, 92, 231, 0.12)' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: bgColor }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />}>
      {/* Teal Wave Header */}
      <View style={styles.headerBg}>
        <LinearGradient colors={[Colors.teal, Colors.lightTeal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Admin Panel</Text>
              <Text style={styles.headerName}>{user?.displayName || user?.name} 🛡️</Text>
            </View>
            <Image source={require('../../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
                <Ionicons name="sparkles" size={24} color={Colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={24} color={Colors.white} />
                {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        {/* Wave SVG overlay would go here; for now, use a simple rounded bottom */}
      </View>

      {/* Revenue Card */}
      <View style={styles.revenueSection}>
        <View style={styles.revenueCard}>
          <Ionicons name="trending-up" size={28} color={Colors.pink} />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.revenueLabel}>This Month Revenue</Text>
            <Text style={styles.revenueAmount}>{formatCurrency(s.monthRevenue || 0)}</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid - 2x2 Layout with Light Pink Cards */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <TouchableOpacity key={i} style={[styles.statCard, { backgroundColor: Colors.lightGray }]} onPress={() => navigation.navigate(card.screen)} activeOpacity={0.85}>
            <View style={[styles.statIconLarge, { backgroundColor: card.color + '20' }]}>
              <Ionicons name={card.icon} size={32} color={card.color} />
            </View>
            <Text style={[styles.statValueLarge, { color: Colors.pink }]}>{card.value}</Text>
            <Text style={[styles.statLabelPremium, { color: Colors.navy }]}>{card.label}</Text>
            <View style={styles.arrowRight}>
              <Ionicons name="chevron-forward" size={18} color={Colors.pink} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Management Carousel - Premium Horizontal Scrollable */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle]}>Management</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ManageStudents')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={quickActions}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          snapToInterval={168}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item, index }) => (
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
              <Text style={[styles.carouselSubtitle, { color: Colors.mediumGray }]}>{item.subtitle}</Text>
              <View style={[styles.carouselArrow, { backgroundColor: item.color + '20' }]}>
                <Ionicons name="arrow-forward" size={14} color={item.color} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle]}>Monthly Top Rankers</Text>
        {topRankers.length ? topRankers.map((r) => (
          <View key={r.studentId || `${r.studentName}-${r.rank}`} style={styles.rankCard}>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>#{r.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName}>{r.studentName}</Text>
              <Text style={styles.rankSub}>Grade {r.grade || 'N/A'} • {r.examsCount} exam(s)</Text>
            </View>
            <Text style={styles.rankPercent}>{r.percentage}%</Text>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No ranking data this month</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle]}>Student Marks (Teacher Assigned)</Text>
        {studentMarks.length ? studentMarks.map((m) => (
          <View key={m._id} style={styles.markCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.markName}>{m.student?.displayName || m.student?.name || 'Student'}</Text>
              <Text style={styles.markSub}>{m.subject} • {m.examTitle}</Text>
              <Text style={styles.markSub}>By {m.teacher?.displayName || m.teacher?.name || 'Teacher'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.markScore}>{m.marksObtained}/{m.maxMarks}</Text>
              <Text style={styles.markGrade}>{m.grade}</Text>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No marks found</Text>
          </View>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBg: { backgroundColor: Colors.white },
  headerGradient: { paddingTop: 28, paddingBottom: 48, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 26, fontWeight: '800', color: Colors.white, marginTop: 2, letterSpacing: 0.5 },
  headerLogo: { width: 34, height: 34, marginRight: 8, borderRadius: 8 },
  aiBtn: { padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  notifBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.pink, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  
  /* Revenue Card */
  revenueSection: { paddingHorizontal: 16, marginTop: -32, marginBottom: 16 },
  revenueCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 20, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  revenueLabel: { fontSize: 13, color: Colors.mediumGray },
  revenueAmount: { fontSize: 32, fontWeight: '800', color: Colors.navy, marginTop: 4 },
  
  /* Stats Grid - Premium 2x2 Layout */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
  statCard: { width: '48%', borderRadius: 24, padding: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statIconLarge: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statValueLarge: { fontSize: 32, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  statLabelPremium: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  arrowRight: { position: 'absolute', top: 16, right: 16 },
  
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy, letterSpacing: 0.3 },
  viewAllText: { fontSize: 13, fontWeight: '600', color: Colors.pink },
  
  /* Premium Carousel Styles */
  carouselContent: { paddingHorizontal: 12, paddingRight: 32 },
  carouselCard: { width: 160, height: 200, borderRadius: 28, marginRight: 12, padding: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  carouselIconGlow: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  carouselIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  carouselLabel: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  carouselSubtitle: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginBottom: 12 },
  carouselArrow: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: { width: '19%', borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: Colors.navy },
  
  /* Premium Card Styles */
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  rankPill: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.pink + '15' },
  rankPillText: { color: Colors.pink, fontWeight: '800', fontSize: 14 },
  rankName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  rankSub: { fontSize: 13, marginTop: 2, color: Colors.mediumGray },
  rankPercent: { color: Colors.pink, fontWeight: '800', fontSize: 15 },
  
  markCard: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  markName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  markSub: { fontSize: 13, marginTop: 2, color: Colors.mediumGray },
  markScore: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  markGrade: { color: Colors.pink, fontWeight: '800', fontSize: 14, marginTop: 4 },
  
  emptyCard: { borderRadius: 16, padding: 20, backgroundColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  emptyCardText: { fontSize: 14, color: Colors.mediumGray, textAlign: 'center' },
});

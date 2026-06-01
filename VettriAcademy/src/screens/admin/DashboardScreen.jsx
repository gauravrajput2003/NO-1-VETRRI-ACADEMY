import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { fetchAdminStats } from '../../redux/slices/adminSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getAdminStudentMarksAPI, getAdminTopRankersAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

export default function AdminDashboard({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
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
        getAdminTopRankersAPI({ limit: 3 }),
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
  const statSummary = [
    { key: 'students', label: 'Students', value: s.totalStudents || 0, icon: 'school' },
    { key: 'teachers', label: 'Teachers', value: s.totalTeachers || 0, icon: 'people' },
    { key: 'enquiries', label: 'Enquiries', value: s.pendingEnquiries || 0, icon: 'help-circle' },
    { key: 'leaves', label: 'Leaves', value: s.pendingLeaves || 0, icon: 'airplane' },
  ];

  const sortedStudentMarks = [...studentMarks]
    .sort((a, b) => {
      const aScore = Number(a.percentage ?? (a.maxMarks ? ((a.marksObtained / a.maxMarks) * 100) : 0));
      const bScore = Number(b.percentage ?? (b.maxMarks ? ((b.marksObtained / b.maxMarks) * 100) : 0));
      return bScore - aScore;
    });

  const topStudentMarks = sortedStudentMarks.slice(0, 4);
  const previewTopRankers = topRankers.slice(0, 3);

  const statCards = [
    { symbol: '🎓', value: s.totalStudents || 0, label: 'Students', accent: '#6C5CE7', glow: '#E8E4FF', screen: 'ManageStudents' },
    { symbol: '👥', value: s.totalTeachers || 0, label: 'Teachers', accent: '#00B894', glow: '#DCF8F1', screen: 'ManageTeachers' },
    { symbol: '❓', value: s.pendingEnquiries || 0, label: 'Enquiries', accent: '#FDCB6E', glow: '#FFF2D8', screen: 'Enquiries' },
    { symbol: '✈️', value: s.pendingLeaves || 0, label: 'Leaves', accent: '#E17055', glow: '#FDE6DC', screen: 'AdminLeaves' },
  ];

  const quickActions = [
    { id: '1', symbol: '🎓', label: 'Students', subtitle: `${s.totalStudents || 0} Active`, screen: 'ManageStudents', color: '#6C5CE7', bgColor: '#6C5CE7', iconBg: '#8A7BFA' },
    { id: '2', symbol: '👩‍🏫', label: 'Teachers', subtitle: `${s.totalTeachers || 0} Active`, screen: 'ManageTeachers', color: '#00B894', bgColor: '#00B894', iconBg: '#33D1B1' },
    { id: '3', symbol: '💳', label: 'Fees', subtitle: 'Payments', screen: 'FeeManagement', color: '#FF4F8B', bgColor: '#FF4F8B', iconBg: '#FF7EA8' },
    { id: '4', symbol: '📢', label: 'Notices', subtitle: 'Announcements', screen: 'Announcements', color: '#E17055', bgColor: '#E17055', iconBg: '#FA9A85' },
    { id: '5', symbol: '💰', label: 'Salary', subtitle: 'Overview', screen: 'SalaryManagement', color: '#7000FF', bgColor: '#7000FF', iconBg: '#9B51FF' },
    { id: '6', symbol: '📅', label: 'Scheduler', subtitle: `${s.totalClasses || 0} Scheduled`, screen: 'ClassScheduler', color: '#0984E3', bgColor: '#0984E3', iconBg: '#4FAAFF' },
    { id: '7', symbol: '🎥', label: 'Training', subtitle: 'Videos', screen: 'AdminTrainingVideos', color: '#B829DB', bgColor: '#B829DB', iconBg: '#D966F2' },
  ];

  return (
    <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={[styles.container, { backgroundColor: bgColor }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />}>
      {/* Teal Wave Header */}
      <View style={styles.headerBg}>
        <LinearGradient colors={['#1A3C40', '#11C5C6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>ADMIN PANEL</Text>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{(user?.displayName || user?.name || '').split(' ')[0]} </Text>
                <Text style={styles.headerNameAccent}>{(user?.displayName || user?.name || '').split(' ').slice(1).join(' ')}</Text>
              </View>
              <Text style={styles.headerDateline}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })} · All systems normal
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ParticleWrapper particleCount={20} size="small">
                <TouchableOpacity style={styles.aiBtn} onPress={() => dispatch(toggleAI())}>
                  <Ionicons name="sparkles" size={20} color={Colors.gold} />
                </TouchableOpacity>
              </ParticleWrapper>
              <ParticleWrapper particleCount={20} size="small">
                <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Ionicons name="notifications-outline" size={22} color={Colors.white} />
                  {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
                </TouchableOpacity>
              </ParticleWrapper>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Grid - 2x2 Horizontal Layout */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <ParticleWrapper key={i} particleCount={24} size="small" style={styles.statCardWrap}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate(card.screen)} activeOpacity={0.85}>
            <LinearGradient colors={[card.glow, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statSymbolArea}>
              <View style={[styles.statGlowCircle, { backgroundColor: card.accent + '18' }]} />
              <View style={[styles.statIconLarge, { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.cardSymbol}>{card.symbol}</Text>
              </View>
            </LinearGradient>
            <View style={styles.statTextArea}>
              <Text style={[styles.statValueLarge, { color: Colors.navy }]}>{card.value}</Text>
              <Text style={[styles.statLabelPremium, { color: Colors.mediumGray }]}>{card.label}</Text>
            </View>
          </TouchableOpacity>
          </ParticleWrapper>
        ))}
      </View>

      {/* Management Carousel - Premium Horizontal Scrollable */}
      <View style={styles.section}>
        <View style={[styles.sectionHeaderCard, styles.managementHeaderCard]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Management</Text>
          </View>
        </View>
        <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}
          data={quickActions}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={168}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item, index }) => (
            <ParticleWrapper particleCount={24} size="small">
              <TouchableOpacity
                style={[styles.carouselCard, { backgroundColor: item.bgColor }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <LinearGradient colors={[item.iconBg, 'rgba(255,255,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.carouselIconGlow}> 
                  <View style={[styles.carouselIcon, { backgroundColor: '#FFFFFF' }]}> 
                    <Text style={styles.carouselSymbol}>{item.symbol}</Text>
                  </View>
                </LinearGradient>
                <Text style={[styles.carouselLabel, { color: Colors.white }]}>{item.label}</Text>
                <Text style={[styles.carouselSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>{item.subtitle}</Text>
                <View style={[styles.carouselArrow, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[styles.cardArrowSmall, { color: Colors.white }]}>→</Text>
                </View>
              </TouchableOpacity>
            </ParticleWrapper>
          )}
        />
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeaderCard, styles.rankersHeaderCard]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Monthly Top Rankers</Text>
          </View>
          <ParticleWrapper particleCount={14} size="small">
            <TouchableOpacity
              onPress={() => navigation.navigate('MonthlyTopRankers')}
              style={styles.viewAllButton}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllText}>Show More →</Text>
            </TouchableOpacity>
          </ParticleWrapper>
        </View>
        <View style={styles.sectionContent}>
          {previewTopRankers.length ? previewTopRankers.map((r) => (
            <ParticleWrapper key={r.studentId || `${r.name}-${r.rank}`} particleCount={12} size="small">
              <TouchableOpacity
                style={styles.rankCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MonthlyTopRankers')}
              >
                <View style={styles.rankPill}>
                  <Text style={styles.rankPillText}>#{r.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{r.name}</Text>
                  <Text style={styles.rankSub}>Grade {r.grade || 'N/A'}</Text>
                </View>
                <Text style={styles.rankPercent}>{r.score}</Text>
              </TouchableOpacity>
            </ParticleWrapper>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No ranking data this month</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHeaderCard, styles.marksHeaderCard]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Student Marks</Text>
          </View>
          <ParticleWrapper particleCount={14} size="small">
          <TouchableOpacity onPress={() => navigation.navigate('StudentMarks')} style={styles.viewAllButton} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
          </ParticleWrapper>
        </View>
        <View style={styles.sectionContent}>
          {topStudentMarks.length ? topStudentMarks.map((m, index) => {
          const score = Number(m.percentage ?? (m.maxMarks ? ((m.marksObtained / m.maxMarks) * 100) : 0));
          const grade = m.grade || (score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D');
          const gradeColor = score >= 80 ? '#00B894' : score >= 60 ? '#FDCB6E' : '#E17055';

          return (
            <ParticleWrapper key={m._id} particleCount={14} size="small">
            <TouchableOpacity style={styles.markCard} activeOpacity={0.85} onPress={() => navigation.navigate('StudentMarks')}>
              <View style={styles.markAvatar}>
                <Text style={styles.markAvatarText}>{(m.student?.displayName || m.student?.name || 'S')?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.markInfo}>
                <Text style={styles.markName} numberOfLines={1}>{m.student?.displayName || m.student?.name || 'Student'}</Text>
                <Text style={styles.markSub} numberOfLines={1}>{m.subject} · {m.examTitle}</Text>
                <View style={styles.markMetaRow}>
                  <View style={[styles.markGradePill, { backgroundColor: gradeColor + '18' }]}>
                    <Text style={[styles.markGradeText, { color: gradeColor }]}>{grade}</Text>
                  </View>
                  <Text style={styles.markMetaText}>{m.marksObtained}/{m.maxMarks}</Text>
                </View>
              </View>
              <View style={styles.markScoreWrap}>
                <Text style={styles.markPercent}>{score.toFixed(0)}%</Text>
                <Text style={styles.markRankLabel}>#{index + 1}</Text>
              </View>
            </TouchableOpacity>
            </ParticleWrapper>
          );
          }) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No marks found</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBg: { backgroundColor: Colors.white },
  headerGradient: { paddingTop: 48, paddingBottom: 22, paddingHorizontal: 18 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase' },
  headerNameRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  headerName: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: 0.2 },
  headerNameAccent: { fontSize: 26, fontWeight: '900', color: '#FF4FA3', letterSpacing: 0.2 },
  headerDateline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '500' },
  aiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.pink, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  
  /* Stats Grid - Premium 2x2 Horizontal Layout */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 12, gap: 12 },
  statCardWrap: { width: '48%' },
  statCard: { width: '100%', height: 110, borderRadius: 22, flexDirection: 'row', backgroundColor: Colors.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)', overflow: 'hidden', ...Shadows.medium },
  statSymbolArea: { width: '50%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  statGlowCircle: { position: 'absolute', width: 70, height: 70, borderRadius: 35, top: -8, right: -12, opacity: 0.95 },
  statIconLarge: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardSymbol: { fontSize: 26, lineHeight: 30 },
  statTextArea: { width: '50%', justifyContent: 'center', paddingRight: 12 },
  statValueLarge: { fontSize: 32, fontWeight: '900', letterSpacing: -0.7 },
  statLabelPremium: { fontSize: 12, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },
  
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 45, 61, 0.06)',
    ...Shadows.light,
  },
  managementHeaderCard: { backgroundColor: '#F4FBF7' },
  rankersHeaderCard: { backgroundColor: '#FFF1F6' },
  marksHeaderCard: { backgroundColor: '#EEF6FF' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionAccentBar: { width: 4, height: 26, borderRadius: 999, backgroundColor: '#FF4F8B', marginRight: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1F2D3D', letterSpacing: 0.1 },
  sectionContent: { marginTop: 2 },
  viewAllButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#FF4F8B' },
  
  /* Premium Carousel Styles */
  carouselContent: { paddingHorizontal: 12, paddingRight: 32 },
  carouselCard: { width: 168, height: 196, borderRadius: 28, marginRight: 12, padding: 14, alignItems: 'center', justifyContent: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
  carouselIconGlow: { width: 92, height: 92, borderRadius: 46, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  carouselIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  carouselSymbol: { fontSize: 30, lineHeight: 34 },
  carouselLabel: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  carouselSubtitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  cardArrowSmall: { fontSize: 14, fontWeight: '700' },
  carouselArrow: { position: 'absolute', bottom: 12, right: 12, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  
  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: { width: '19%', borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: Colors.navy },
  
  /* Premium Card Styles - Top Rankers */
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  rankPill: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.pink + '15' },
  rankPillText: { color: Colors.pink, fontWeight: '800', fontSize: 14 },
  rankName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  rankSub: { fontSize: 13, marginTop: 2, color: Colors.mediumGray },
  rankPercent: { color: Colors.pink, fontWeight: '800', fontSize: 15 },
  
  /* Student Marks Cards */
  markCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: Colors.white, ...Shadows.light },
  markAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.teal + '18', justifyContent: 'center', alignItems: 'center' },
  markAvatarText: { color: Colors.teal, fontSize: 16, fontWeight: '800' },
  markInfo: { flex: 1 },
  markName: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  markSub: { fontSize: 12, marginTop: 2, color: Colors.mediumGray },
  markMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  markGradePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  markGradeText: { fontSize: 11, fontWeight: '800' },
  markMetaText: { fontSize: 11, color: Colors.mediumGray, fontWeight: '600' },
  markScoreWrap: { alignItems: 'flex-end' },
  markPercent: { color: Colors.pink, fontWeight: '900', fontSize: 18 },
  markRankLabel: { color: Colors.mediumGray, fontSize: 11, fontWeight: '700', marginTop: 2 },
  
  emptyCard: { borderRadius: 16, padding: 20, backgroundColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  emptyCardText: { fontSize: 14, color: Colors.mediumGray, textAlign: 'center' },
});


import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeacherDashboard, fetchTeacherMaterials, fetchTeacherStudents } from '../../redux/slices/teacherSlice';
import { fetchTodayClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { fetchDoubtMetrics } from '../../redux/slices/doubtsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getActiveAnnouncementsAPI } from '../../services/api';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { formatScheduledTime } from '../../utils/formatters';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

export default function TeacherDashboard({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { dashboard, loading: teacherLoading, students, materials } = useSelector((s) => s.teacher);
  const { todayClasses } = useSelector((s) => s.classes);
  const { unreadCount } = useSelector((s) => s.notifications);
  const { metrics } = useSelector((s) => s.doubts);
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const loadData = useCallback(async () => {
    dispatch(fetchTeacherDashboard());
    dispatch(fetchTeacherStudents());
    dispatch(fetchTeacherMaterials());
    dispatch(fetchTodayClasses());
    dispatch(fetchUnreadNotificationCount());
    dispatch(fetchDoubtMetrics());
    try {
      const { data } = await getActiveAnnouncementsAPI();
      setAnnouncements(data.announcements?.slice(0, 2) || []);
    } catch {
      setAnnouncements([]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const overview = dashboard || {};
  const studentCount = students?.length || overview.totalStudents || 0;
  const materialCount = materials?.length || overview.totalMaterials || 0;
  const classCount = overview.todayClasses?.length || todayClasses?.length || 0;
  const liveClass = todayClasses?.find((c) => c.status === 'live');
  const nextClass = todayClasses?.find((c) => c.status === 'scheduled');
  
  const doubtCount = metrics?.pendingDoubts ?? metrics?.assignedDoubts ?? 0;

  /* ── Stat Cards (matches Admin 2×2 grid with gradient glow) ── */
  const statCards = [
    { symbol: '🎥', value: classCount, label: 'Today Classes', accent: '#2563EB', glow: '#DBEAFE', screen: 'LiveClass' },
    { symbol: '🎓', value: studentCount, label: 'Students', accent: '#6C5CE7', glow: '#E8E4FF', screen: 'Students' },
    { symbol: '📁', value: materialCount, label: 'Materials', accent: '#0F766E', glow: '#CCFBF1', screen: 'TeacherMaterials' },
    { symbol: '✈️', value: overview.pendingLeaves || 0, label: 'Pending Leaves', accent: '#E17055', glow: '#FDE6DC', screen: 'Leave' },
  ];

  /* ── Quick Actions (matches Admin carousel) ── */
  const quickActions = useMemo(() => ([
    { id: 'live', symbol: '🎥', label: 'Live Class', subtitle: `${classCount} today`, screen: 'LiveClass', color: '#2563EB', bgColor: '#2563EB', iconBg: '#60A5FA' },
    { id: 'doubts', symbol: '❓', label: 'Doubts', subtitle: `${doubtCount} pending`, screen: 'DoubtCenter', color: '#EA580C', bgColor: '#EA580C', iconBg: '#F97316' },
    { id: 'grades', symbol: '✏️', label: 'Grades', subtitle: 'Enter marks', screen: 'Grades', color: '#7C3AED', bgColor: '#7C3AED', iconBg: '#A78BFA' },
    { id: 'materials', symbol: '📂', label: 'Materials', subtitle: `${materialCount} files`, screen: 'TeacherMaterials', color: '#0F766E', bgColor: '#0F766E', iconBg: '#2DD4BF' },
    { id: 'students', symbol: '👥', label: 'Students', subtitle: `${studentCount} active`, screen: 'Students', color: '#0284C7', bgColor: '#0284C7', iconBg: '#38BDF8' },
    { id: 'salary', symbol: '💰', label: 'Salary', subtitle: 'Overview', screen: 'Salary', color: '#B45309', bgColor: '#B45309', iconBg: '#F59E0B' },
    { id: 'leave', symbol: '🏖️', label: 'Leave', subtitle: 'Apply now', screen: 'Leave', color: '#DB2777', bgColor: '#DB2777', iconBg: '#F472B6' },
  ]), [classCount, materialCount, studentCount, doubtCount]);

  if (teacherLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding + 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ Teal Wave Header (identical to Admin) ═══ */}
      <View style={styles.headerBg}>
        <LinearGradient colors={['#1A3C40', '#11C5C6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>TEACHER PANEL</Text>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{(user?.displayName || user?.name || '').split(' ')[0]} </Text>
                <Text style={styles.headerNameAccent}>{(user?.displayName || user?.name || '').split(' ').slice(1).join(' ')}</Text>
              </View>
              <Text style={styles.headerDateline} numberOfLines={1}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
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

      {/* ═══ Stats Grid — Premium 2×2 Horizontal (matches Admin) ═══ */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <ParticleWrapper key={i} particleCount={24} size="small" style={styles.statCardWrap}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate(card.screen)} activeOpacity={0.85}>
            <LinearGradient colors={[card.glow, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statSymbolArea}>
              <View style={[styles.statGlowCircle, { backgroundColor: card.accent + '18' }]} />
              <View style={styles.statIconLarge}>
                <Text style={styles.cardSymbol}>{card.symbol}</Text>
              </View>
            </LinearGradient>
            <View style={styles.statTextArea}>
              <Text style={styles.statValueLarge}>{card.value}</Text>
              <Text style={styles.statLabelPremium} numberOfLines={2}>{card.label}</Text>
            </View>
          </TouchableOpacity>
          </ParticleWrapper>
        ))}
      </View>

      {/* ═══ Quick Actions Carousel (matches Admin Management) ═══ */}
      <View style={styles.section}>
        <View style={[styles.sectionHeaderCard, styles.managementHeaderCard]}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
        </View>
        <FlatList
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          data={quickActions}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={168}
          decelerationRate="fast"
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item }) => (
            <ParticleWrapper particleCount={24} size="small">
            <TouchableOpacity
              style={[styles.carouselCard, { backgroundColor: item.bgColor }]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <LinearGradient colors={[item.iconBg, 'rgba(255,255,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.carouselIconGlow}>
                <View style={styles.carouselIcon}>
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

      {/* ═══ Live Status (if live class active) ═══ */}
      {liveClass && (
        <View style={styles.section}>
          <View style={[styles.sectionHeaderCard, styles.liveHeaderCard]}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>Live Status</Text>
            </View>
          </View>
          <ParticleWrapper particleCount={24} size="small">
          <TouchableOpacity style={styles.infoCard} onPress={() => navigation.navigate('LiveClass')} activeOpacity={0.85}>
            <View style={styles.infoRow}>
              <View style={[styles.smallIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="radio-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle} numberOfLines={1}>{liveClass.subject || liveClass.title}</Text>
                <Text style={styles.infoSubtitle} numberOfLines={1}>{formatScheduledTime(liveClass.scheduledTime)}</Text>
              </View>
            </View>
            <Text style={styles.infoAction}>Manage →</Text>
          </TouchableOpacity>
          </ParticleWrapper>
        </View>
      )}

      {/* ═══ Upcoming Class ═══ */}
      {nextClass && !liveClass && (
        <View style={styles.section}>
          <View style={[styles.sectionHeaderCard, styles.liveHeaderCard]}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>Upcoming Class</Text>
            </View>
          </View>
          <ParticleWrapper particleCount={24} size="small">
          <TouchableOpacity style={styles.infoCard} onPress={() => navigation.navigate('LiveClass')} activeOpacity={0.85}>
            <View style={styles.infoRow}>
              <View style={[styles.smallIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle} numberOfLines={1}>{nextClass.subject || nextClass.title}</Text>
                <Text style={styles.infoSubtitle} numberOfLines={1}>{formatScheduledTime(nextClass.scheduledTime)} • {nextClass.durationMinutes || 60} min</Text>
              </View>
            </View>
            <Text style={styles.infoAction}>Open →</Text>
          </TouchableOpacity>
          </ParticleWrapper>
        </View>
      )}

      {/* ═══ Announcements ═══ */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeaderCard, styles.noticeHeaderCard]}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>Announcements</Text>
            </View>
          </View>
          <View style={styles.sectionContent}>
            {announcements.map((a) => (
              <View key={a._id} style={styles.noticeCard}>
                <View style={[styles.smallIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="megaphone-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.noticeTextWrap}>
                  <Text style={styles.infoTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.noticeBody} numberOfLines={2}>{a.content}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STYLES — Mirrors AdminDashboardScreen styles for visual consistency
   ═══════════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* ── Layout ── */
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite },

  /* ── Header (identical to Admin) ── */
  headerBg: { backgroundColor: Colors.white },
  headerGradient: { paddingTop: 48, paddingBottom: 22, paddingHorizontal: 18 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontWeight: '700', textTransform: 'uppercase' },
  headerNameRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, flexWrap: 'wrap' },
  headerName: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: 0.2 },
  headerNameAccent: { fontSize: 26, fontWeight: '900', color: '#FF4FA3', letterSpacing: 0.2 },
  headerDateline: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '500' },
  aiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.pink, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },

  /* ── Stats Grid — Premium 2×2 (identical to Admin) ── */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 12, gap: 12 },
  statCardWrap: { width: '48%' },
  statCard: {
    width: '100%',
    height: 110,
    borderRadius: 22,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
    ...Shadows.medium,
  },
  statSymbolArea: {
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  statGlowCircle: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    top: -8,
    right: -12,
    opacity: 0.95,
  },
  statIconLarge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSymbol: { fontSize: 26, lineHeight: 30 },
  statTextArea: { width: '50%', justifyContent: 'center', paddingRight: 12, paddingLeft: 4 },
  statValueLarge: { fontSize: 32, fontWeight: '900', color: Colors.navy, letterSpacing: -0.7 },
  statLabelPremium: { fontSize: 12, fontWeight: '700', color: Colors.mediumGray, marginTop: 2, letterSpacing: 0.3 },

  /* ── Section Layout (matches Admin) ── */
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
  liveHeaderCard: { backgroundColor: '#EEF6FF' },
  noticeHeaderCard: { backgroundColor: '#FFF8E8' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionAccentBar: { width: 4, height: 26, borderRadius: 999, backgroundColor: '#FF4F8B', marginRight: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1F2D3D', letterSpacing: 0.1 },
  sectionContent: { marginTop: 2 },

  /* ── Carousel Cards (identical to Admin) ── */
  carouselContent: { paddingHorizontal: 0, paddingRight: 32 },
  carouselCard: {
    width: 168,
    height: 196,
    borderRadius: 28,
    marginRight: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  carouselIconGlow: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  carouselIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  carouselSymbol: { fontSize: 30, lineHeight: 34 },
  carouselLabel: { fontSize: 18, fontWeight: '900', color: Colors.navy, textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  carouselSubtitle: { fontSize: 12, fontWeight: '600', color: Colors.mediumGray, textAlign: 'center', marginBottom: 12 },
  cardArrowSmall: { fontSize: 14, fontWeight: '700' },
  carouselArrow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Info / Live Cards ── */
  infoCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Shadows.light,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  infoTextWrap: { flex: 1, minWidth: 0 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1F2D3D', lineHeight: 20 },
  infoSubtitle: { fontSize: 12, fontWeight: '500', color: Colors.mediumGray, marginTop: 2, lineHeight: 16 },
  infoAction: { marginTop: 10, fontSize: 13, fontWeight: '700', color: '#FF4F8B', textAlign: 'right' },

  /* ── Notice / Announcement Cards ── */
  noticeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...Shadows.light,
  },
  noticeTextWrap: { flex: 1, minWidth: 0 },
  noticeBody: { fontSize: 12, fontWeight: '500', color: Colors.mediumGray, marginTop: 4, lineHeight: 18 },
});

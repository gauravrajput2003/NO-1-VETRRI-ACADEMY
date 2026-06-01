import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, FlatList,
  Animated, Easing,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
// UNCHANGED — all existing imports
import { formatScheduledTime, formatPercentage } from '../../utils/formatters';
import { fetchTodayClasses, fetchUpcomingClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getStudentDashboardAPI, getActiveAnnouncementsAPI } from '../../services/api';


// CHANGED — Anti-Gravity Kids design tokens
const C = {
  purple: '#7B61FF', purpleL: '#9B85FF',
  pink:   '#FF4FA3', teal: '#14B8A6',
  orange: '#F5A623',
  dark:   '#1A1A2E', gray: '#666', lightGray: '#888',
  white:  '#FFFFFF', bg:  '#EDE8FF', bgL: '#F5F3FF',
  error:  '#E53935',
};

// CHANGED — category items for horizontal scroll
const CATEGORIES = [
  { id: '1', label: 'Lessons',    emoji: '📚', screen: 'Materials' },
  { id: '2', label: 'Classes',    emoji: '🎮', screen: 'Classes'   },
  { id: '3', label: 'Scores',     emoji: '📊', screen: 'ExamScores'},
  { id: '4', label: 'Attendance', emoji: '📅', screen: 'Attendance'},
  { id: '5', label: 'Discuss',    emoji: '💬', screen: 'Discuss'   },
];

// CHANGED — floating emoji decoration (built-in Animated)
function FloatEmoji({ emoji, style }) {
  const ty = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ty, { toValue: -12, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0,   duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.Text style={[{ fontSize: 32, position: 'absolute' }, style, { transform: [{ translateY: ty }] }]}>{emoji}</Animated.Text>;
}

// CHANGED — section card (built-in Animated)
function SectionCard({ icon, title, color, onPress, children, style }) {
  const sc = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(sc, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(sc, { toValue: 1,    useNativeDriver: true }).start();
  return (
    <Animated.View style={[st.sectionCard, style, { transform: [{ scale: sc }] }]}>
      <ParticleWrapper particleCount={24} size="small">
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
        <View style={st.sectionCardHeader}>
          <View style={[st.sectionIconWrap, { backgroundColor: color + '18' }]}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <Text style={[st.sectionCardTitle, { fontWeight: '800' }]}>{title}</Text>
          <ParticleWrapper particleCount={20} size="small">
            <TouchableOpacity style={st.arrowBtn} onPress={onPress}>
              <Ionicons name="arrow-forward" size={18} color={C.white} />
            </TouchableOpacity>
          </ParticleWrapper>
        </View>
        {children}
      </TouchableOpacity>
      </ParticleWrapper>
    </Animated.View>
  );
}

export default function DashboardScreen({ navigation }) {
  // UNCHANGED — all existing state and logic
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { todayClasses } = useSelector((state) => state.classes);
  const { unreadCount }  = useSelector((state) => state.notifications);
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const [dashboard,     setDashboard]    = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [activeCategory, setActiveCategory] = useState('1'); // CHANGED — for category tabs

  // UNCHANGED — loadData exactly as-is
  const loadData = useCallback(async () => {
    try {
      const [dashRes, annRes] = await Promise.all([
        getStudentDashboardAPI(),
        getActiveAnnouncementsAPI(),
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

  // UNCHANGED — onRefresh
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // CHANGED — progress bar animation (built-in Animated)
  const progressW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressW, { toValue: 55, duration: 900, delay: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, []);
  const progressStyle = { width: progressW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) };

  // CHANGED — card entrance animations (built-in Animated, NOT inside nested function)
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const anim4 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(anim1, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(anim2, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(anim3, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(anim4, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);
  const mkAnim = (a) => ({ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] });
  const a1 = mkAnim(anim1);
  const a2 = mkAnim(anim2);
  const a3 = mkAnim(anim3);
  const a4 = mkAnim(anim4);

  if (loading) {
    return (
      <View style={[st.centered, { backgroundColor: C.bgL }]}>
        <ActivityIndicator size="large" color={C.purple} />
      </View>
    );
  }

  // UNCHANGED — dashboard data extraction
  const todayClass       = dashboard?.todayClass || todayClasses?.[0];
  const scores           = dashboard?.recentScores || [];
  const leaderboard      = dashboard?.leaderboard || [];
  const attendanceSummary = dashboard?.attendanceSummary || [];
  const presentCount     = attendanceSummary.find((a) => a._id === 'present')?.count || 0;
  const totalAtt         = attendanceSummary.reduce((s, a) => s + a.count, 0);
  const attendancePct    = totalAtt > 0 ? ((presentCount / totalAtt) * 100).toFixed(0) : 0;
  const topPerformers = leaderboard.slice(0, 5);

  return (
    <ScrollView
      style={st.root}
      // UNCHANGED — RefreshControl
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.purple]} tintColor={C.purple} />}
      showsVerticalScrollIndicator={false}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
    >
      {/* CHANGED — header: white bar with avatar + greeting + bell */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={st.avatarCircle}>
            <Text style={st.avatarEmoji}>👤</Text>
          </View>
          <View>
            <Text style={st.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            {user?.grade && (
              <Text style={st.gradeText}>Grade {user.grade} · {user?.board || 'Student'}</Text>
            )}
          </View>
        </View>
        <View style={st.headerRight}>
          {/* UNCHANGED — AI button, notification nav */}
          <ParticleWrapper particleCount={20} size="small" colors={['#FFD700', '#F5A623', '#FFFFFF']}>
            <TouchableOpacity style={st.aiCircle} onPress={() => dispatch(toggleAI())}>
              <Ionicons name="sparkles" size={18} color={C.orange} />
            </TouchableOpacity>
          </ParticleWrapper>
          <ParticleWrapper particleCount={20} size="small" colors={['#FFD700', '#FF3B30', '#FFFFFF']}>
            <TouchableOpacity style={st.bellCircle} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={20} color={C.dark} />
              {unreadCount > 0 && <View style={st.notifDot} />}
            </TouchableOpacity>
          </ParticleWrapper>
        </View>
      </View>

      {/* CHANGED — streak pill */}
      {user?.loginStreak > 0 && (
        <Animated.View style={[st.streakPill, a1]}>
          <Text style={st.streakText}>🔥 {user.loginStreak} day streak</Text>
        </Animated.View>
      )}

      {/* Pink Learning Level card */}
      <Animated.View style={[st.levelCardWrap, a1]}>
        <LinearGradient colors={['#FF4FA3', '#C2185B']} style={st.levelCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <FloatEmoji emoji="🏆" style={{ right: 12, top: -10, fontSize: 48 }} />
          <Text style={st.levelTitle}>Learning Level 1</Text>
          <Text style={st.levelSub}>Complete lessons &amp; classes to reach Level 2!</Text>
          {/* Progress bar — 55% = lessons completed this month */}
          <View style={st.progressBg}>
            <Animated.View style={[st.progressFill, progressStyle]}>
              <LinearGradient colors={['#FFF', 'rgba(255,255,255,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 10 }} />
            </Animated.View>
            <View style={[st.progressThumb, { left: `${Math.min(progressW._value - 3, 90)}%` }]} />
          </View>
          <Text style={st.progressLabel}>55% Progress to Level 2</Text>
        </LinearGradient>
      </Animated.View>

      {/* CHANGED — horizontal category scroll */}
      <Animated.View style={a2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.categoriesRow}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <ParticleWrapper key={cat.id} particleCount={24} size="small" colors={['#FFD700', '#FFA500', '#FFEC8B']}>
              <TouchableOpacity
                style={st.catItem}
                onPress={() => {
                  setActiveCategory(cat.id);
                  // UNCHANGED — navigation logic
                  if (cat.screen === 'ExamScores') navigation.navigate('Scores', { screen: 'ExamScoresMain' });
                  else navigation.navigate(cat.screen);
                }}
              >
                <View style={[st.catCircle, isActive && st.catCircleActive]}>
                  <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                </View>
                <Text style={[st.catLabel, isActive && { color: C.pink }]}>{cat.label}</Text>
              </TouchableOpacity>
              </ParticleWrapper>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* CHANGED — Today's Class card */}
      <Animated.View style={a3}>
        <SectionCard
          icon="📅" title="Today's Class" color={C.purple}
          onPress={() => navigation.navigate('Classes')}
        >
          {todayClass ? (
            <ParticleWrapper particleCount={14} size="small">
            <TouchableOpacity
              // UNCHANGED — navigation.navigate
              onPress={() => navigation.navigate('ClassDetail', { classId: todayClass._id })}
              style={st.classRow}
            >
              <View style={[st.classDot, { backgroundColor: todayClass.status === 'live' ? C.error : '#00B894' }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.classTitle}>{todayClass.subject || todayClass.title}</Text>
                <Text style={st.classTeacher}>
                  {todayClass.teacher?.name || todayClass.teacherId?.name || 'Teacher'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.classTime}>{formatScheduledTime(todayClass.scheduledTime)}</Text>
                {todayClass.status === 'live' && (
                  <View style={st.liveChip}><Text style={st.liveText}>🔴 LIVE</Text></View>
                )}
              </View>
            </TouchableOpacity>
            </ParticleWrapper>
          ) : (
            <View style={st.emptyRow}>
              <Ionicons name="sunny-outline" size={28} color={C.orange} />
              <Text style={st.emptyText}>No classes scheduled today</Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      {/* CHANGED — Lessons feature card */}
      <Animated.View style={a3}>
        <SectionCard
          icon="📚" title="Lessons" color="#7B61FF"
          onPress={() => navigation.navigate('Materials')}
          style={{ marginHorizontal: 16, marginBottom: 14 }}
        >
          <Text style={st.featDesc}>Fun learning lessons that help kids grow smarter daily.</Text>
        </SectionCard>
      </Animated.View>

      {/* CHANGED — Quick Actions row (kept existing navigation) */}
      <Animated.View style={[a3, { paddingHorizontal: 16, marginBottom: 14 }]}>
        <Text style={st.sectionTitle}>Quick Actions</Text>
        <FlatList
          data={[
            { id: '1', icon: 'chatbubbles-outline', label: 'Discuss', screen: 'Discuss',   color: '#0984E3', bg: '#0984E3' },
            { id: '2', icon: 'wallet-outline',      label: 'Fees',    screen: 'Fees',      color: C.orange,  bg: C.orange },
            { id: '3', icon: 'chatbubble-outline',  label: 'Chat',    screen: 'Chat',      color: '#7B61FF', bg: '#7B61FF' },
            { id: '4', icon: 'stats-chart-outline', label: 'Scores',  screen: 'ExamScores', color: C.pink,   bg: C.pink },
          ]}
          keyExtractor={(item) => item.id}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          renderItem={({ item }) => (
            <ParticleWrapper particleCount={14} size="small" colors={['#FFD700', '#FFA500', '#FFFFFF']}>
              <TouchableOpacity
                style={[st.actionChip, { backgroundColor: item.bg }]}
                onPress={() => {
                  // UNCHANGED — navigation logic
                  if (item.screen === 'ExamScores') navigation.navigate('Scores', { screen: 'ExamScoresMain' });
                  else navigation.navigate(item.screen);
                }}
              >
                <View style={[st.actionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                  <Ionicons name={item.icon} size={22} color={C.white} />
                </View>
                <Text style={[st.actionLabel, { color: C.white }]}>{item.label}</Text>
              </TouchableOpacity>
            </ParticleWrapper>
          )}
        />
      </Animated.View>

      {/* CHANGED — Leaderboard card (UNCHANGED — data rendering) */}
      {topPerformers.length > 0 && (
        <Animated.View style={a4}>
          <SectionCard
            icon="🏆"
            title="Weekly Top Performers"
            color={C.orange}
            onPress={() => navigation.navigate('TopPerformers')}
          >
            {topPerformers.map((entry, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <View key={idx} style={st.leaderRow}>
                  <Text style={st.medal}>{medals[idx]}</Text>
                  <Text style={st.leaderName}>{entry._id?.name || 'Student'}</Text>
                  <Text style={[st.leaderScore, { color: C.orange }]}>{entry.totalScore} pts</Text>
                </View>
              );
            })}
            <ParticleWrapper particleCount={14} size="small">
            <TouchableOpacity style={st.viewAllBtn} onPress={() => navigation.navigate('TopPerformers')}>
              <Text style={st.viewAllText}>View Weekly Top Performers →</Text>
            </TouchableOpacity>
            </ParticleWrapper>
          </SectionCard>
        </Animated.View>
      )}

      {/* CHANGED — Announcements card (UNCHANGED — data rendering) */}
      {announcements.length > 0 && (
        <Animated.View style={[a4, { paddingHorizontal: 16, marginBottom: 14 }]}>
          <Text style={st.sectionTitle}>📢 Announcements</Text>
          {announcements.map((ann) => (
            <View key={ann._id} style={st.annCard}>
              {ann.isPinned && <Ionicons name="pin" size={13} color={C.orange} />}
              <Text style={st.annTitle}>{ann.title}</Text>
              <Text style={st.annBody} numberOfLines={2}>{ann.content}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F5F3FF' },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  // CHANGED — header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCircle:{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE8FF', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 24 },
  greeting:    { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  gradeText:   { fontSize: 12, color: '#888', marginTop: 2 },
  aiCircle:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF9EF', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#F5A623' + '40' },
  bellCircle:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.error, position: 'absolute', top: 6, right: 6 },

  // CHANGED — streak pill
  streakPill:  { alignSelf: 'flex-start', backgroundColor: '#FFF9EF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginTop: 14, borderWidth: 1.5, borderColor: '#F5A623' + '60' },
  streakText:  { fontSize: 13, fontWeight: '700', color: '#F5A623' },

  // CHANGED — purple level card
  levelCardWrap:{ marginHorizontal: 12, marginTop: 14 },
  levelCard:    { borderRadius: 24, padding: 22, overflow: 'hidden' },
  levelTitle:   { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  levelSub:     { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  progressBg:   { height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, position: 'relative' },
  progressFill: { height: 10, borderRadius: 10, position: 'absolute', top: 0, left: 0 },
  progressThumb:{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', position: 'absolute', top: -5, shadowColor: C.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
  progressLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 14, fontWeight: '700' },

  // CHANGED — category scroll
  categoriesRow:{ paddingHorizontal: 16, gap: 16, paddingVertical: 18 },
  catItem:      { alignItems: 'center', gap: 8 },
  catCircle:    { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(123,97,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  catCircleActive:{ backgroundColor: '#FF4FA3' },
  catLabel:     { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },

  // CHANGED — section cards
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 24, marginHorizontal: 12, marginBottom: 16,
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 6, overflow: 'hidden',
  },
  sectionCardHeader:{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, gap: 12 },
  sectionIconWrap:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionCardTitle: { flex: 1, fontSize: 18, color: '#1A1A2E' },
  arrowBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: '#14B8A6', justifyContent: 'center', alignItems: 'center' },
  featDesc:         { fontSize: 13, color: '#666', lineHeight: 20, paddingHorizontal: 20, paddingBottom: 20, maxWidth: '80%' },

  // CHANGED — class card inner
  classRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  classDot:    { width: 10, height: 10, borderRadius: 5 },
  classTitle:  { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  classTeacher:{ fontSize: 13, color: '#888', marginTop: 2 },
  classTime:   { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  liveChip:    { backgroundColor: 'rgba(229,57,53,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  liveText:    { fontSize: 11, fontWeight: '700', color: C.error },
  emptyRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  emptyText:   { fontSize: 14, color: '#888' },

  // CHANGED — quick actions
  sectionTitle:{ fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  actionChip:  { width: 100, borderRadius: 18, padding: 14, alignItems: 'center', gap: 10 },
  actionIcon:  { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700' },

  // CHANGED — leaderboard
  leaderRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, gap: 10 },
  medal:       { fontSize: 20, width: 32 },
  leaderName:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  leaderScore: { fontSize: 14, fontWeight: '700' },
  viewAllBtn:  { marginTop: 6, marginBottom: 16, marginHorizontal: 18, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: '#F5A623' + '55' },
  viewAllText: { fontSize: 12, fontWeight: '800', color: C.orange },

  // CHANGED — announcements
  annCard:     { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#7B61FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  annTitle:    { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  annBody:     { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 19 },
});


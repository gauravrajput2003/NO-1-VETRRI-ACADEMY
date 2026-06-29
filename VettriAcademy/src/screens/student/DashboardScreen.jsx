import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator,
  Animated, Easing, StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { formatScheduledTime } from '../../utils/formatters';
import { fetchTodayClasses, fetchUpcomingClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getStudentDashboardAPI, getActiveAnnouncementsAPI } from '../../services/api';
import { Colors } from '../../utils/colors'; // ← adjust path to wherever your colors.js lives
import {
  CalendarCheckIcon, DocCheckIcon, StarBadgeIcon, TrophyIcon,
  Sparkle, LeafCluster, SunCharacter, PaperPlane, DottedPath,
} from './BadgeIcons';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — derived entirely from Colors (theme/colors.js). No hardcoding.
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  pageBg:      Colors.offWhite,
  cardBg:      Colors.white,
  cardBorder:  Colors.cardTeal,

  pink:        Colors.pink,
  pinkLight:   Colors.primaryLight,
  pinkDark:    Colors.primaryDark,
  pinkFaint:   Colors.cardPink,
  pinkGrad:    Colors.gradient.pink,

  teal:        Colors.teal,
  tealLight:   Colors.lightTeal,
  tealDark:    Colors.tealdark,
  tealFaint:   Colors.cardTeal,
  tealGrad:    Colors.gradient.teal,

  golden:      Colors.gold,
  goldenDark:  Colors.warning,
  goldenFaint: Colors.cardGold,
  silver:      Colors.mediumGray,
  bronze:      Colors.warning,

  white:       Colors.white,
  offWhite:    Colors.text.light,
  muted:       Colors.textSecondary.light,
  mutedMore:   Colors.gray,

  divider:     Colors.border.light,
};

const CATEGORIES = [
  { id:'1', label:'Lessons',    emoji:'📚', screen:'Materials',  color: D.pink   },
  { id:'2', label:'Classes',    emoji:'🎓', screen:'Classes',    color: D.teal   },
  { id:'3', label:'Scores',     emoji:'📊', screen:'ExamScores', color: D.golden },
  { id:'4', label:'Attendance', emoji:'📅', screen:'Attendance', color: D.pink   },
  { id:'5', label:'Discuss',    emoji:'💬', screen:'Discuss',    color: D.teal   },
];

// ─── PulseRing (live dot) ─────────────────────────────────────────────────────
function PulseRing({ color }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 2.6, duration: 900, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: 14, height: 14, borderRadius: 7,
      backgroundColor: color,
      transform: [{ scale }], opacity,
    }} />
  );
}

// ─── StatCard — solid gradient tile, white circular icon badge, big number, label ──
function StatCard({ icon, value, label, gradientColors }) {
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.statCard}>
      <Sparkle size={11} color="#FFFFFF" opacity={0.55} style={{ position: 'absolute', top: 10, left: 12 }} />
      <Sparkle size={9}  color="#FFFFFF" opacity={0.45} style={{ position: 'absolute', top: 16, right: 16 }} />
      <View style={st.statIconWrap}>{icon}</View>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </LinearGradient>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ label, onSeeAll, accentEmoji }) {
  return (
    <View style={st.secHeader}>
      <Text style={st.secTitle}>{label}{accentEmoji ? `  ${accentEmoji}` : ''}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={st.seeAllBtn} activeOpacity={0.7}>
          <Text style={st.secSeeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={D.pink} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}


export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user }         = useSelector((s) => s.auth);
  const { todayClasses } = useSelector((s) => s.classes);
  const { unreadCount }  = useSelector((s) => s.notifications);
  const bottomPadding    = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const [dashboard,      setDashboard]     = useState(null);
  const [announcements,  setAnnouncements] = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [refreshing,     setRefreshing]    = useState(false);
  const [activeCategory, setActiveCategory] = useState('1');

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
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const dashboardLevel    = dashboard?.level ?? dashboard?.currentLevel ?? user?.level ?? 1;
  const dashboardPoints   = dashboard?.points ?? dashboard?.xp ?? dashboard?.totalPoints ?? user?.points ?? 0;
  const levelProgress     = dashboard?.progress ?? dashboard?.xpProgress ?? 55;

  // Progress bar
  const progressW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressW, {
      toValue: Number(levelProgress) || 55, duration: 1100, delay: 500,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [levelProgress, progressW]);
  const progressPct = {
    width: progressW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
  };

  // Stagger entrance
  const anims = [0,1,2,3,4].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    Animated.stagger(65, anims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true })
    )).start();
  }, []);
  const slide = (a) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }],
  });

  if (loading) {
    return (
      <View style={{ flex:1, backgroundColor: D.pageBg, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color={D.pink} />
        <Text style={{ marginTop: 14, fontSize: 14, fontWeight: '600', color: D.muted }}>
          Loading your dashboard…
        </Text>
      </View>
    );
  }

  const todayClass        = dashboard?.todayClass || todayClasses?.[0];
  const scores            = dashboard?.recentScores || [];
  const leaderboard       = dashboard?.leaderboard || [];
  const attendanceSummary = dashboard?.attendanceSummary || [];
  const presentCount      = attendanceSummary.find((a) => a._id === 'present')?.count || 0;
  const totalAtt          = attendanceSummary.reduce((s, a) => s + a.count, 0);
  const attendancePct     = totalAtt > 0 ? ((presentCount / totalAtt) * 100).toFixed(0) : 0;
  const topPerformers     = leaderboard.slice(0, 5);
  const firstName         = user?.name?.split(' ')[0] || 'Student';
  const xpCurrent         = dashboard?.currentXp ?? dashboard?.xp ?? Math.round(Number(levelProgress));
  const xpTarget          = dashboard?.nextLevelXp ?? dashboard?.xpTarget ?? 100;
  const materialsCount    = dashboard?.materialsCount ?? dashboard?.studyMaterialsCount ?? dashboard?.materialCount;
  const loginStreak       = user?.loginStreak ?? dashboard?.loginStreak ?? 0;
  const lessonsCompleted  = dashboard?.lessonsCompleted ?? scores.length;
  const leaderboardRank   = dashboard?.myRank ?? dashboard?.rank ?? null;
  const quizBestScore     = dashboard?.quizBestScore ?? dashboard?.bestQuizScore ?? null;

  const achievements = [
    {
      image: require('../../../assets/rocket.png'),
      title: 'Goal Getter',
      subtitle: 'Complete 5 lessons',
      achieved: lessonsCompleted >= 5,
    },
    {
      image: require('../../../assets/streakk.png'),
      title: 'Streak Master',
      subtitle: `${Math.max(loginStreak, 3)} day streak`,
      achieved: loginStreak >= 3,
    },
    {
      image: require('../../../assets/cup.png'),
      title: 'Top Performer',
      subtitle: leaderboardRank ? `Top ${leaderboardRank} in class` : 'Top 10 in class',
      achieved: !!leaderboardRank && leaderboardRank <= 10,
    },
    {
      image: require('../../../assets/book_quiz.png'),
      title: 'Quiz Master',
      subtitle: quizBestScore ? `Score ${quizBestScore}%+` : 'Score 90%+',
      achieved: !!quizBestScore && quizBestScore >= 90,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: D.pageBg }}>
      <StatusBar barStyle="light-content" backgroundColor="#FF5C93" />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[D.pink]} tintColor={D.pink} />}
        showsVerticalScrollIndicator={false}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding + 5 }}
      >

        {/* HERO — gradient background + glass cards + Learning Champion card */}
        <Animated.View style={[st.heroOuter, slide(anims[0])]}>
          <LinearGradient
            colors={['#FF5C93', '#FF7EB3', '#12C7C4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={st.heroGradient}
          >
            <View style={st.heroCircle1} />
            <View style={st.heroCircle2} />
            <View style={st.heroCircle3} />
            <View style={st.heroStar1}>
              <Ionicons name="star" size={18} color="rgba(255,255,255,0.12)" />
            </View>
            <View style={st.heroStar2}>
              <Ionicons name="star" size={14} color="rgba(255,255,255,0.10)" />
            </View>
            <View style={st.heroSpark1}>
              <Sparkle size={14} color="#FFFFFF" opacity={0.12} />
            </View>
            <View style={st.heroSpark2}>
              <Sparkle size={12} color="#FFFFFF" opacity={0.10} />
            </View>
            <View style={st.heroConfetti}>
              <View style={[st.confettiDot, { left: 4, top: 2, backgroundColor: 'rgba(255,255,255,0.14)' }]} />
              <View style={[st.confettiDot, { left: 18, top: 8, backgroundColor: 'rgba(255,255,255,0.10)' }]} />
              <View style={[st.confettiDot, { left: 10, top: 18, backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              <View style={[st.confettiDot, { left: 28, top: 14, backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            </View>
          </LinearGradient>

          <View style={st.heroContent}>
            <View style={st.heroTopBar}>
              <View style={st.heroLeft}>
                <View style={st.avatarGlow}>
                  <View style={st.avatarCore}>
                    <Image
                      source={{
                        uri:
                          user?.profilePicture ||
                          `https://api.dicebear.com/7.x/adventurer/png?seed=${user?._id}`,
                      }}
                      style={st.avatarImage}
                    />
                    <View style={st.avatarBadge}>
                      <Text style={st.avatarBadgeText}>★</Text>
                    </View>
                  </View>
                </View>
                <View style={st.heroCopyWrap}>
                  <Text style={st.helloText}>Hello, {firstName}! 👋</Text>
                  <Text style={st.gradeText}>
                    {user?.grade ? `Grade ${user.grade}` : 'Learning journey'}
                    {user?.board ? ` · ${user.board}` : ''}
                  </Text>
                </View>
              </View>

              <View style={st.heroRight}>
                <TouchableOpacity style={st.aiBtn} onPress={() => dispatch(toggleAI())} activeOpacity={0.9}>
                  <Ionicons name="sparkles" size={20} color={D.pink} />
                </TouchableOpacity>
                <TouchableOpacity style={st.notifBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.9}>
                  <Ionicons name="notifications-outline" size={20} color={D.offWhite} />
                  {unreadCount > 0 && (
                    <View style={st.notifBadge}>
                      <Text style={st.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={st.heroPillsRow}>
              <View style={st.heroMiniPill}>
                <Text style={st.heroMiniEmoji}>🔥</Text>
                <Text style={st.heroMiniValue} numberOfLines={1}>{loginStreak || 1} Day Streak</Text>
              </View>
              <View style={st.heroMiniPill}>
                <Text style={st.heroMiniEmoji}>⭐</Text>
                <Text style={st.heroMiniValue} numberOfLines={1}>{dashboardPoints} Points</Text>
              </View>
              <View style={st.heroMiniPill}>
                <Text style={st.heroMiniEmoji}>🎯</Text>
                <Text style={st.heroMiniValue} numberOfLines={1}>Level {dashboardLevel}</Text>
              </View>
            </View>

            <View style={st.learningCardWrap}>
              <View style={st.learningCard}>
                <View style={st.learningCardInner}>
                  <View style={st.levelBadge}>
                    <Text style={st.levelBadgeText}>LEVEL {dashboardLevel}</Text>
                  </View>
                  <Text style={st.levelHeading}>Learning Champion</Text>
                  <Text style={st.levelCaption}>{levelProgress}% to next level</Text>

                  <View style={st.progressTrack}>
                    <Animated.View style={[st.progressFillWrap, progressPct]}>
                      <LinearGradient
                        colors={[D.pink, D.pinkDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                    <Animated.View style={[st.progressKnob, {
                      left: progressW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '97%'] }),
                    }]} />
                  </View>
                  <View style={st.progressLabels}>
                    <Text style={[st.progressLabelText, st.progressLabelCurrent]}>{xpCurrent} XP</Text>
                    <Text style={st.progressLabelText}>{xpTarget} XP</Text>
                  </View>
                </View>

                <View style={st.trophyWrap}>
                  <View style={st.trophyConfettiTop}>
                    <Sparkle size={14} color={D.golden} opacity={0.95} />
                  </View>
                  <View style={st.trophyConfettiLeft}>
                    <Sparkle size={11} color={D.golden} opacity={0.9} />
                    <Sparkle size={9} color={D.pink} opacity={0.85} style={{ marginTop: 6, marginLeft: 8 }} />
                  </View>
                  <View style={st.trophyConfettiRight}>
                    <Sparkle size={10} color={D.golden} opacity={0.8} />
                  </View>
                  <View style={st.trophyGraphicWrap}>
                    <TrophyIcon size={96} />
                  </View>
                  <View style={st.trophyLeaves}>
                    <LeafCluster width={82} height={68} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

       
        <Animated.View style={[st.statRow, slide(anims[1])]}>
          <StatCard
            icon={<CalendarCheckIcon size={22} color="#FFFFFF" />}
            value={`${attendancePct}%`}
            label="Attendance"
            gradientColors={[D.tealDark, D.teal]}
          />
          <StatCard
            icon={<DocCheckIcon size={22} color="#FFFFFF" />}
            value={scores.length || '0'}
            label="Tests Done"
            gradientColors={[D.pinkDark, D.pink]}
          />
          <StatCard
            icon={<StarBadgeIcon size={22} color="#FFFFFF" />}
            value={presentCount}
            label="Days Present"
            gradientColors={[D.goldenDark, D.golden]}
          />
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════
            EXPLORE — pill row, active pill = pink outline + pink-tinted bg
            (matches reference Image 2: "Lessons" active in pink, rest white/grey)
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View style={slide(anims[1])}>
          <SectionHeader label="Explore" onSeeAll={() => {}} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catScroll}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    st.catChip,
                    active
                      ? { backgroundColor: cat.color + '14', borderColor: cat.color }
                      : { backgroundColor: D.cardBg, borderColor: D.divider },
                  ]}
                  onPress={() => {
                    setActiveCategory(cat.id);
                    if (cat.screen === 'ExamScores') navigation.navigate('Scores', { screen: 'ExamScoresMain' });
                    else navigation.navigate(cat.screen);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                  <Text style={[st.catLabel, { color: active ? cat.color : D.offWhite }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ACHIEVEMENTS — PNG badge cards, horizontal scroll */}
        <Animated.View style={slide(anims[1])}>
          <SectionHeader label="Achievements" accentEmoji="✨" />
          <View style={st.achievementSection}>
            <Text style={st.achievementDeco1}>✨</Text>
            <Text style={st.achievementDeco2}>⭐</Text>
            <Text style={st.achievementDeco3}>✨</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.achievementScroll}>
              {achievements.map((item) => (
                <View key={item.title} style={st.achievementCard}>
                  <Image source={item.image} style={st.achievementBadge} resizeMode="contain" />
                  <Text style={st.achievementTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={st.achievementSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════════
            TODAY'S CLASS — matches reference Image 2 empty state exactly:
            mint/teal gradient card, cute sun character, headline + sub,
            dotted flight path + paper plane decoration on the right
        ════════════════════════════════════════════════════════════════ */}
        <Animated.View style={slide(anims[2])}>
          <SectionHeader label="Today's Class" onSeeAll={() => navigation.navigate('Classes')} />
          <LinearGradient colors={[D.tealFaint, '#F2FFFC']} style={[st.card, st.todayCard]}>
            {todayClass ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('ClassDetail', { classId: todayClass._id })}
                style={st.classRow}
                activeOpacity={0.8}
              >
                <View style={[st.todayIllustrationWrap, { backgroundColor: todayClass.status === 'live' ? D.pinkFaint : D.tealFaint }]}>
                  <Text style={st.todayIllustration}>☀️</Text>
                </View>

                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <Text style={st.todayEyebrow}>{todayClass.status === 'live' ? 'Live right now' : 'Scheduled today'}</Text>
                  <Text style={st.classTitle}>{todayClass.subject || todayClass.title}</Text>
                  <Text style={st.classTeacher}>
                    {todayClass.teacher?.name || todayClass.teacherId?.name || 'Teacher'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={st.classTime}>{formatScheduledTime(todayClass.scheduledTime)}</Text>
                  {todayClass.status === 'live' ? (
                    <View style={st.livePill}>
                      <View style={st.liveDot} />
                      <PulseRing color={D.pink} />
                      <Text style={st.livePillText}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={[st.livePill, { backgroundColor: D.tealFaint, borderColor: D.teal + '40' }]}>
                      <Text style={[st.livePillText, { color: D.teal }]}>Upcoming</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View style={st.emptyStateRow}>
                <SunCharacter size={64} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={st.emptyEyebrow}>Today's Class</Text>
                  <Text style={st.emptyTitle}>All clear today! 🎉</Text>
                  <Text style={st.emptySub}>No classes scheduled</Text>
                  <Text style={st.emptySubLight}>Enjoy your day! 🌈</Text>
                </View>
                <View style={st.emptyDecoWrap}>
                  <DottedPath width={64} height={20} color={D.teal} />
                  <View style={{ alignSelf: 'flex-end', marginTop: -4 }}>
                    <PaperPlane size={26} color={D.teal} />
                  </View>
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* LESSONS */}
        <Animated.View style={slide(anims[2])}>
          <SectionHeader label="Lessons" onSeeAll={() => navigation.navigate('Materials')} />
          <ParticleWrapper particleCount={18} size="small" colors={[D.pinkLight, '#FFF', D.tealLight]}>
            <TouchableOpacity onPress={() => navigation.navigate('Materials')} activeOpacity={0.88}>
              <LinearGradient
                colors={[D.pink, D.pinkLight, D.teal]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={st.lessonCard}
              >
                <View style={st.lessonIllustrationWrap}>
                  <Text style={st.lessonIllustration}>📚</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.lessonTitle}>Study Materials</Text>
                  <Text style={st.lessonSub}>{typeof materialsCount === 'number' ? `${materialsCount} materials available` : 'Materials available'}</Text>
                </View>
                <View style={st.lessonArrow}>
                  <Text style={st.lessonArrowText}>Browse</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </ParticleWrapper>
        </Animated.View>

        {/* QUICK ACTIONS — premium gradient feature cards */}
        <Animated.View style={slide(anims[2])}>
          <SectionHeader label="Quick Actions" />
          <View style={st.quickRow}>
            <TouchableOpacity
              style={st.quickCardWrap}
              onPress={() => navigation.navigate('Discuss')}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#14C8C4', '#6EE7E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.quickGradientCard}
              >
                <View style={st.quickBubble1} />
                <View style={st.quickBubble2} />
                <View style={st.quickBubble3} />
                <View style={st.quickIconGlass}>
                  <Ionicons name="chatbubbles" size={34} color={D.white} />
                </View>
                <Text style={st.quickGradientLabel}>Discuss</Text>
                <Text style={st.quickGradientSub}>Join class chat</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.quickCardWrap}
              onPress={() => navigation.navigate('Fees')}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#FF4D8D', '#FF7EB3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.quickGradientCard}
              >
                <View style={st.quickCoin1} />
                <View style={st.quickCoin2} />
                <View style={st.quickCoin3} />
                <View style={st.quickIconGlass}>
                  <Ionicons name="wallet" size={34} color={D.white} />
                </View>
                <Text style={st.quickGradientLabel}>Fees</Text>
                <Text style={st.quickGradientSub}>View payments</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* LEADERBOARD */}
        {topPerformers.length > 0 && (
          <Animated.View style={slide(anims[3])}>
            <SectionHeader label="Weekly Champions" onSeeAll={() => navigation.navigate('TopPerformers')} />
            <View style={st.card}>
              <LinearGradient
                colors={[D.goldenFaint, 'rgba(255,255,255,0.2)', 'transparent']}
                style={st.podiumStrip}
              >
                <Text style={st.podiumText}>🏅 This week's top performers</Text>
              </LinearGradient>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.leaderScroll}>
                {topPerformers.map((entry, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4', '5'];
                  const rankBg = idx === 0 ? [D.golden, D.goldenFaint] : idx === 1 ? [D.cardBg, D.silver] : idx === 2 ? [D.goldenFaint, D.bronze] : [D.cardBg, D.pageBg];
                  const rankBorder = idx === 0 ? D.golden + '55' : idx === 1 ? D.silver + '40' : idx === 2 ? D.bronze + '40' : D.cardBorder;
                  return (
                    <LinearGradient key={idx} colors={rankBg} style={[st.leaderCard, { borderColor: rankBorder }]}>
                      <View style={st.leaderTopRow}>
                        <Text style={st.leaderMedal}>{medals[idx] || '•'}</Text>
                        <View style={st.leaderAvatar}>
                          <Text style={st.leaderAvatarText}>{(entry._id?.name || 'Student').split(' ').map((part) => part[0]).slice(0, 2).join('')}</Text>
                        </View>
                      </View>
                      <Text style={st.leaderName} numberOfLines={1}>{entry._id?.name || 'Student'}</Text>
                      <View style={st.scoreBadgeWrap}>
                        <Text style={st.scoreBadgeText}>{entry.totalScore ?? 0} pts</Text>
                      </View>
                    </LinearGradient>
                  );
                })}
              </ScrollView>

              <TouchableOpacity onPress={() => navigation.navigate('TopPerformers')} style={st.viewAllRow}>
                <Text style={st.viewAllText}>See full leaderboard</Text>
                <Ionicons name="arrow-forward" size={14} color={D.pink} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ANNOUNCEMENTS */}
        {announcements.length > 0 && (
          <Animated.View style={slide(anims[4])}>
            <SectionHeader label="Announcements" />
            {announcements.map((ann, i) => {
              const stylesByIndex = [
                { icon: 'megaphone-outline', color: D.pink, bg: D.pinkFaint },
                { icon: 'chatbubble-ellipses-outline', color: D.teal, bg: D.tealFaint },
                { icon: 'sparkles-outline', color: D.goldenDark, bg: D.goldenFaint },
              ];
              const chosen = stylesByIndex[i % 3];
              const timeLabel = formatRelativeTime(ann.createdAt || ann.updatedAt);
              const cardGrad = i % 3 === 0 ? [D.pinkFaint, D.cardBg] : i % 3 === 1 ? [D.tealFaint, D.cardBg] : [D.goldenFaint, D.cardBg];
              return (
                <LinearGradient
                  key={ann._id}
                  colors={cardGrad}
                  style={st.annCard}
                >
                  <View style={[st.annIconWrap, { backgroundColor: chosen.bg }]}>
                    <Ionicons name={chosen.icon} size={18} color={chosen.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={st.annTopRow}>
                      <Text style={st.annTitle} numberOfLines={1}>{ann.title}</Text>
                      <Text style={st.annTime}>{timeLabel}</Text>
                    </View>
                    <Text style={st.annBody} numberOfLines={2}>{ann.content}</Text>
                  </View>
                  {ann.isPinned && <Ionicons name="pin" size={13} color={D.goldenDark} style={st.annPin} />}
                </LinearGradient>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = 16; // side padding

const st = StyleSheet.create({
  heroOuter: {
    position: 'relative',
    overflow: 'visible',
    marginBottom: 4,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroContent: {
    paddingTop: 48,
    paddingHorizontal: S,
    paddingBottom: 8,
    zIndex: 1,
  },
  heroCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -70, right: -52,
  },
  heroCircle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.10)', top: 72, left: -34,
  },
  heroCircle3: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)', top: 22, right: 108,
  },
  heroStar1: { position: 'absolute', top: 42, right: 46, opacity: 0.12 },
  heroStar2: { position: 'absolute', top: 92, left: 40, opacity: 0.10 },
  heroSpark1: { position: 'absolute', top: 24, left: 112, opacity: 0.12 },
  heroSpark2: { position: 'absolute', top: 130, right: 104, opacity: 0.10 },
  heroConfetti: { position: 'absolute', top: 78, right: 18, width: 34, height: 26 },
  confettiDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  heroTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  heroRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  heroCopyWrap: { flexShrink: 1 },
  avatarGlow: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF2F6D', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 8,
  },
  avatarCore: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: D.white, justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'visible',
    borderWidth: 3, borderColor: D.white,
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarBadge: {
    position: 'absolute', right: -1, bottom: -1,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: D.golden, borderWidth: 2, borderColor: D.white,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarBadgeText: { fontSize: 9, lineHeight: 10, color: D.white, fontWeight: '900' },
  helloText: { fontSize: 20, fontWeight: '900', color: D.white, letterSpacing: -0.4 },
  gradeText: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 3, fontWeight: '600' },
  aiBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: D.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 4,
  },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: D.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 4,
  },
  notifBadge: {
    position: 'absolute', top: 3, right: 3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: D.white,
  },
  notifBadgeText: { fontSize: 8, fontWeight: '900', color: D.white },
  heroPillsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  heroMiniPill: {
    flex: 1, height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, borderRadius: 18,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  heroMiniEmoji: { fontSize: 16 },
  heroMiniValue: { fontSize: 11, fontWeight: '800', color: D.white, flexShrink: 1 },

  // ── LEVEL / PROGRESS CARD (inside hero) ──
  learningCardWrap: { marginTop: 16 },
  learningCard: {
    backgroundColor: D.white, borderRadius: 28,
    paddingVertical: 18, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    minHeight: 170,
    shadowColor: '#B63B6B', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28, shadowRadius: 28, elevation: 10,
    overflow: 'visible', position: 'relative',
  },
  learningCardInner: { flex: 1, paddingRight: 4, justifyContent: 'center' },
  levelBadge: {
    alignSelf: 'flex-start', backgroundColor: D.pinkFaint,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6,
  },
  levelBadgeText: { fontSize: 10, fontWeight: '900', color: D.pink, letterSpacing: 1.4 },
  levelHeading: { fontSize: 22, fontWeight: '900', color: D.offWhite, marginBottom: 3, letterSpacing: -0.5 },
  levelCaption: { fontSize: 12, color: D.muted, fontWeight: '600', marginBottom: 12 },
  progressTrack: { height: 10, backgroundColor: '#ECEEF2', borderRadius: 10, overflow: 'visible' },
  progressFillWrap: {
    position: 'absolute', top: 0, left: 0, height: 10, borderRadius: 10, overflow: 'hidden',
  },
  progressKnob: {
    position: 'absolute', top: -4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: D.pink, borderWidth: 3, borderColor: D.white,
    shadowColor: D.pinkDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabelText: { fontSize: 11, color: D.mutedMore, fontWeight: '700' },
  progressLabelCurrent: { color: D.pink, fontWeight: '800' },
  trophyWrap: { width: 120, height: 130, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  trophyGraphicWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  trophyConfettiTop: { position: 'absolute', top: 0, right: 18, zIndex: 3 },
  trophyConfettiLeft: { position: 'absolute', left: 0, top: 16, zIndex: 3 },
  trophyConfettiRight: { position: 'absolute', right: 4, top: 36, zIndex: 3 },
  trophyLeaves: { position: 'absolute', right: -6, bottom: -4, opacity: 0.95, zIndex: 1 },

  // ── STATS — solid gradient tiles, circular icon badge ──
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: S, marginTop: 12, marginBottom: 6 },
  statCard: {
    flex: 1, borderRadius: 22, paddingVertical: 20, paddingHorizontal: 8,
    alignItems: 'center', gap: 8, overflow: 'hidden', position: 'relative',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 6,
  },
  statIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.24)' },
  statValue: { fontSize: 26, fontWeight: '900', color: D.white },
  statLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.92)', textAlign: 'center' },

  // ── SECTION HEADER ──
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S, marginTop: 22, marginBottom: 10 },
  secTitle: { fontSize: 17, fontWeight: '900', color: D.offWhite },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  secSeeAll: { fontSize: 13, fontWeight: '700', color: D.pink },

  // ── EXPLORE chips ──
  catScroll: { paddingHorizontal: S, gap: 10, paddingBottom: 2 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5 },
  catLabel: { fontSize: 13, fontWeight: '800' },

  // ── ACHIEVEMENTS — PNG badge cards ──
  achievementSection: { position: 'relative', marginBottom: 4 },
  achievementDeco1: { position: 'absolute', top: 8, right: 28, fontSize: 16, opacity: 0.35, zIndex: 1 },
  achievementDeco2: { position: 'absolute', top: 52, left: 8, fontSize: 14, opacity: 0.28, zIndex: 1 },
  achievementDeco3: { position: 'absolute', bottom: 12, right: 64, fontSize: 12, opacity: 0.22, zIndex: 1 },
  achievementScroll: { paddingHorizontal: S, gap: 12, paddingBottom: 6, paddingTop: 4 },
  achievementCard: {
    width: 140,
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  achievementBadge: { width: 72, height: 72, marginBottom: 8 },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
  achievementSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── GENERIC CARD ──
  card: { marginHorizontal: S, borderRadius: 22, backgroundColor: D.cardBg, borderWidth: 1, borderColor: D.cardBorder, overflow: 'hidden', shadowColor: D.pinkDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  todayCard: { backgroundColor: 'transparent' },
  classRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  todayIllustrationWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  todayIllustration: { fontSize: 28 },
  todayEyebrow: { fontSize: 11, fontWeight: '900', color: D.pink, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  classTitle: { fontSize: 16, fontWeight: '900', color: D.offWhite },
  classTeacher: { fontSize: 13, color: D.muted, marginTop: 3, fontWeight: '600' },
  classTime: { fontSize: 14, fontWeight: '800', color: D.offWhite },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: D.pinkFaint, borderWidth: 1, borderColor: D.pink + '40' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: D.pink, zIndex: 1 },
  livePillText: { fontSize: 11, fontWeight: '900', color: D.pink },

  // ── EMPTY STATE — Today's Class (matches reference Image 2: sun + plane) ──
  emptyStateRow: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  emptyDecoWrap: { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  emptyEyebrow: { fontSize: 11, fontWeight: '800', color: D.teal, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: D.offWhite },
  emptySub: { fontSize: 13, color: D.muted, marginTop: 3, fontWeight: '600' },
  emptySubLight: { fontSize: 13, color: D.tealDark, marginTop: 2, fontWeight: '700' },

  // ── LESSONS ──
  lessonCard: { marginHorizontal: S, borderRadius: 24, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14, height: 110, shadowColor: D.pinkDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  lessonIllustrationWrap: { width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.20)', justifyContent: 'center', alignItems: 'center' },
  lessonIllustration: { fontSize: 30 },
  lessonTitle: { fontSize: 18, fontWeight: '900', color: D.white },
  lessonSub: { fontSize: 13, color: 'rgba(255,255,255,0.84)', marginTop: 4, fontWeight: '600' },
  lessonArrow: { width: 90, height: 42, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  lessonArrowText: { fontSize: 12, fontWeight: '900', color: D.white },

  // ── QUICK ACTIONS — premium gradient cards ──
  quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: S },
  quickCardWrap: { flex: 1 },
  quickGradientCard: {
    height: 130,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  quickIconGlass: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  quickGradientLabel: { fontSize: 16, fontWeight: '900', color: D.white, zIndex: 2 },
  quickGradientSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginTop: 3, zIndex: 2 },
  quickBubble1: {
    position: 'absolute', top: 12, right: 14,
    width: 36, height: 24, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  quickBubble2: {
    position: 'absolute', top: 28, left: 10,
    width: 28, height: 20, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  quickBubble3: {
    position: 'absolute', bottom: 16, right: 20,
    width: 22, height: 16, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quickCoin1: {
    position: 'absolute', top: 14, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  quickCoin2: {
    position: 'absolute', top: 36, left: 12,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  quickCoin3: {
    position: 'absolute', bottom: 18, right: 24,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // ── LEADERBOARD ──
  podiumStrip: { paddingHorizontal: 18, paddingVertical: 12 },
  podiumText: { fontSize: 13, fontWeight: '800', color: D.goldenDark },
  leaderScroll: { paddingHorizontal: 14, paddingBottom: 2, gap: 10 },
  leaderCard: { width: 136, borderRadius: 24, padding: 14, marginHorizontal: 6, borderWidth: 1, shadowColor: D.pinkDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  leaderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  leaderMedal: { fontSize: 22 },
  leaderAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  leaderAvatarText: { fontSize: 13, fontWeight: '900', color: D.offWhite },
  leaderName: { fontSize: 14, fontWeight: '900', color: D.offWhite, marginBottom: 12 },
  scoreBadgeWrap: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.74)' },
  scoreBadgeText: { fontSize: 12, fontWeight: '900', color: D.offWhite },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: D.divider },
  viewAllText: { fontSize: 14, fontWeight: '800', color: D.pink },

  // ── ANNOUNCEMENTS ──
  annCard: { marginHorizontal: S, borderRadius: 24, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: D.pinkDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 3 },
  annIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  annTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  annTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: D.offWhite },
  annTime: { fontSize: 11, fontWeight: '800', color: D.mutedMore },
  annBody: { fontSize: 13, color: D.muted, lineHeight: 20, fontWeight: '500' },
  annPin: { marginLeft: 2, marginTop: 2 },
});
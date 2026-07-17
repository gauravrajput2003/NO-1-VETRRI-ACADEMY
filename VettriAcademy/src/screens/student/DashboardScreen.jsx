import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator,
  Animated, Easing, StatusBar, Dimensions
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { formatScheduledTime } from '../../utils/formatters';
import { fetchTodayClasses, fetchUpcomingClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { getStudentDashboardAPI, getActiveAnnouncementsAPI } from '../../services/api';
import { Colors } from '../../utils/colors';
import { Sparkle, SunCharacter, DottedPath, PaperPlane } from './BadgeIcons';

const { width } = Dimensions.get('window');

// ---- BRAND PALETTE: teal + pink + golden + white ----
const D = {
  pageBg: '#FFF9FB',
  pink: '#FF4F8B',
  pinkDark: '#D63D73',
  pinkLight: '#FFE3EE',
  teal: '#14C8C4',
  tealDark: '#0C8E8B',
  tealLight: '#DDFBF9',
  golden: '#FFB800',
  goldenDark: '#B87F00',
  goldenLight: '#FFF3D2',
  white: '#FFFFFF',
  ink: '#1E2A3A',
  muted: Colors?.textSecondary?.light || '#64748B',
  mutedMore: Colors?.gray || '#94A3B8',
};

// Darkens a hex color by a fixed amount — used for the active Explore tile gradient
function shade(hex, amt = 28) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const b = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const CATEGORIES = [
  { id: '1', label: 'Lessons',    icon: 'book',        screen: 'Materials',  tint: D.pink   },
  { id: '2', label: 'Classes',    icon: 'school',       screen: 'Classes',    tint: D.teal   },
  { id: '3', label: 'Scores',     icon: 'bar-chart',    screen: 'ExamScores', tint: D.golden },
  { id: '4', label: 'Attendance', icon: 'calendar',     screen: 'Attendance', tint: D.teal   },
  { id: '5', label: 'Homework',   icon: 'create',       screen: 'Discuss',    tint: D.pink   },
  { id: '6', label: 'Library',    icon: 'library',      screen: 'Materials',  tint: D.golden },
];

function PulseRing({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.6, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: 14, height: 14, borderRadius: 7,
      backgroundColor: color, transform: [{ scale }], opacity,
    }} />
  );
}

const ScaleButton = ({ onPress, children, style, activeOpacity = 1 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity activeOpacity={activeOpacity} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

function SectionHeader({ label, onSeeAll, accentEmoji }) {
  return (
    <View style={st.secHeader}>
      <Text style={st.secTitle}>{label}{accentEmoji ? ` ${accentEmoji}` : ''}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={st.seeAllBtn} activeOpacity={0.7}>
          <Text style={st.secSeeAll}>See all</Text>
          <Ionicons name="chevron-forward" size={16} color={D.pink} />
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
  const { user } = useSelector((s) => s.auth);
  const { todayClasses } = useSelector((s) => s.classes);
  const { unreadCount } = useSelector((s) => s.notifications);
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const [dashboard, setDashboard] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const dashboardLevel = dashboard?.level ?? dashboard?.currentLevel ?? user?.level ?? 1;
  const dashboardPoints = dashboard?.points ?? dashboard?.xp ?? dashboard?.totalPoints ?? user?.points ?? 0;
  const levelProgress = dashboard?.progress ?? dashboard?.xpProgress ?? 55;

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

  const anims = Array(12).fill(0).map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    Animated.stagger(65, anims.map((a) =>
      Animated.timing(a, { toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true })
    )).start();
  }, []);
  const slide = (a) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: D.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={D.pink} />
        <Text style={{ marginTop: 14, fontSize: 15, fontWeight: '600', color: D.muted }}>Loading your dashboard...</Text>
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
  const topPerformers = leaderboard.slice(0, 5);
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const xpCurrent = dashboard?.currentXp ?? dashboard?.xp ?? Math.round(Number(levelProgress));
  const xpTarget = dashboard?.nextLevelXp ?? dashboard?.xpTarget ?? 100;
  const materialsCount = dashboard?.materialsCount ?? dashboard?.studyMaterialsCount ?? dashboard?.materialCount;
  const loginStreak = user?.loginStreak ?? dashboard?.loginStreak ?? 0;
  const leaderboardRank = dashboard?.myRank ?? dashboard?.rank ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: D.pageBg }}>
      <StatusBar barStyle="light-content" backgroundColor={D.pink} />

      <LinearGradient
        colors={[D.pageBg, '#FFFBF6', D.tealLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Subdued Blobs */}
      <View style={[st.blob, { top: 200, left: -100, backgroundColor: D.pink }]} />
      <View style={[st.blob, { top: 500, right: -100, backgroundColor: D.teal }]} />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[D.pink]} tintColor={D.pink} />}
        showsVerticalScrollIndicator={false}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding + 5 }}
      >
        {/* FULL-WIDTH HERO SECTION */}
        <Animated.View style={slide(anims[0])}>
          <LinearGradient
            colors={[D.pink, D.teal]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={st.heroGradient}
          >
            <View style={st.heroBubble1} />
            <View style={st.heroBubble2} />
            <View style={st.heroBubble3} />

            <View style={[st.heroTopActions, { top: insets.top + 10 }]}>
              <TouchableOpacity style={st.heroGlassBtn} onPress={() => dispatch(toggleAI())}>
                <Ionicons name="sparkles" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={st.heroGlassBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={st.notifBadge}>
                    <Text style={st.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={st.heroContentRow}>
              <View style={st.heroLeftText}>
                <Text style={st.heroGreeting}>Welcome back! 👋</Text>
                <Text style={st.heroName} numberOfLines={1}>{firstName}</Text>
                <View style={st.heroPill}>
                  <Text style={st.heroPillText}>{user?.grade ? `Grade ${user.grade}` : 'Learning journey'} • {user?.school || 'School'} • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
              </View>

              <View style={st.avatarContainer}>
                <View style={st.avatarGlow}>
                  <Image source={{ uri: user?.profilePicture || `https://api.dicebear.com/7.x/adventurer/png?seed=${user?._id}` }} style={st.avatarImg} />
                  <View style={st.onlineIndicator} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* LEARNING CHAMPION CARD (Golden + Pink, brand-aligned) */}
        <Animated.View style={slide(anims[1])}>
          <ScaleButton style={st.championCardWrap}>
            <LinearGradient colors={[D.goldenLight, '#FFD976']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.championCard}>
              <View style={st.championContent}>
                <View style={st.levelBadge}>
                  <Text style={st.levelBadgeText}>LEVEL {dashboardLevel}</Text>
                </View>
                <Text style={st.championTitle}>Learning Champion</Text>
                <Text style={st.championSubtitle}>{levelProgress}% to next level</Text>

                <View style={st.champProgressTrack}>
                  <Animated.View style={[st.champProgressFill, progressPct]}>
                    <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  </Animated.View>
                </View>
                <Text style={st.champPointsText}>{xpCurrent} / {xpTarget} XP</Text>
              </View>

              <View style={st.champImageWrap}>
                <Sparkle size={16} color={D.white} opacity={0.7} style={{ position: 'absolute', top: -5, right: 10 }} />
                <Sparkle size={11} color={D.white} opacity={0.7} style={{ position: 'absolute', bottom: 10, left: -10 }} />
                <Image source={require('../../../assets/cup.png')} style={st.champImage} resizeMode="contain" />
              </View>
            </LinearGradient>
          </ScaleButton>
        </Animated.View>

        {/* TODAY'S CLASS (Teal Gradient) */}
        <Animated.View style={slide(anims[2])}>
          <SectionHeader label="Today's Class" onSeeAll={() => navigation.navigate('Classes')} />
          <ScaleButton>
            <LinearGradient colors={[D.tealLight, D.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.scheduleCard}>
              {todayClass ? (
                <>
                  <View style={st.scheduleLeft}>
                    {todayClass.status === 'live' && (
                      <View style={st.liveBadge}>
                        <View style={st.liveDotRed} />
                        <PulseRing color="#FFFFFF" />
                        <Text style={st.liveBadgeText}>LIVE</Text>
                      </View>
                    )}
                    <Text style={st.scheduleSubject}>{todayClass.subject || todayClass.title}</Text>
                    <Text style={st.scheduleTeacher}>👨‍🏫 {todayClass.teacher?.name || todayClass.teacherId?.name || 'Teacher'}</Text>
                    <Text style={st.scheduleTime}>{formatScheduledTime(todayClass.scheduledTime)}</Text>
                    <View style={st.joinButton}>
                      <Text style={st.joinButtonText}>JOIN NOW</Text>
                    </View>
                  </View>
                  <Image source={require('../../../assets/classes.png')} style={st.scheduleImage} resizeMode="contain" />
                </>
              ) : (
                <View style={st.emptyStateRow}>
                  <Image source={require('../../../assets/classes.png')} style={st.scheduleImageEmpty} resizeMode="contain" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={st.emptyTitle}>All clear today! 🎉</Text>
                    <Text style={st.emptySub}>No classes scheduled</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </ScaleButton>
        </Animated.View>

        {/* STATS ROW — brand colors: teal / golden / pink */}
        <Animated.View style={[st.statsGrid, slide(anims[3])]}>
          <ScaleButton style={st.statCardContainer}>
            <LinearGradient colors={[D.tealLight, '#9CEEE9']} style={st.premiumStatCard}>
              <Ionicons name="trophy" size={20} color={D.tealDark} style={{ marginBottom: 6 }} />
              <Text style={[st.statValue3D, { color: D.tealDark }]}>#{leaderboardRank || 5}</Text>
              <Text style={[st.statLabel3D, { color: D.tealDark }]}>Rank</Text>
            </LinearGradient>
          </ScaleButton>
          <ScaleButton style={st.statCardContainer}>
            <LinearGradient colors={[D.goldenLight, '#FFD976']} style={st.premiumStatCard}>
              <Ionicons name="star" size={20} color={D.goldenDark} style={{ marginBottom: 6 }} />
              <Text style={[st.statValue3D, { color: D.goldenDark }]}>{dashboardPoints}</Text>
              <Text style={[st.statLabel3D, { color: D.goldenDark }]}>Points</Text>
            </LinearGradient>
          </ScaleButton>
          <ScaleButton style={st.statCardContainer}>
            <LinearGradient colors={[D.pinkLight, '#FFB3CB']} style={st.premiumStatCard}>
              <Ionicons name="flame" size={20} color={D.pinkDark} style={{ marginBottom: 6 }} />
              <Text style={[st.statValue3D, { color: D.pinkDark }]}>{loginStreak}</Text>
              <Text style={[st.statLabel3D, { color: D.pinkDark }]}>Streak</Text>
            </LinearGradient>
          </ScaleButton>
        </Animated.View>

        {/* EXPLORE — rebuilt as an icon-tile grid */}
        <Animated.View style={slide(anims[4])}>
          <SectionHeader label="Explore" />
          <View style={st.exploreGrid}>
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <ScaleButton
                  key={cat.id}
                  style={st.exploreTileWrap}
                  onPress={() => {
                    setActiveCategory(cat.id);
                    if (cat.screen === 'ExamScores') navigation.navigate('ExamScores');
                    else navigation.navigate(cat.screen);
                  }}
                >
                  {active ? (
                    <LinearGradient
                      colors={[cat.tint, shade(cat.tint)]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[st.exploreTile, { shadowColor: cat.tint, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7 }]}
                    >
                      <View style={[st.exploreIconCircle, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                        <Ionicons name={cat.icon} size={26} color={D.white} />
                      </View>
                      <Text style={[st.exploreTileLabel, { color: D.white }]} numberOfLines={1}>{cat.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[st.exploreTile, { backgroundColor: `${cat.tint}1F` }]}>
                      <View style={[st.exploreIconCircle, { backgroundColor: cat.tint }]}>
                        <Ionicons name={cat.icon} size={26} color={D.white} />
                      </View>
                      <Text style={st.exploreTileLabel} numberOfLines={1}>{cat.label}</Text>
                    </View>
                  )}
                </ScaleButton>
              );
            })}
          </View>
        </Animated.View>

        {/* FEATURE CARDS (Teal & Golden tints — on brand) */}
        <Animated.View style={[st.featureGrid, slide(anims[5])]}>
          <ScaleButton style={st.featureCardWrap} onPress={() => navigation.navigate('Attendance')}>
            <LinearGradient colors={[D.tealLight, '#B7F0EC']} style={st.featureCard}>
              <Image source={require('../../../assets/scedule.png')} style={st.featureImage} resizeMode="contain" />
              <View style={st.featureTextCont}>
                <Text style={st.featureTitle}>Attendance</Text>
                <Text style={st.featureSub}>{attendancePct}% Present</Text>
              </View>
            </LinearGradient>
          </ScaleButton>

          <ScaleButton style={st.featureCardWrap} onPress={() => navigation.navigate('ExamScores')}>
            <LinearGradient colors={[D.goldenLight, '#FFE29B']} style={st.featureCard}>
              <Image source={require('../../../assets/book_quiz.png')} style={st.featureImage} resizeMode="contain" />
              <View style={st.featureTextCont}>
                <Text style={st.featureTitle}>Tests</Text>
                <Text style={st.featureSub}>{scores.length} Completed</Text>
              </View>
            </LinearGradient>
          </ScaleButton>
        </Animated.View>

        {/* LESSONS (Teal Gradient) */}
        <Animated.View style={slide(anims[6])}>
          <SectionHeader label="Lessons" onSeeAll={() => navigation.navigate('Materials')} />
          <ParticleWrapper particleCount={15} size="small" colors={['#FFFFFF', D.teal]}>
            <ScaleButton>
              <LinearGradient colors={[D.teal, D.tealDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.lessonBanner}>
                <Image source={require('../../../assets/study.png')} style={st.lessonBannerImg} resizeMode="contain" />
                <View style={st.lessonBannerContent}>
                  <Text style={st.lessonBannerTitle}>Study Materials</Text>
                  <Text style={st.lessonBannerSub}>{materialsCount || 0} materials available</Text>
                  <View style={st.lessonBannerBtn}>
                    <Text style={st.lessonBannerBtnText}>Browse Now</Text>
                  </View>
                </View>
              </LinearGradient>
            </ScaleButton>
          </ParticleWrapper>
        </Animated.View>

        {/* QUICK ACTIONS (Teal + Pink) */}
        <Animated.View style={slide(anims[7])}>
          <SectionHeader label="Quick Actions" />
          <View style={st.quickRow}>
            <ScaleButton style={st.quickCardWrap} onPress={() => navigation.navigate('Discuss')}>
              <LinearGradient colors={[D.teal, D.tealDark]} style={st.quickGradientCard}>
                <Image source={require('../../../assets/student_group.png')} style={st.quickActionImg} resizeMode="contain" />
                <Text style={st.quickGradientLabel}>Discuss</Text>
                <Text style={st.quickGradientSub}>Join class chat</Text>
              </LinearGradient>
            </ScaleButton>

            <ScaleButton style={st.quickCardWrap} onPress={() => navigation.navigate('Fees')}>
              <LinearGradient colors={[D.pink, D.pinkDark]} style={st.quickGradientCard}>
                <Image source={require('../../../assets/rocket.png')} style={st.quickActionImg} resizeMode="contain" />
                <Text style={st.quickGradientLabel}>Fees</Text>
                <Text style={st.quickGradientSub}>View payments</Text>
              </LinearGradient>
            </ScaleButton>
          </View>
        </Animated.View>

        {/* LEADERBOARD (Golden for #1 — matches brand) */}
        {topPerformers.length > 0 && (
          <Animated.View style={slide(anims[8])}>
            <SectionHeader label="Weekly Champions" onSeeAll={() => navigation.navigate('TopPerformers')} />
            <View style={st.leaderboardCont}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.leaderScroll}>
                {topPerformers.map((entry, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4', '5'];
                  const isTop = idx === 0;
                  return (
                    <ScaleButton key={idx}>
                      <LinearGradient colors={isTop ? [D.goldenLight, '#FFD976'] : ['#F1F5F9', '#E2E8F0']} style={[st.leaderCard, isTop && st.leaderCardTop]}>
                        <View style={st.leaderTopRow}>
                          <Text style={st.leaderMedal}>{medals[idx] || '•'}</Text>
                          <View style={st.leaderAvatar}>
                            <Text style={st.leaderAvatarText}>{(entry._id?.name || 'Student').substring(0, 2)}</Text>
                          </View>
                        </View>
                        <Text style={st.leaderName} numberOfLines={1}>{entry._id?.name || 'Student'}</Text>
                        <View style={st.scoreBadgeWrap}>
                          <Text style={st.scoreBadgeText}>{entry.totalScore ?? 0} pts</Text>
                        </View>
                      </LinearGradient>
                    </ScaleButton>
                  );
                })}
              </ScrollView>
            </View>
          </Animated.View>
        )}

        {/* ANNOUNCEMENTS */}
        {announcements.length > 0 && (
          <Animated.View style={slide(anims[9])}>
            <SectionHeader label="Announcements" />
            {announcements.map((ann, i) => (
              <ScaleButton key={ann._id}>
                <LinearGradient colors={['#FFFFFF', '#FFFBFC']} style={st.annCard}>
                  <View style={st.annIconWrap}>
                    <Ionicons name="megaphone" size={22} color={D.pink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.annTitle} numberOfLines={1}>{ann.title}</Text>
                    <Text style={st.annBody} numberOfLines={2}>{ann.content}</Text>
                  </View>
                </LinearGradient>
              </ScaleButton>
            ))}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.04,
  },

  // HERO FULL WIDTH
  heroGradient: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#12C7C4', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
  },
  heroBubble1: { position: 'absolute', top: -50, right: -20, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroBubble2: { position: 'absolute', bottom: -50, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroBubble3: { position: 'absolute', top: 40, left: 100, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' },

  heroTopActions: { position: 'absolute', right: 24, flexDirection: 'row', gap: 12, zIndex: 10 },
  heroGlassBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  notifBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  heroContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, zIndex: 10 },
  heroLeftText: { flex: 1, paddingRight: 20 },
  heroGreeting: { fontSize: 17, color: 'rgba(255,255,255,0.95)', fontWeight: '800', marginBottom: 4 },
  heroName: { fontSize: 34, color: '#FFFFFF', fontWeight: '900', marginBottom: 12 },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  heroPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  avatarContainer: {},
  avatarGlow: {
    width: 80, height: 80, borderRadius: 40, padding: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 36 },
  onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },

  championCardWrap: { marginHorizontal: 16, marginBottom: 20 },
  championCard: {
    flexDirection: 'row', borderRadius: 28, padding: 22, alignItems: 'center',
    shadowColor: '#FFB800', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  championContent: { flex: 1, paddingRight: 10 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  levelBadgeText: { color: '#B87F00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  championTitle: { fontSize: 22, fontWeight: '900', color: '#7A4E00', marginBottom: 4 },
  championSubtitle: { fontSize: 14, color: '#8A5B00', fontWeight: '700', marginBottom: 16 },
  champProgressTrack: { height: 14, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  champProgressFill: { height: '100%', borderRadius: 7 },
  champPointsText: { fontSize: 13, color: '#8A5B00', fontWeight: '800' },
  champImageWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  champImage: { width: '100%', height: '100%' },

  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, justifyContent: 'space-between', marginBottom: 24 },
  statCardContainer: { width: (width - 48) / 3 },
  premiumStatCard: {
    borderRadius: 22, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  statValue3D: { fontSize: 26, fontWeight: '900', marginBottom: 4 },
  statLabel3D: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14, marginTop: 10 },
  secTitle: { fontSize: 20, fontWeight: '900', color: D.ink },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secSeeAll: { fontSize: 14, fontWeight: '800', color: D.pink },

  // EXPLORE — icon tile grid (3 columns)
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, paddingBottom: 20 },
  exploreTileWrap: { width: (width - 16 * 2 - 12 * 2) / 3 },
  exploreTile: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  exploreIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  exploreTileLabel: { fontSize: 13, fontWeight: '800', color: D.ink, textAlign: 'center' },

  featureGrid: { flexDirection: 'row', paddingHorizontal: 16, justifyContent: 'space-between', marginBottom: 24 },
  featureCardWrap: { width: (width - 44) / 2 },
  featureCard: {
    borderRadius: 26, padding: 18, height: 200, justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  featureImage: { width: '90%', height: '65%', alignSelf: 'center' },
  featureTextCont: { alignItems: 'center' },
  featureTitle: { fontSize: 18, fontWeight: '900', color: D.ink, marginBottom: 2 },
  featureSub: { fontSize: 14, color: D.muted, fontWeight: '700' },

  scheduleCard: {
    marginHorizontal: 16, borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#14C8C4', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8, marginBottom: 24,
  },
  scheduleLeft: { flex: 1 },
  liveBadge: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, alignSelf: 'flex-start', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  scheduleSubject: { fontSize: 22, fontWeight: '900', color: '#053B39', marginBottom: 6 },
  scheduleTeacher: { fontSize: 15, color: '#0C4A48', fontWeight: '700', marginBottom: 6 },
  scheduleTime: { fontSize: 14, color: '#0C4A48', fontWeight: '700', marginBottom: 16 },
  joinButton: { backgroundColor: '#053B39', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, alignSelf: 'flex-start' },
  joinButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  scheduleImage: { width: 120, height: 120 },
  emptyStateRow: { flexDirection: 'row', alignItems: 'center' },
  scheduleImageEmpty: { width: 90, height: 90 },
  emptyTitle: { fontSize: 19, fontWeight: '900', color: '#053B39', marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#0C4A48', fontWeight: '600' },

  lessonBanner: {
    marginHorizontal: 16, borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#14C8C4', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8, marginBottom: 24,
  },
  lessonBannerImg: { width: 100, height: 100, marginRight: 16 },
  lessonBannerContent: { flex: 1 },
  lessonBannerTitle: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
  lessonBannerSub: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginBottom: 14 },
  lessonBannerBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, alignSelf: 'flex-start' },
  lessonBannerBtnText: { color: '#0C8E8B', fontSize: 14, fontWeight: '800' },

  quickRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginBottom: 24 },
  quickCardWrap: { flex: 1 },
  quickGradientCard: {
    height: 150, borderRadius: 26, alignItems: 'center', justifyContent: 'center', padding: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  quickActionImg: { width: 64, height: 64, marginBottom: 14 },
  quickGradientLabel: { fontSize: 19, fontWeight: '900', color: '#FFFFFF' },
  quickGradientSub: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  leaderboardCont: { marginHorizontal: 16, marginBottom: 24, borderRadius: 28, backgroundColor: 'transparent', paddingVertical: 0 },
  leaderScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 10 },
  leaderCard: { width: 132, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  leaderCardTop: { shadowColor: '#FFB800', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  leaderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leaderMedal: { fontSize: 26 },
  leaderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
  leaderAvatarText: { fontSize: 15, fontWeight: '900', color: D.ink },
  leaderName: { fontSize: 17, fontWeight: '900', color: D.ink, marginBottom: 10 },
  scoreBadgeWrap: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  scoreBadgeText: { fontSize: 13, fontWeight: '800', color: '#334155' },

  annCard: { marginHorizontal: 16, borderRadius: 24, padding: 18, marginBottom: 12, flexDirection: 'row', gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  annIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: D.pinkLight, justifyContent: 'center', alignItems: 'center' },
  annTitle: { fontSize: 18, fontWeight: '900', color: D.ink, marginBottom: 4 },
  annBody: { fontSize: 15, color: D.muted, fontWeight: '600', lineHeight: 20 },
});
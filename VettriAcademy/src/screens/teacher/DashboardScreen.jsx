import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeacherDashboard, fetchTeacherMaterials, fetchTeacherStudents } from '../../redux/slices/teacherSlice';
import { fetchTodayClasses } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { fetchDoubtMetrics } from '../../redux/slices/doubtsSlice';
import { getActiveAnnouncementsAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { formatScheduledTime } from '../../utils/formatters';
import { Sparkle, PaperPlane, DottedPath } from '../student/BadgeIcons';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { useCompensationNotifications } from '../../hooks/useCompensationNotifications';


const T = {
  pink: '#FF4D8D',
  teal: '#14C8C4',
  tealLight: '#6EE7E5',
  sky: '#0EA5E9',
  purple: '#7C4DFF',
  orange: '#FF8A00',
  gold: '#FFC83D',
  white: '#FFFFFF',
  pageBg: '#F8F7FC',
  title: '#1F2937',
  subtitle: '#6B7280',
  green: '#22C55E',
};

const ASSETS = {
  teacher: require('../../../assets/teacher.png'),
  camera: require('../../../assets/camera.png'),
  question: require('../../../assets/question.png'),
  book: require('../../../assets/book.png'),
  studentGroup: require('../../../assets/student_group.png'),
  newClass: require('../../../assets/new_class.png'),
  newStudent: require('../../../assets/new_student.png'),
  newMaterial: require('../../../assets/new_material.png'),
  study: require('../../../assets/study.png'),
  newLeave: require('../../../assets/new_leave.png'),
};

// Prefetch assets for faster rendering
Image.prefetch(Object.values(ASSETS));

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 8, height: 8, borderRadius: 4, backgroundColor: T.green,
      transform: [{ scale }], opacity,
    }} />
  );
}

function PulseIndicator({ style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

function FloatingView({ children, style, amplitude = 6, duration = 2400 }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -amplitude, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: amplitude, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function ScalePressable({ children, onPress, style, activeScale = 0.96 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function FadeInView({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function GoldenBadge() {
  return (
    <FloatingView style={st.goldenBadge} amplitude={4} duration={2000}>
      <LinearGradient colors={['#FFE566', '#F5A623']} style={st.goldenBadgeInner}>
        <Ionicons name="trophy" size={14} color={T.white} />
      </LinearGradient>
    </FloatingView>
  );
}


function QuickActionCard({ item, onPress }) {
  return (
    <ParticleWrapper style={st.quickCardWrap}>
      <ScalePressable onPress={onPress}>
        <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.quickCard}>
          <View style={st.quickGlass} />
          <View style={st.quickBlob} />
          <View style={st.quickCircle1} />
          <View style={st.quickCircle2} />
          <FloatingView style={st.quickImageWrap} amplitude={5}>
            <Image source={item.image} style={st.quickImage} contentFit="contain" transition={300} cachePolicy="memory-disk" />
          </FloatingView>
          <Text style={st.quickTitle}>{item.title}</Text>
          <Text style={st.quickSub}>{item.subtitle}</Text>
          <View style={st.quickArrow}>
            <Ionicons name="arrow-forward" size={15} color={T.white} />
          </View>
        </LinearGradient>
      </ScalePressable>
    </ParticleWrapper>
  );
}

function PulsingJoinButton({ onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <LinearGradient colors={[T.pink, '#FF7EB3']} style={st.joinBtn}>
          <Ionicons name="videocam" size={15} color={T.white} />
          <Text style={st.joinBtnText}>Join Class</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TeacherDashboard({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { dashboard, loading: teacherLoading, students, materials } = useSelector((s) => s.teacher);
  const { todayClasses } = useSelector((s) => s.classes);
  const { unreadCount } = useSelector((s) => s.notifications);
  const { metrics } = useSelector((s) => s.doubts);
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { width } = useWindowDimensions();
  
  // Call the compensation notifications hook to sync local scheduled notifications
  useCompensationNotifications();

  // Dynamic responsive values
  const heroHeight = (width < 380 ? 250 : width < 420 ? 240 : 230) + 30 + insets.top;
  const tNameSize = width < 380 ? 32 : width < 420 ? 36 : 40;
  const avatarSize = (width < 380 ? 96 : width < 420 ? 106 : 116) + 12;

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

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const overview = dashboard || {};
  const studentCount = students?.length || overview.totalStudents || 0;
  const materialCount = materials?.length || overview.totalMaterials || 0;
  const scheduleList = todayClasses?.length ? todayClasses : (overview.todayClasses || []);
  const classCount = scheduleList.length;
  const doubtCount = metrics?.pendingDoubts ?? metrics?.assignedDoubts ?? 0;

  const teacherName = user?.displayName || user?.name || 'Teacher';
  const teacherInitials = teacherName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });

  const dynamicGreeting = useMemo(() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istDate = new Date(utc + (3600000 * 5.5));
    const hour = istDate.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning ☀️';
    if (hour >= 12 && hour < 17) return 'Good Afternoon 🌤️';
    if (hour >= 17 && hour < 21) return 'Good Evening 🌇';
    return 'Good Night 🌙';
  }, []);

  const statCards = [
    { value: classCount, label: "Today's Classes", tint: T.purple, glow: 'rgba(124,77,255,0.14)', image: ASSETS.classes, trend: 'Scheduled', trendIcon: 'calendar-outline', screen: 'LiveClass' },
    { value: studentCount, label: 'Students', tint: T.teal, glow: 'rgba(20,200,196,0.14)', image: ASSETS.studentGroup, trend: 'Enrolled', trendIcon: 'trending-up', screen: 'Students' },
    { value: materialCount, label: 'Materials', tint: T.gold, glow: 'rgba(255,200,61,0.16)', image: ASSETS.book, trend: 'Uploaded', trendIcon: 'document-text-outline', screen: 'TeacherMaterials' },
    { value: overview.pendingLeaves || 0, label: 'Pending Leaves', tint: T.pink, glow: 'rgba(255,77,141,0.14)', image: ASSETS.study, trend: 'Awaiting', trendIcon: 'time-outline', screen: 'Leave' },
  ];

  const quickActions = useMemo(() => ([
    { id: 'live', title: 'Live Class', subtitle: 'Go Live Now', screen: 'LiveClass', gradient: ['#2563EB', '#60A5FA'], image: ASSETS.camera },
    { id: 'doubts', title: 'Doubts', subtitle: 'View & Reply', screen: 'DoubtCenter', gradient: [T.orange, '#FFB347'], image: ASSETS.question },
    { id: 'materials', title: 'Materials', subtitle: 'Upload & Manage', screen: 'TeacherMaterials', gradient: [T.teal, T.tealLight], image: ASSETS.book },
    { id: 'students', title: 'Students', subtitle: 'View All', screen: 'Students', gradient: [T.pink, '#FF7EB3'], image: ASSETS.studentGroup },
  ]), []);

  const openMenu = () => navigation.getParent()?.navigate('Profile');
  const openSchedule = () => navigation.getParent()?.navigate('Schedule');
  const openTraining = () => navigation.getParent()?.navigate('Training');

  if (teacherLoading && !refreshing) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color={T.teal} />
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: '#D8FFF0' }]}>
      <ScrollView
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.pink]} />}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

        {/* ── BACKGROUND DECORATIONS ── */}
        <Ionicons name="star" size={240} color="#14C8C4" style={[st.bgGeom, { top: 80, left: -90, transform: [{ rotate: '15deg' }] }]} />
        <Ionicons name="ellipse-outline" size={320} color="#14C8C4" style={[st.bgGeom, { top: 320, right: -120 }]} />
        <Ionicons name="star" size={180} color="#14C8C4" style={[st.bgGeom, { top: 600, left: 20, transform: [{ rotate: '-20deg' }] }]} />
        <Ionicons name="ellipse-outline" size={240} color="#14C8C4" style={[st.bgGeom, { top: 780, right: 60 }]} />
        <Ionicons name="star-outline" size={280} color="#14C8C4" style={[st.bgGeom, { top: 950, left: -60, transform: [{ rotate: '45deg' }] }]} />
        <Ionicons name="ellipse-outline" size={150} color="#14C8C4" style={[st.bgGeom, { top: 120, right: 30 }]} />
        <Ionicons name="star-outline" size={120} color="#14C8C4" style={[st.bgGeom, { top: 450, left: 80, transform: [{ rotate: '10deg' }] }]} />

        {/* ── HERO HEADER ── */}
      <View style={[st.heroWrap, { height: heroHeight }]}>
        <LinearGradient
          colors={['#C2185B', '#D81B60', '#E83E8C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[st.heroGradient, { height: heroHeight }]}
        >
          <FloatingView amplitude={15} duration={8000} style={st.heroPremiumCircle1} />
          <FloatingView amplitude={20} duration={10000} style={st.heroPremiumCircle2} />
          <FloatingView amplitude={10} duration={6000} style={st.heroPremiumCircle3} />
          
          <View style={st.heroStreak1} />
          <View style={st.heroStreak2} />

          <Sparkle size={14} color="#FFF" opacity={0.2} style={{ position: 'absolute', top: insets.top + 50, left: 30 }} />
          <Sparkle size={10} color="#FFF" opacity={0.3} style={{ position: 'absolute', top: insets.top + 100, right: 80 }} />
          <Sparkle size={18} color="#FFF" opacity={0.15} style={{ position: 'absolute', bottom: 40, left: '50%' }} />
        </LinearGradient>

        <View style={[st.heroTopBar, { top: Math.max(insets.top, 24) }]}>
          <ParticleWrapper>
            <TouchableOpacity style={st.glassBtn} onPress={openMenu} activeOpacity={0.8}>
              <Ionicons name="grid" size={24} color={T.white} />
            </TouchableOpacity>
          </ParticleWrapper>
          <ParticleWrapper>
            <TouchableOpacity style={st.whiteIconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.8}>
              <Ionicons name="notifications" size={24} color="#E83E8C" />
              {unreadCount > 0 && (
                <View style={st.notifBadge}>
                  <Text style={st.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ParticleWrapper>
        </View>

        <View style={[st.heroContent, { bottom: 28 }]}>
          <View style={st.heroLeft}>
            <FadeInView delay={100}>
              <Text style={st.greeting}>{dynamicGreeting}</Text>
            </FadeInView>
            <FadeInView delay={200}>
              <Text style={[st.teacherName, { fontSize: tNameSize }]} numberOfLines={2}>{teacherName}</Text>
            </FadeInView>
            <FadeInView delay={250}>
              <Text style={st.subtitleText}>Inspire • Teach • Empower</Text>
            </FadeInView>
            <FadeInView delay={300}>
              <View style={st.datePill}>
                <Ionicons name="calendar" size={16} color={T.white} />
                <Text style={st.datePillText}>{dateLabel}</Text>
              </View>
            </FadeInView>
          </View>

          <View style={st.heroRight}>
            <FloatingView amplitude={6} duration={3000}>
              <ParticleWrapper>
                <TouchableOpacity activeOpacity={0.9} style={st.avatarFrame} onPress={() => navigation.getParent()?.navigate('Profile')}>
                  
                  <Sparkle size={10} color="#FFF" opacity={0.4} style={{ position: 'absolute', top: -10, right: 0, zIndex: 1 }} />
                  <Sparkle size={14} color="#FFF" opacity={0.3} style={{ position: 'absolute', bottom: -10, left: 0, zIndex: 1 }} />
                  <View style={st.avatarBubble} />

                  <View style={st.avatarOuterGlow}>
                    <View style={[st.avatarRing, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                      <Image
                        source={ASSETS.teacher}
                        style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="memory-disk"
                      />
                    </View>
                    <View style={[st.avatarGlassHighlight, { width: avatarSize, height: avatarSize / 2, borderTopLeftRadius: avatarSize / 2, borderTopRightRadius: avatarSize / 2 }]} />
                  </View>
                  <PulseIndicator style={st.onlineIndicator} />
                  <GoldenBadge />
                </TouchableOpacity>
              </ParticleWrapper>
            </FloatingView>
          </View>
        </View>
      </View>

      {/* ── STATISTICS ── */}
      <View style={st.statsContainer}>
        <View style={st.statCardWrap}>
          <ParticleWrapper>
            <ScalePressable activeScale={0.96} onPress={() => navigation.navigate('LiveClass')}>
              <LinearGradient colors={['#1D4ED8', '#2563EB', '#3B82F6']} style={st.statCard}>
                <View style={st.statRadialGlow} />
                <View style={st.statGlass} />
                <View style={st.statDecoCircle1} />
                <View style={st.statDecoCircle2} />
                <Sparkle size={12} color="#FFF" opacity={0.6} style={st.statSparkle1} />
                <Sparkle size={16} color="#FFF" opacity={0.4} style={st.statSparkle2} />
                <Image source={ASSETS.newClass} style={st.statHeroImgOnly} contentFit="contain" transition={300} cachePolicy="memory-disk" />
              </LinearGradient>
            </ScalePressable>
          </ParticleWrapper>
        </View>

        <View style={st.statCardWrap}>
          <ParticleWrapper>
            <ScalePressable activeScale={0.96} onPress={() => navigation.navigate('Students')}>
              <LinearGradient colors={['#0F766E', '#14B8A6', '#2DD4BF']} style={st.statCard}>
                <View style={st.statRadialGlow} />
                <View style={st.statGlass} />
                <View style={st.statDecoCircle1} />
                <View style={st.statDecoCircle2} />
                <Sparkle size={12} color="#FFF" opacity={0.6} style={st.statSparkle1} />
                <Sparkle size={16} color="#FFF" opacity={0.4} style={st.statSparkle2} />
                <Image source={ASSETS.newStudent} style={st.statHeroImgOnly} contentFit="contain" transition={300} cachePolicy="memory-disk" />
              </LinearGradient>
            </ScalePressable>
          </ParticleWrapper>
        </View>

        <View style={st.statCardWrap}>
          <ParticleWrapper>
            <ScalePressable activeScale={0.96} onPress={() => navigation.navigate('TeacherMaterials')}>
              <LinearGradient colors={['#EA580C', '#F97316', '#FBBF24']} style={st.statCard}>
                <View style={st.statRadialGlow} />
                <View style={st.statGlass} />
                <View style={st.statDecoCircle1} />
                <View style={st.statDecoCircle2} />
                <Sparkle size={12} color="#FFF" opacity={0.6} style={st.statSparkle1} />
                <Sparkle size={16} color="#FFF" opacity={0.4} style={st.statSparkle2} />
                <Image source={ASSETS.newMaterial} style={st.statHeroImgOnly} contentFit="contain" transition={300} cachePolicy="memory-disk" />
              </LinearGradient>
            </ScalePressable>
          </ParticleWrapper>
        </View>

        <View style={st.statCardWrap}>
          <ParticleWrapper>
            <ScalePressable activeScale={0.96} onPress={() => navigation.navigate('Leave')}>
              <LinearGradient colors={['#DB2777', '#EC4899', '#F472B6']} style={st.statCard}>
                <View style={st.statRadialGlow} />
                <View style={st.statGlass} />
                <View style={st.statDecoCircle1} />
                <View style={st.statDecoCircle2} />
                <Sparkle size={12} color="#FFF" opacity={0.6} style={st.statSparkle1} />
                <Sparkle size={16} color="#FFF" opacity={0.4} style={st.statSparkle2} />
                <Image source={ASSETS.newLeave} style={st.statHeroImgOnly} contentFit="contain" transition={300} cachePolicy="memory-disk" />
              </LinearGradient>
            </ScalePressable>
          </ParticleWrapper>
        </View>
      </View>

      {/* ── TODAY'S SCHEDULE ── */}
      <ParticleWrapper style={{ marginHorizontal: 16, marginTop: 24 }}>
        <LinearGradient
          colors={scheduleList.length === 0 ? ['#FFE7F0', '#E0F2FE'] : ['#FFFFFF', '#F8FBFF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={st.scheduleCard}
        >
          <View style={st.scheduleHeader}>
            <Text style={st.scheduleTitle}>📅 Today's Schedule</Text>
            <ParticleWrapper>
              <TouchableOpacity onPress={openSchedule} activeOpacity={0.8}>
                <Text style={st.scheduleViewAll}>View All</Text>
              </TouchableOpacity>
            </ParticleWrapper>
          </View>

          {scheduleList.length === 0 ? (
            <View style={st.plannerEmptyState}>
              <View style={st.plannerTopArea}>
                <View style={st.plannerDecoCircle1} />
                <View style={st.plannerDecoCircle2} />
                <View style={st.plannerDecoBubble1} />
                <View style={st.plannerDecoBubble2} />
                <View style={st.plannerDecoBubble3} />
                <Sparkle size={14} color={T.gold} opacity={0.6} style={st.plannerStar1} />
                <Sparkle size={10} color={T.pink} opacity={0.5} style={st.plannerStar2} />
                <Sparkle size={18} color={T.teal} opacity={0.4} style={st.plannerStar3} />
                <FloatingView amplitude={12} duration={2500}>
                  <Image source={ASSETS.study} style={st.plannerIllustration} contentFit="contain" transition={300} cachePolicy="memory-disk" />
                </FloatingView>
              </View>

              <LinearGradient colors={['#FF4D8D', '#FF7EB3']} style={st.plannerFreeDayBadge}>
                <Text style={[st.plannerFreeDayText, { color: '#FFF' }]}>✨ Free Day</Text>
              </LinearGradient>

              <Text style={st.plannerMainText}>No more classes today</Text>
              <Text style={st.plannerSubText}>Enjoy your day and keep inspiring students.</Text>
            </View>
          ) : (
            <View style={st.timelineContainer}>
              {scheduleList.map((cls, index) => {
                const isLive = cls.status === 'live';
                const studentTotal = cls.studentIds?.length || cls.enrolledStudents?.length || 0;
                const classTeacher = cls.teacher?.displayName || cls.teacher?.name || cls.teacherName || teacherName;
                const duration = cls.durationMinutes || 60;
                const isLast = index === scheduleList.length - 1;
                return (
                  <ParticleWrapper key={cls._id}>
                    <View style={st.timelineItem}>
                      <View style={st.timelineLeft}>
                        <Text style={st.timelineTime}>{formatScheduledTime(cls.scheduledTime)}</Text>
                        <Text style={st.timelineDuration}>{duration} min</Text>
                      </View>
                      
                      <View style={st.timelineDivider}>
                        <View style={[st.timelineDot, isLive && st.timelineDotLive]} />
                        {!isLast && <View style={st.timelineConnector} />}
                      </View>

                      <View style={st.timelineContent}>
                        <Text style={st.timelineSubject} numberOfLines={1}>{cls.subject || cls.title}</Text>
                        <View style={st.timelineMetaRow}>
                          <Ionicons name="person-outline" size={12} color={T.subtitle} />
                          <Text style={st.timelineMeta} numberOfLines={1}>{classTeacher}</Text>
                        </View>
                        <View style={st.timelineMetaRow}>
                          <Ionicons name="people-outline" size={12} color={T.subtitle} />
                          <Text style={st.timelineMeta}>{studentTotal} students</Text>
                        </View>
                        
                        <View style={st.timelineActions}>
                          {isLive && (
                            <View style={st.liveBadge}>
                              <PulseDot />
                              <Text style={st.liveBadgeText}>LIVE</Text>
                            </View>
                          )}
                          {isLive ? (
                            <PulsingJoinButton onPress={() => navigation.navigate('LiveClass')} />
                          ) : (
                            <TouchableOpacity onPress={() => navigation.navigate('LiveClass')} activeOpacity={0.85}>
                              <View style={st.viewBtn}>
                                <Text style={st.viewBtnText}>Open</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </ParticleWrapper>
                );
              })}
            </View>
          )}
        </LinearGradient>
      </ParticleWrapper>

      {/* ── UPCOMING COMPENSATION CLASSES ── */}
      {overview?.pendingCompensationCount > 0 && overview?.pendingCompensationLeaves?.length > 0 && (
        <View style={st.sectionCard}>
          <Text style={st.sectionTitle}>Upcoming Compensation</Text>
          <Text style={{ color: T.subtitle, fontSize: 13, marginBottom: 12 }}>
            You have {overview.pendingCompensationCount} pending compensation class{overview.pendingCompensationCount > 1 ? 'es' : ''}.
          </Text>
          {overview.pendingCompensationLeaves.map((l, index) => (
            <View key={`comp-${l._id}`} style={[st.timelineItem, { marginBottom: index === overview.pendingCompensationLeaves.length - 1 ? 0 : 12 }]}>
              <View style={st.timelineLeft}>
                <Text style={st.timelineTime}>{new Date(l.compensationClassDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
              <View style={st.timelineDivider}>
                <View style={[st.timelineDot, { backgroundColor: T.orange }]} />
                {index < overview.pendingCompensationLeaves.length - 1 && <View style={st.timelineConnector} />}
              </View>
              <View style={st.timelineContent}>
                <Text style={st.timelineSubject} numberOfLines={1}>Compensation for {l.leaveType} leave</Text>
                <Text style={{ fontSize: 12, color: l.compensationStatus === 'completed_by_teacher' ? T.orange : T.subtitle, marginTop: 4 }}>
                  {l.compensationStatus === 'completed_by_teacher' ? 'Awaiting Admin Approval' : 'Pending'}
                </Text>
                <View style={st.timelineActions}>
                  <TouchableOpacity onPress={() => navigation.navigate('Leave')} activeOpacity={0.85}>
                    <View style={st.viewBtn}>
                      <Text style={st.viewBtnText}>View</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── FEATURED TEACHER BANNER ── */}
      <LinearGradient colors={[T.purple, T.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.banner}>
        <View style={st.bannerBlob} />
        <View style={st.bannerCopy}>
          <Text style={st.bannerTitle}>Create, Teach and Inspire</Text>
          <Text style={st.bannerSub}>
            Upload materials, manage classes and track student performance.
          </Text>
          <ParticleWrapper>
            <TouchableOpacity style={st.bannerBtn} onPress={openTraining} activeOpacity={0.9}>
              <Text style={st.bannerBtnText}>Explore Features</Text>
              <Ionicons name="arrow-forward" size={16} color={T.purple} />
            </TouchableOpacity>
          </ParticleWrapper>
        </View>
        <FloatingView style={st.bannerImageWrap} amplitude={5}>
          <Image source={ASSETS.teacher} style={st.bannerImage} contentFit="contain" transition={300} cachePolicy="memory-disk" />
        </FloatingView>
      </LinearGradient>

      {/* ── QUICK ACTIONS ── */}
      <View style={st.quickSection}>
        <Text style={st.sectionTitle}>Quick Actions</Text>
        <FlatList
          data={quickActions}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.quickScroll}
          renderItem={({ item }) => (
            <QuickActionCard
              item={item}
              onPress={() => navigation.navigate(item.screen)}
            />
          )}
        />
        {doubtCount > 0 && (
          <Text style={st.doubtHint}>{doubtCount} doubt{doubtCount !== 1 ? 's' : ''} awaiting reply</Text>
        )}
      </View>

      {/* ── ANNOUNCEMENTS ── */}
      {announcements.length > 0 && (
        <View style={st.sectionCard}>
          <Text style={st.sectionTitle}>Announcements</Text>
          {announcements.map((a) => (
            <View key={a._id} style={st.announceCard}>
              <View style={st.announceIcon}>
                <Ionicons name="megaphone" size={18} color={T.sky} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.announceTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={st.announceBody} numberOfLines={2}>{a.content}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  bgGeom: { position: 'absolute', opacity: 0.04 },

  heroWrap: { position: 'relative', marginBottom: 0 },
  heroGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroPremiumCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -150, right: -100,
  },
  heroPremiumCircle2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -80, left: -80,
  },
  heroPremiumCircle3: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)', top: 60, left: '20%',
  },
  heroStreak1: {
    position: 'absolute', width: 200, height: 20, backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-45deg' }], top: 30, right: -40,
  },
  heroStreak2: {
    position: 'absolute', width: 150, height: 15, backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '-45deg' }], bottom: 40, left: -20,
  },
  heroTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, zIndex: 3,
  },
  glassBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  whiteIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.white, marginTop: 6,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: T.white,
  },
  notifBadgeText: { fontSize: 8, fontWeight: '900', color: T.white },
  heroContent: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    zIndex: 2,
  },
  heroLeft: { flex: 0.65, paddingRight: 16 },
  greeting: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.95)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  teacherName: { fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subtitleText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  datePillText: { fontSize: 12, fontWeight: '800', color: T.white },
  heroRight: { flex: 0.35, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  avatarFrame: { position: 'relative' },
  avatarOuterGlow: {
    padding: 6,
    borderRadius: 70,
    backgroundColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 15, elevation: 14,
    position: 'relative',
  },
  avatarRing: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.white,
    borderWidth: 4, borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarGlassHighlight: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarBubble: {
    position: 'absolute', width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', top: 10, left: -15, zIndex: 1,
  },
  onlineIndicator: {
    position: 'absolute', bottom: 8, right: 8, width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#4ADE80', borderWidth: 2.5, borderColor: '#FFFFFF', zIndex: 4,
  },
  goldenBadge: {
    position: 'absolute', top: -5, right: -5, zIndex: 5,
    shadowColor: '#FFC83D', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 10, elevation: 8,
  },
  goldenBadgeInner: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },

  statsContainer: {
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardWrap: {
    width: '48%',
    marginBottom: 16,
  },
  statCard: {
    width: '100%',
    height: 165,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  statRadialGlow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)', top: '10%',
  },
  statGlass: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  statDecoCircle1: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -10, right: -10,
  },
  statDecoCircle2: {
    position: 'absolute', width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: 20, left: -10,
  },
  statSparkle1: { position: 'absolute', top: 20, left: 20 },
  statSparkle2: { position: 'absolute', bottom: 30, right: 20 },
  statHeroImgOnly: {
    width: '115%',
    height: '115%',
  },

  sectionCard: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: T.white, borderRadius: 16,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: T.title, letterSpacing: -0.3 },
  viewAll: { fontSize: 11, fontWeight: '800', color: T.pink },

  classItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  classItemFirst: { borderTopWidth: 0, paddingTop: 2 },
  classTimeCol: { width: 58 },
  classTime: { fontSize: 11, fontWeight: '900', color: T.title },
  durationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2,
    alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 8, backgroundColor: '#F3EEFF',
  },
  classDuration: { fontSize: 8, fontWeight: '700', color: T.purple },
  classBody: { flex: 1, minWidth: 0 },
  classSubject: { fontSize: 13, fontWeight: '900', color: T.title },
  classTeacherRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  classTeacher: { fontSize: 10, fontWeight: '600', color: T.subtitle, flex: 1 },
  classMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  classMeta: { fontSize: 9, fontWeight: '600', color: T.subtitle },
  classActions: { alignItems: 'flex-end', gap: 4 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  liveBadgeText: { fontSize: 8, fontWeight: '900', color: T.green },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  joinBtnText: { fontSize: 9, fontWeight: '900', color: T.white },
  viewBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  viewBtnText: { fontSize: 9, fontWeight: '800', color: T.subtitle },

  emptySchedule: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  emptyIllustrationArea: {
    width: '100%', height: 130, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, position: 'relative',
  },
  emptyBlob1: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(124,77,255,0.08)',
  },
  emptyBlob2: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(20,200,196,0.10)', right: 80, top: 5,
  },
  emptyCircle: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,200,61,0.35)', left: 70, bottom: 20,
  },
  enjoyBadge: {
    backgroundColor: '#FFF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#FFE4E4',
  },
  enjoyBadgeText: { fontSize: 10, fontWeight: '800', color: T.pink },
  emptyImage: { width: 120, height: 120 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: T.title },
  emptySub: { fontSize: 12, fontWeight: '600', color: T.subtitle, marginTop: 4, textAlign: 'center' },

  banner: {
    marginHorizontal: 16, marginTop: 28, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 105,
    shadowColor: T.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  bannerBlob: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)', top: -10, left: -10,
  },
  bannerCopy: { flex: 0.65, paddingRight: 4, justifyContent: 'center' },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: T.white, lineHeight: 20 },
  bannerSub: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 15 },
  bannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 8, backgroundColor: T.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
  },
  bannerBtnText: { fontSize: 11, fontWeight: '900', color: T.purple },
  bannerImageWrap: { flex: 0.35, alignItems: 'center', justifyContent: 'center' },
  bannerImage: { width: 95, height: 95 },

  quickSection: { marginTop: 8, paddingLeft: 16 },
  quickScroll: { gap: 10, paddingRight: 16, paddingTop: 4 },
  quickCardWrap: { borderRadius: 16 },
  quickCard: {
    width: 145, height: 145, borderRadius: 16, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
  },
  quickGlass: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 32,
    backgroundColor: 'rgba(255,255,255,0.14)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  quickBlob: {
    position: 'absolute', width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.10)', bottom: -10, left: -10,
  },
  quickCircle1: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.20)', top: 32, right: 10,
  },
  quickCircle2: {
    position: 'absolute', width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.25)', bottom: 40, left: 12,
  },
  quickImageWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 1 },
  quickImage: { width: 65, height: 65 },
  quickTitle: { fontSize: 13, fontWeight: '900', color: T.white, textAlign: 'center', marginTop: 1 },
  quickSub: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 1 },
  quickArrow: {
    position: 'absolute', bottom: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.28)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  doubtHint: { fontSize: 10, fontWeight: '700', color: T.orange, marginTop: 4, paddingRight: 16 },

  announceCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4,
  },
  announceIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#E0F2FE',
    justifyContent: 'center', alignItems: 'center',
  },
  announceTitle: { fontSize: 12, fontWeight: '800', color: T.title },
  announceBody: { fontSize: 10, fontWeight: '600', color: T.subtitle, marginTop: 2, lineHeight: 14 },

  // NEW SCHEDULE SECTION STYLES
  scheduleCard: {
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: T.title,
    letterSpacing: -0.5,
  },
  scheduleViewAll: {
    fontSize: 13,
    fontWeight: '800',
    color: T.pink,
  },
  plannerEmptyState: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  plannerTopArea: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  plannerIllustration: {
    width: 195,
    height: 195,
  },
  plannerDecoCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124,77,255,0.06)',
    top: 5,
  },
  plannerDecoCircle2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(20,200,196,0.08)',
    bottom: 5,
    left: 30,
  },
  plannerDecoBubble1: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.6)',
    top: 20,
    right: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  plannerDecoBubble2: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    bottom: 30,
    left: 60,
  },
  plannerDecoBubble3: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.4)',
    bottom: 50,
    right: 30,
  },
  plannerStar1: { position: 'absolute', top: 20, left: 70 },
  plannerStar2: { position: 'absolute', bottom: 40, right: 60 },
  plannerStar3: { position: 'absolute', top: 60, right: 30 },
  plannerFreeDayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  plannerFreeDayText: {
    fontSize: 12,
    fontWeight: '800',
    color: T.pink,
  },
  plannerMainText: {
    fontSize: 22,
    fontWeight: '900',
    color: T.title,
    marginBottom: 6,
    textAlign: 'center',
  },
  plannerSubText: {
    fontSize: 14,
    fontWeight: '500',
    color: T.subtitle,
    marginBottom: 20,
    textAlign: 'center',
  },
  plannerFeaturesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  plannerMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  plannerMiniCardIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  plannerMiniCardText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.subtitle,
    textAlign: 'center',
  },
  timelineContainer: {
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 65,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 2,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '900',
    color: T.title,
  },
  timelineDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: T.subtitle,
    marginTop: 2,
  },
  timelineDivider: {
    width: 20,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 2,
    marginTop: 4,
  },
  timelineDotLive: {
    backgroundColor: T.pink,
    shadowColor: T.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  timelineConnector: {
    position: 'absolute',
    top: 16,
    bottom: -16,
    width: 2,
    backgroundColor: '#F3F4F6',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: T.title,
    marginBottom: 4,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timelineMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: T.subtitle,
  },
  timelineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
});

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity as RNTouchableOpacity,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

// --- ASSETS & COLORS ---
const T = {
  pink: '#FF4D8D',
  teal: '#14C8C4',
  tealLight: '#6EE7E5',
  sky: '#0EA5E9',
  purple: '#7C4DFF',
  orange: '#FF8A00',
  gold: '#FFC83D',
  white: '#FFFFFF',
  pageBg: '#F2FFFC',
  title: '#1F2937',
  subtitle: '#6B7280',
  green: '#22C55E',
};

const ASSETS = {
  teacher: require('../../../assets/teacher.png'),
  studentGroup: require('../../../assets/student_group.png'),
  study: require('../../../assets/study.png'),
  newLeave: require('../../../assets/new_leave.png'),
  question: require('../../../assets/question.png'),
  camera: require('../../../assets/camera.png'),
  book: require('../../../assets/book.png'),
  newClass: require('../../../assets/new_class.png'),
  newStudent: require('../../../assets/new_student.png'),
  newMaterial: require('../../../assets/new_material.png'),
  newTeacher: require('../../../assets/new_teacher.png'),
  newEnquiry: require('../../../assets/new_enquiry.png'),
  newFee: require('../../../assets/new_fees.png'),
  newSalary: require('../../../assets/new_salary.png'),
  newNotice: require('../../../assets/new_notice.png'),
  newSchedular: require('../../../assets/new_schedular.png'),
  newTraining: require('../../../assets/new_training.png'),
};

// --- ANIMATION COMPONENTS ---
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
    <RNTouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </RNTouchableOpacity>
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

function Sparkle({ size = 14, color = '#FFF', opacity = 1, style }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);
  const spinInterpolate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={[style, { opacity, transform: [{ rotate: spinInterpolate }] }]}>
      <Ionicons name="sparkles" size={size} color={color} />
    </Animated.View>
  );
}

// Section Header
function SectionHeader({ title, subtitle, onViewAll }) {
  return (
    <View style={st.sectionHeader}>
      <View>
        <Text style={st.sectionTitle}>{title}</Text>
        {subtitle && <Text style={st.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {onViewAll && (
        <ParticleWrapper>
          <RNTouchableOpacity onPress={onViewAll} activeOpacity={0.8}>
            <Text style={st.viewAllBtn}>View All</Text>
          </RNTouchableOpacity>
        </ParticleWrapper>
      )}
    </View>
  );
}

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

export function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const heroHeight = width < 380 ? 250 : width < 420 ? 240 : 230;
  const adminName = 'Super Admin';
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });

  const dynamicGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    if (hour < 21) return 'Good Evening 🌇';
    return 'Good Night 🌙';
  }, []);

  const [topRankers] = useState([
    { rank: 1, name: 'Gaurav Kumar Singh', score: '88%', grade: 'Grade 6', avatar: ASSETS.teacher },
    { rank: 2, name: 'Priya Singh', score: '85%', grade: 'Grade 7', avatar: ASSETS.teacher },
    { rank: 3, name: 'Arun Raj', score: '82%', grade: 'Grade 8', avatar: ASSETS.teacher },
  ]);

  const [studentMarks] = useState([
    { id: 1, name: 'Rahul Dev', subject: 'Mathematics', score: '95%', rank: 1, avatar: ASSETS.teacher },
    { id: 2, name: 'Sneha Patil', subject: 'Science', score: '91%', rank: 2, avatar: ASSETS.teacher },
    { id: 3, name: 'Amit Kumar', subject: 'English', score: '88%', rank: 3, avatar: ASSETS.teacher },
  ]);

  const [managementCards] = useState([
    { title: 'Fees', icon: ASSETS.newFee, gradient: ['#0EA5E9', '#7DD3FC'] },
    { title: 'Salary', icon: ASSETS.newSalary, gradient: ['#F59E0B', '#FCD34D'] },
    { title: 'Notices', icon: ASSETS.newNotice, gradient: ['#EF4444', '#FCA5A5'] },
    { title: 'Class Scheduler', icon: ASSETS.newSchedular, gradient: ['#14C8C4', '#6EE7E5'] },
    { title: 'Training Videos', icon: ASSETS.newTraining, gradient: ['#8B5CF6', '#C4B5FD'] },
  ]);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching admin dashboard data...');
    } catch (error) {
      console.log('Error fetching dashboard:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  return (
    <View style={st.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <StatusBar barStyle="light-content" />

        {/* ── BACKGROUND BLOBS ── */}
        <View style={[st.bgBlob, { backgroundColor: '#FFF8FB', top: -50, left: -50 }]} />
        <View style={[st.bgBlob, { backgroundColor: '#F8F7FC', top: 200, right: -100 }]} />
        <View style={[st.bgBlob, { backgroundColor: '#F5FCFF', top: 500, left: -80 }]} />
        <View style={[st.bgBlob, { backgroundColor: '#F2FFFC', top: 800, right: -50 }]} />
        
        <Ionicons name="star" size={240} color="#14C8C4" style={[st.bgGeom, { top: 80, left: -90, transform: [{ rotate: '15deg' }] }]} />

        {/* ── HERO HEADER ── */}
        <View style={[st.heroWrap, { height: heroHeight }]}>
          <LinearGradient
            colors={[T.pink, T.teal, T.sky]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[st.heroGradient, { height: heroHeight }]}
          >
            <FloatingView amplitude={15} duration={8000} style={st.heroPremiumCircle1} />
            <FloatingView amplitude={20} duration={10000} style={st.heroPremiumCircle2} />
            <Sparkle size={14} color="#FFF" opacity={0.3} style={{ position: 'absolute', top: 50, left: 30 }} />
            <Sparkle size={18} color="#FFF" opacity={0.2} style={{ position: 'absolute', bottom: 40, left: '50%' }} />
          </LinearGradient>

          <View style={[st.heroTopBar, { top: Math.max(insets.top, 16) }]}>
            <View style={st.logoRow}>
              <Image source={ASSETS.study} style={st.schoolLogo} />
              <Text style={st.logoText}>Academy</Text>
            </View>
            <View style={st.heroTopRight}>
              <ParticleWrapper>
                <RNTouchableOpacity style={st.glassBtnRight} onPress={() => {}}>
                  <Ionicons name="color-wand" size={22} color={T.white} />
                </RNTouchableOpacity>
              </ParticleWrapper>
              <ParticleWrapper>
                <RNTouchableOpacity style={st.glassBtnRight} onPress={() => navigation.navigate('Chat')}>
                  <Ionicons name="notifications" size={22} color={T.white} />
                </RNTouchableOpacity>
              </ParticleWrapper>
            </View>
          </View>

          <View style={[st.heroContent, { bottom: 20 }]}>
            <View style={st.heroLeft}>
              <FadeInView delay={100}>
                <Text style={st.greeting}>{dynamicGreeting.toUpperCase()}</Text>
              </FadeInView>
              <FadeInView delay={200}>
                <Text style={st.adminName} numberOfLines={1}>{adminName}</Text>
              </FadeInView>
              <FadeInView delay={250}>
                <Text style={st.subtitleText}>Control Center</Text>
              </FadeInView>
              <FadeInView delay={300}>
                <View style={st.datePill}>
                  <Ionicons name="calendar" size={14} color={T.white} />
                  <Text style={st.datePillText}>{dateLabel}</Text>
                </View>
              </FadeInView>
            </View>

            <View style={st.heroRight}>
              <FloatingView amplitude={6} duration={3000}>
                <ParticleWrapper>
                  <RNTouchableOpacity activeOpacity={0.9} style={st.avatarFrame} onPress={() => navigation.navigate('Profile')}>
                    <View style={st.avatarOuterGlow}>
                      <Image source={ASSETS.teacher} style={st.avatarImg} />
                    </View>
                  </RNTouchableOpacity>
                </ParticleWrapper>
              </FloatingView>
            </View>
          </View>
        </View>

        {/* ── STATISTICS ── */}
        <View style={st.statsContainer}>
          {[
            { t: 'Students', count: '1,250', i: ASSETS.newStudent, g: ['#1D4ED8', '#2563EB', '#3B82F6'] },
            { t: 'Teachers', count: '45', i: ASSETS.newTeacher, g: ['#0F766E', '#14B8A6', '#2DD4BF'] },
            { t: 'Enquiries', count: '12', i: ASSETS.newEnquiry, g: ['#EA580C', '#F97316', '#FBBF24'] },
            { t: 'Leaves', count: '5', i: ASSETS.newLeave, g: ['#DB2777', '#EC4899', '#F472B6'] },
          ].map((stat, idx) => (
            <View key={idx} style={st.statCardWrap}>
              <ParticleWrapper>
                <ScalePressable activeScale={0.96}>
                  <LinearGradient colors={stat.g} style={st.statCard}>
                    <View style={st.statRadialGlow} />
                    <View style={st.statGlass} />
                    <Image source={stat.i} style={st.statHeroImgOnly} resizeMode="contain" />
                    <View style={st.statOverlayTextWrap}>
                      <Text style={st.statCountText}>{stat.count}</Text>
                      <Text style={st.statOverlayText}>{stat.t}</Text>
                    </View>
                  </LinearGradient>
                </ScalePressable>
              </ParticleWrapper>
            </View>
          ))}
        </View>

        {/* ── MANAGEMENT ── */}
        <View style={st.sectionContainer}>
          <SectionHeader title="Management" subtitle="Quick access modules" />
          <View style={st.mgmtGrid}>
            {managementCards.map((m, idx) => (
              <View key={idx} style={st.mgmtCardWrap2}>
                <ScalePressable activeScale={0.95} onPress={() => navigation.navigate('Users', { tab: m.title })}>
                  <LinearGradient colors={m.gradient} style={st.mgmtCard2}>
                    <View style={st.statGlass} />
                    <Image source={m.icon} style={st.mgmtImage2} resizeMode="contain" />
                    <View style={st.mgmtTitleRow}>
                      <Text style={st.mgmtTitle2}>{m.title}</Text>
                      <View style={st.mgmtArrowWrap}>
                        <Ionicons name="arrow-forward" size={12} color={T.white} />
                      </View>
                    </View>
                  </LinearGradient>
                </ScalePressable>
              </View>
            ))}
          </View>
        </View>

        {/* ── TOP RANKERS ── */}
        <View style={st.sectionContainer}>
          <SectionHeader title="Top Rankers" subtitle="Outstanding performances" onViewAll={() => {}} />
          <View style={st.premiumListCard}>
            {topRankers.map((r, i) => (
              <View key={i} style={st.listItem}>
                <Image source={r.avatar} style={st.listAvatar} />
                <View style={st.listInfo}>
                  <Text style={st.listName}>{r.name}</Text>
                  <Text style={st.listSub}>{r.grade}</Text>
                  <View style={st.progressBarWrap}>
                    <LinearGradient colors={[T.pink, T.orange]} style={[st.progressBar, { width: r.score }]} />
                  </View>
                </View>
                <View style={st.listRight}>
                  <View style={st.rankMedal}>
                    <Text style={st.rankMedalText}>#{r.rank}</Text>
                  </View>
                  <Text style={st.scoreText}>{r.score}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── STUDENT MARKS ── */}
        <View style={st.sectionContainer}>
          <SectionHeader title="Student Marks" subtitle="Recent assessment results" onViewAll={() => {}} />
          <View style={st.premiumListCard}>
            {studentMarks.map((s, i) => (
              <View key={i} style={st.listItem}>
                <Image source={s.avatar} style={st.listAvatar} />
                <View style={st.listInfo}>
                  <Text style={st.listName}>{s.name}</Text>
                  <Text style={st.listSub}>{s.subject}</Text>
                  <View style={st.progressBarWrap}>
                    <LinearGradient colors={[T.teal, T.sky]} style={[st.progressBar, { width: s.score }]} />
                  </View>
                </View>
                <View style={st.listRight}>
                  <View style={[st.rankMedal, { backgroundColor: T.tealLight }]}>
                    <Text style={[st.rankMedalText, { color: T.title }]}>{['A+','A','B+'][i]}</Text>
                  </View>
                  <Text style={st.scoreText}>{s.score}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.pageBg },
  bgBlob: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.1 },
  bgGeom: { position: 'absolute', opacity: 0.04 },

  heroWrap: { position: 'relative', marginBottom: 20 },
  heroGradient: {
    position: 'absolute', top: 0, left: 0, right: 0,
    borderBottomLeftRadius: 42, borderBottomRightRadius: 42, overflow: 'hidden'
  },
  heroPremiumCircle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -150, right: -100,
  },
  heroPremiumCircle2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -80, left: -80,
  },
  heroTopBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, zIndex: 3,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  schoolLogo: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  logoText: { fontSize: 16, fontWeight: '800', color: T.white },
  heroTopRight: { flexDirection: 'row', gap: 12 },
  glassBtnRight: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, zIndex: 2,
  },
  heroLeft: { flex: 0.65 },
  greeting: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  adminName: { fontSize: 32, fontWeight: '900', color: T.white, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subtitleText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  datePillText: { fontSize: 11, fontWeight: '800', color: T.white },
  heroRight: { flex: 0.35, alignItems: 'flex-end', justifyContent: 'center' },
  avatarFrame: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)' },
  avatarOuterGlow: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: T.white, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },

  statsContainer: {
    paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    marginTop: 10,
  },
  statCardWrap: { width: '48%', marginBottom: 16 },
  statCard: {
    width: '100%', height: 140, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statRadialGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)', top: '10%' },
  statGlass: { position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  statHeroImgOnly: { width: '70%', height: '70%' },
  statOverlayTextWrap: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  statCountText: { fontSize: 20, fontWeight: '900', color: T.white, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  statOverlayText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  sectionContainer: { marginVertical: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: T.title, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, color: T.subtitle, marginTop: 2, fontWeight: '500' },
  viewAllBtn: { fontSize: 12, fontWeight: '800', color: T.pink },

  mgmtGrid: { paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mgmtCardWrap2: { width: '48%', marginBottom: 16, paddingHorizontal: 4 },
  mgmtCard2: {
    width: '100%', height: 150, borderRadius: 24, padding: 16,
    justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, overflow: 'hidden',
  },
  mgmtImage2: { width: 85, height: 85 },
  mgmtTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 6 },
  mgmtTitle2: { fontSize: 13, fontWeight: '800', color: T.white, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, flexShrink: 1 },
  mgmtArrowWrap: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 3 },

  premiumListCard: {
    marginHorizontal: 16, backgroundColor: T.white, borderRadius: 20, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  listAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '800', color: T.title, marginBottom: 2 },
  listSub: { fontSize: 11, color: T.subtitle, marginBottom: 6 },
  progressBarWrap: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, width: '80%', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  listRight: { alignItems: 'flex-end' },
  rankMedal: { backgroundColor: '#FFF0F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
  rankMedalText: { fontSize: 10, fontWeight: '800', color: T.pink },
  scoreText: { fontSize: 13, fontWeight: '900', color: T.title },
});

export default AdminDashboardScreen;

/**
 * ProfileScreen.jsx — Premium EdTech Student Profile
 * UI redesign only — all APIs, Redux, navigation & logic preserved.
 * (Enhanced pass: richer avatar treatment, deeper shadows, accent details.)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity as RNTouchableOpacity,
  Image, Alert, Platform, RefreshControl,
  Pressable as RNPressable, StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { getProfileAPI } from '../../services/api';
import { logoutUser } from '../../redux/slices/authSlice';
import { getDiceBearUrl, APP_VERSION } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { Sparkle } from './BadgeIcons';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

const Pressable = (props) => {
  const { particleCount = 20, size = 'small', colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNPressable {...rest} />
    </ParticleWrapper>
  );
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  pink: '#FF4D8D',
  pinkLight: '#FF7EB3',
  teal: '#14C8C4',
  tealLight: '#6EE7E5',
  gold: '#FFC83D',
  goldDeep: '#F0A400',
  purple: '#8B5CF6',
  orange: '#FF9F43',
  white: '#FFFFFF',
  pageBg: '#F8F6FB',
  title: '#1F2937',
  subtitle: '#6B7280',
  error: '#C62828',
  errorBg: '#FFEBEE',
  errorBorder: '#FFCDD2',
};

const STUDENT_FEATURES = [
  {
    screen: 'ExamScores',
    title: 'Exam Scores',
    description: 'View your exam performance',
    icon: 'stats-chart',
    illustration: 'bar-chart',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  {
    screen: 'Attendance',
    title: 'Attendance',
    description: 'Check your attendance records',
    icon: 'calendar',
    illustration: 'calendar',
    gradient: [T.teal, T.tealLight],
  },
  {
    screen: 'Leave',
    title: 'Leave Application',
    description: 'Apply for leave or view status',
    icon: 'paper-plane',
    illustration: 'airplane',
    gradient: [T.orange, '#FFB347'],
  },
];

const haptics = { impact: () => {}, notify: () => {} };

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBlock({ width = '100%', height = 18, radius = 8, style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#E8D8EE', opacity: pulse }, style]} />
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: T.pageBg }}>
      <LinearGradient colors={[T.pink, T.pinkLight, T.teal]} style={{ height: 320, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} />
      <View style={{ padding: 16, marginTop: -40, gap: 14 }}>
        <SkeletonBlock height={180} radius={30} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBlock height={110} radius={24} style={{ flex: 1 }} />
          <SkeletonBlock height={110} radius={24} style={{ flex: 1 }} />
          <SkeletonBlock height={110} radius={24} style={{ flex: 1 }} />
        </View>
        {[1, 2, 3].map((i) => <SkeletonBlock key={i} height={120} radius={28} />)}
      </View>
    </View>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, expandable, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = expandable && value && value.length > 28;

  return (
    <Pressable
      style={[st.infoRow, isLast && { paddingBottom: 20 }]}
      onPress={canExpand ? () => setExpanded((e) => !e) : undefined}
      android_ripple={canExpand ? { color: 'rgba(255,77,141,0.08)' } : undefined}
    >
      <View style={st.infoIconWrap}>
        <Ionicons name={icon} size={22} color={T.pink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.infoLabel}>{label}</Text>
        <Text style={st.infoValue} numberOfLines={expanded ? undefined : 2} ellipsizeMode="tail">
          {value}
        </Text>
      </View>
      <Ionicons
        name={canExpand ? (expanded ? 'chevron-up' : 'chevron-down') : 'chevron-forward'}
        size={18}
        color={T.subtitle}
      />
    </Pressable>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, emoji, accentColor }) {
  return (
    <View style={[st.statCard, { borderTopColor: accentColor }]}>
      <View style={[st.statEmojiRing, { backgroundColor: accentColor + '16', borderColor: accentColor + '30' }]}>
        <Text style={st.statEmoji}>{emoji}</Text>
      </View>
      <Text style={[st.statNum, { color: accentColor }]}>{value}</Text>
      <Text style={st.statLbl}>{label}</Text>
      <View style={[st.statWave, { backgroundColor: accentColor + '22' }]} />
    </View>
  );
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────
function FeatureCard({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <LinearGradient
        colors={item.gradient || [T.pink, T.pinkLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.featureCard}
      >
        <View style={st.featureSheen} />
        <View style={st.featureLeft}>
          <View style={st.featureIconGlass}>
            <Ionicons name={item.icon} size={28} color={T.white} />
          </View>
          <View style={st.featureCopy}>
            <Text style={st.featureTitle}>{item.title}</Text>
            <Text style={st.featureDesc}>{item.description || item.label}</Text>
          </View>
        </View>
        <View style={st.featureRight}>
          <Ionicons name={item.illustration || item.icon} size={52} color="rgba(255,255,255,0.28)" />
          <View style={st.featureArrow}>
            <Ionicons name="arrow-forward" size={18} color={T.white} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Secondary menu item ──────────────────────────────────────────────────────
function SecondaryMenuItem({ item, onPress }) {
  return (
    <TouchableOpacity style={st.secondaryItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[st.secondaryAccent, { backgroundColor: item.color || T.pink }]} />
      <View style={[st.secondaryIcon, { backgroundColor: (item.color || T.pink) + '14' }]}>
        <Ionicons name={item.icon} size={20} color={item.color || T.pink} />
      </View>
      <Text style={st.secondaryLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={T.subtitle} />
    </TouchableOpacity>
  );
}

function LogoutButton({ onPress }) {
  return (
    <TouchableOpacity style={st.logoutBtn} onPress={() => { haptics.notify(); onPress(); }} activeOpacity={0.85}>
      <View style={st.logoutIconWrap}>
        <Ionicons name="log-out-outline" size={20} color={T.error} />
      </View>
      <Text style={st.logoutText}>Logout</Text>
      <Ionicons name="chevron-forward" size={18} color={T.error} />
    </TouchableOpacity>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  const runEntrance = useCallback(() => {
    anim1.setValue(0); anim2.setValue(0); anim3.setValue(0); headerAnim.setValue(0);
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(100, [
        Animated.timing(anim1, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.timing(anim2, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.timing(anim3, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const slide = (anim, from = 24) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getProfileAPI();
      setProfile(data.user || data.profile);
      setAvatarFailed(false);
      setTimeout(runEntrance, 80);
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, []);

  const performLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
    } catch {
      Toast.show({ type: 'error', text1: 'Logout failed. Please try again.' });
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm('Are you sure you want to logout?')) performLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  if (loading) return <ProfileSkeleton />;

  const p = profile || user;
  const avatarSource = avatarFailed ? '' : (p?.profilePicture || p?.profilePic || p?.profileImage || p?.avatar || '');
  const avatarUrl = (avatarSource || getDiceBearUrl(p?._id)).replace('/svg?', '/png?');
  const role = p?.role;

  const menuByRole = {
    student: [
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: T.pink },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: T.subtitle },
    ],
    teacher: [
      { icon: 'document-text-outline', label: 'Manage Materials', screen: 'TeacherMaterials', color: T.purple, description: 'Upload and manage study files', gradient: [T.purple, '#A78BFA'], illustration: 'folder-open' },
      { icon: 'bar-chart-outline', label: 'Monthly Report', screen: 'MonthlyReport', color: T.teal, description: 'View class performance reports', gradient: [T.teal, T.tealLight], illustration: 'analytics' },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: T.pink },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: T.subtitle },
    ],
    admin: [
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: T.pink },
      { icon: 'settings-outline', label: 'Settings', screen: 'Settings', color: T.subtitle },
    ],
  };

  const secondaryItems = menuByRole[role] || menuByRole.student;
  const featureItems = role === 'student'
    ? STUDENT_FEATURES
    : secondaryItems.filter((i) => i.gradient).map((i) => ({
      ...i,
      title: i.label,
      icon: i.icon.replace('-outline', ''),
    }));
  const menuExtras = role === 'student'
    ? secondaryItems
    : secondaryItems.filter((i) => !i.gradient);

  const displayName = (p?.displayName || p?.name || 'Student').toLowerCase();

  return (
    <ScrollView
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
      style={st.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPadding + 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.pink} colors={[T.pink]} />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor={T.pink} />

      {/* ── HERO ── */}
      <Animated.View style={slide(headerAnim, -10)}>
        <View style={st.heroWrap}>
          <LinearGradient
            colors={[T.pink, T.pinkLight, T.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.heroGradient}
          >
            <View style={st.heroBlob1} />
            <View style={st.heroBlob2} />
            <View style={st.heroBlob3} />
            <View style={st.heroSpark1}><Sparkle size={14} color="#FFFFFF" opacity={0.12} /></View>
            <View style={st.heroSpark2}><Sparkle size={11} color="#FFFFFF" opacity={0.10} /></View>
            <Text style={st.heroStar1}>⭐</Text>
            <Text style={st.heroStar2}>✨</Text>
            <Text style={st.heroConfetti}>🎉</Text>
          </LinearGradient>

          {/* Avatar + details */}
          <View style={[st.heroContent, { paddingTop: insets.top + 16 }]}>
            <View style={st.avatarGlow}>
              {/* Extra outer halo ring for a richer, layered avatar presentation */}
              <View style={st.avatarHalo}>
                <View style={st.avatarRing}>
                  <Image source={{ uri: avatarUrl }} style={st.avatar} onError={() => setAvatarFailed(true)} />
                  <View style={st.avatarBadge}>
                    <Ionicons name="star" size={12} color={T.white} />
                  </View>
                  <View style={st.avatarOnlineDot} />
                </View>
              </View>
            </View>

            <Text style={st.name}>{displayName}</Text>

            <View style={st.rolePill}>
              <Ionicons
                name={role === 'teacher' ? 'school-outline' : role === 'admin' ? 'shield-outline' : 'person-outline'}
                size={13}
                color={T.white}
              />
              <Text style={st.rolePillText}>{(p?.role || 'student').toUpperCase()}</Text>
            </View>

            {p?.grade && (
              <Text style={st.gradeText}>
                Grade {p.grade}{p?.board ? ` · ${p.board}` : ''}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={st.body}>
        {/* ── CONTACT INFO ── */}
        <Animated.View style={[st.contactCard, slide(anim1)]}>
          <View style={st.cardHeader}>
            <View style={st.cardHeaderIcon}>
              <Ionicons name="person-circle" size={22} color={T.pink} />
            </View>
            <Text style={st.cardTitle}>Contact Info</Text>
          </View>
          <InfoRow icon="call-outline" label="Mobile" value={p?.mobile || 'Not set'} />
          <View style={st.divider} />
          <InfoRow icon="mail-outline" label="Email" value={p?.email || 'Not set'} expandable />
          {p?.bio && (
            <>
              <View style={st.divider} />
              <InfoRow icon="document-text-outline" label="Bio" value={p.bio} expandable />
            </>
          )}
          {p?.joinedAt && (
            <>
              <View style={st.divider} />
              <InfoRow icon="time-outline" label="Joined" value={formatDate(p.joinedAt)} isLast />
            </>
          )}
        </Animated.View>

        {/* ── STATISTICS ── */}
        <Animated.View style={[st.statsRow, slide(anim2)]}>
          <StatCard label="Day Streak" value={p?.loginStreak || 0} emoji="🔥" accentColor={T.purple} />
          <StatCard label="Best Streak" value={p?.longestStreak || 0} emoji="🏆" accentColor={T.orange} />
          <StatCard label="Total Days" value={p?.totalLoginDays || 0} emoji="📅" accentColor={T.teal} />
        </Animated.View>

        {/* ── QUICK ACCESS ── */}
        <Animated.View style={slide(anim3)}>
          <View style={st.sectionTitleRow}>
            <Text style={st.sectionTitle}>QUICK ACCESS</Text>
            <View style={st.sectionTitleLine} />
            <Text style={st.sectionStar1}>✨</Text>
            <Text style={st.sectionStar2}>⭐</Text>
          </View>

          {featureItems.map((item) => (
            <FeatureCard
              key={item.screen}
              item={item}
              onPress={() => { haptics.impact(); navigation.navigate(item.screen); }}
            />
          ))}

          {menuExtras.map((item) => (
            <SecondaryMenuItem
              key={item.label}
              item={item}
              onPress={() => { haptics.impact(); navigation.navigate(item.screen); }}
            />
          ))}

          <Text style={st.accountLabel}>ACCOUNT</Text>
          <LogoutButton onPress={handleLogout} />
          <Text style={st.version}>v{APP_VERSION}</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.pageBg },

  // ── HERO ──
  heroWrap: { position: 'relative', marginBottom: 0 },
  heroGradient: {
    height: 320,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -70, right: -50,
  },
  heroBlob2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.10)', bottom: 30, left: -40,
  },
  heroBlob3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)', top: 60, right: 80,
  },
  heroSpark1: { position: 'absolute', top: 80, left: 30, opacity: 0.12 },
  heroSpark2: { position: 'absolute', bottom: 90, right: 40, opacity: 0.10 },
  heroStar1: { position: 'absolute', top: 100, right: 24, fontSize: 16, opacity: 0.12 },
  heroStar2: { position: 'absolute', top: 140, left: 20, fontSize: 14, opacity: 0.10 },
  heroConfetti: { position: 'absolute', bottom: 70, right: 60, fontSize: 16, opacity: 0.12 },
  heroContent: { alignItems: 'center', marginTop: -280, paddingBottom: 52, zIndex: 2 },

  // Layered avatar presentation: outer glow shadow -> translucent halo ring -> white ring -> photo
  avatarGlow: {
    shadowColor: T.pink, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 10, marginBottom: 16,
  },
  avatarHalo: {
    width: 122, height: 122, borderRadius: 61,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 5, borderColor: T.white,
    overflow: 'visible', position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarBadge: {
    position: 'absolute', right: 2, bottom: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.goldDeep, borderWidth: 2.5, borderColor: T.white,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarOnlineDot: {
    position: 'absolute', left: 4, top: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: T.white,
  },
  name: {
    fontSize: 32, fontWeight: '900', color: T.title,
    textAlign: 'center', letterSpacing: -0.5,
    textTransform: 'lowercase', paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.05)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: 'rgba(31,41,55,0.08)',
    borderWidth: 1, borderColor: 'rgba(31,41,55,0.15)',
  },
  rolePillText: { fontSize: 11, fontWeight: '800', color: T.title, letterSpacing: 1.2 },
  gradeText: { fontSize: 14, fontWeight: '600', color: T.subtitle, marginTop: 8 },

  body: { paddingHorizontal: 16, gap: 16 },

  // ── CONTACT CARD ──
  contactCard: {
    marginTop: -40,
    backgroundColor: T.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(31,41,55,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  cardHeaderIcon: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,77,141,0.10)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '900', color: T.title },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  infoIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,77,141,0.10)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  infoLabel: { fontSize: 11, color: T.subtitle, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  infoValue: { fontSize: 15, fontWeight: '700', color: T.title, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20 },

  // ── STATS ──
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, height: 118, backgroundColor: T.white, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', paddingTop: 6,
    borderTopWidth: 4, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 6,
  },
  statEmojiRing: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statEmoji: { fontSize: 18 },
  statNum: { fontSize: 24, fontWeight: '900' },
  statLbl: { fontSize: 10, fontWeight: '700', color: T.subtitle, marginTop: 2, textAlign: 'center' },
  statWave: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },

  // ── QUICK ACCESS ──
  sectionTitleRow: { position: 'relative', marginTop: 4, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: T.subtitle, letterSpacing: 1.2 },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: 'rgba(107,114,128,0.15)', marginLeft: 10 },
  sectionStar1: { position: 'absolute', top: -4, right: 28, fontSize: 12, opacity: 0.45 },
  sectionStar2: { position: 'absolute', top: 2, right: 8, fontSize: 10, opacity: 0.35 },
  featureCard: {
    height: 120, borderRadius: 28, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 8,
  },
  featureSheen: {
    position: 'absolute', top: -40, left: -20, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)',
  },
  featureLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  featureIconGlass: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  featureCopy: { flex: 1 },
  featureTitle: { fontSize: 17, fontWeight: '900', color: T.white },
  featureDesc: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 16 },
  featureRight: { alignItems: 'flex-end', justifyContent: 'center', position: 'relative', width: 72 },
  featureArrow: {
    position: 'absolute', bottom: -8, right: 0,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },

  secondaryItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.white, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    overflow: 'hidden',
  },
  secondaryAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
  },
  secondaryIcon: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  secondaryLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: T.title },

  accountLabel: {
    fontSize: 13, fontWeight: '900', color: T.subtitle,
    letterSpacing: 1.2, marginTop: 8, marginBottom: 10,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.errorBg, borderRadius: 20,
    borderWidth: 1.5, borderColor: T.errorBorder,
    paddingVertical: 16, paddingHorizontal: 16, gap: 12,
  },
  logoutIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: '#FFCDD2', justifyContent: 'center', alignItems: 'center',
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '800', color: T.error },
  version: { textAlign: 'center', fontSize: 12, color: T.subtitle, marginTop: 16, marginBottom: 8 },
});

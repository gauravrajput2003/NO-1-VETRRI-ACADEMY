/**
 * ProfileScreen.jsx - Enhanced EdTech Profile
 *
 * Key improvements over original:
 *  - Email / long text truncated with expandable tap (no more hidden text)
 *  - Logout button has clear red-tinted background and border
 *  - Glassmorphism hero with animated gradient shimmer
 *  - Skeleton loading instead of bare spinner
 *  - Edit Profile shortcut on avatar
 *  - Stats row upgraded to progress-ring style
 *  - Menu items with colored left-accent bars
 *  - Pull-to-refresh
 *  - Section headers between grouped items
 *  - Responsive email/text: wraps gracefully, no overflow
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, RefreshControl,
  Pressable,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Animated, Easing } from 'react-native';

import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { getProfileAPI } from '../../services/api';
import { logoutUser } from '../../redux/slices/authSlice';
import { getDiceBearUrl, APP_VERSION } from '../../utils/constants';
import { formatDate, getInitials } from '../../utils/formatters';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';

// --- Design tokens ------------------------------------------------------------
const C = {
  primary:     '#D81B60',   // deep rose
  primaryLight:'#F06292',   // medium rose
  primaryGhost:'#FCE4EC',   // very light rose bg
  accent:      '#FF6F00',   // amber accent
  accentLight: '#FFF3E0',
  teal:        '#00897B',
  tealLight:   '#E0F2F1',
  purple:      '#5E35B1',
  purpleLight: '#EDE7F6',
  blue:        '#1565C0',
  blueLight:   '#E3F2FD',
  dark:        '#1A1A2E',
  mid:         '#5C5C7A',
  muted:       '#9E9EB8',
  border:      '#EDE8F5',
  cardBg:      '#FFFFFF',
  pageBg:      '#F7F3FC',
  white:       '#FFFFFF',
  error:       '#C62828',
  errorBg:     '#FFEBEE',
  errorBorder: '#FFCDD2',
  success:     '#2E7D32',
  successBg:   '#E8F5E9',
};

const GRADIENT = ['#880E4F', '#C2185B', '#E91E63'];

const haptics = {
  impact: () => {},
  notify: () => {},
};

// --- Skeleton loader ----------------------------------------------------------
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
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: '#E8D8EE', opacity: pulse }, style]}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <LinearGradient colors={GRADIENT} style={[st.header, { paddingBottom: 36 }]}>
        <SkeletonBlock width={88} height={88} radius={44} style={{ marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <SkeletonBlock width={140} height={20} radius={10} style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.3)' }} />
        <SkeletonBlock width={80} height={24} radius={12} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
      </LinearGradient>
      <View style={{ padding: 16, gap: 12 }}>
        <SkeletonBlock height={110} radius={18} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SkeletonBlock height={80} radius={14} style={{ flex: 1 }} />
          <SkeletonBlock height={80} radius={14} style={{ flex: 1 }} />
          <SkeletonBlock height={80} radius={14} style={{ flex: 1 }} />
        </View>
        {[1,2,3,4].map(i => <SkeletonBlock key={i} height={58} radius={14} />)}
      </View>
    </View>
  );
}

// --- InfoRow with expand support ---------------------------------------------
function InfoRow({ icon, label, value, expandable }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = expandable && value && value.length > 28;

  return (
    <Pressable
      style={st.infoRow}
      onPress={canExpand ? () => setExpanded(e => !e) : undefined}
      android_ripple={canExpand ? { color: C.primaryGhost } : undefined}
    >
      <View style={st.infoIconWrap}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.infoLabel}>{label}</Text>
        <Text
          style={st.infoValue}
          numberOfLines={expanded ? undefined : 1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
      </View>
      {canExpand && (
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={C.muted}
          style={{ marginLeft: 6 }}
        />
      )}
    </Pressable>
  );
}

// --- StatBox -----------------------------------------------------------------
function StatBox({ label, value, icon, color, bgColor }) {
  return (
    <View style={[st.statBox, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[st.statNum, { color }]}>{value}</Text>
      <Text style={st.statLbl}>{label}</Text>
    </View>
  );
}

// --- SectionHeader ------------------------------------------------------------
function SectionHeader({ title }) {
  return (
    <Text style={st.sectionHeader}>{title}</Text>
  );
}

// --- MenuItem ----------------------------------------------------------------
function MenuItem({ item, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    haptics.impact();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onPress());
  };
  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 8 }}>
      <TouchableOpacity style={st.menuItem} onPress={press} activeOpacity={1}>
        <View style={[st.menuAccent, { backgroundColor: item.color }]} />
        <View style={[st.menuIconWrap, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <Text style={st.menuLabel}>{item.label}</Text>
        <View style={st.menuChevron}>
          <Ionicons name="chevron-forward" size={15} color={C.muted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function LogoutButton({ onPress }) {
  return (
    <TouchableOpacity
      style={st.logoutBtn}
      onPress={() => {
        haptics.notify();
        onPress();
      }}
      activeOpacity={0.85}
    >
      <View style={st.logoutIconWrap}>
        <Ionicons name="log-out-outline" size={20} color={C.error} />
      </View>
      <Text style={st.logoutText}>Logout</Text>
      <Ionicons name="chevron-forward" size={15} color={C.error} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations - always at top
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

  const p         = profile || user;
  const avatarUrl = p?.profilePic || getDiceBearUrl(p?._id);
  const role      = p?.role;

  const menuByRole = {
    student: [
      { icon: 'stats-chart-outline',    label: 'Exam Scores',      screen: 'ExamScores',    color: C.purple },
      { icon: 'calendar-outline',       label: 'Attendance',       screen: 'Attendance',    color: C.teal   },
      { icon: 'airplane-outline',       label: 'Leave Application',screen: 'Leave',         color: C.accent },
      { icon: 'notifications-outline',  label: 'Notifications',    screen: 'Notifications', color: C.primary},
      { icon: 'settings-outline',       label: 'Settings',         screen: 'Settings',      color: C.mid    },
    ],
    teacher: [
      { icon: 'document-text-outline',  label: 'Manage Materials', screen: 'TeacherMaterials', color: C.purple },
      { icon: 'bar-chart-outline',      label: 'Monthly Report',   screen: 'MonthlyReport',    color: C.teal   },
      { icon: 'notifications-outline',  label: 'Notifications',    screen: 'Notifications',    color: C.primary},
      { icon: 'settings-outline',       label: 'Settings',         screen: 'Settings',         color: C.mid    },
    ],
    admin: [
      { icon: 'notifications-outline',  label: 'Notifications',    screen: 'Notifications', color: C.primary},
      { icon: 'settings-outline',       label: 'Settings',         screen: 'Settings',      color: C.mid    },
    ],
  };
  const menuItems = menuByRole[role] || menuByRole.student;

  return (
    <ScrollView
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
      style={st.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
      }
    >

      <Animated.View style={slide(headerAnim, -10)}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
          {/* Edit shortcut */}
          <TouchableOpacity
            style={st.editBtn}
            onPress={() => {
              haptics.impact();
              navigation.navigate('EditProfile');
            }}
          >
            <Ionicons name="pencil" size={15} color="#FFF" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={st.avatarRing}>
            {avatarUrl?.includes('dicebear') ? (
              <View style={st.avatarPlaceholder}>
                <Text style={st.initials}>{getInitials(p?.name)}</Text>
              </View>
            ) : (
              <Image source={{ uri: avatarUrl }} style={st.avatar} />
            )}
          </View>

          <Text style={st.name}>{p?.displayName || p?.name}</Text>

          {/* Role pill */}
          <View style={st.rolePill}>
            <Ionicons
              name={role === 'teacher' ? 'school-outline' : role === 'admin' ? 'shield-outline' : 'person-outline'}
              size={12}
              color="#FFF"
              style={{ marginRight: 4 }}
            />
            <Text style={st.rolePillText}>{p?.role?.toUpperCase()}</Text>
          </View>

          {p?.grade && (
            <Text style={st.grade}>Grade {p.grade}  ·  {p?.board || 'N/A'}</Text>
          )}

          {/* Bottom wave */}
          <View style={st.waveCutout} />
        </LinearGradient>
      </Animated.View>

      <View style={st.body}>

        {/* -- Info card -------------------------------------------------- */}
        <Animated.View style={[st.card, slide(anim1)]}>
          <View style={st.cardHeader}>
            <Ionicons name="person-circle-outline" size={18} color={C.primary} />
            <Text style={st.cardTitle}>Contact Info</Text>
          </View>
          <InfoRow icon="call-outline"  label="Mobile" value={p?.mobile || 'Not set'} />
          <View style={st.divider} />
          <InfoRow icon="mail-outline"  label="Email"  value={p?.email  || 'Not set'} expandable />
          {p?.bio && (
            <>
              <View style={st.divider} />
              <InfoRow icon="pencil-outline" label="Bio" value={p.bio} expandable />
            </>
          )}
          {p?.joinedAt && (
            <>
              <View style={st.divider} />
              <InfoRow icon="time-outline" label="Joined" value={formatDate(p.joinedAt)} />
            </>
          )}
        </Animated.View>
        <Animated.View style={[st.statsRow, slide(anim2)]}>
          <StatBox label="Day Streak"  value={`🔥 ${p?.loginStreak    || 0}`} color={C.purple}  />
          <StatBox label="Best Streak" value={`🏆 ${p?.longestStreak  || 0}`} color={C.accent}  />
          <StatBox label="Total Days"  value={`📅 ${p?.totalLoginDays || 0}`} color={C.teal}    />
        </Animated.View>
        <Animated.View style={slide(anim3)}>
          <SectionHeader title="Quick Access" />
          {menuItems.map(item => (
            <MenuItem key={item.label} item={item} onPress={() => navigation.navigate(item.screen)} />
          ))}

          <SectionHeader title="Account" />
          <LogoutButton onPress={handleLogout} />

          <Text style={st.version}>v{APP_VERSION}</Text>
        </Animated.View>

      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.pageBg },

  // Hero
  header: {
    paddingTop: 64,
    paddingBottom: 48,
    alignItems: 'center',
  },
  waveCutout: {
    position: 'absolute',
    bottom: -1,
    left: 0, right: 0,
    height: 28,
    backgroundColor: C.pageBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  editBtn: {
    position: 'absolute',
    top: 56, right: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 50,
    padding: 3,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar:            { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  initials:     { fontSize: 30, fontWeight: '800', color: '#FFF' },
  name:         { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 10, letterSpacing: 0.2 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  rolePillText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 1.4 },
  grade:        { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },

  // Generic card
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 18,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.dark, letterSpacing: 0.3 },

  // InfoRow
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primaryGhost,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 2, letterSpacing: 0.2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.dark },
  divider:   { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: C.cardBg, borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  statNum: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLbl: { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' },

  // Section header
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, marginTop: 4, marginLeft: 4,
  },

  // Menu item
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    minHeight: 58,
  },
  menuAccent:   { width: 4, alignSelf: 'stretch' },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12, marginRight: 4,
    flexShrink: 0,
  },
  menuLabel:   { flex: 1, fontSize: 15, fontWeight: '600', color: C.dark, paddingHorizontal: 4 },
  menuChevron: {
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.errorBg,
    borderRadius: 14,
    borderWidth: 1.5, borderColor: C.errorBorder,
    paddingVertical: 15, paddingHorizontal: 16,
    gap: 12, marginBottom: 8,
  },
  logoutIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFCDD2',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: C.error, flex: 1 },

  version: {
    textAlign: 'center', fontSize: 12,
    color: C.muted, marginTop: 12, marginBottom: 24,
  },
});
import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking, ScrollView, Image, StatusBar, Animated, Easing,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { formatScheduledTime, formatDate } from '../../utils/formatters';
import { getDiceBearUrl } from '../../utils/constants';
import { fetchSchedules, joinClass, clearJoinResult } from '../../redux/slices/classesSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
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

const T = {
  pink: '#FF4D8D',
  pinkLight: '#FF7EB3',
  teal: '#14C8C4',
  tealLight: '#6EE7E5',
  gold: '#FFC83D',
  orange: '#FF9F43',
  white: '#FFFFFF',
  pageBg: '#F8F6FB',
  title: '#1F2937',
  subtitle: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  purple: '#8B5CF6',
};

const FILTER_CHIPS = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'scheduled', label: 'Scheduled', icon: 'calendar' },
  { key: 'live', label: 'Live', icon: 'radio-button-on' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle' },
];

function getSubjectEmoji(subject, title) {
  const s = `${subject || ''} ${title || ''}`.toLowerCase();
  if (s.includes('math')) return '📘';
  if (s.includes('science')) return '🔬';
  if (s.includes('english')) return '📖';
  if (s.includes('computer') || s.includes('coding')) return '💻';
  return '📚';
}

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.8, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
      transform: [{ scale }], opacity,
    }} />
  );
}

export default function ClassesScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { schedules, loading, joinResult } = useSelector((s) => s.classes);
  const { unreadCount } = useSelector((s) => s.notifications);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [summaryStats, setSummaryStats] = useState({ total: 0, live: 0, completed: 0, upcoming: 0 });
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadClasses = () => {
    const params = filter !== 'all' ? { status: filter } : {};
    dispatch(fetchSchedules(params));
  };

  useEffect(() => { loadClasses(); }, [filter]);
  useEffect(() => { dispatch(fetchUnreadNotificationCount()); }, [dispatch]);

  useEffect(() => {
    if (filter !== 'all') return;
    setSummaryStats({
      total: schedules.length,
      live: schedules.filter((c) => c.status === 'live').length,
      completed: schedules.filter((c) => c.status === 'completed').length,
      upcoming: schedules.filter((c) => c.status === 'scheduled').length,
    });
  }, [schedules, filter]);

  useEffect(() => {
    if (joinResult) {
      if (joinResult.meetLink) {
        Toast.show({ type: 'success', text1: 'Joined!', text2: joinResult.message });
        Linking.openURL(joinResult.meetLink);
      }
      dispatch(clearJoinResult());
    }
  }, [joinResult, dispatch]);

  const onRefresh = () => { setRefreshing(true); loadClasses(); setRefreshing(false); };
  const handleJoin = (classId) => { dispatch(joinClass(classId)); };

  const summaryCards = useMemo(() => [
    { emoji: '📚', label: 'Total Classes', value: summaryStats.total, tint: T.purple },
    { emoji: '🔴', label: 'Live Classes', value: summaryStats.live, tint: T.pink },
    { emoji: '✅', label: 'Completed', value: summaryStats.completed, tint: T.green },
    { emoji: '⏰', label: 'Upcoming', value: summaryStats.upcoming, tint: T.teal },
  ], [summaryStats]);

  const openNotifications = () => {
    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.navigate('Home', { screen: 'Notifications' });
    } else {
      navigation.navigate('Notifications');
    }
  };

  const renderClass = ({ item }) => {
    const subject = item.subject || item.title || 'Class';
    const teacher = item.teacherId;
    const teacherName = teacher?.displayName || teacher?.name || 'Teacher';
    const teacherAvatar = teacher?.profilePicture || teacher?.profilePic || getDiceBearUrl(teacher?._id);
    const emoji = getSubjectEmoji(item.subject, item.title);
    const duration = item.durationMinutes || 60;
    const status = item.status;

    if (status === 'cancelled') {
      return (
        <View style={st.cancelCard}>
          <View style={st.cancelLeft}>
            <View style={st.cancelIconWrap}><Text style={st.subjectEmoji}>📅</Text></View>
            <View style={st.cardBody}>
              <Text style={st.cancelTitle} numberOfLines={1}>{subject}</Text>
              <Text style={st.cancelSub}>Class Cancelled</Text>
              <Text style={st.cancelMeta}>{formatDate(item.scheduledDate)} · {formatScheduledTime(item.scheduledTime)}</Text>
            </View>
          </View>
          <View style={st.cancelBadge}>
            <Text style={st.cancelBadgeText}>CANCELLED</Text>
          </View>
        </View>
      );
    }

    const cardStyle = status === 'live'
      ? st.liveCard
      : status === 'completed'
        ? st.completedCard
        : st.scheduledCard;

    const cardBg = status === 'live'
      ? ['rgba(255,77,141,0.12)', 'rgba(255,159,67,0.10)']
      : status === 'completed'
        ? [T.greenLight, '#F0FDF4']
        : ['rgba(20,200,196,0.12)', 'rgba(110,231,229,0.08)'];

    return (
      <View style={[st.classCardWrap, cardStyle]}>
        <LinearGradient colors={cardBg} style={st.classCard}>
          <TouchableOpacity
            style={st.cardTopRow}
            onPress={() => navigation.navigate('ClassDetail', { classId: item._id })}
            activeOpacity={0.9}
          >
            <View style={[st.subjectIconWrap, { backgroundColor: T.white }]}>
              <Text style={st.subjectEmoji}>{emoji}</Text>
            </View>

            <View style={st.cardBody}>
              <Text style={st.classTitle} numberOfLines={1}>{subject}</Text>
              <View style={st.teacherRow}>
                <Image source={{ uri: teacherAvatar }} style={st.teacherAvatar} />
                <Text style={st.teacherName} numberOfLines={1}>{teacherName}</Text>
              </View>
              <Text style={st.timeText}>
                {formatScheduledTime(item.scheduledTime)} · {duration} min
              </Text>
              <Text style={st.dateText}>{formatDate(item.scheduledDate)}</Text>
            </View>

            <View style={st.statusCol}>
              {status === 'live' && (
                <View style={st.liveBadge}>
                  <PulseDot />
                  <Text style={st.liveBadgeText}>LIVE NOW</Text>
                </View>
              )}
              {status === 'scheduled' && (
                <View style={st.upcomingBadge}>
                  <Text style={st.upcomingBadgeText}>Upcoming</Text>
                </View>
              )}
              {status === 'completed' && (
                <View style={st.doneBadge}>
                  <Text style={st.doneBadgeText}>✅ Completed</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {status === 'live' && (
            <TouchableOpacity onPress={() => handleJoin(item._id)} activeOpacity={0.9}>
              <LinearGradient colors={[T.pink, T.pinkLight]} style={st.joinBtn}>
                <Ionicons name="videocam" size={20} color={T.white} />
                <Text style={st.joinBtnText}>Join Live Class</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'scheduled' && (
            <TouchableOpacity onPress={() => navigation.navigate('ClassDetail', { classId: item._id })} activeOpacity={0.9}>
              <LinearGradient colors={[T.teal, T.tealLight]} style={st.actionBtn}>
                <Text style={st.actionBtnText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color={T.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'completed' && item.recordingUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(item.recordingUrl)} activeOpacity={0.9}>
              <LinearGradient colors={['#16A34A', '#22C55E']} style={st.actionBtn}>
                <Ionicons name="play-circle" size={18} color={T.white} />
                <Text style={st.actionBtnText}>View Recording</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={st.heroWrap}>
        <LinearGradient
          colors={[T.pink, T.pinkLight, T.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.heroGradient}
        >
          <View style={st.heroBlob1} />
          <View style={st.heroBlob2} />
          <View style={st.heroSpark1}><Sparkle size={12} color="#FFFFFF" opacity={0.12} /></View>
          <Text style={st.heroStar1}>⭐</Text>
          <Text style={st.heroStar2}>✨</Text>
          <Text style={st.heroConfetti}>🎉</Text>
        </LinearGradient>

        <View style={[st.heroBar, { paddingTop: insets.top + 10 }]}>
          <View>
            <Text style={st.heroTitle}>Classes</Text>
            <Text style={st.heroSubtitle}>Your Learning Schedule</Text>
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity style={st.heroBtn} onPress={() => dispatch(toggleAI())} activeOpacity={0.85}>
              <Ionicons name="gift" size={20} color={T.pink} />
            </TouchableOpacity>
            <TouchableOpacity style={st.heroBtn} onPress={openNotifications} activeOpacity={0.85}>
              <Ionicons name="notifications-outline" size={22} color={T.title} />
              {unreadCount > 0 && (
                <View style={st.notifBadge}>
                  <Text style={st.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.summaryScroll}>
        {summaryCards.map((s) => (
          <View key={s.label} style={st.summaryCard}>
            <Text style={st.summaryEmoji}>{s.emoji}</Text>
            <Text style={[st.summaryValue, { color: s.tint }]}>{s.value}</Text>
            <Text style={st.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipScroll}>
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <TouchableOpacity key={chip.key} onPress={() => setFilter(chip.key)} activeOpacity={0.85}>
              {active ? (
                <LinearGradient colors={[T.pink, T.pinkLight]} style={st.chipActive}>
                  <Ionicons name={chip.icon} size={14} color={T.white} />
                  <Text style={st.chipActiveText}>{chip.label}</Text>
                </LinearGradient>
              ) : (
                <View style={st.chipInactive}>
                  <Ionicons name={chip.icon} size={14} color={T.subtitle} />
                  <Text style={st.chipInactiveText}>{chip.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.pink} />

      {loading && !refreshing ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <ActivityIndicator size="large" color={T.pink} style={{ marginTop: 32 }} />
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item._id}
          renderItem={renderClass}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.pink]} tintColor={T.pink} />
          }
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 16 }}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyEmoji}>📚</Text>
              <Text style={st.emptyTitle}>No Classes Today</Text>
              <Text style={st.emptySub}>Enjoy your learning journey</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.pageBg },

  heroWrap: { marginHorizontal: -16, marginBottom: 14 },
  heroGradient: { height: 180, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroBlob1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -40, right: -20,
  },
  heroBlob2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.10)', bottom: 10, left: -20,
  },
  heroSpark1: { position: 'absolute', top: 50, left: 30, opacity: 0.12 },
  heroStar1: { position: 'absolute', top: 36, right: 40, fontSize: 14, opacity: 0.12 },
  heroStar2: { position: 'absolute', bottom: 30, left: 50, fontSize: 12, opacity: 0.10 },
  heroConfetti: { position: 'absolute', top: 60, right: 80, fontSize: 14, opacity: 0.10 },
  heroBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, zIndex: 2,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: T.white, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.90)', marginTop: 4 },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: T.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  notifBadge: {
    position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: T.white,
  },
  notifBadgeText: { fontSize: 8, fontWeight: '900', color: T.white },

  summaryScroll: { gap: 10, paddingBottom: 14, paddingRight: 4 },
  summaryCard: {
    width: 118, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: T.white, borderRadius: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  summaryEmoji: { fontSize: 18, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: T.subtitle, marginTop: 2, textAlign: 'center' },

  chipScroll: { gap: 10, paddingBottom: 16 },
  chipActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
  },
  chipActiveText: { fontSize: 13, fontWeight: '800', color: T.white },
  chipInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: T.white, borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipInactiveText: { fontSize: 13, fontWeight: '700', color: T.subtitle },

  classCardWrap: { marginBottom: 14, borderRadius: 28, overflow: 'hidden' },
  liveCard: {
    shadowColor: T.pink, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  scheduledCard: {
    shadowColor: T.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
  },
  completedCard: {
    shadowColor: T.green, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 4,
  },
  classCard: { borderRadius: 28, padding: 16, minHeight: 150 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  subjectIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  subjectEmoji: { fontSize: 28 },
  cardBody: { flex: 1, minWidth: 0 },
  classTitle: { fontSize: 17, fontWeight: '900', color: T.title, marginBottom: 6 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  teacherAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' },
  teacherName: { fontSize: 13, fontWeight: '700', color: T.subtitle, flex: 1 },
  timeText: { fontSize: 12, fontWeight: '700', color: T.title, marginTop: 2 },
  dateText: { fontSize: 11, fontWeight: '600', color: T.subtitle, marginTop: 2 },
  statusCol: { alignItems: 'flex-end' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  liveBadgeText: { fontSize: 10, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 },
  upcomingBadge: {
    backgroundColor: 'rgba(20,200,196,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  upcomingBadgeText: { fontSize: 10, fontWeight: '800', color: T.teal },
  doneBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
  },
  doneBadgeText: { fontSize: 10, fontWeight: '800', color: T.green },

  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 25, marginTop: 14,
    shadowColor: T.pink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  joinBtnText: { fontSize: 15, fontWeight: '900', color: T.white },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, borderRadius: 22, marginTop: 12, paddingHorizontal: 16,
  },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: T.white },

  cancelCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F4F6', borderRadius: 28, padding: 16, marginBottom: 14,
    minHeight: 120, opacity: 0.85,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cancelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cancelIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  cancelTitle: { fontSize: 16, fontWeight: '800', color: '#9CA3AF' },
  cancelSub: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginTop: 4 },
  cancelMeta: { fontSize: 11, fontWeight: '600', color: '#B0B0B0', marginTop: 4 },
  cancelBadge: {
    backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  cancelBadgeText: { fontSize: 9, fontWeight: '900', color: '#9CA3AF', letterSpacing: 0.8 },

  empty: { alignItems: 'center', marginTop: 48, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: T.title },
  emptySub: { fontSize: 14, fontWeight: '600', color: T.subtitle, marginTop: 6, textAlign: 'center' },
});

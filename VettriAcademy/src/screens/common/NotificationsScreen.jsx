import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { formatRelativeTime } from '../../utils/formatters';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
} from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { resolveNotificationTarget } from '../../utils/notificationNavigation';

// ---------------------------------------------------------------------------
// Responsive scaling helpers
// Base dimensions are a standard 375x812 (iPhone X) design reference.
// Every size in the stylesheet is derived from these so the layout scales
// smoothly on small phones (iPhone SE), large phones (Pro Max), and tablets,
// without ever looking too cramped or too oversized.
// ---------------------------------------------------------------------------
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

function useResponsive() {
  const { width, height } = useWindowDimensions();

  const widthScale = width / BASE_WIDTH;
  const heightScale = height / BASE_HEIGHT;
  // Moderate scale: blends width-scale with a dampening factor so text/icons
  // don't grow linearly (and become huge) on large-screen devices/tablets.
  const moderateScale = (size, factor = 0.5) => size + (widthScale * size - size) * factor;
  const scaleFont = (size) => {
    const newSize = moderateScale(size, 0.3);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  const isSmallDevice = width < 360;
  const isTablet = width >= 768;

  return { width, height, widthScale, heightScale, moderateScale, scaleFont, isSmallDevice, isTablet };
}

const NOTIF_COLORS = {
  scores: { bg: ['#DBEAFE', '#BFDBFE'], text: '#1E3A8A', icon: 'stats-chart', strip: '#3B82F6' },
  attendance: { bg: ['#CCFBF1', '#99F6E4'], text: '#115E59', icon: 'calendar', strip: '#14B8A6' },
  homework: { bg: ['#FFEDD5', '#FED7AA'], text: '#9A3412', icon: 'document-text', strip: '#F97316' },
  live: { bg: ['#F3E8FF', '#E9D5FF'], text: '#5B21B6', icon: 'videocam', strip: '#8B5CF6' },
  doubt: { bg: ['#FCE7F3', '#FBCFE8'], text: '#9D174D', icon: 'help-circle', strip: '#EC4899' },
  announcement: { bg: ['#DCFCE7', '#BBF7D0'], text: '#166534', icon: 'megaphone', strip: '#22C55E' },
  default: { bg: ['#F3F4F6', '#E5E7EB'], text: '#374151', icon: 'notifications', strip: '#6B7280' },
};

function getCategoryConfig(type) {
  if (type === 'general') return NOTIF_COLORS.scores;
  if (['leave_approved', 'leave_rejected', 'leave_applied', 'compensation_approved', 'fee_reminder', 'fee_paid', 'fee_partial', 'fee_overdue'].includes(type)) {
    return NOTIF_COLORS.attendance;
  }
  if (type === 'study_material') return NOTIF_COLORS.homework;
  if (['live_class', 'class_starting'].includes(type)) return NOTIF_COLORS.live;
  if (['doubt_created', 'doubt_assigned', 'doubt_reply', 'doubt_status'].includes(type)) return NOTIF_COLORS.doubt;
  if (['announcement', 'new_enquiry'].includes(type)) return NOTIF_COLORS.announcement;
  // Legacy / still-used backend types
  if (type === 'new_score') return NOTIF_COLORS.scores;
  if (['class_reminder', 'recording_available'].includes(type)) return NOTIF_COLORS.live;
  if (['new_material', 'material_unlocked'].includes(type)) return NOTIF_COLORS.homework;
  if (['leave_update', 'compensation_completed', 'salary_paid'].includes(type)) return NOTIF_COLORS.attendance;
  if (type === 'chat') return NOTIF_COLORS.doubt;
  return NOTIF_COLORS.default;
}

const ScaleButton = ({ onPress, children, style, activeOpacity = 1 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity activeOpacity={activeOpacity} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = React.useMemo(() => createStyles(r), [r.width, r.height]);

  const { list = [], loading = false, page = 1, hasMore = false } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications(1));
    dispatch(fetchUnreadNotificationCount());
  }, [dispatch]);

  // IMPORTANT: this screen renders its own header below. Make sure the
  // parent navigator does NOT also render a default stack header, or you'll
  // get the "two headers" issue seen in the screenshot. Either:
  //   1. Set this in your navigator: <Stack.Screen name="Notifications"
  //      component={NotificationsScreen} options={{ headerShown: false }} />
  //   2. Or set it globally on the mount via navigation.setOptions below.
  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const unreadCount = list.filter((n) => !n.isRead).length;

  const handlePress = (item) => {
    if (!item.isRead) dispatch(markNotificationRead(item._id));
    const { screen, params } = resolveNotificationTarget(item);
    navigation.navigate(screen, params);
  };

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      dispatch(fetchNotifications(page + 1));
    }
  }, [dispatch, hasMore, loading, page]);

  const renderRightActions = (item) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => dispatch(deleteNotification(item._id))}
      activeOpacity={0.85}
    >
      <Ionicons name="trash-outline" size={r.scaleFont(22)} color="#FFFFFF" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }) => {
    const config = getCategoryConfig(item.type);

    return (
      <Animated.View style={{ animationDuration: '0.4s', animationDelay: `${index * 0.05}s` }}>
        <Swipeable
          overshootRight={false}
          renderRightActions={() => renderRightActions(item)}
        >
          <ScaleButton style={styles.cardWrap} onPress={() => handlePress(item)}>
            <LinearGradient
              colors={!item.isRead ? ['#F0FDFA', '#CCFBF1'] : ['#F0FDFA', '#E6FFFA']}
              style={styles.card}
            >
              <View style={[styles.accentStrip, { backgroundColor: config.strip }]} />

              <View style={styles.cardHeader}>
                <LinearGradient colors={config.bg} style={styles.iconCircle}>
                  <Ionicons name={config.icon} size={r.scaleFont(26)} color={config.text} />
                </LinearGradient>

                <View style={styles.timePill}>
                  <Text style={styles.timeText} numberOfLines={1}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.message}</Text>
              </View>

              {!item.isRead && (
                <View style={styles.unreadGlow}>
                  <View style={styles.unreadDot} />
                </View>
              )}

              <View style={styles.glassHighlight} />
            </LinearGradient>
          </ScaleButton>
        </Swipeable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4F8B" />
      <LinearGradient
        colors={['#FFF8FB', '#F8F7FC', '#F5FCFF', '#F2FFFC']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative blobs — sized as a fraction of screen width so they never
          overwhelm small phones or look tiny on large ones */}
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />

      {/* Single colorful hero header (replaces the default stack header) */}
      <LinearGradient
        colors={['#FF4F8B', '#FF6EA8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroGradient, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.heroBubble1} />
        <View style={styles.heroBubble2} />

        <View style={styles.heroTopRow}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={r.scaleFont(22)} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle} numberOfLines={1}>Notifications</Text>
            <Text style={styles.heroSub} numberOfLines={1}>Stay updated with your learning</Text>
          </View>

          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => dispatch(toggleAI())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="sparkles" size={r.scaleFont(20)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.actionBar}>
        <Text style={styles.unreadText}>{unreadCount} Unread</Text>
        {unreadCount > 0 && (
          <ParticleWrapper particleCount={15} colors={['#FF4F8B', '#FF6EA8']}>
            <TouchableOpacity style={styles.markAllBtn} onPress={() => dispatch(markAllRead())}>
              <Ionicons name="checkmark-done" size={r.scaleFont(16)} color="#FF4F8B" />
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          </ParticleWrapper>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => dispatch(fetchNotifications(1))}
        onEndReachedThreshold={0.5}
        onEndReached={handleEndReached}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image source={require('../../../assets/rocket.png')} style={styles.emptyImage} resizeMode="contain" />
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySub}>No new notifications to display right now.</Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet is a factory function of the responsive helpers so every value
// re-derives from the *current* window size (handles rotation / split-screen
// / different device classes without a reload).
// ---------------------------------------------------------------------------
function createStyles(r) {
  const { width, moderateScale, scaleFont, isTablet } = r;
  const horizontalPadding = isTablet ? width * 0.08 : 20;
  const contentMaxWidth = isTablet ? 640 : undefined;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8FB' },

    blob: { position: 'absolute', borderRadius: 999, opacity: 0.04 },
    blobOne: {
      top: moderateScale(180),
      left: -width * 0.28,
      width: width * 0.65,
      height: width * 0.65,
      backgroundColor: '#FF4F8B',
    },
    blobTwo: {
      top: moderateScale(480),
      right: -width * 0.28,
      width: width * 0.65,
      height: width * 0.65,
      backgroundColor: '#14B8A6',
    },

    // Single hero header
    heroGradient: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: 20,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: '#FF4F8B',
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      overflow: 'hidden',
    },
    heroBubble1: {
      position: 'absolute', top: -30, right: -20,
      width: moderateScale(140), height: moderateScale(140), borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroBubble2: {
      position: 'absolute', bottom: -20, left: 20,
      width: moderateScale(80), height: moderateScale(80), borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    heroCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    heroTitle: { fontSize: scaleFont(20), fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
    heroSub: { fontSize: scaleFont(12.5), fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
    glassBtn: {
      width: moderateScale(42), height: moderateScale(42), borderRadius: moderateScale(21),
      backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    },

    actionBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: horizontalPadding, marginTop: 16, marginBottom: 12,
      maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%',
    },
    unreadText: { fontSize: scaleFont(15.5), fontWeight: '800', color: '#1E293B' },
    markAllBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255, 79, 139, 0.08)', paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 79, 139, 0.3)',
    },
    markAllText: { fontSize: scaleFont(12.5), fontWeight: '700', color: '#FF4F8B' },

    listContent: {
      paddingHorizontal: horizontalPadding, paddingBottom: 40,
      maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%',
    },
    cardWrap: { marginBottom: 16 },
    deleteAction: {
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      width: moderateScale(88),
      borderRadius: 22,
      marginBottom: 16,
      marginLeft: 8,
    },
    deleteActionText: {
      color: '#FFFFFF',
      fontSize: scaleFont(11),
      fontWeight: '800',
      marginTop: 4,
    },
    card: {
      borderRadius: 22, padding: moderateScale(16),
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
      elevation: 5, overflow: 'hidden',
    },
    accentStrip: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 5, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    iconCircle: {
      width: moderateScale(52), height: moderateScale(52), borderRadius: moderateScale(26),
      justifyContent: 'center', alignItems: 'center',
    },
    timePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, maxWidth: '40%' },
    timeText: { fontSize: scaleFont(11.5), fontWeight: '700', color: '#64748B' },
    cardContent: { paddingLeft: 4 },
    cardTitle: { fontSize: scaleFont(16.5), fontWeight: '800', color: '#1E293B', marginBottom: 6, lineHeight: scaleFont(22) },
    cardDesc: { fontSize: scaleFont(13.5), fontWeight: '500', color: '#64748B', lineHeight: scaleFont(19) },
    unreadGlow: {
      position: 'absolute', top: 16, right: 16, width: 14, height: 14, borderRadius: 7,
      backgroundColor: 'rgba(255, 79, 139, 0.2)', justifyContent: 'center', alignItems: 'center',
    },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4F8B' },
    glassHighlight: {
      position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
      backgroundColor: 'rgba(255,255,255,0.5)', opacity: 0.35,
    },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 30 },
    emptyImage: { width: moderateScale(150), height: moderateScale(150), marginBottom: 24, opacity: 0.9 },
    emptyTitle: { fontSize: scaleFont(21), fontWeight: '900', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: scaleFont(14.5), fontWeight: '600', color: '#64748B', textAlign: 'center', lineHeight: scaleFont(21) },
  });
}
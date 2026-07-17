import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Modal, Animated, RefreshControl, Keyboard, Platform, StatusBar,
  Image, Easing
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { fetchTodayClasses, fetchSchedules } from '../../redux/slices/classesSlice';
import { startLiveClass } from '../../redux/slices/teacherSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { formatScheduledTime, formatDate } from '../../utils/formatters';

const ASSETS = {
  study: require('../../../assets/study.png'),
};

const T = {
  pink: '#FF4D8D',
  pinkLight: '#FF6AA2',
  teal: '#14C8C4',
  blue: '#2563EB',
  orange: '#FF9800',
  white: '#FFFFFF',
  title: '#1F2937',
  subtitle: '#6B7280',
  gray: '#9CA3AF',
  green: '#10B981',
  red: '#EF4444',
  pageBgTop: '#FFF8FB',
  pageBgMid: '#F8F7FC',
  pageBgBot: '#F5FAFF',
};

// ─── HELPERS ───

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: '🏠' },
  { key: 'scheduled', label: 'Scheduled', icon: '📅' },
  { key: 'live', label: 'Ongoing', icon: '🔴' },
  { key: 'completed', label: 'Completed', icon: '✅' },
];

const LINK_TYPES = [
  { key: 'googlemeet', label: 'Google Meet', icon: 'videocam' },
  { key: 'zoom', label: 'Zoom', icon: 'tv' },
  { key: 'jitsi', label: 'Jitsi', icon: 'globe' },
  { key: 'other', label: 'Other', icon: 'link' },
];

const validateMeetLink = (url) => {
  if (!url || !url.trim()) return { valid: false, error: '' };
  const trimmed = url.trim().toLowerCase();
  if (trimmed.includes('meet.google.com') || trimmed.includes('zoom.us') || trimmed.includes('jitsi')) {
    return { valid: true, error: '' };
  }
  return { valid: false, error: 'Please use a Google Meet, Zoom, or Jitsi link' };
};

const getStatusConfig = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled': return { color: T.blue, bg: 'rgba(37,99,235,0.1)' };
    case 'live': return { color: T.green, bg: 'rgba(16,185,129,0.15)' };
    case 'completed': return { color: T.gray, bg: 'rgba(156,163,175,0.15)' };
    case 'cancelled': return { color: T.red, bg: 'rgba(239,68,68,0.1)' };
    default: return { color: T.gray, bg: 'rgba(156,163,175,0.1)' };
  }
};



// ─── ANIMATED COMPONENTS ───

const ScaleBtn = ({ onPress, style, children, activeScale = 0.94, disabled, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (!disabled) Animated.timing(scale, { toValue: activeScale, duration: 100, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    if (!disabled) Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  };
  return (
    <RNTouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} activeOpacity={disabled ? 1 : 0.9} style={style} disabled={disabled} {...rest}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </RNTouchableOpacity>
  );
};

const FadeSlideView = ({ children, delay = 0, index = 0, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: delay + index * 100, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: delay + index * 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
};

const PulseView = ({ children, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
};

const FloatingView = ({ children, style, amplitude = 6, duration = 3000 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: amplitude, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -amplitude, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
};

const Sparkle = ({ size = 10, color = T.white, opacity = 0.5, style }) => (
  <View style={[style, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }]} />
);

// ─── MAIN COMPONENT ───

export default function LiveClassScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { todayClasses, schedules, loading } = useSelector((s) => s.classes);
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [meetLink, setMeetLink] = useState('');
  const [meetLinkType, setMeetLinkType] = useState('googlemeet');
  const [isStarting, setIsStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchTodayClasses()),
      dispatch(fetchSchedules({ status: 'scheduled' })),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (route?.params?.classToStart) {
      setSelectedClass(route.params.classToStart);
      setShowModal(true);
    }
  }, [route?.params?.classToStart]);

  const allClasses = [...(todayClasses || []), ...(schedules || [])].reduce((acc, c) => {
    if (!acc.find((x) => x._id === c._id)) acc.push(c);
    return acc;
  }, []);

  const filteredClasses = activeTab === 'all'
    ? allClasses
    : allClasses.filter((c) => c.status === activeTab);

  const linkValidation = validateMeetLink(meetLink);

  const handleGoLive = (cls) => {
    setSelectedClass(cls);
    setMeetLink('');
    setMeetLinkType('googlemeet');
    setShowModal(true);
  };

  const confirmGoLive = async () => {
    if (!linkValidation.valid) {
      Toast.show({ type: 'error', text1: 'Invalid Link', text2: linkValidation.error || 'Please enter a valid meeting link' });
      return;
    }
    Keyboard.dismiss();
    setIsStarting(true);
    try {
      const result = await dispatch(startLiveClass({ classId: selectedClass._id, meetLink: meetLink.trim(), meetLinkType }));
      if (startLiveClass.fulfilled.match(result)) {
        Toast.show({ type: 'success', text1: '🔴 Class is LIVE!', text2: 'Students have been notified' });
        setShowModal(false);
        setMeetLink('');
        dispatch(fetchTodayClasses());
        navigation.navigate('LiveMonitor', {
          classId: selectedClass._id,
          meetLink: meetLink.trim(),
          className: selectedClass.title || selectedClass.subject,
        });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to Start', text2: result.payload || 'Something went wrong' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Network error. Please try again.' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleManageLive = (cls) => {
    navigation.navigate('LiveMonitor', {
      classId: cls._id,
      meetLink: cls.meetLink,
      className: cls.title || cls.subject,
    });
  };

  const renderClassCard = ({ item, index }) => {
    const isLive = item.status === 'live';
    const conf = getStatusConfig(item.status);
    const studentCount = item.studentIds?.length || item.enrolledStudents?.length || item.students || 0;

    return (
      <FadeSlideView index={index}>
        <LinearGradient
          colors={['#FFFFFF', '#F3FFFC']}
          style={styles.card}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        >
          <View style={styles.cardGlass} />
          <View style={styles.cardDecoTopRight} />
          <View style={styles.cardDecoBottomLeft} />

          {/* TOP ROW */}
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: conf.bg }]}>
              {isLive ? (
                <PulseView>
                  <View style={[styles.statusDot, { backgroundColor: conf.color, shadowColor: conf.color, shadowOpacity: 0.8, shadowRadius: 4 }]} />
                </PulseView>
              ) : (
                <View style={[styles.statusDot, { backgroundColor: conf.color }]} />
              )}
              <Text style={[styles.statusLabel, { color: conf.color }]}>{item.status?.toUpperCase()}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.scheduledDate)}</Text>
          </View>

          {/* SECOND ROW */}
          <Text style={styles.classTitle} numberOfLines={2}>{item.title || item.subject}</Text>

          {/* THIRD ROW */}
          <View style={styles.infoPillsRow}>
            <View style={[styles.infoPill, styles.infoPillBlue]}>
              <Ionicons name="time" size={14} color={T.blue} />
              <Text style={[styles.infoPillText, { color: T.blue }]}>{formatScheduledTime(item.scheduledTime)}</Text>
            </View>
            <View style={[styles.infoPill, styles.infoPillTeal]}>
              <Ionicons name="people" size={14} color={T.teal} />
              <Text style={[styles.infoPillText, { color: T.teal }]}>{studentCount}</Text>
            </View>
            {item.course && (
              <View style={[styles.infoPill, styles.infoPillOrange]}>
                <Ionicons name="book" size={14} color={T.orange} />
                <Text style={[styles.infoPillText, { color: T.orange }]}>{item.course}</Text>
              </View>
            )}
          </View>

          {/* BUTTON */}
          {item.status === 'scheduled' && (
            <ParticleWrapper>
              <ScaleBtn activeScale={0.96} onPress={() => handleGoLive(item)}>
                <LinearGradient colors={['#FF4D8D', '#FF6AA2']} style={styles.goLiveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.btnIconCircle}>
                    <Ionicons name="videocam" size={18} color={T.pink} />
                  </View>
                  <Text style={styles.goLiveBtnText}>GO LIVE</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.white} style={{ position: 'absolute', right: 20 }} />
                </LinearGradient>
              </ScaleBtn>
            </ParticleWrapper>
          )}

          {isLive && (
            <ParticleWrapper>
              <ScaleBtn activeScale={0.96} onPress={() => handleManageLive(item)}>
                <LinearGradient colors={['#10B981', '#34D399']} style={styles.goLiveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.btnIconCircle}>
                    <Ionicons name="pulse" size={18} color={T.green} />
                  </View>
                  <Text style={styles.goLiveBtnText}>MANAGE LIVE CLASS</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.white} style={{ position: 'absolute', right: 20 }} />
                </LinearGradient>
              </ScaleBtn>
            </ParticleWrapper>
          )}
        </LinearGradient>
      </FadeSlideView>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FFF7FB', '#F8F7FC', '#F5FCFF', '#F0FFFC']} style={StyleSheet.absoluteFillObject} />

      {/* Background Decor */}
      <View style={styles.bgBlobPink} />
      <View style={styles.bgBlobTeal} />
      <View style={styles.bgBlobBlue} />
      
      <View style={styles.bgBubble1} />
      <View style={styles.bgBubble2} />
      
      <Sparkle size={12} color={T.pink} opacity={0.10} style={{ position: 'absolute', top: 250, left: 60 }} />
      <Sparkle size={18} color={T.teal} opacity={0.10} style={{ position: 'absolute', top: 450, right: 40 }} />
      <Sparkle size={10} color={T.blue} opacity={0.10} style={{ position: 'absolute', top: 650, left: 80 }} />
      <Sparkle size={14} color={T.orange} opacity={0.10} style={{ position: 'absolute', top: 800, right: 60 }} />

      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* HERO HEADER */}
      <View style={[styles.headerWrap, { height: Math.max(180, insets.top + 140) }]}>
        <LinearGradient colors={['#C2185B', '#D81B60', '#FF5D9E']} style={StyleSheet.absoluteFillObject}>
          <FloatingView amplitude={15} duration={8000} style={styles.headerCircle1} />
          <FloatingView amplitude={20} duration={10000} style={styles.headerCircle2} />
          <View style={styles.headerGlassBubble} />
          <Sparkle size={14} color={T.white} opacity={0.3} style={{ position: 'absolute', top: 80, right: 40 }} />
          <Sparkle size={10} color={T.white} opacity={0.4} style={{ position: 'absolute', bottom: 30, left: 60 }} />
        </LinearGradient>

        <View style={[styles.headerTopBar, { top: Math.max(insets.top, 16) }]}>
          <ScaleBtn onPress={() => navigation.goBack()} style={styles.glassCircleBtn}>
            <Ionicons name="arrow-back" size={24} color={T.white} />
          </ScaleBtn>
          <View style={[styles.glassCircleBtn, { opacity: 0 }]} />
        </View>

        <View style={styles.headerContent}>
          <FadeSlideView delay={100}>
            <Text style={styles.headerTitle}>🔴 Go Live</Text>
          </FadeSlideView>
          <FadeSlideView delay={200}>
            <Text style={styles.headerSubtitle}>Manage your online classes</Text>
          </FadeSlideView>
        </View>
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={t => t.key}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 10, paddingVertical: 12 }}
          renderItem={({ item }) => {
            const isActive = activeTab === item.key;
            return (
              <ScaleBtn activeScale={0.94} onPress={() => setActiveTab(item.key)}>
                {isActive ? (
                  <LinearGradient colors={['#FF4D8D', '#FF6AA2']} style={styles.chipActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.chipIcon}>{item.icon}</Text>
                    <Text style={styles.chipTextActive}>{item.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.chipInactive}>
                    <Text style={styles.chipIcon}>{item.icon}</Text>
                    <Text style={styles.chipTextInactive}>{item.label}</Text>
                  </View>
                )}
              </ScaleBtn>
            );
          }}
        />
      </View>

      {/* CONTENT LIST */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={T.pink} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filteredClasses}
          keyExtractor={(item) => item._id}
          renderItem={renderClassCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[T.pink]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FloatingView amplitude={10} duration={3000}>
                <Image source={ASSETS.study} style={styles.emptyImage} resizeMode="contain" />
              </FloatingView>
              <Text style={styles.emptyTitle}>No Classes Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'all' ? "You don't have any classes scheduled for today.\nTake a break! 😊" : `No ${activeTab} classes available right now.`}
              </Text>
            </View>
          }
        />
      )}

      {/* ═══ GO LIVE MODAL ═══ */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); setMeetLink(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start Live Class</Text>
              <ScaleBtn onPress={() => { setShowModal(false); setMeetLink(''); }} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={T.subtitle} />
              </ScaleBtn>
            </View>

            <View style={styles.modalSubjectCard}>
              <Text style={styles.modalSubjectTitle} numberOfLines={2}>{selectedClass?.title || selectedClass?.subject}</Text>
              <View style={styles.modalSubjectInfoRow}>
                <Ionicons name="time" size={14} color={T.blue} />
                <Text style={styles.modalSubjectInfoText}>{formatScheduledTime(selectedClass?.scheduledTime)}</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Platform</Text>
            <View style={styles.platformRow}>
              {LINK_TYPES.map((lt) => (
                <ScaleBtn
                  key={lt.key}
                  activeScale={0.92}
                  style={[styles.modalPlatformChip, meetLinkType === lt.key && styles.modalPlatformChipActive]}
                  onPress={() => setMeetLinkType(lt.key)}
                >
                  <Ionicons name={lt.icon} size={14} color={meetLinkType === lt.key ? T.white : T.pink} />
                  <Text style={[styles.modalPlatformChipText, meetLinkType === lt.key && { color: T.white }]}>{lt.label}</Text>
                </ScaleBtn>
              ))}
            </View>

            <Text style={styles.inputLabel}>Meeting Link</Text>
            <View style={[styles.inputContainer, { borderColor: meetLink ? (linkValidation.valid ? T.green : T.red) : '#E5E7EB' }]}>
              <TextInput
                style={styles.textInput}
                placeholder="https://meet.google.com/..."
                placeholderTextColor={T.gray}
                value={meetLink}
                onChangeText={setMeetLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {meetLink.length > 0 && linkValidation.valid && <Ionicons name="checkmark-circle" size={22} color={T.green} />}
              {meetLink.length > 0 && !linkValidation.valid && (
                <RNTouchableOpacity onPress={() => setMeetLink('')}>
                  <Ionicons name="close-circle" size={22} color={T.red} />
                </RNTouchableOpacity>
              )}
            </View>
            {meetLink.length > 0 && !linkValidation.valid && linkValidation.error !== '' && (
              <Text style={styles.errorText}>{linkValidation.error}</Text>
            )}

            <View style={styles.modalActions}>
              <ScaleBtn style={styles.cancelBtn} onPress={() => { setShowModal(false); setMeetLink(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </ScaleBtn>
              <ScaleBtn
                activeScale={(!meetLink.trim() || !linkValidation.valid || isStarting) ? 1 : 0.96}
                style={[styles.startBtnWrap, (!meetLink.trim() || !linkValidation.valid || isStarting) && { opacity: 0.5 }]}
                onPress={confirmGoLive}
                disabled={!meetLink.trim() || !linkValidation.valid || isStarting}
              >
                <LinearGradient colors={['#FF4D8D', '#FF6AA2']} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {isStarting ? (
                    <ActivityIndicator size="small" color={T.white} />
                  ) : (
                    <>
                      <Ionicons name="videocam" size={18} color={T.white} />
                      <Text style={styles.startBtnText}>START CLASS</Text>
                    </>
                  )}
                </LinearGradient>
              </ScaleBtn>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgBlobPink: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#EC4899', opacity: 0.06, top: 150, left: -100, filter: 'blur(50px)'
  },
  bgBlobTeal: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#14B8A6', opacity: 0.05, top: 450, right: -80, filter: 'blur(60px)'
  },
  bgBlobBlue: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175,
    backgroundColor: '#3B82F6', opacity: 0.05, top: 700, left: -150, filter: 'blur(70px)'
  },
  bgBubble1: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)',
    top: 280, right: 50, opacity: 0.08
  },
  bgBubble2: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)',
    top: 550, left: 40, opacity: 0.08
  },
  
  // Header
  headerWrap: { position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 42, borderBottomRightRadius: 42, elevation: 8, shadowColor: T.pink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
  headerCircle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -50 },
  headerCircle2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -50 },
  headerGlassBubble: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', top: 60, left: '50%' },
  headerTopBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  glassCircleBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  headerContent: { position: 'absolute', bottom: 24, left: 24, right: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: T.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  // Chips
  tabsContainer: { marginTop: 10 },
  chipActive: { height: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: T.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  chipInactive: { height: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  chipIcon: { fontSize: 14 },
  chipTextActive: { fontSize: 13, fontWeight: '800', color: T.white },
  chipTextInactive: { fontSize: 13, fontWeight: '700', color: T.subtitle },

  // List
  listContent: { padding: 18, paddingTop: 10, paddingBottom: 140 },
  
  // Card
  card: { borderRadius: 24, padding: 22, marginBottom: 18, shadowColor: '#14C8C6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 8, overflow: 'hidden' },
  cardGlass: { position: 'absolute', top: 0, left: 0, right: 0, height: 40, backgroundColor: 'rgba(255,255,255,0.5)' },
  cardDecoTopRight: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: T.teal, opacity: 0.05, top: -40, right: -40 },
  cardDecoBottomLeft: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: T.teal, opacity: 0.05, bottom: -20, left: -20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 12, fontWeight: '700', color: T.subtitle },
  classTitle: { fontSize: 20, fontWeight: '800', color: T.title, marginBottom: 14 },
  infoPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  infoPillBlue: { backgroundColor: '#E0F2FE', shadowColor: T.blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  infoPillTeal: { backgroundColor: '#CCFBF1', shadowColor: T.teal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  infoPillOrange: { backgroundColor: '#FFEDD5', shadowColor: T.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  infoPillText: { fontSize: 13, fontWeight: '700' },

  // Buttons
  goLiveBtn: { height: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: T.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.white, justifyContent: 'center', alignItems: 'center' },
  goLiveBtnText: { fontSize: 16, fontWeight: '800', color: T.white },

  // Empty
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyImage: { width: 220, height: 220, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: T.title, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontWeight: '600', color: T.subtitle, textAlign: 'center', lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: T.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalDragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: T.title },
  modalClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  modalSubjectCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  modalSubjectTitle: { fontSize: 16, fontWeight: '800', color: T.title, marginBottom: 8 },
  modalSubjectInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalSubjectInfoText: { fontSize: 13, fontWeight: '600', color: T.subtitle },
  
  inputLabel: { fontSize: 14, fontWeight: '800', color: T.title, marginBottom: 12 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  modalPlatformChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(255,77,141,0.08)', borderWidth: 1, borderColor: 'rgba(255,77,141,0.1)' },
  modalPlatformChipActive: { backgroundColor: T.pink, borderColor: T.pink },
  modalPlatformChipText: { fontSize: 13, fontWeight: '700', color: T.pink },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: '#F9FAFB' },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 14, fontWeight: '500', color: T.title },
  errorText: { fontSize: 12, fontWeight: '600', color: T.red, marginTop: 6, marginLeft: 4 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 32 },
  cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F3F4F6' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: T.subtitle },
  startBtnWrap: { flex: 2 },
  startBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  startBtnText: { fontSize: 16, fontWeight: '800', color: T.white },
});

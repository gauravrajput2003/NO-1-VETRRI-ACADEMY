import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getTrainingVideosAPI, markVideoCompleteAPI, getIncompleteMandatoryCountAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'getting-started', label: 'Getting Started', icon: 'rocket-outline' },
  { key: 'teaching-setup', label: 'Teaching Setup', icon: 'desktop-outline' },
  { key: 'live-classes', label: 'Live Classes', icon: 'radio-outline' },
  { key: 'student-management', label: 'Students', icon: 'people-outline' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline' },
  { key: 'exams', label: 'Exams', icon: 'document-text-outline' },
  { key: 'assignments', label: 'Assignments', icon: 'create-outline' },
  { key: 'platform-tutorials', label: 'Platform', icon: 'laptop-outline' },
  // Legacy
  { key: 'platform-tutorial', label: 'Platform', icon: 'laptop-outline' },
  { key: 'teaching-methods', label: 'Teaching', icon: 'school-outline' },
  { key: 'technical-setup', label: 'Tech Setup', icon: 'settings-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const formatDur = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const getCatColor = (c) => {
  const map = {
    'getting-started': '#00B894', 'teaching-setup': '#0984E3',
    'live-classes': '#E17055', 'student-management': '#6C5CE7',
    'attendance': '#00B894', 'exams': '#FDCB6E',
    'assignments': '#E17055', 'platform-tutorials': '#FF4F8B',
    'platform-tutorial': '#6C63FF', 'teaching-methods': '#FF6B6B',
    'technical-setup': '#00B894', other: '#FDCB6E',
  };
  return map[c] || Colors.primary;
};

function SkeletonCard({ cardBg, isDark }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  const shimBg = isDark ? '#2A3A5E' : '#E8E8E8';
  return (
    <Animated.View style={[{ borderRadius: 18, marginBottom: 16, overflow: 'hidden', backgroundColor: cardBg, opacity }, skStyles.skCard]}>
      <View style={[skStyles.skThumb, { backgroundColor: shimBg }]} />
      <View style={skStyles.skBody}>
        <View style={[skStyles.skLine, { width: '40%', backgroundColor: shimBg }]} />
        <View style={[skStyles.skLine, { width: '85%', marginTop: 8, backgroundColor: shimBg }]} />
        <View style={[skStyles.skLine, { width: '60%', marginTop: 6, backgroundColor: shimBg }]} />
      </View>
    </Animated.View>
  );
}

const skStyles = StyleSheet.create({
  skCard: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  skThumb: { height: 140, borderRadius: 18 },
  skBody: { padding: 14 },
  skLine: { height: 12, borderRadius: 6 },
});

export default function TrainingVideosScreen({ navigation }) {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [mandatoryLeft, setMandatoryLeft] = useState(0);
  const [marking, setMarking] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bg = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const txt = isDark ? Colors.text.dark : Colors.text.light;
  const txtSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const load = useCallback(async () => {
    try {
      const [vRes, cRes] = await Promise.all([getTrainingVideosAPI(), getIncompleteMandatoryCountAPI()]);
      setVideos(vRes.data.videos || []);
      setMandatoryLeft(cRes.data.count || 0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDone = async (v) => {
    try {
      setMarking(v._id);
      await markVideoCompleteAPI(v._id, v.duration);
      setVideos((p) => p.map((x) => x._id === v._id ? { ...x, progress: { ...x.progress, isCompleted: true, percentWatched: 100 } } : x));
      if (v.isMandatory) setMandatoryLeft((c) => Math.max(0, c - 1));
    } catch (e) { console.error(e); } finally { setMarking(null); }
  };

  const filtered = videos.filter((v) => {
    if (category !== 'all' && v.category !== category) return false;
    if (search && !v.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const done = videos.filter((v) => v.progress?.isCompleted).length;
  const pct = videos.length > 0 ? (done / videos.length) * 100 : 0;
  const recentlyAdded = [...videos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const inProgress = videos.filter(v => v.progress?.percentWatched > 0 && !v.progress?.isCompleted);

  const renderItem = ({ item }) => {
    const comp = item.progress?.isCompleted;
    const wp = item.progress?.percentWatched || 0;
    const cc = getCatColor(item.category);
    return (
      <Animated.View style={[styles.card, { backgroundColor: cardBg, opacity: fadeAnim }]}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('VideoPlayer', { video: item })}>
          <LinearGradient colors={comp ? ['#00B894', '#00CEC9'] : [cc + 'CC', cc + '88']} style={styles.thumb}>
            <View style={styles.playOuter}><View style={styles.playInner}>
              <Ionicons name={comp ? 'checkmark' : 'play'} size={28} color="#fff" />
            </View></View>
            <View style={styles.durBadge}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={styles.durText}>{formatDur(item.duration)}</Text>
            </View>
            {item.isMandatory && <View style={styles.mandBadge}><Text style={styles.mandText}>★ MANDATORY</Text></View>}
            {comp && <View style={styles.compOverlay}><Ionicons name="checkmark-circle" size={32} color="#fff" /><Text style={styles.compText}>COMPLETED</Text></View>}
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.body}>
          <View style={[styles.catChip, { backgroundColor: cc + '18' }]}>
            <Text style={[styles.catText, { color: cc }]}>{CATEGORIES.find((c) => c.key === item.category)?.label || 'Other'}</Text>
          </View>
          <Text style={[styles.title, { color: txt }]} numberOfLines={2}>{item.title}</Text>
          {item.description ? <Text style={[styles.desc, { color: txtSec }]} numberOfLines={2}>{item.description}</Text> : null}
          <View style={styles.progSec}>
            <View style={[styles.progTrack, { backgroundColor: isDark ? '#2A3A5E' : '#F0F0F0' }]}>
              <View style={[styles.progFill, { width: `${Math.min(100, wp)}%`, backgroundColor: comp ? '#00B894' : cc }]} />
            </View>
            <Text style={[styles.progLabel, { color: txtSec }]}>{comp ? '✓ Completed' : `${wp}% watched`}</Text>
          </View>
          {!comp && (
            <View style={styles.actRow}>
              <TouchableOpacity style={[styles.watchBtn, { backgroundColor: cc }]} onPress={() => navigation.navigate('VideoPlayer', { video: item })}>
                <Ionicons name="play" size={15} color="#fff" /><Text style={styles.watchTxt}>Watch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.doneBtn, { borderColor: '#00B894' }]} onPress={() => markDone(item)} disabled={marking === item._id}>
                {marking === item._id ? <ActivityIndicator size="small" color="#00B894" /> : <><Ionicons name="checkmark-circle-outline" size={15} color="#00B894" /><Text style={{ color: '#00B894', fontWeight: '700', fontSize: 13 }}>Mark Done</Text></>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient colors={Colors.gradient.primary} style={styles.header}>
        <View style={styles.hRow}>
          <View style={{ flex: 1 }}><Text style={styles.hTitle}>📚 Training Hub</Text><Text style={styles.hSub}>Complete your onboarding</Text></View>
        </View>
      </LinearGradient>
      <View style={{ padding: 16, paddingTop: 20 }}>
        {[1,2,3].map(i => <SkeletonCard key={i} cardBg={cardBg} isDark={isDark} />)}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient colors={Colors.gradient.primary} style={styles.header}>
        <View style={styles.hRow}>
          <View style={{ flex: 1 }}><Text style={styles.hTitle}>📚 Training Hub</Text><Text style={styles.hSub}>Complete your onboarding</Text></View>
          <View style={styles.hCircle}><Text style={styles.hCircleVal}>{done}/{videos.length}</Text><Text style={styles.hCircleLbl}>Done</Text></View>
        </View>
        <View style={styles.hTrack}><View style={[styles.hFill, { width: `${pct}%` }]} /></View>
        <View style={styles.hStats}>
          <View style={styles.hStat}><Ionicons name="videocam" size={14} color="rgba(255,255,255,0.8)" /><Text style={styles.hStatTxt}>{videos.length} Videos</Text></View>
          {mandatoryLeft > 0 && <View style={styles.hStat}><Ionicons name="alert-circle" size={14} color={Colors.gold} /><Text style={[styles.hStatTxt, { color: Colors.gold }]}>{mandatoryLeft} Mandatory Left</Text></View>}
        </View>
      </LinearGradient>
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
        <Ionicons name="search-outline" size={18} color={Colors.mediumGray} />
        <TextInput style={[styles.searchIn, { color: txt }]} placeholder="Search videos..." placeholderTextColor={Colors.mediumGray} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.mediumGray} /></TouchableOpacity> : null}
      </View>
      <View style={{ height: 44, marginBottom: 4 }}>
        <FlatList data={CATEGORIES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(i) => i.key} contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item: c }) => {
          const a = category === c.key; const cc2 = getCatColor(c.key);
          return (<TouchableOpacity style={[styles.fChip, a && { backgroundColor: cc2, borderColor: cc2 }, !a && { borderColor: isDark ? '#30475E' : '#E0E0E0' }]} onPress={() => setCategory(c.key)}>
            <Ionicons name={c.icon} size={13} color={a ? '#fff' : cc2} style={{ marginRight: 4 }} />
            <Text style={[styles.fText, a && { color: '#fff' }, !a && { color: cc2 }]}>{c.label}</Text>
          </TouchableOpacity>);
        }} />
      </View>
      <FlatList data={filtered} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: bottomPadding }}
        ListHeaderComponent={
          <>
            {inProgress.length > 0 && category === 'all' && !search && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionLbl, { color: txt }]}>⏯ Continue Watching</Text>
                <FlatList data={inProgress.slice(0,3)} horizontal showsHorizontalScrollIndicator={false}
                  keyExtractor={i => i._id + '_cp'}
                  renderItem={({ item: v }) => {
                    const cc = getCatColor(v.category);
                    const wp = v.progress?.percentWatched || 0;
                    return (
                      <TouchableOpacity onPress={() => navigation.navigate('VideoPlayer', { video: v })}
                        style={[styles.miniCard, { backgroundColor: cardBg }]}>
                        <LinearGradient colors={[cc + 'CC', cc + '55']} style={styles.miniThumb}>
                          <Ionicons name='play' size={20} color='#fff' />
                        </LinearGradient>
                        <Text style={[styles.miniTitle, { color: txt }]} numberOfLines={2}>{v.title}</Text>
                        <View style={[styles.miniTrack, { backgroundColor: isDark ? '#2A3A5E' : '#F0F0F0' }]}>
                          <View style={[styles.miniFill, { width: `${wp}%`, backgroundColor: cc }]} />
                        </View>
                        <Text style={[{ fontSize: 10, fontWeight: '600', color: txtSec, marginTop: 2 }]}>{wp}% watched</Text>
                      </TouchableOpacity>
                    );
                  }}
                  contentContainerStyle={{ paddingRight: 8 }}
                />
              </View>
            )}
            {recentlyAdded.length > 0 && category === 'all' && !search && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.sectionLbl, { color: txt }]}>🆕 Recently Added</Text>
                <FlatList data={recentlyAdded} horizontal showsHorizontalScrollIndicator={false}
                  keyExtractor={i => i._id + '_ra'}
                  renderItem={({ item: v }) => {
                    const cc = getCatColor(v.category);
                    return (
                      <TouchableOpacity onPress={() => navigation.navigate('VideoPlayer', { video: v })}
                        style={[styles.miniCard, { backgroundColor: cardBg }]}>
                        <LinearGradient colors={[cc + 'CC', cc + '55']} style={styles.miniThumb}>
                          <Ionicons name='play' size={20} color='#fff' />
                        </LinearGradient>
                        <Text style={[styles.miniTitle, { color: txt }]} numberOfLines={2}>{v.title}</Text>
                        <View style={[styles.catMini, { backgroundColor: cc + '18' }]}>
                          <Text style={{ color: cc, fontSize: 9, fontWeight: '700' }}>NEW</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  contentContainerStyle={{ paddingRight: 8 }}
                />
                <Text style={[styles.sectionLbl, { color: txt, marginTop: 14 }]}>📋 All Videos</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="videocam-off-outline" size={56} color={Colors.mediumGray} /><Text style={[styles.emptyTitle, { color: txt }]}>No Videos Found</Text><Text style={[{ color: txtSec, fontSize: 13, marginTop: 4 }]}>{search ? 'Try different keywords' : 'No training videos yet'}</Text></View>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />} 
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, ctr: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { margin: 16, marginBottom: 0, borderRadius: 20, padding: 20 },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  hSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  hCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  hCircleVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  hCircleLbl: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  hTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  hFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  hStats: { flexDirection: 'row', gap: 14, marginTop: 10 },
  hStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hStatTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, borderRadius: 14, paddingHorizontal: 14, ...Shadows.light },
  searchIn: { flex: 1, fontSize: 14, paddingVertical: 11, marginLeft: 8 },
  fChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, marginRight: 8 },
  fText: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 18, marginBottom: 16, overflow: 'hidden', ...Shadows.medium },
  thumb: { height: 150, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  playOuter: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  playInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  durBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 3 },
  durText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  mandBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mandText: { fontSize: 9, fontWeight: '800', color: '#333' },
  compOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,184,148,0.7)', justifyContent: 'center', alignItems: 'center' },
  compText: { fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 4, letterSpacing: 1 },
  body: { padding: 14 },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  desc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  progSec: { marginTop: 10 },
  progTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 3 },
  progLabel: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  actRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  watchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 5 },
  watchTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  doneBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 5 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  sectionLbl: { fontSize: 15, fontWeight: '800', marginBottom: 10, letterSpacing: 0.2 },
  miniCard: { width: 140, borderRadius: 14, marginRight: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  miniThumb: { height: 80, justifyContent: 'center', alignItems: 'center' },
  miniTitle: { fontSize: 12, fontWeight: '700', padding: 8, paddingBottom: 4, lineHeight: 16 },
  miniTrack: { height: 3, marginHorizontal: 8, borderRadius: 2, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  catMini: { alignSelf: 'flex-start', marginHorizontal: 8, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});

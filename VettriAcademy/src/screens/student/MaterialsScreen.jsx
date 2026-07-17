import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Image, ScrollView, StatusBar,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { fetchMaterials } from '../../redux/slices/materialsSlice';
import { fetchAllBookmarks } from '../../redux/slices/pdfSlice';
import { fetchUnreadNotificationCount } from '../../redux/slices/notificationsSlice';
import { toggleAI } from '../../redux/slices/uiSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { Sparkle, DottedPath } from './BadgeIcons';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  pink: '#FF4D8D',
  pinkLight: '#FF7EB3',
  teal: '#14C8C4',
  tealLight: '#6EE7E5',
  purple: '#8B5CF6',
  orange: '#FF9F43',
  white: '#FFFFFF',
  pageBg: '#F4F7FB',
  title: '#1F2937',
  subtitle: '#6B7280',
  cream: '#FFF8EE',
  creamEnd: '#FFFDF8',
};

const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image' };
const typeColors = { pdf: T.pink, ppt: T.orange, video: T.teal, image: T.purple };

const FILTER_CHIPS = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'pdf', label: 'PDF', icon: 'document-text' },
  { key: 'ppt', label: 'PPT', icon: 'easel' },
  { key: 'video', label: 'Video', icon: 'videocam' },
  { key: 'image', label: 'Image', icon: 'image' },
];

export default function MaterialsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { list, loading } = useSelector((s) => s.materials);
  const { allBookmarks } = useSelector((s) => s.pdf);
  const { progress: pdfProgress } = useSelector((s) => s.pdf);
  const { unreadCount } = useSelector((s) => s.notifications);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [quickMode, setQuickMode] = useState('all');
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMaterials());
    dispatch(fetchAllBookmarks());
    dispatch(fetchUnreadNotificationCount());
  }, [dispatch]);

  const stats = useMemo(() => ({
    total: list.length,
    pdf: list.filter((m) => m.type === 'pdf').length,
    video: list.filter((m) => m.type === 'video').length,
    image: list.filter((m) => m.type === 'image').length,
  }), [list]);

  const recentIds = useMemo(
    () => [...list]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((m) => m._id),
    [list],
  );

  const continueItem = useMemo(() => {
    let best = null;
    let bestPct = 0;
    list.forEach((m) => {
      const p = pdfProgress[m._id];
      const pct = p?.completedPercentage || 0;
      if (pct > bestPct) {
        bestPct = pct;
        best = m;
      }
    });
    if (best && bestPct > 0) return { material: best, pct: bestPct };
    const recent = [...list]
      .filter((m) => !m.isLocked)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return recent ? { material: recent, pct: 0 } : null;
  }, [list, pdfProgress]);

  const filteredMaterials = useMemo(() => list.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (quickMode === 'recent' && !recentIds.includes(m._id)) return false;
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [list, typeFilter, quickMode, recentIds, search]);

  const sortedMaterials = useMemo(() => {
    const arr = [...filteredMaterials];
    arr.sort((a, b) => (
      sortOrder === 'newest'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    ));
    return arr;
  }, [filteredMaterials, sortOrder]);

  const toggleSort = () => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'));

  const renderMaterial = ({ item }) => {
    const color = typeColors[item.type] || T.pink;
    const completed = !item.isLocked;

    return (
      <TouchableOpacity
        style={st.materialCard}
        onPress={() => navigation.navigate('MaterialDetail', { material: item })}
        activeOpacity={0.88}
      >
        <View style={[st.materialIconBlock, { backgroundColor: color + '18' }]}>
          <Ionicons name={typeIcons[item.type] || 'document'} size={28} color={color} />
        </View>

        <View style={st.materialBody}>
          <Text style={st.materialTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={st.materialSubject} numberOfLines={1}>{item.subject || 'General'}</Text>
        </View>

        <View style={st.materialActions}>
          {item.isLocked ? (
            <Ionicons name="lock-closed" size={20} color={T.subtitle} />
          ) : completed ? (
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
          ) : null}
          <View style={[st.openPill, { backgroundColor: color }]}>
            <Text style={st.openPillText}>Open</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* HERO */}
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
          <View style={st.heroSpark1}><Sparkle size={14} color="#FFFFFF" opacity={0.35} /></View>
          <View style={st.heroSpark2}><Sparkle size={11} color="#FFFFFF" opacity={0.28} /></View>
          <Text style={st.heroStar1}>⭐</Text>
          <Text style={st.heroStar2}>✨</Text>
          <View style={st.heroDotted}><DottedPath width={80} height={20} color="rgba(255,255,255,0.35)" /></View>
          <Image source={require('../../../assets/book_quiz.png')} style={st.heroBook} resizeMode="contain" />
        </LinearGradient>

        <View style={[st.heroBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={st.heroIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={22} color={T.white} />
          </TouchableOpacity>
        </View>

        <View style={st.heroContent}>
          <Text style={st.heroTitle}>Study Materials</Text>
          <Text style={st.heroSubtitle}>{stats.total} Learning Resources</Text>
          <Text style={st.heroDesc}>Continue your learning journey! 🚀</Text>
        </View>
      </View>

      {/* SEARCH */}
      <View style={st.searchWrap}>
        <Ionicons name="search" size={20} color={T.subtitle} />
        <TextInput
          style={st.searchInput}
          placeholder="Search materials..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={st.filterIconBtn} activeOpacity={0.8} onPress={() => setTypeFilter('all')}>
          <Ionicons name="options-outline" size={20} color={T.pink} />
        </TouchableOpacity>
      </View>

      {/* FILTER CHIPS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipScroll}>
        {FILTER_CHIPS.map((chip) => {
          const active = typeFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => { setTypeFilter(chip.key); setQuickMode('all'); }}
              activeOpacity={0.85}
            >
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

      {/* QUICK ACCESS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.quickScroll}>
        {[
          {
            label: 'Downloaded',
            icon: 'cloud-download',
            count: null,
            colors: [T.teal, T.tealLight],
            onPress: () => navigation.getParent()?.navigate('Downloads'),
          },
          {
            label: 'Favorites',
            icon: 'heart',
            count: allBookmarks?.length || 0,
            colors: [T.pink, T.pinkLight],
            onPress: () => navigation.navigate('Bookmarks'),
          },
          {
            label: 'Recent',
            icon: 'time',
            count: recentIds.length,
            colors: [T.purple, '#A78BFA'],
            onPress: () => { setQuickMode('recent'); setTypeFilter('all'); },
          },
          {
            label: 'All Materials',
            icon: 'folder-open',
            count: stats.total,
            colors: [T.orange, '#FFB347'],
            onPress: () => { setQuickMode('all'); setTypeFilter('all'); setSearch(''); },
          },
        ].map((item) => (
          <TouchableOpacity key={item.label} onPress={item.onPress} activeOpacity={0.88}>
            <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.quickCard}>
              <View style={st.quickIconGlass}>
                <Ionicons name={item.icon} size={22} color={T.white} />
              </View>
              <Text style={st.quickCardLabel}>{item.label}</Text>
              <Text style={st.quickCardCount}>{item.count != null ? item.count : '→'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CONTINUE LEARNING */}
      {continueItem && (
        <LinearGradient colors={[T.cream, T.creamEnd]} style={st.continueCard}>
          <Image source={require('../../../assets/book_quiz.png')} style={st.continueBook} resizeMode="contain" />
          <View style={st.continueBody}>
            <Text style={st.continueTitle} numberOfLines={1}>{continueItem.material.title}</Text>
            <Text style={st.continuePct}>
              {continueItem.pct > 0 ? `${continueItem.pct}% Completed` : 'Ready to start'}
            </Text>
            <View style={st.continueTrack}>
              <LinearGradient
                colors={[T.pink, T.pinkLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[st.continueFill, { width: `${Math.max(continueItem.pct, 8)}%` }]}
              />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('MaterialDetail', { material: continueItem.material })}
            activeOpacity={0.9}
          >
            <LinearGradient colors={[T.pink, T.pinkLight]} style={st.resumeBtn}>
              <Text style={st.resumeBtnText}>Resume</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* SECTION HEADER */}
      <View style={st.sectionRow}>
        <Text style={st.sectionTitle}>All Materials</Text>
        <TouchableOpacity style={st.sortBtn} onPress={toggleSort} activeOpacity={0.8}>
          <Ionicons name="swap-vertical" size={14} color={T.pink} />
          <Text style={st.sortBtnText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={st.container}>
      <LinearGradient
        colors={[T.tealLight, T.pinkLight, '#FFF3D2']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        opacity={0.3}
      />
      <StatusBar barStyle="light-content" backgroundColor={T.pink} />

      {loading ? (
        <View style={st.loadingWrap}>
          {renderHeader()}
          <ActivityIndicator size="large" color={T.pink} style={{ marginTop: 24 }} />
        </View>
      ) : (
        <FlatList
          data={sortedMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: bottomPadding + 16 }}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyEmoji}>📂</Text>
              <Text style={st.emptyTitle}>No materials found</Text>
              <Text style={st.emptySub}>Try adjusting your search or filters</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => dispatch(fetchMaterials())}
              colors={[T.pink]}
              tintColor={T.pink}
            />
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.pageBg },
  loadingWrap: { flex: 1 },

  // ── HERO ──
  heroWrap: { position: 'relative', marginBottom: 8 },
  heroGradient: {
    height: 180,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -40,
  },
  heroBlob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.10)', bottom: 20, left: -30,
  },
  heroBlob3: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)', top: 40, right: 90,
  },
  heroSpark1: { position: 'absolute', top: 70, left: 40, opacity: 0.35 },
  heroSpark2: { position: 'absolute', top: 120, right: 50, opacity: 0.28 },
  heroStar1: { position: 'absolute', top: 50, right: 30, fontSize: 16, opacity: 0.35 },
  heroStar2: { position: 'absolute', bottom: 60, left: 24, fontSize: 14, opacity: 0.30 },
  heroDotted: { position: 'absolute', bottom: 40, right: 20, opacity: 0.5 },
  heroBook: { position: 'absolute', bottom: 16, right: 16, width: 90, height: 90, opacity: 0.95 },
  heroBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 2,
  },
  heroBarRight: { flexDirection: 'row', gap: 10 },
  heroIconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: T.white,
  },
  heroBadgeText: { fontSize: 8, fontWeight: '900', color: T.white },
  heroContent: { position: 'absolute', bottom: 28, left: 20, right: 110, zIndex: 2 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: T.white, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.92)', marginTop: 4 },
  heroDesc: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 6 },

  // ── STATS ──
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 12,
    marginTop: -36, marginBottom: 16, zIndex: 3,
  },
  statCard: {
    width: '47%',
    height: 90,
    backgroundColor: T.white,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  statEmoji: { fontSize: 20, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', color: T.subtitle, marginTop: 2, textAlign: 'center' },

  // ── SEARCH ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 14,
    height: 58, backgroundColor: T.white, borderRadius: 28,
    paddingHorizontal: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: T.title },
  filterIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,77,141,0.10)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── FILTER CHIPS ──
  chipScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 14 },
  chipActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
  },
  chipActiveText: { fontSize: 13, fontWeight: '800', color: T.white },
  chipInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: T.white,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipInactiveText: { fontSize: 13, fontWeight: '700', color: T.subtitle },

  // ── QUICK ACCESS ──
  quickScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  quickCard: {
    width: 120, height: 110, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 14, elevation: 6,
  },
  quickIconGlass: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  quickCardLabel: { fontSize: 12, fontWeight: '800', color: T.white },
  quickCardCount: { fontSize: 18, fontWeight: '900', color: T.white, marginTop: 2 },

  // ── CONTINUE LEARNING ──
  continueCard: {
    marginHorizontal: 16, marginBottom: 18,
    borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 14, elevation: 5,
  },
  continueBook: { width: 56, height: 56 },
  continueBody: { flex: 1 },
  continueTitle: { fontSize: 15, fontWeight: '900', color: T.title },
  continuePct: { fontSize: 12, fontWeight: '600', color: T.subtitle, marginTop: 3, marginBottom: 8 },
  continueTrack: { height: 8, backgroundColor: '#ECEEF2', borderRadius: 8, overflow: 'hidden' },
  continueFill: { height: 8, borderRadius: 8 },
  resumeBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22 },
  resumeBtnText: { fontSize: 13, fontWeight: '900', color: T.white },

  // ── SECTION ──
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: T.title },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    backgroundColor: 'rgba(255,77,141,0.10)',
  },
  sortBtnText: { fontSize: 12, fontWeight: '800', color: T.pink },

  // ── MATERIAL CARDS ──
  materialCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    height: 110, backgroundColor: '#CCFBF1', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  materialIconBlock: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  materialBody: { flex: 1, minWidth: 0 },
  materialTitle: { fontSize: 16, fontWeight: '900', color: T.title },
  materialSubject: { fontSize: 14, fontWeight: '700', color: '#0F766E', marginTop: 4 },
  materialMeta: { fontSize: 11, fontWeight: '600', color: T.subtitle, marginTop: 4 },
  materialActions: { alignItems: 'center', gap: 8, marginLeft: 8 },
  openPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  openPillText: { fontSize: 11, fontWeight: '900', color: T.white },

  // ── EMPTY ──
  empty: { alignItems: 'center', marginTop: 40, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: T.title },
  emptySub: { fontSize: 13, fontWeight: '600', color: T.subtitle, marginTop: 6, textAlign: 'center' },
});

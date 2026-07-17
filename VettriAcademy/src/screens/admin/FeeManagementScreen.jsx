import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Animated, Easing, useWindowDimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/formatters';
import { fetchStudentFeeDirectory } from '../../redux/slices/adminSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { toggleAI } from '../../redux/slices/uiSlice';
import { useResponsive } from '../../utils/responsive';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MAX_CONTENT_WIDTH = 640;
const TABLET_BREAKPOINT = 600;

const BRAND = {
  primaryPink: '#FF4F8B',
  primaryTeal: '#11C5C6',
  gold: '#F8C24E',
  white: '#FFFFFF',
  darkText: '#1F2D3D',
  muted: '#64748B',
  bg: '#F8FAFC',
  border: '#EEF1F5',
};

const STATUS = {
  paid: { color: '#16A34A', bg: '#DCFCE7', label: 'PAID' },
  partial: { color: '#2563EB', bg: '#DBEAFE', label: 'PARTIAL' },
  pending: { color: '#D97706', bg: '#FEF3C7', label: 'PENDING' },
  overdue: { color: '#DC2626', bg: '#FEE2E2', label: 'OVERDUE' },
  late: { color: '#DC2626', bg: '#FEE2E2', label: 'LATE' },
  none: { color: '#64748B', bg: '#F1F5F9', label: 'UNPAID' }, 
};

function FadeInUp({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function IconChip({ icon, badge, onPress, isGold = false, styles }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.iconChip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name={icon} size={styles.__iconSize} color={isGold ? BRAND.gold : '#FFF'} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function initials(name = '') {
  const parts = name.trim().split(' ');
  if (!parts[0]) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function FeeManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  
  const { studentFeeDirectory, studentFeeDirectoryTotal, loading } = useSelector((state) => state.admin);
  const { unreadCount } = useSelector((state) => state.notifications);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = Math.min(width, height) >= TABLET_BREAKPOINT;
  const { s, vs } = useResponsive();

  const styles = useMemo(() => createStyles({ isTablet, insets, width, s, vs }), [isTablet, insets.top, insets.bottom, width, s, vs]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      dispatch(fetchStudentFeeDirectory({ search: searchQuery, page: 1, limit: 100 }));
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Derive computed status for each student
  const processedDirectory = useMemo(() => {
    return studentFeeDirectory.map(student => {
      let computedStatus = 'none';
      if (student.latestFee) {
        computedStatus = student.latestFee.status;
        if (computedStatus === 'paid' && student.latestFee.paidAt) {
          const pd = new Date(student.latestFee.paidAt);
          // Late if paid after the 5th
          if (pd.getDate() > 5) {
            computedStatus = 'late';
          }
        }
      }
      return { ...student, computedStatus };
    }).filter(s => {
      if (filter === 'all') return true;
      if (filter === 'unpaid') return s.computedStatus === 'none' || s.computedStatus === 'pending';
      return s.computedStatus === filter;
    });
  }, [studentFeeDirectory, filter]);

  const filterTabs = ['all', 'paid', 'unpaid', 'partial', 'late'];

  const renderHeader = () => (
    <View style={styles.contentWrap}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={styles.__iconSize} color={BRAND.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name..."
          placeholderTextColor={BRAND.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterTabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterPill, filter === t && styles.filterPillActive]}
            onPress={() => setFilter(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filter === t && styles.filterPillTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>STUDENT DIRECTORY ({processedDirectory.length})</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FadeInUp>
        <LinearGradient colors={['#FF4F8B', '#FF6AA8']} style={styles.headerGradient}>
          <View style={styles.contentWrap}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={styles.__iconSize + 3} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <IconChip styles={styles} icon="sparkles" isGold onPress={() => dispatch(toggleAI())} />
                <IconChip styles={styles} icon="notifications-outline" badge={unreadCount} onPress={() => navigation.navigate('Notifications')} />
              </View>
            </View>
            <View style={styles.headerBottom}>
              <Text style={styles.headerTitle}>Student Fees</Text>
              <Text style={styles.headerSubtitle}>View and manage individual student fee records</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeInUp>

      <FadeInUp delay={80} style={styles.panel}>
        <FlatList
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          data={processedDirectory}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ paddingBottom: Math.max(vs(24), bottomPadding), paddingHorizontal: styles.__listPadding, flexGrow: 1 }}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => {
            const hasFee = !!item.latestFee;
            const st = STATUS[item.computedStatus] || STATUS.none;
            
            return (
              <View style={styles.cardWrapper}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.card}
                  onPress={() => navigation.navigate('StudentFeeHistory', { studentId: item._id, studentName: item.name })}
                >
                  <View style={[styles.avatar, { backgroundColor: st.bg }]}>
                    <Text style={[styles.avatarText, { color: st.color }]}>{initials(item.name)}</Text>
                  </View>

                  <View style={styles.rowMiddle}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.grade || 'No Grade'} • {formatCurrency(item.feeAmount || 0)}/{item.feeFrequency || 'monthly'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {hasFee && item.latestFee.paidAt ? (
                      <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        Last Paid: {new Date(item.latestFee.paidAt).toLocaleDateString()}
                      </Text>
                    ) : (
                      <Text style={styles.rowMeta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        No payments
                      </Text>
                    )}
                    <View style={[styles.statusTag, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusTagText, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordBtn}>
                    <Ionicons name="chevron-forward" size={styles.__iconSize - 2} color={BRAND.muted} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading && (
              <View style={[styles.contentWrap, styles.emptyWrap]}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="people-outline" size={styles.__iconSize + 11} color={BRAND.primaryTeal} />
                </View>
                <Text style={styles.emptyTitle}>No students found</Text>
                <Text style={styles.emptySub}>Try adjusting your search criteria.</Text>
              </View>
            )
          }
          refreshing={loading}
          onRefresh={() => dispatch(fetchStudentFeeDirectory({ search: searchQuery, page: 1, limit: 100 }))}
        />
      </FadeInUp>
    </View>
  );
}

function createStyles({ isTablet, insets, width, s, vs }) {
  const f = (base, tabletBase = base + 2) => clamp(isTablet ? s(tabletBase) : s(base), base * 0.85, (tabletBase || base) * 1.15);
  const sidePadding = isTablet ? 28 : 20;
  const iconSize = isTablet ? 21 : 19;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BRAND.primaryPink },
    contentWrap: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
    
    headerGradient: { paddingTop: insets.top + vs(12), paddingBottom: vs(32), paddingHorizontal: sidePadding },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
    headerActions: { flexDirection: 'row', gap: s(10) },
    iconChip: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
    badge: { position: 'absolute', top: -4, right: -4, backgroundColor: BRAND.primaryTeal, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: BRAND.primaryPink },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    headerBottom: { marginTop: vs(22) },
    headerTitle: { fontSize: f(24, 27), fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
    headerSubtitle: { fontSize: f(13), fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 4 },

    panel: { flex: 1, backgroundColor: BRAND.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -22, overflow: 'hidden' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, borderRadius: 16, paddingHorizontal: s(16), marginTop: vs(20), marginBottom: vs(12), height: vs(50) },
    searchIcon: { marginRight: s(10) },
    searchInput: { flex: 1, fontSize: f(14, 15.5), fontWeight: '500', color: BRAND.darkText, height: '100%' },
    
    filterRow: { paddingBottom: vs(18), gap: 8 },
    filterPill: { paddingHorizontal: s(16), paddingVertical: vs(8), borderRadius: 999, backgroundColor: '#FFF', borderWidth: 1, borderColor: BRAND.border, marginRight: 8 },
    filterPillActive: { backgroundColor: BRAND.darkText, borderColor: BRAND.darkText },
    filterPillText: { fontSize: f(12, 13.5), fontWeight: '700', color: BRAND.muted },
    filterPillTextActive: { color: '#FFF' },

    sectionLabel: { fontSize: f(10.5, 12), fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },

    cardWrapper: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', marginBottom: 12 },
    card: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#FFFFFF',
      padding: s(16),
      borderRadius: 20,
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
      minHeight: isTablet ? 72 : 64 
    },
    rowMiddle: { flex: 1, marginLeft: s(14), marginRight: 8 },
    avatar: { width: s(44), height: s(44), borderRadius: s(22), justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: f(13.5, 15), fontWeight: '800' },
    rowName: { fontSize: f(14.5, 16), fontWeight: '800', color: BRAND.darkText },
    rowMeta: { fontSize: f(12, 13), fontWeight: '500', color: BRAND.muted, marginTop: 4 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
    statusTagText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
    recordBtn: { marginLeft: 12, padding: 4, backgroundColor: BRAND.bg, borderRadius: 20 },

    emptyWrap: { alignItems: 'center', paddingVertical: vs(60) },
    emptyIconCircle: { width: s(64), height: s(64), borderRadius: s(32), backgroundColor: '#E7FBFB', justifyContent: 'center', alignItems: 'center', marginBottom: vs(16) },
    emptyTitle: { fontSize: f(15.5, 17), fontWeight: '800', color: BRAND.darkText },
    emptySub: { fontSize: f(12.5, 14), fontWeight: '500', color: BRAND.muted, marginTop: 4, textAlign: 'center' },
  });

  styles.__iconSize = iconSize;
  styles.__listPadding = sidePadding;
  return styles;
}
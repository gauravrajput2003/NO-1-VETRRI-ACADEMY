import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity as RNTouchableOpacity, RefreshControl,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../utils/colors';
import { fetchTeacherAnalytics, fetchMaterialAnalytics } from '../../redux/slices/pdfSlice';
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


const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

export default function PdfAnalyticsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const tabPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const { analytics, loading } = useSelector((s) => s.pdf);
  const summary = analytics.summary;

  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState(null);

  useEffect(() => {
    dispatch(fetchTeacherAnalytics(period));
  }, [period]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchTeacherAnalytics(period));
    setRefreshing(false);
  }, [period]);

  const toggleExpand = (materialId) => {
    if (expandedMaterial === materialId) {
      setExpandedMaterial(null);
    } else {
      setExpandedMaterial(materialId);
      dispatch(fetchMaterialAnalytics(materialId));
    }
  };

  const bg = isDark ? '#0A1628' : '#F8FAFC';
  const cardBg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';
  const borderColor = isDark ? '#30475E' : '#F0F0F0';

  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  // Summary Cards
  const StatCard = ({ icon, label, value, color, gradient }) => (
    <LinearGradient colors={gradient} style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Ionicons name={icon} size={20} color="#FFF" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );

  const renderMaterial = ({ item }) => {
    const material = item.material || {};
    const isExpanded = expandedMaterial === material._id;
    const detail = analytics.materialDetails[material._id];

    return (
      <View style={[styles.materialCard, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          style={styles.materialHeader}
          onPress={() => toggleExpand(material._id)}
          activeOpacity={0.7}
        >
          <View style={styles.materialInfo}>
            <Text style={[styles.materialTitle, { color: textColor }]} numberOfLines={1}>
              {material.title || 'Untitled'}
            </Text>
            <Text style={[styles.materialSubject, { color: mutedColor }]}>
              {material.subject}
            </Text>
          </View>

          <View style={styles.materialStats}>
            <View style={styles.statPill}>
              <Ionicons name="eye" size={12} color={Colors.teal} />
              <Text style={[styles.statPillText, { color: Colors.teal }]}>{item.totalOpens}</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="people" size={12} color={Colors.pink} />
              <Text style={[styles.statPillText, { color: Colors.pink }]}>{item.uniqueStudents}</Text>
            </View>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18} color={mutedColor}
          />
        </TouchableOpacity>

        {/* Completion bar */}
        <View style={styles.completionRow}>
          <View style={[styles.completionTrack, { backgroundColor: isDark ? '#0A1628' : '#EEE' }]}>
            <LinearGradient
              colors={['#11C5C6', '#08AEEA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.completionFill, { width: `${item.avgCompletion || 0}%` }]}
            />
          </View>
          <Text style={[styles.completionText, { color: mutedColor }]}>
            {Math.round(item.avgCompletion || 0)}% avg
          </Text>
        </View>

        {/* Expanded detail */}
        {isExpanded && detail && (
          <View style={[styles.detailSection, { borderTopColor: borderColor }]}>
            <Text style={[styles.detailTitle, { color: textColor }]}>Student Breakdown</Text>

            {detail.studentStats?.length === 0 ? (
              <Text style={[styles.noData, { color: mutedColor }]}>No reading data yet</Text>
            ) : (
              detail.studentStats?.map((student, idx) => (
                <View key={idx} style={[styles.studentRow, { borderBottomColor: borderColor }]}>
                  <View style={styles.studentInfo}>
                    <Text style={[styles.studentName, { color: textColor }]}>{student.studentName}</Text>
                    <Text style={[styles.studentMeta, { color: mutedColor }]}>
                      {student.totalOpens} opens · {formatTime(student.totalTimeSpent)} · Page {student.maxPage || 1}
                    </Text>
                  </View>
                  {/* Mini completion bar */}
                  <View style={styles.miniBarWrap}>
                    <View style={[styles.miniBarTrack, { backgroundColor: isDark ? '#0A1628' : '#EEE' }]}>
                      <View style={[styles.miniBarFill, {
                        width: `${student.maxCompletion || 0}%`,
                        backgroundColor: student.maxCompletion >= 80 ? '#4CAF50' :
                          student.maxCompletion >= 40 ? '#FF9800' : '#F44336',
                      }]} />
                    </View>
                    <Text style={[styles.miniBarText, { color: mutedColor }]}>
                      {Math.round(student.maxCompletion || 0)}%
                    </Text>
                  </View>
                </View>
              ))
            )}

            {/* Most bookmarked pages */}
            {detail.bookmarkStats?.length > 0 && (
              <View style={styles.bookmarkSection}>
                <Text style={[styles.bookmarkTitle, { color: textColor }]}>
                  📌 Most Bookmarked Pages
                </Text>
                <View style={styles.bookmarkPills}>
                  {detail.bookmarkStats.map((b, i) => (
                    <View key={i} style={styles.bookmarkPill}>
                      <Text style={styles.bookmarkPillText}>
                        P.{b._id} ({b.count})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabPadding + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pink} />
        }
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Period Filter */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[
                styles.periodText,
                period === p.key ? styles.periodTextActive : { color: mutedColor },
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        {loading.analytics && !summary ? (
          <ActivityIndicator size="large" color={Colors.pink} style={{ marginTop: 40 }} />
        ) : summary ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statRow}>
              <StatCard
                icon="eye" label="Total Opens"
                value={summary.totalOpens || 0}
                gradient={['#FF4F8B', '#FF2E5E']}
              />
              <StatCard
                icon="people" label="Active Students"
                value={summary.uniqueStudents || 0}
                gradient={['#11C5C6', '#08AEEA']}
              />
              <StatCard
                icon="checkmark-circle" label="Avg Completion"
                value={`${summary.avgCompletion || 0}%`}
                gradient={['#9B59B6', '#8E44AD']}
              />
              <StatCard
                icon="star" label="Most Read"
                value={summary.mostReadMaterial?.material?.title?.substring(0, 12) || 'N/A'}
                gradient={['#F39C12', '#E67E22']}
              />
            </ScrollView>

            {/* Material Breakdown */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Material Performance
            </Text>

            {(summary.materialBreakdown || []).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={48} color={mutedColor} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: mutedColor }]}>
                  No reading activity yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={summary.materialBreakdown}
                keyExtractor={(item) => item.material?._id || Math.random().toString()}
                renderItem={renderMaterial}
                scrollEnabled={false}
              />
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color={mutedColor} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Analytics Data</Text>
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Analytics will appear when students start reading your materials
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 8,
  },
  periodBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  periodBtnActive: { backgroundColor: Colors.pink },
  periodText: { fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#FFF', fontWeight: '700' },
  statRow: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: {
    width: 130, padding: 14, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  materialCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  materialHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8,
  },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 14, fontWeight: '700' },
  materialSubject: { fontSize: 11, marginTop: 2 },
  materialStats: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  statPillText: { fontSize: 12, fontWeight: '700' },
  completionRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 8,
  },
  completionTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 2 },
  completionText: { fontSize: 11, minWidth: 50, textAlign: 'right' },
  detailSection: { borderTopWidth: 1, padding: 14 },
  detailTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  noData: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 13, fontWeight: '600' },
  studentMeta: { fontSize: 11, marginTop: 2 },
  miniBarWrap: { width: 80, alignItems: 'flex-end' },
  miniBarTrack: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  miniBarFill: { height: '100%', borderRadius: 2 },
  miniBarText: { fontSize: 10, fontWeight: '600' },
  bookmarkSection: { marginTop: 14 },
  bookmarkTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  bookmarkPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bookmarkPill: {
    backgroundColor: 'rgba(255,79,139,0.1)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  bookmarkPillText: { fontSize: 11, fontWeight: '600', color: Colors.pink },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});

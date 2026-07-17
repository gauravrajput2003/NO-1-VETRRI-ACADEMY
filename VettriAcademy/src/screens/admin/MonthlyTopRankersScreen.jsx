import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity as RNTouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getAdminTopRankersAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

const TouchableOpacity = (props) => {
  const { particleCount = 16, size = 'small', colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};

const rankThemes = [
  { label: 'Gold', accent: '#D4AF37', badge: '#FFF7D6', icon: 'trophy' },
  { label: 'Silver', accent: '#8D99AE', badge: '#F3F5F7', icon: 'medal' },
  { label: 'Bronze', accent: '#CD7F32', badge: '#FAF1E8', icon: 'ribbon' },
];

export default function MonthlyTopRankersScreen({ navigation }) {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const [rankers, setRankers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.offWhite;
  const cardBg = isDark ? Colors.card.dark : Colors.white;
  const textColor = isDark ? Colors.text.dark : Colors.navy;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.mediumGray;
  const headerTextSec = isDark ? 'rgba(255,255,255,0.72)' : Colors.gray;

  const loadRankers = useCallback(async () => {
    try {
      const response = await getAdminTopRankersAPI({ limit: 10 });
      setRankers(response.data?.topRankers || []);
    } catch {
      setRankers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRankers();
    }, [loadRankers])
  );

  const renderItem = ({ item, index }) => {
    const themeConfig = rankThemes[index] || { label: 'Top 10', accent: Colors.primary, badge: '#EEF6FF', icon: 'sparkles' };

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        activeOpacity={0.85}
        onPress={() => {}}
        particleCount={14}
      >
        <View style={[styles.rankBadge, { backgroundColor: themeConfig.badge }]}>
          <Ionicons name={themeConfig.icon} size={18} color={themeConfig.accent} />
          <Text style={[styles.rankBadgeText, { color: themeConfig.accent }]}>#{index + 1}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.meta, { color: textSec }]} numberOfLines={1}>{item.grade ? `Grade ${item.grade}` : 'Monthly ranking'}</Text>
        </View>

        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: themeConfig.accent }]}>{item.score}</Text>
          <Text style={[styles.rankLabel, { color: textSec }]}>{themeConfig.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor }]}>Monthly Top Rankers</Text>
        
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: textColor }]}>Full Monthly Board</Text>
        <Text style={[styles.listSub, { color: textSec }]}>Top 10 students are listed below</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rankers}
          keyExtractor={(item, index) => `${item.rank}-${item.name}-${index}`}
          renderItem={renderItem}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRankers(); }} colors={[Colors.primary]} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + 40 }]}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <Ionicons name="trophy-outline" size={52} color={Colors.mediumGray} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No rankers found</Text>
              <Text style={[styles.emptyText, { color: textSec }]}>Monthly ranking data will appear here once scores are published.</Text>
            </View>
          )}
          ListFooterComponent={<View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.light },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 3 },
  listHeader: { paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: '800' },
  listSub: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, marginBottom: 10, ...Shadows.light },
  rankBadge: { width: 74, borderRadius: 16, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  rankBadgeText: { fontSize: 12, fontWeight: '900', marginTop: 2 },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3 },
  scoreWrap: { alignItems: 'flex-end' },
  score: { fontSize: 18, fontWeight: '900' },
  rankLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
});
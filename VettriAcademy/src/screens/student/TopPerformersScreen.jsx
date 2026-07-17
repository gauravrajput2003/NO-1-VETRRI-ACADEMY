import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getStudentDashboardAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

const C = {
  purple: '#7B61FF',
  pink: '#FF4FA3',
  teal: '#14B8A6',
  orange: '#F5A623',
  white: '#FFFFFF',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export default function TopPerformersScreen() {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? '#1A1A2E' : '#F5F3FF';
  const cardBg = isDark ? '#2D2D44' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSec = isDark ? '#AAAAAA' : '#666666';

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data } = await getStudentDashboardAPI();
      if (data.success && data.dashboard?.leaderboard) {
        // Ensure it is limited to top 5
        setPerformers(data.dashboard.leaderboard.slice(0, 5));
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (index) => {
    const config = {
      0: { emoji: '👑', color: C.gold, badgeBg: '#FFFDF0', label: '1st Place' },
      1: { emoji: '🥈', color: C.silver, badgeBg: '#F8F9FA', label: '2nd Place' },
      2: { emoji: '🥉', color: C.bronze, badgeBg: '#FAF4F0', label: '3rd Place' },
      3: { emoji: '⭐', color: C.purple, badgeBg: '#F3F4F6', label: '4th Place' },
      4: { emoji: '⭐', color: C.purple, badgeBg: '#F3F4F6', label: '5th Place' },
    };
    return config[index] || { emoji: '⚡', color: C.teal, badgeBg: '#F3F4F6', label: `${index + 1}th Place` };
  };

  const renderItem = ({ item, index }) => {
    const rank = getRankStyle(index);

    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.leftRow}>
          <View style={[styles.avatarCircle, { backgroundColor: rank.badgeBg }]}>
            <Text style={styles.avatarText}>{rank.emoji}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: textColor }]}>{item._id?.name || 'Student'}</Text>
            <Text style={[styles.grade, { color: textSec }]}>
              {item._id?.grade ? `Grade ${item._id.grade}` : 'Academy Student'}
            </Text>
          </View>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.pointsLabel, { color: rank.color }]}>{item.totalScore} pts</Text>
          <Text style={[styles.rankLabel, { color: textSec }]}>{rank.label}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={C.purple} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={performers}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 20 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textColor }]}>This Week's Stars</Text>
            <Text style={[styles.headerSub, { color: textSec }]}>
              The top 5 students with the highest test scores this week. Keep learning to see your name here!
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={60} color={C.pink} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: textSec }]}>No top performers yet for this week.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20, marginTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  headerSub: { fontSize: 13, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    ...Shadows.light,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  avatarText: { fontSize: 24 },
  nameContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800' },
  grade: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  scoreContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  pointsLabel: { fontSize: 18, fontWeight: '900' },
  rankLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
});

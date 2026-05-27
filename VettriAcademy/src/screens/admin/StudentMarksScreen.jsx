import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getAdminStudentMarksAPI } from '../../services/api';

const getScore = (item) => Number(item.percentage ?? (item.maxMarks ? ((item.marksObtained / item.maxMarks) * 100) : 0));

export default function StudentMarksScreen({ navigation }) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadMarks = useCallback(async () => {
    try {
      const response = await getAdminStudentMarksAPI({ limit: 200 });
      setMarks(response.data?.marks || []);
    } catch {
      setMarks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMarks();
    }, [loadMarks])
  );

  const sortedMarks = useMemo(() => {
    return [...marks].sort((a, b) => getScore(b) - getScore(a));
  }, [marks]);

  const filteredMarks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedMarks;
    return sortedMarks.filter((item) => {
      const studentName = (item.student?.displayName || item.student?.name || '').toLowerCase();
      return studentName.includes(normalized);
    });
  }, [query, sortedMarks]);

  const topStudent = filteredMarks[0];

  const renderItem = ({ item, index }) => {
    const score = getScore(item);
    const grade = item.grade || (score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D');
    const gradeColor = score >= 80 ? '#00B894' : score >= 60 ? '#FDCB6E' : '#E17055';

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.student?.displayName || item.student?.name || 'S')[0]?.toUpperCase()}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={1}>{item.student?.displayName || item.student?.name || 'Student'}</Text>
          <Text style={styles.detail} numberOfLines={1}>{item.subject} · {item.examTitle}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.gradePill, { backgroundColor: gradeColor + '18' }]}>
              <Text style={[styles.gradePillText, { color: gradeColor }]}>{grade}</Text>
            </View>
            <Text style={styles.metaText}>{item.marksObtained}/{item.maxMarks}</Text>
          </View>
        </View>

        <View style={styles.scoreSection}>
          <Text style={styles.score}>{score.toFixed(0)}%</Text>
          <View style={styles.rankChip}>
            <Text style={styles.rankChipText}>#{index + 1}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>All Student Marks</Text>
          <Text style={styles.subtitle}>Top scorer stays at the top automatically</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View>
            <Text style={styles.summaryLabel}>Filtered Students</Text>
            <Text style={styles.summaryValue}>{filteredMarks.length}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <Ionicons name="bar-chart" size={22} color={Colors.white} />
          </View>
        </View>

        {topStudent ? (
          <Text style={styles.summaryNote}>
            Top now: {topStudent.student?.displayName || topStudent.student?.name || 'Student'}
          </Text>
        ) : (
          <Text style={styles.summaryNote}>No marks match the current filter.</Text>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.mediumGray} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filter by student name"
          placeholderTextColor={Colors.mediumGray}
          style={styles.searchInput}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.mediumGray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMarks}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMarks(); }} colors={[Colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={48} color={Colors.mediumGray} />
              <Text style={styles.emptyTitle}>No marks found</Text>
              <Text style={styles.emptyText}>Try a different student name.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite, padding: 16, paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.light },
  title: { fontSize: 24, fontWeight: '800', color: Colors.navy },
  subtitle: { fontSize: 13, color: Colors.gray, marginTop: 3 },
  summaryCard: { borderRadius: 24, padding: 18, backgroundColor: Colors.navy, ...Shadows.medium },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  summaryValue: { fontSize: 34, fontWeight: '900', color: Colors.white, marginTop: 4 },
  summaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.pink, justifyContent: 'center', alignItems: 'center' },
  summaryNote: { color: 'rgba(255,255,255,0.78)', marginTop: 10, fontSize: 13, lineHeight: 18 },
  searchWrap: { marginTop: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: 14, height: 52, ...Shadows.light },
  searchInput: { flex: 1, fontSize: 15, color: Colors.navy },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 28 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10, ...Shadows.light },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.teal + '18', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.teal, fontSize: 16, fontWeight: '800' },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  detail: { fontSize: 12, color: Colors.mediumGray, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  gradePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  gradePillText: { fontSize: 11, fontWeight: '800' },
  metaText: { fontSize: 11, color: Colors.mediumGray, fontWeight: '600' },
  scoreSection: { alignItems: 'flex-end', gap: 4 },
  score: { fontSize: 20, fontWeight: '900', color: Colors.navy },
  rankChip: { backgroundColor: Colors.pink + '14', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  rankChipText: { color: Colors.pink, fontSize: 11, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy, marginTop: 10 },
  emptyText: { fontSize: 13, color: Colors.gray, marginTop: 4 },
});
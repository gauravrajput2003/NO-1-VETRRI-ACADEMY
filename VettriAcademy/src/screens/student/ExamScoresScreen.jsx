import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors, gradeColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatPercentage, calculateGrade } from '../../utils/formatters';
import { getStudentScoresAPI } from '../../services/api';

export default function ExamScoresScreen() {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const { data } = await getStudentScoresAPI();
      setScores(data.scores || []);
    } catch (err) {
      console.error('Scores error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderScore = ({ item }) => {
    const pct = (item.marksObtained / item.maxMarks) * 100;
    const grade = item.grade || calculateGrade(pct);
    const gradeColor = gradeColors[grade] || Colors.primary;

    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.examTitle, { color: textColor }]}>{item.examTitle}</Text>
            <Text style={[styles.subject, { color: textSec }]}>{item.subject}</Text>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '18' }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: gradeColor }]} />
          </View>
          <Text style={[styles.pctText, { color: textColor }]}>{formatPercentage(pct)}</Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={[styles.scoreText, { color: textSec }]}>{item.marksObtained}/{item.maxMarks}</Text>
          <Text style={[styles.dateText, { color: textSec }]}>{formatDate(item.examDate)}</Text>
        </View>
        {item.remarks && <Text style={[styles.remarks, { color: textSec }]}>💬 {item.remarks}</Text>}
      </View>
    );
  };

  if (loading) return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList
        data={scores}
        keyExtractor={(item) => item._id}
        renderItem={renderScore}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={48} color={Colors.mediumGray} />
            <Text style={[styles.emptyText, { color: textSec }]}>No exam scores yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  examTitle: { fontSize: 16, fontWeight: '700' },
  subject: { fontSize: 13, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  gradeText: { fontSize: 16, fontWeight: 'bold' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.06)' },
  progressFill: { height: '100%', borderRadius: 4 },
  pctText: { fontSize: 14, fontWeight: '700', width: 50, textAlign: 'right' },
  scoreInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreText: { fontSize: 13 },
  dateText: { fontSize: 12 },
  remarks: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

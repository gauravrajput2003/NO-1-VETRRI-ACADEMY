import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { fetchGrading } from '../../redux/slices/teacherSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

export default function MonthlyReportScreen() {
  const dispatch = useDispatch();
  const { grading, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const now = new Date();
  useEffect(() => {
    dispatch(fetchGrading({ month: now.getMonth() + 1, year: now.getFullYear() }));
  }, []);

  if (loading) return <View style={[styles.centered, { backgroundColor: bgColor }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const g = grading?.grading || grading;

  const criteria = g ? [
    { label: 'Login Punctuality', score: g.loginPunctuality, max: 20, icon: 'time', color: Colors.primary },
    { label: 'Question Papers On Time', score: g.questionPaperOnTime, max: 15, icon: 'document-text', color: Colors.info },
    { label: 'Answer Sheet Return', score: g.answerSheetReturn, max: 15, icon: 'checkmark-done-circle', color: Colors.success },
    { label: 'Leave Score', score: g.leaveScore, max: 10, icon: 'airplane', color: Colors.warning },
    { label: 'Professional Appearance', score: g.professionalAppearance, max: 10, icon: 'shirt', color: Colors.gold },
    { label: 'Network Issues', score: g.networkIssues, max: 10, icon: 'wifi', color: Colors.error },
    { label: 'Parent Rating', score: g.parentRating, max: 20, icon: 'star', color: Colors.primary },
  ] : [];

  const totalScore = g?.totalScore || 0;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: bgColor }]} 
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
      onScroll={onTabBarScroll}
      scrollEventThrottle={16}
    >
      {!g ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={48} color={Colors.mediumGray} />
          <Text style={[styles.emptyText, { color: textSec }]}>No grading data for this month</Text>
        </View>
      ) : (
        <>
          {/* Total Score Circle */}
          <View style={[styles.scoreCard, { backgroundColor: cardBg }]}>
            <View style={[styles.circle, { borderColor: totalScore >= 75 ? Colors.success : totalScore >= 50 ? Colors.warning : Colors.error }]}>
              <Text style={[styles.circleScore, { color: textColor }]}>{totalScore}</Text>
              <Text style={[styles.circleLabel, { color: textSec }]}>/ 100</Text>
            </View>
            <Text style={[styles.monthLabel, { color: textColor }]}>{g.month || `Month ${now.getMonth() + 1}`}, {g.year || now.getFullYear()}</Text>
            {g.rank && <Text style={[styles.rankText, { color: Colors.gold }]}>🏅 Rank #{g.rank}</Text>}
            {g.isBestTeacher && <Text style={styles.bestBadge}>🌟 Best Teacher of the Month!</Text>}
          </View>

          {/* Criteria breakdown */}
          {criteria.map((c, i) => (
            <View key={i} style={[styles.criteriaCard, { backgroundColor: cardBg }]}>
              <View style={[styles.criteriaIcon, { backgroundColor: c.color + '14' }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.criteriaLabel, { color: textColor }]}>{c.label}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(c.score / c.max) * 100}%`, backgroundColor: c.color }]} />
                </View>
              </View>
              <Text style={[styles.criteriaScore, { color: textColor }]}>{c.score || 0}/{c.max}</Text>
            </View>
          ))}

          {g.remarks && (
            <View style={[styles.remarksCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.remarksLabel, { color: textColor }]}>Admin Remarks</Text>
              <Text style={[styles.remarksText, { color: textSec }]}>{g.remarks}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scoreCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, ...Shadows.medium },
  circle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  circleScore: { fontSize: 36, fontWeight: 'bold' },
  circleLabel: { fontSize: 14 },
  monthLabel: { fontSize: 17, fontWeight: '600' },
  rankText: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  bestBadge: { fontSize: 15, fontWeight: '700', color: Colors.gold, marginTop: 6, backgroundColor: Colors.gold + '18', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  criteriaCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, ...Shadows.light },
  criteriaIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  criteriaLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)' },
  progressFill: { height: '100%', borderRadius: 3 },
  criteriaScore: { fontSize: 15, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  remarksCard: { borderRadius: 14, padding: 16, marginTop: 8, ...Shadows.light },
  remarksLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  remarksText: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

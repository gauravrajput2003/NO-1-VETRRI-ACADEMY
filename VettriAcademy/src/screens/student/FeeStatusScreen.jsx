import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { Colors, feeStatusColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStudentFeesAPI } from '../../services/api';

export default function FeeStatusScreen({ navigation }) {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: response } = await getStudentFeesAPI();
      setData(response);
    } catch (error) {
      console.error('Failed to load fee status', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSecondary = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const current = data?.currentMonthFee;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <LinearGradient colors={Colors.gradient.primary} style={styles.heroCard}>
        <Text style={styles.heroTitle}>Fees & Payments</Text>
        <Text style={styles.heroSub}>Manual fee tracking with live dues and payment history.</Text>
      </LinearGradient>

      <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>This Month</Text>
            <Text style={[styles.summaryValue, { color: textColor }]}>{current?.monthYear || 'Current Month'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: (feeStatusColors[current?.status] || Colors.mediumGray) + '20' }]}>
            <Text style={[styles.statusText, { color: feeStatusColors[current?.status] || Colors.mediumGray }]}>{(current?.status || 'pending').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.moneyGrid}>
          <View style={styles.moneyItem}>
            <Text style={[styles.moneyLabel, { color: textSecondary }]}>Due</Text>
            <Text style={[styles.moneyValue, { color: textColor }]}>{formatCurrency(current?.dueAmount || 0)}</Text>
          </View>
          <View style={styles.moneyItem}>
            <Text style={[styles.moneyLabel, { color: textSecondary }]}>Paid</Text>
            <Text style={[styles.moneyValue, { color: Colors.success }]}>{formatCurrency(current?.paidAmount || 0)}</Text>
          </View>
          <View style={styles.moneyItem}>
            <Text style={[styles.moneyLabel, { color: textSecondary }]}>Remaining</Text>
            <Text style={[styles.moneyValue, { color: Colors.error }]}>{formatCurrency(current?.remainingAmount || 0)}</Text>
          </View>
        </View>

        <Text style={[styles.smallText, { color: textSecondary }]}>
          Due date: {formatDate(current?.dueDate)} · Method: {current?.paymentMethod || 'Not recorded'}
        </Text>
        {current?.status === 'paid' ? (
          <Text style={[styles.note, { color: Colors.success }]}>Thank you for on-time payment.</Text>
        ) : (
          <Text style={[styles.note, { color: Colors.warning }]}>Please clear your fee balance with the school office.</Text>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Outstanding Dues</Text>
        {data?.pendingDues?.length ? data.pendingDues.map((due) => (
          <View key={due.monthYear} style={styles.dueRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dueMonth, { color: textColor }]}>{due.monthYear}</Text>
              <Text style={[styles.dueMeta, { color: textSecondary }]}>
                Overdue by {due.overdueBy || 0} day(s) · Due {formatDate(due.dueDate)}
              </Text>
            </View>
            <Text style={[styles.dueAmount, { color: Colors.error }]}>{formatCurrency(due.amount)}</Text>
          </View>
        )) : (
          <View style={styles.emptyBox}>
            <Ionicons name="shield-checkmark-outline" size={34} color={Colors.success} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No outstanding dues.</Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Payment History</Text>
        {data?.feesHistory?.length ? data.feesHistory.map((item) => (
          <View key={item._id} style={styles.historyRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyMonth, { color: textColor }]}>{item.monthYear}</Text>
              <Text style={[styles.historyMeta, { color: textSecondary }]}>
                {item.paymentMethod || 'No method'} · {item.paymentDate ? formatDate(item.paymentDate) : 'Pending'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.historyAmount, { color: textColor }]}>{formatCurrency(item.paidAmount || 0)}</Text>
              <Text style={[styles.statusMini, { color: feeStatusColors[item.status] || Colors.mediumGray }]}>{item.status?.toUpperCase()}</Text>
            </View>
          </View>
        )) : (
          <Text style={[styles.emptyText, { color: textSecondary }]}>No payment history yet.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate('Notifications')}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.white} />
        <Text style={styles.contactText}>Contact School</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { margin: 16, borderRadius: 20, padding: 20 },
  heroTitle: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.88)', marginTop: 6, lineHeight: 20 },
  summaryCard: { marginHorizontal: 16, borderRadius: 18, padding: 16, ...Shadows.light },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  moneyGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  moneyItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12 },
  moneyLabel: { fontSize: 12, marginBottom: 4 },
  moneyValue: { fontSize: 16, fontWeight: '800' },
  smallText: { marginTop: 14, fontSize: 13 },
  note: { marginTop: 8, fontWeight: '700' },
  sectionCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 16, ...Shadows.light },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  dueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  dueMonth: { fontSize: 15, fontWeight: '700' },
  dueMeta: { fontSize: 12, marginTop: 3 },
  dueAmount: { fontSize: 15, fontWeight: '800' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  historyMonth: { fontSize: 15, fontWeight: '700' },
  historyMeta: { fontSize: 12, marginTop: 3 },
  historyAmount: { fontSize: 15, fontWeight: '800' },
  statusMini: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  emptyBox: { alignItems: 'center', paddingVertical: 18 },
  emptyText: { marginTop: 8, fontSize: 13 },
  contactBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.pink, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  contactText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { fetchCurrentSalary, fetchSalaryHistory } from '../../redux/slices/teacherSlice';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../../utils/constants';
import { getToken } from '../../services/storage';

export default function SalaryScreen() {
  const dispatch = useDispatch();
  const { currentSalary, salaryHistory, salaryConfig, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadData = async () => {
    try {
      await Promise.all([dispatch(fetchCurrentSalary()), dispatch(fetchSalaryHistory())]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSlip = async () => {
    if (!currentSalary?.teacherId || !currentSalary?.monthYear) return;
    const teacherId = currentSalary.teacherId;
    const monthYear = encodeURIComponent(currentSalary.monthYear);
    const url = `${API_BASE_URL}/teacher/salary/${teacherId}/${monthYear}/slip`;
    const filename = `salary_${teacherId}_${currentSalary.monthYear.replace(/\s+/g, '_')}.pdf`;
    const fileUri = FileSystem.cacheDirectory + filename;

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, { headers });
      if (downloadRes.status !== 200 && downloadRes.status !== 201) {
        throw new Error('Download failed');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, { mimeType: 'application/pdf' });
      } else {
        Toast.show({ type: 'success', text1: 'Downloaded', text2: 'Salary slip saved to cache.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Slip unavailable', text2: error.message || 'Unable to download salary slip' });
    }
  };

  if (loading && !currentSalary) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const earnings = [
    { label: 'Base', value: currentSalary?.baseSalary || 0 },
    { label: 'Bonus', value: currentSalary?.performanceBonus || 0 },
    { label: 'Allowance', value: currentSalary?.specialAllowance || 0 },
  ];
  const deductions = [
    { label: 'PF', value: currentSalary?.providentFund || 0 },
    { label: 'Tax', value: currentSalary?.taxDeduction || 0 },
    { label: 'Other', value: currentSalary?.otherDeductions || 0 },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <LinearGradient colors={['#00A8AB', '#008B8D']} style={styles.hero}>
        <Text style={styles.heroTitle}>My Salary & Payments</Text>
        <Text style={styles.heroSub}>{currentSalary?.monthYear || 'Current month'} salary statement</Text>
      </LinearGradient>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Current Month</Text>
        <Text style={[styles.bigAmount, { color: textColor }]}>{formatCurrency(currentSalary?.netSalary || 0)}</Text>
        <Text style={[styles.status, { color: currentSalary?.paymentStatus === 'paid' ? Colors.success : Colors.warning }]}>
          {String(currentSalary?.paymentStatus || 'pending').toUpperCase()}
        </Text>
        <Text style={[styles.small, { color: textSec }]}>Paid on: {formatDate(currentSalary?.paidDate) || 'Not yet paid'}</Text>
        <Text style={[styles.small, { color: textSec }]}>Method: {currentSalary?.paymentMethod || salaryConfig?.paymentMode || 'bank_transfer'}</Text>
        <Text style={[styles.small, { color: textSec }]}>Transaction ID: {currentSalary?.transactionId || '-'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSlip}>
          <Ionicons name="download-outline" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Generate Slip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Salary Breakdown</Text>
        <View style={styles.grid}>
          {earnings.map((item) => (
            <View key={item.label} style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: textSec }]}>{item.label}</Text>
              <Text style={[styles.gridValue, { color: textColor }]}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        <View style={styles.grid}>
          {deductions.map((item) => (
            <View key={item.label} style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: textSec }]}>{item.label}</Text>
              <Text style={[styles.gridValue, { color: Colors.error }]}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={[styles.small, { color: textSec }]}>Gross: {formatCurrency(currentSalary?.grossSalary || 0)}</Text>
        <Text style={[styles.small, { color: textSec }]}>Net: {formatCurrency(currentSalary?.netSalary || 0)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Bank Details</Text>
        <Text style={[styles.small, { color: textSec }]}>Bank: {salaryConfig?.bankName || '-'}</Text>
        <Text style={[styles.small, { color: textSec }]}>Account: {salaryConfig?.bankAccount ? `****${String(salaryConfig.bankAccount).slice(-4)}` : '-'}</Text>
        <Text style={[styles.small, { color: textSec }]}>IFSC: {salaryConfig?.ifscCode || '-'}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Last 12 Months</Text>
        {salaryHistory.length ? salaryHistory.map((item) => (
          <View key={item.monthYear} style={styles.historyRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyMonth, { color: textColor }]}>{item.monthYear}</Text>
              <Text style={[styles.small, { color: textSec }]}>{item.paymentStatus?.toUpperCase() || 'PENDING'} • {item.paymentMethod || '-'}</Text>
            </View>
            <Text style={[styles.historyAmount, { color: textColor }]}>{formatCurrency(item.netSalary || 0)}</Text>
          </View>
        )) : (
          <Text style={[styles.small, { color: textSec }]}>No salary history yet.</Text>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { margin: 16, borderRadius: 20, padding: 20 },
  heroTitle: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, ...Shadows.light },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  bigAmount: { fontSize: 30, fontWeight: '900' },
  status: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  small: { fontSize: 13, marginTop: 4 },
  primaryBtn: { marginTop: 14, backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: Colors.white, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 12 },
  gridLabel: { fontSize: 12 },
  gridValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  historyMonth: { fontSize: 15, fontWeight: '700' },
  historyAmount: { fontSize: 15, fontWeight: '800' },
});

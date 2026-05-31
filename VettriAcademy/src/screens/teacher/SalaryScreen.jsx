import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity as RNTouchableOpacity, ActivityIndicator } from 'react-native';
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
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


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
  const paymentStatus = String(currentSalary?.paymentStatus || 'pending');
  const paymentTone = paymentStatus === 'paid' ? Colors.success : Colors.warning;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.heroShell}>
        <View style={styles.heroRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="wallet-outline" size={24} color={Colors.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Teacher Payroll</Text>
            <Text style={styles.heroTitle}>Salary Management</Text>
            <Text style={styles.heroSub}>{currentSalary?.monthYear || 'Current month'} payout summary</Text>
          </View>
        </View>
        <View style={styles.heroStatusBar}>
          <View style={[styles.heroDot, { backgroundColor: paymentTone }]} />
          <Text style={styles.heroStatusText}>{paymentStatus === 'paid' ? 'Salary processed' : 'Salary pending review'}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Current Month</Text>
          <View style={[styles.statusChip, { backgroundColor: paymentStatus === 'paid' ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 152, 0, 0.12)' }]}>
            <Text style={[styles.statusChipText, { color: paymentTone }]}>{paymentStatus.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.bigAmount, { color: textColor }]}>{formatCurrency(currentSalary?.netSalary || 0)}</Text>
        <Text style={[styles.small, { color: textSec }]}>Net salary for {currentSalary?.monthYear || 'this month'}</Text>
        <Text style={[styles.status, { color: currentSalary?.paymentStatus === 'paid' ? Colors.success : Colors.warning }]}>
          {paymentStatus.toUpperCase()}
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
  heroShell: { margin: 16, borderRadius: 22, padding: 16, backgroundColor: Colors.white, ...Shadows.light },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 79, 139, 0.12)', justifyContent: 'center', alignItems: 'center' },
  heroEyebrow: { color: Colors.pink, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroTitle: { color: Colors.navy, fontSize: 24, fontWeight: '900', marginTop: 2 },
  heroSub: { color: Colors.mediumGray, marginTop: 4 },
  heroStatusBar: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: Colors.surface.light },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatusText: { color: Colors.navy, fontSize: 13, fontWeight: '600' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, backgroundColor: Colors.white, ...Shadows.light },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  bigAmount: { fontSize: 30, fontWeight: '900' },
  status: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  statusChip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  statusChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  small: { fontSize: 13, marginTop: 4 },
  primaryBtn: { marginTop: 14, backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: Colors.white, fontWeight: '800' },
  grid: { flexDirection: 'row', gap: 10 },
  gridItem: { flex: 1, backgroundColor: Colors.surface.light, borderRadius: 14, padding: 12 },
  gridLabel: { fontSize: 12 },
  gridValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.gray, marginVertical: 14 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.gray },
  historyMonth: { fontSize: 15, fontWeight: '700' },
  historyAmount: { fontSize: 15, fontWeight: '800' },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getTeacherSalaryCurrentMonthAPI,
  getTeacherSalaryHistoryAPI,
  getTeacherSalarySlipAPI,
} from '../../services/api';

// Mirrors backend EARNING_FIELDS / DEDUCTION_FIELDS in salaryController.js
const EARNING_FIELDS = [
  { key: 'baseSalary', label: 'Base Salary' },
  { key: 'groupTuitionSalary', label: 'Group Tuition Salary' },
  { key: 'individualTuitionSalary', label: 'Individual Tuition Salary' },
  { key: 'hourlyTuitionSalary', label: 'Hourly Tuition Salary' },
  { key: 'weeklyTuitionSalary', label: 'Weekly Tuition Salary' },
  { key: 'performanceBonus', label: 'Performance Bonus' },
  { key: 'specialAllowance', label: 'Special Allowance' },
];

const DEDUCTION_FIELDS = [
  { key: 'providentFund', label: 'Provident Fund' },
  { key: 'taxDeduction', label: 'Tax Deduction' },
  { key: 'otherDeductions', label: 'Other Deductions' },
  { key: 'attendanceDeductionAmount', label: 'Attendance Deduction' },
];

const STATUS_COLORS = {
  paid: Colors.success,
  partial: Colors.warning,
  pending: Colors.error || '#ff3d71',
};

// ── PDF byte-array -> base64 -> share/download helpers (same pattern used on admin screen) ──
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return global.btoa ? global.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
};

const savePdfAndShare = async (arrayBuffer, filename) => {
  if (Platform.OS === 'web') {
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return url;
  }

  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: filename });
  }
  return fileUri;
};

const parseApiError = (error) => {
  const data = error?.response?.data;
  if (data instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder().decode(data);
      const parsed = JSON.parse(text);
      return parsed.message || text;
    } catch (e) {
      return `Server returned ${error.response?.status || 'an error'}`;
    }
  }
  return error?.response?.data?.message || error?.message || 'Unknown error';
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || Colors.mediumGray;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{(status || 'pending').toUpperCase()}</Text>
    </View>
  );
}

export default function SalaryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((s) => s.auth);
  const teacherId = user?._id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSalary, setCurrentSalary] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedMonthYear, setSelectedMonthYear] = useState(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [currentRes, historyRes] = await Promise.all([
        getTeacherSalaryCurrentMonthAPI(),
        getTeacherSalaryHistoryAPI(),
      ]);
      const current = currentRes.data?.salary || null;
      setCurrentSalary(current);
      setHistory(historyRes.data?.salaryHistory || []);
      setSelectedMonthYear((prev) => prev || current?.monthYear || null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load salary', text2: parseApiError(error) });
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

  // Build the list of selectable records: current month first, then history (deduped by monthYear)
  const records = React.useMemo(() => {
    const list = [];
    if (currentSalary) list.push(currentSalary);
    history.forEach((h) => {
      if (!list.some((r) => r.monthYear === h.monthYear)) list.push(h);
    });
    return list;
  }, [currentSalary, history]);

  const selectedRecord = records.find((r) => r.monthYear === selectedMonthYear) || records[0] || null;

  const canDownload = Boolean(selectedRecord?.salarySlipGenerated);

  const handleDownload = async () => {
    if (!selectedRecord || !teacherId) return;
    if (!canDownload) {
      Toast.show({
        type: 'info',
        text1: 'Not available yet',
        text2: 'Admin has not processed this salary yet.',
      });
      return;
    }
    setDownloading(true);
    try {
      const { data } = await getTeacherSalarySlipAPI(teacherId, selectedRecord.monthYear);
      const filename = `salary-slip-${selectedRecord.monthYear}`.replace(/\s+/g, '-').toLowerCase() + '.pdf';
      await savePdfAndShare(data, filename);
      Toast.show({ type: 'success', text1: 'Slip ready', text2: 'Choose where to save or share it.' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: parseApiError(error) });
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !currentSalary) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const remaining = Math.max((selectedRecord?.netSalary || 0) - (selectedRecord?.paidAmount || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Salary</Text>
          <Text style={styles.headerSub}>View, download and track your salary payments</Text>
        </View>

        {/* Month selector */}
        {records.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScroll}
          >
            {records.map((r) => {
              const active = r.monthYear === selectedRecord?.monthYear;
              return (
                <TouchableOpacity
                  key={r.monthYear}
                  style={[styles.monthChip, active && styles.monthChipActive]}
                  onPress={() => setSelectedMonthYear(r.monthYear)}
                >
                  <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{r.monthYear}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {!selectedRecord ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={40} color={Colors.mediumGray} />
            <Text style={styles.emptyText}>No salary records found yet.</Text>
          </View>
        ) : (
          <>
            {/* Main salary card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardMonth}>{selectedRecord.monthYear}</Text>
                <StatusBadge status={selectedRecord.paymentStatus} />
              </View>

              <Text style={styles.netLabel}>Net Salary</Text>
              <Text style={styles.netValue}>{formatCurrency(selectedRecord.netSalary || 0)}</Text>

              <View style={styles.rowBetween}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Paid</Text>
                  <Text style={[styles.metaValue, { color: Colors.success }]}>
                    {formatCurrency(selectedRecord.paidAmount || 0)}
                  </Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Remaining</Text>
                  <Text style={[styles.metaValue, { color: remaining > 0 ? Colors.warning : Colors.navy }]}>
                    {formatCurrency(remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>{selectedRecord.paymentMethod || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Paid Date</Text>
                <Text style={styles.infoValue}>
                  {selectedRecord.paidDate ? formatDate(selectedRecord.paidDate) : '-'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transaction ID</Text>
                <Text style={styles.infoValue}>{selectedRecord.transactionId || '-'}</Text>
              </View>

              {/* Dedicated action buttons: Salary / Breakdown / Printout */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={onRefresh}>
                  <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Salary</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => setBreakdownVisible(true)}>
                  <Ionicons name="list-outline" size={18} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Breakdown</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary, !canDownload && styles.actionBtnDisabled]}
                  onPress={handleDownload}
                  disabled={downloading || !canDownload}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color={Colors.white} />
                      <Text style={[styles.actionBtnText, { color: Colors.white }]}>Printout</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {!canDownload && (
                <Text style={styles.pendingNote}>
                  Your slip will be available for download once admin processes this month's salary.
                </Text>
              )}
            </View>

            {/* Payment history (only present on the live current-month transaction) */}
            {Array.isArray(selectedRecord.payments) && selectedRecord.payments.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Payment History</Text>
                {selectedRecord.payments.map((p, idx) => (
                  <View key={p._id || idx} style={styles.paymentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(p.amount)} · {p.method}
                      </Text>
                      <Text style={styles.paymentMeta}>
                        {p.transactionId ? `Txn: ${p.transactionId} · ` : ''}
                        {formatDate(p.paidAt)}
                      </Text>
                      {!!p.remarks && <Text style={styles.paymentMeta}>{p.remarks}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Breakdown modal */}
      <Modal visible={breakdownVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.modalTitle}>Salary Breakdown</Text>
              <Text style={styles.modalSub}>{selectedRecord?.monthYear}</Text>

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Earnings</Text>
              {EARNING_FIELDS.map((f) => (
                <View key={f.key} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{f.label}</Text>
                  <Text style={styles.infoValue}>{formatCurrency(selectedRecord?.[f.key] || 0)}</Text>
                </View>
              ))}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, styles.boldLabel]}>Gross Salary</Text>
                <Text style={[styles.infoValue, styles.boldLabel]}>
                  {formatCurrency(selectedRecord?.grossSalary || 0)}
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Deductions</Text>
              {DEDUCTION_FIELDS.map((f) => (
                <View key={f.key} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{f.label}</Text>
                  <Text style={styles.infoValue}>{formatCurrency(selectedRecord?.[f.key] || 0)}</Text>
                </View>
              ))}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, styles.boldLabel]}>Total Deductions</Text>
                <Text style={[styles.infoValue, styles.boldLabel]}>
                  {formatCurrency(selectedRecord?.totalDeductions || 0)}
                </Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: 16, fontWeight: '800' }]}>Net Salary</Text>
                <Text style={[styles.infoValue, { fontSize: 16, fontWeight: '800', color: Colors.primary }]}>
                  {formatCurrency(selectedRecord?.netSalary || 0)}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setBreakdownVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 16, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  headerSub: { color: Colors.gray, marginTop: 4, fontSize: 13 },

  monthScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#e4e9f2', marginRight: 8,
  },
  monthChipActive: { backgroundColor: Colors.pink, borderColor: Colors.pink },
  monthChipText: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  monthChipTextActive: { color: Colors.white },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: Colors.mediumGray, fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 18,
    marginHorizontal: 16, marginBottom: 16, ...Shadows.light,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMonth: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  netLabel: { fontSize: 12, color: Colors.mediumGray, fontWeight: '700', marginTop: 14 },
  netValue: { fontSize: 30, fontWeight: '900', color: Colors.navy, marginTop: 2 },

  rowBetween: { flexDirection: 'row', gap: 12, marginTop: 14 },
  metaBlock: { flex: 1, backgroundColor: '#f4f6f8', borderRadius: 12, padding: 12 },
  metaLabel: { fontSize: 11, fontWeight: '700', color: '#8f9bb3' },
  metaValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },

  divider: { height: 1, backgroundColor: '#eef1f5', marginVertical: 14 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 12, color: Colors.mediumGray, fontWeight: '600' },
  infoValue: { fontSize: 12, color: Colors.navy, fontWeight: '700' },
  boldLabel: { fontWeight: '800', color: Colors.navy },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary + '12',
  },
  actionBtnPrimary: { backgroundColor: Colors.pink },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  pendingNote: { fontSize: 11, color: Colors.mediumGray, marginTop: 10, textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy, marginBottom: 6 },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f8',
    borderRadius: 10, padding: 10, marginTop: 8,
  },
  paymentAmount: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  paymentMeta: { fontSize: 11, color: '#8f9bb3', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '85%', backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy },
  modalSub: { fontSize: 13, color: Colors.mediumGray, marginTop: 2, fontWeight: '600' },
  closeBtn: { marginTop: 20, backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeBtnText: { color: Colors.white, fontWeight: '800' },
});
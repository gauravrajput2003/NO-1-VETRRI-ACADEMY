import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getAdminSalaryDashboardAPI,
  processTeacherSalaryAPI,
  uploadSalaryProofAPI,
  processAllSalariesAPI,
  setTeacherSalaryConfigAPI,
  getSalaryReportsAPI,
} from '../../services/api';

const emptyConfig = {
  baseSalary: '',
  performanceBonus: '',
  specialAllowance: '',
  providentFund: '',
  taxDeduction: '',
  otherDeductions: '',
  bankAccount: '',
  bankName: '',
  ifscCode: '',
  accountHolder: '',
  paymentMode: 'bank_transfer',
  attendanceDeduction: false,
  daysInMonth: '26',
  daysPresent: '26',
  deductionPerDay: '0',
};

export default function SalaryManagementScreen({ navigation, route }) {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const paddingTop = route?.name === 'SalaryManagement' ? 16 : Math.max(insets.top, 16);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [month, setMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [config, setConfig] = useState(emptyConfig);

  // Pay Now modal state
  const [activePayTeacher, setActivePayTeacher] = useState(null);
  const [payingAmount, setPayingAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payTxnId, setPayTxnId] = useState('');
  const [payProofImage, setPayProofImage] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [processingPay, setProcessingPay] = useState(false);

  const bgColor = Colors.surface.light;
  const cardBg = Colors.white;
  const textColor = Colors.text.light;
  const textSec = Colors.textSecondary.light;

  const loadData = async () => {
    try {
      const [dashRes, reportRes] = await Promise.all([
        getAdminSalaryDashboardAPI({ month, year }),
        getSalaryReportsAPI({ period: 'monthly' }),
      ]);
      setDashboard(dashRes.data);
      setReports(reportRes.data.reports);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load salaries', text2: error.response?.data?.message || 'Try again' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const summary = dashboard?.summary || {};
  const teachers = dashboard?.teachers || [];

  const handleProcessAll = async () => {
    try {
      const { data } = await processAllSalariesAPI({ month, year });
      Toast.show({ type: 'success', text1: 'All salaries processed', text2: `${data.processed} processed, ${data.failed} failed` });
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Process failed', text2: error.response?.data?.message || 'Unable to process salaries' });
    }
  };

  const handleSaveConfig = async () => {
    if (!activeTeacher) return;
    try {
      await setTeacherSalaryConfigAPI(activeTeacher.teacherId, config);
      Toast.show({ type: 'success', text1: 'Salary config saved' });
      setActiveTeacher(null);
      setConfig(emptyConfig);
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: error.response?.data?.message || 'Unable to save salary config' });
    }
  };

  const handlePickProof = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Permission to access gallery is required.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingProof(true);

        const formData = new FormData();
        const filename = asset.fileName || `proof_${Date.now()}.jpg`;
        const type = asset.mimeType || 'image/jpeg';
        formData.append('file', {
          uri: asset.uri,
          name: filename,
          type: type,
        });

        const uploadRes = await uploadSalaryProofAPI(formData);
        if (uploadRes.data?.url) {
          setPayProofImage(uploadRes.data.url);
          Toast.show({ type: 'success', text1: 'Proof uploaded!' });
        } else {
          throw new Error('No URL returned from upload API');
        }
      }
    } catch (err) {
      console.error('[Upload Proof Error]:', err);
      Toast.show({ type: 'error', text1: 'Upload failed', text2: err.message || 'Please try again.' });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!activePayTeacher) return;
    const amount = Number(payingAmount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Please enter a valid paying amount.' });
      return;
    }

    setProcessingPay(true);
    try {
      await processTeacherSalaryAPI({
        teacherId: activePayTeacher.teacherId,
        month,
        year,
        payingAmount: amount,
        paymentMethod: payMethod,
        transactionId: payTxnId,
        proofImage: payProofImage,
        remarks: payRemarks,
      });
      Toast.show({ type: 'success', text1: 'Payment processed successfully!' });
      setActivePayTeacher(null);
      loadData();
    } catch (error) {
      console.error('[Process Payment Error]:', error);
      Toast.show({ type: 'error', text1: 'Payment failed', text2: error.response?.data?.message || 'Unable to process payment' });
    } finally {
      setProcessingPay(false);
    }
  };

  const reportCards = useMemo(() => [
    { label: 'Total Payroll', value: summary.totalPayroll || 0, color: Colors.primary },
    { label: 'Already Paid', value: summary.alreadyPaid || 0, color: Colors.success },
    { label: 'Pending', value: summary.pending || 0, color: Colors.warning },
    { label: 'Teachers Paid', value: summary.paidCount || 0, color: Colors.info },
  ], [summary]);

  // Derived states for Pay Modal
  const payTotalSalary = activePayTeacher?.netSalary || 0;
  const payAlreadyPaid = activePayTeacher?.paidAmount || 0;
  const payRemaining = Math.max(payTotalSalary - payAlreadyPaid, 0);
  const payNewlyPaying = Number(payingAmount) || 0;
  const payNewRemaining = Math.max(payRemaining - payNewlyPaying, 0);

  if (loading && !dashboard) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />}
      >
        <View style={[styles.header, { paddingTop }]}>
          <Text style={styles.headerTitle}>Teacher Salary Management</Text>
          <Text style={styles.headerSub}>{month} {year}</Text>
        </View>

        <View style={styles.summaryRow}>
          {reportCards.map((item) => (
            <View key={item.label} style={[styles.summaryCard, { backgroundColor: item.color + '12' }]}>
              <Text style={[styles.summaryValue, { color: item.color }]}>{formatCurrency(item.value)}</Text>
              <Text style={[styles.summaryLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleProcessAll}>
            <Ionicons name="flash-outline" size={18} color={Colors.white} />
            <Text style={styles.primaryBtnText}>Process All Salaries</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={loadData}>
            <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Table</Text>
          {teachers.length ? teachers.map((teacher) => (
            <View key={teacher._id} style={[styles.teacherCard, { backgroundColor: cardBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.teacherName, { color: textColor }]}>{teacher.teacherName}</Text>
                <Text style={[styles.teacherMeta, { color: textSec }]}>{teacher.teacherEmail || '-'} • {teacher.teacherMobile || '-'}</Text>
                <Text style={[styles.teacherMeta, { color: textSec }]}>Net: {formatCurrency(teacher.netSalary || 0)} • Status: {teacher.paymentStatus?.toUpperCase() || 'PENDING'}</Text>
                <Text style={[styles.teacherMeta, { color: textSec }]}>Paid: {formatCurrency(teacher.paidAmount || 0)} • Bank: {teacher.bankName || teacher.teacher?.salary?.bankName || '-'}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => { setActiveTeacher(teacher); setConfig({ ...emptyConfig, baseSalary: String(teacher.baseSalary || ''), performanceBonus: String(teacher.performanceBonus || ''), specialAllowance: String(teacher.specialAllowance || ''), providentFund: String(teacher.providentFund || ''), taxDeduction: String(teacher.taxDeduction || ''), otherDeductions: String(teacher.otherDeductions || ''), bankAccount: teacher.bankAccount || '', bankName: teacher.bankName || '', ifscCode: teacher.ifscCode || '', accountHolder: teacher.accountHolder || teacher.teacherName || '', paymentMode: teacher.paymentMode || 'bank_transfer' }); }}>
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: Colors.success }]}
                  onPress={() => {
                    setActivePayTeacher(teacher);
                    setPayingAmount(String((teacher.netSalary || 0) - (teacher.paidAmount || 0)));
                    setPayMethod(teacher.paymentMethod || 'Cash');
                    setPayTxnId('');
                    setPayProofImage('');
                    setPayRemarks('');
                  }}
                >
                  <Text style={styles.smallBtnText}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )) : (
            <Text style={{ color: textSec }}>No teacher salary rows available.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>
          <Text style={{ color: textSec, marginBottom: 4 }}>Average salary: {formatCurrency(reports?.totalPayroll && reports?.count ? reports.totalPayroll / reports.count : 0)}</Text>
          <Text style={{ color: textSec, marginBottom: 4 }}>Paid count: {summary.paidCount || 0} | Pending count: {summary.pendingCount || 0}</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Salary Config Modal */}
      <Modal visible={!!activeTeacher} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={styles.modalSheet} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Salary Config - {activeTeacher?.teacherName}</Text>
            {[
              ['Base Salary', 'baseSalary'],
              ['Performance Bonus', 'performanceBonus'],
              ['Special Allowance', 'specialAllowance'],
              ['Provident Fund', 'providentFund'],
              ['Tax Deduction', 'taxDeduction'],
              ['Other Deductions', 'otherDeductions'],
              ['Bank Name', 'bankName'],
              ['Bank Account', 'bankAccount'],
              ['IFSC', 'ifscCode'],
              ['Account Holder', 'accountHolder'],
              ['Payment Mode', 'paymentMode'],
            ].map(([label, key]) => (
              <View key={key} style={{ marginBottom: 10 }}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={String(config[key] ?? '')}
                  onChangeText={(value) => setConfig({ ...config, [key]: value })}
                  placeholder={label}
                  placeholderTextColor={Colors.mediumGray}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setActiveTeacher(null); setConfig(emptyConfig); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig}>
                <Text style={styles.saveBtnText}>Save Config</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Pay Now Modal */}
      <Modal visible={!!activePayTeacher} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} style={styles.modalSheet} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Process Salary Payment</Text>
            <Text style={[styles.modalSubTitle, { color: textSec, marginBottom: 16 }]}>
              {activePayTeacher?.teacherName} · {month} {year}
            </Text>

            <View style={styles.paymentRowSummary}>
              <View style={styles.paySummaryBlock}>
                <Text style={styles.paySummaryLabel}>Total Net Salary</Text>
                <Text style={styles.paySummaryVal}>{formatCurrency(payTotalSalary)}</Text>
              </View>
              <View style={styles.paySummaryBlock}>
                <Text style={styles.paySummaryLabel}>Already Paid</Text>
                <Text style={[styles.paySummaryVal, { color: Colors.success }]}>{formatCurrency(payAlreadyPaid)}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Paying Now (₹)</Text>
              <TextInput
                style={styles.input}
                value={payingAmount}
                onChangeText={setPayingAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={Colors.mediumGray}
              />
            </View>

            <View style={styles.paymentRowSummary}>
              <View style={styles.paySummaryBlock}>
                <Text style={styles.paySummaryLabel}>New Remaining</Text>
                <Text style={[styles.paySummaryVal, { color: payNewRemaining > 0 ? Colors.warning : Colors.navy }]}>
                  {formatCurrency(payNewRemaining)}
                </Text>
              </View>
              <View style={styles.paySummaryBlock}>
                <Text style={styles.paySummaryLabel}>Calculated Status</Text>
                <View style={[
                  styles.statusBadgePay,
                  { backgroundColor: (payNewlyPaying + payAlreadyPaid >= payTotalSalary) ? Colors.success + '18' : Colors.warning + '18' }
                ]}>
                  <Text style={[
                    styles.statusBadgeTextPay,
                    { color: (payNewlyPaying + payAlreadyPaid >= payTotalSalary) ? Colors.success : Colors.warning }
                  ]}>
                    {(payNewlyPaying + payAlreadyPaid >= payTotalSalary) ? 'Paid' : 'Partial Paid'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Method Selection Pills */}
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodContainer}>
                {['Cash', 'UPI', 'Bank Transfer', 'Net Banking'].map((method) => {
                  const isSelected = payMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodPill, isSelected && styles.methodPillActive]}
                      onPress={() => setPayMethod(method)}
                    >
                      <Text style={[styles.methodText, isSelected && styles.methodTextActive]}>{method}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Transaction ID if not Cash */}
            {payMethod !== 'Cash' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.label}>Transaction ID / Reference Number</Text>
                <TextInput
                  style={styles.input}
                  value={payTxnId}
                  onChangeText={setPayTxnId}
                  placeholder="e.g. TXN123456789"
                  placeholderTextColor={Colors.mediumGray}
                  autoCapitalize="characters"
                />
              </View>
            )}

            {/* Receipt Proof Upload */}
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Receipt Proof Image</Text>
              {uploadingProof ? (
                <View style={styles.uploadArea}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ color: textSec, fontSize: 13, marginLeft: 8 }}>Uploading image...</Text>
                </View>
              ) : payProofImage ? (
                <View style={styles.proofPreviewArea}>
                  <Image source={{ uri: payProofImage }} style={styles.proofImagePreview} />
                  <TouchableOpacity style={styles.removeProofBtn} onPress={() => setPayProofImage('')}>
                    <Ionicons name="trash-outline" size={16} color={Colors.white} />
                    <Text style={styles.removeProofText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadArea} onPress={handlePickProof}>
                  <Ionicons name="image-outline" size={20} color={Colors.primary} />
                  <Text style={styles.uploadBtnText}>Upload Payment Receipt / ScreenShot</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={payRemarks}
                onChangeText={setPayRemarks}
                placeholder="Remarks (e.g. advance released, special bonus, etc.)"
                placeholderTextColor={Colors.mediumGray}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActivePayTeacher(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleProcessPayment} disabled={processingPay || uploadingProof}>
                {processingPay ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text.light },
  headerSub: { color: Colors.textSecondary.light, marginTop: 4 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginTop: 8 },
  summaryCard: { flexBasis: '48%', borderRadius: 14, padding: 14, ...Shadows.light },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  primaryBtn: { flex: 1, backgroundColor: Colors.pink, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: Colors.white, fontWeight: '800' },
  secondaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: Colors.white },
  secondaryBtnText: { color: Colors.primary, fontWeight: '800' },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  teacherCard: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10, ...Shadows.light },
  teacherName: { fontSize: 15, fontWeight: '700' },
  teacherMeta: { fontSize: 12, marginTop: 2 },
  smallBtn: { backgroundColor: Colors.pink, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  smallBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '88%', backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, color: Colors.text.light },
  modalSubTitle: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text.light, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.gray, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text.light },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.gray, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: Colors.darkGray, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: Colors.white, fontWeight: '800' },

  // Pay Now summary block styles
  paymentRowSummary: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 14 },
  paySummaryBlock: { flex: 1, backgroundColor: '#f4f6f8', padding: 12, borderRadius: 12 },
  paySummaryLabel: { fontSize: 11, fontWeight: '700', color: '#8f9bb3', marginBottom: 4 },
  paySummaryVal: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  statusBadgePay: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeTextPay: { fontSize: 12, fontWeight: '800' },
  
  // Payment methods container
  methodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  methodPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#e4e9f2' },
  methodPillActive: { backgroundColor: Colors.pink, borderColor: Colors.pink },
  methodText: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  methodTextActive: { color: Colors.white },

  // Upload proof styling
  uploadArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: Colors.primary + '0a', paddingHorizontal: 12 },
  uploadBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 8 },
  proofPreviewArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proofImagePreview: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#e4e9f2' },
  removeProofBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ff3d71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  removeProofText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
});

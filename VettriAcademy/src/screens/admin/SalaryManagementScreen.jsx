import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity as RNTouchableOpacity,
  FlatList, Modal, TextInput, ActivityIndicator, RefreshControl, Image, Platform,
  Animated, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import {
  getAdminSalaryDashboardAPI,
  processTeacherSalaryAPI,
  uploadSalaryProofAPI,
  processAllSalariesAPI,
  setTeacherSalaryConfigAPI,
  getSalaryReportsAPI,
  editSalaryPaymentAPI,
  deleteSalaryPaymentAPI,
  downloadSalaryReportAPI,
  getTeacherSalarySlipAPI,
} from '../../services/api';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// Printable salary components — mirrors backend EARNING_FIELDS / DEDUCTION_FIELDS
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
const ALL_COMPONENT_KEYS = [...EARNING_FIELDS, ...DEDUCTION_FIELDS].map((f) => f.key);

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
  // Web: expo-file-system doesn't apply — trigger a normal browser download instead.
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

  // Native (iOS/Android/Expo Go): write to cache, then open the share sheet.
  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  // NOTE: use the string literal 'base64' — FileSystem.EncodingType.Base64 is
  // undefined on some expo-file-system versions and crashes here otherwise.
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: filename });
  }
  return fileUri;
};
const buildFileFormData = async (asset, fieldName = 'file') => {
  const formData = new FormData();
  const filename = asset.fileName || `proof_${Date.now()}.jpg`;
  const type = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web, RN's {uri, name, type} shape doesn't work — real FormData needs a Blob/File.
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, filename);
  } else {
    formData.append(fieldName, { uri: asset.uri, name: filename, type });
  }

  return formData;
};

const emptyConfig = {
  groupTuitionSalary: '',
  individualTuitionSalary: '',
  hourlyTuitionSalary: '',
  weeklyTuitionSalary: '',
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
  effectiveDate: '',
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
  const [processingDate, setProcessingDate] = useState('');
  const [salaryDate, setSalaryDate] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [processingPay, setProcessingPay] = useState(false);

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState(null);
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);

  // Download / component selection state
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingSlipId, setDownloadingSlipId] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [componentModalFor, setComponentModalFor] = useState(null); // 'single' | 'bulk' | null
  const [componentModalTeacher, setComponentModalTeacher] = useState(null);
  const [selectedComponents, setSelectedComponents] = useState(ALL_COMPONENT_KEYS);

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

      const formData = await buildFileFormData(asset, 'file');

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
        processingDate,
        salaryDate,
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

  const openEditPayment = (payment) => {
    setEditingPayment({
      transactionId: activePayTeacher._id,
      paymentId: payment._id,
      amount: String(payment.amount || ''),
      method: payment.method || 'Cash',
      txnId: payment.transactionId || '',
      remarks: payment.remarks || '',
    });
  };

  const handleSavePaymentEdit = async () => {
    if (!editingPayment) return;
    const amount = Number(editingPayment.amount);
    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid amount' });
      return;
    }
    setSavingPaymentEdit(true);
    try {
      await editSalaryPaymentAPI(editingPayment.transactionId, editingPayment.paymentId, {
        amount,
        method: editingPayment.method,
        transactionId: editingPayment.txnId,
        remarks: editingPayment.remarks,
      });
      Toast.show({ type: 'success', text1: 'Payment updated' });
      setEditingPayment(null);
      setActivePayTeacher(null);
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: error.response?.data?.message || 'Unable to update payment' });
    } finally {
      setSavingPaymentEdit(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    try {
      await deleteSalaryPaymentAPI(activePayTeacher._id, payment._id);
      Toast.show({ type: 'success', text1: 'Payment removed' });
      setActivePayTeacher(null);
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: error.response?.data?.message || 'Unable to remove payment' });
    }
  };

const handleDownloadReport = async (components) => {
  setDownloadingReport(true);
  setGeneratingPdf(true);
  setGenerationStep('Generating salary report PDF from server...');
  try {
    const { data } = await downloadSalaryReportAPI(`${month} ${year}`, components);
    setGenerationStep('Preparing PDF file for sharing & saving...');
    const filename = `salary-report-${month}-${year}.pdf`.toLowerCase();
    await savePdfAndShare(data, filename);
    Toast.show({ type: 'success', text1: 'Report ready! 📄', text2: 'Choose where to save or share it.' });
  } catch (error) {
    console.error('[Download Report Error]:', parseApiError(error));
    Toast.show({ type: 'error', text1: 'Download failed', text2: parseApiError(error) });
  } finally {
    setDownloadingReport(false);
    setGeneratingPdf(false);
    setGenerationStep('');
  }
};

const handleDownloadSlip = async (teacher, components) => {
  setDownloadingSlipId(teacher.teacherId);
  setGeneratingPdf(true);
  setGenerationStep(`Generating salary slip for ${teacher.teacherName}...`);
  try {
    const { data } = await getTeacherSalarySlipAPI(teacher.teacherId, `${month} ${year}`, components);
    setGenerationStep('Preparing salary slip PDF...');
    const filename = `salary-slip-${teacher.teacherName}-${month}-${year}.pdf`.replace(/\s+/g, '-').toLowerCase();
    await savePdfAndShare(data, filename);
    Toast.show({ type: 'success', text1: 'Slip ready! 📄', text2: 'Choose where to save or share it.' });
  } catch (error) {
    console.error('[Download Slip Error]:', parseApiError(error));
    Toast.show({ type: 'error', text1: 'Download failed', text2: parseApiError(error) });
  } finally {
    setDownloadingSlipId(null);
    setGeneratingPdf(false);
    setGenerationStep('');
  }
};

  const toggleComponent = (key) => {
    setSelectedComponents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const selectAllComponents = () => {
    setSelectedComponents(ALL_COMPONENT_KEYS);
  };

  const deselectAllComponents = () => {
    setSelectedComponents([]);
  };

  const openComponentModal = (mode, teacher = null) => {
    setComponentModalFor(mode);
    setComponentModalTeacher(teacher);
    setSelectedComponents(ALL_COMPONENT_KEYS);
    setGeneratingPdf(false);
    setGenerationStep('');
  };

  const handleConfirmComponentSelection = async () => {
    if (selectedComponents.length === 0) {
      Toast.show({ type: 'error', text1: 'No Components Selected', text2: 'Please select at least one component.' });
      return;
    }
    if (componentModalFor === 'single' && componentModalTeacher) {
      await handleDownloadSlip(componentModalTeacher, selectedComponents);
    } else if (componentModalFor === 'bulk') {
      await handleDownloadReport(selectedComponents);
    }
    setComponentModalFor(null);
    setComponentModalTeacher(null);
  };
  const parseApiError = (error) => {
  // When responseType is 'arraybuffer', axios also arraybuffer-encodes error JSON bodies.
  // Decode it back to text so the real server error message is visible.
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

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => openComponentModal('bulk')} disabled={downloadingReport}>
            {downloadingReport ? (
              <>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Generating Report...</Text>
              </>
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Download Full Salary Report (PDF)</Text>
              </>
            )}
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
                <Text style={[styles.teacherMeta, { color: textSec }]}>
                  Processed: {teacher.processingDate ? formatDate(teacher.processingDate) : '-'} • Salary Date: {teacher.salaryDate ? formatDate(teacher.salaryDate) : '-'}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    setActiveTeacher(teacher);
                    setConfig({
                      ...emptyConfig,
                      groupTuitionSalary: String(teacher.groupTuitionSalary || ''),
                      individualTuitionSalary: String(teacher.individualTuitionSalary || ''),
                      hourlyTuitionSalary: String(teacher.hourlyTuitionSalary || ''),
                      weeklyTuitionSalary: String(teacher.weeklyTuitionSalary || ''),
                      baseSalary: String(teacher.baseSalary || ''),
                      performanceBonus: String(teacher.performanceBonus || ''),
                      specialAllowance: String(teacher.specialAllowance || ''),
                      providentFund: String(teacher.providentFund || ''),
                      taxDeduction: String(teacher.taxDeduction || ''),
                      otherDeductions: String(teacher.otherDeductions || ''),
                      bankAccount: teacher.bankAccount || '',
                      bankName: teacher.bankName || '',
                      ifscCode: teacher.ifscCode || '',
                      accountHolder: teacher.accountHolder || teacher.teacherName || '',
                      paymentMode: teacher.paymentMode || 'bank_transfer',
                      effectiveDate: teacher.effectiveDate ? String(teacher.effectiveDate).slice(0, 10) : '',
                    });
                  }}
                >
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
                    const today = new Date().toISOString().slice(0, 10);
                    setProcessingDate(today);
                    setSalaryDate(today);
                  }}
                >
                  <Text style={styles.smallBtnText}>Pay Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: Colors.info || '#2E86DE' }]}
                  onPress={() => openComponentModal('single', teacher)}
                  disabled={downloadingSlipId === teacher.teacherId}
                >
                  {downloadingSlipId === teacher.teacherId ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.smallBtnText}>Slip</Text>
                  )}
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
              ['Group Tuition Salary (optional)', 'groupTuitionSalary'],
              ['Individual Tuition Salary (optional)', 'individualTuitionSalary'],
              ['Hourly Tuition Salary (optional)', 'hourlyTuitionSalary'],
              ['Weekly Tuition Salary (optional)', 'weeklyTuitionSalary'],
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
              ['Configuration Effective Date (YYYY-MM-DD)', 'effectiveDate'],
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

            {Array.isArray(activePayTeacher?.payments) && activePayTeacher.payments.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Payment History</Text>
                {activePayTeacher.payments.map((payment) => (
                  <View key={payment._id} style={styles.paymentHistoryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentHistoryAmount}>{formatCurrency(payment.amount)} · {payment.method}</Text>
                      <Text style={styles.paymentHistoryMeta}>
                        {payment.transactionId ? `Txn: ${payment.transactionId} · ` : ''}
                        {formatDate(payment.paidAt)}
                      </Text>
                      {!!payment.remarks && <Text style={styles.paymentHistoryMeta}>{payment.remarks}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity style={styles.paymentEditBtn} onPress={() => openEditPayment(payment)}>
                        <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.paymentEditBtn, { backgroundColor: '#ff3d7118' }]} onPress={() => handleDeletePayment(payment)}>
                        <Ionicons name="trash-outline" size={14} color="#ff3d71" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

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

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Processing Date</Text>
                <TextInput
                  style={styles.input}
                  value={processingDate}
                  onChangeText={setProcessingDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.mediumGray}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Salary Date (Effective)</Text>
                <TextInput
                  style={styles.input}
                  value={salaryDate}
                  onChangeText={setSalaryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.mediumGray}
                />
              </View>
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

      {/* Edit Payment Modal */}
      <Modal visible={!!editingPayment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Edit Payment Record</Text>
            <Text style={[styles.modalSubTitle, { color: textSec, marginBottom: 16 }]}>
              Correct a mistaken or incorrectly recorded payment
            </Text>

            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={editingPayment?.amount ?? ''}
                onChangeText={(v) => setEditingPayment((p) => ({ ...p, amount: v }))}
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodContainer}>
                {['Cash', 'UPI', 'Bank Transfer', 'Net Banking'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodPill, editingPayment?.method === m && styles.methodPillActive]}
                    onPress={() => setEditingPayment((p) => ({ ...p, method: m }))}
                  >
                    <Text style={[styles.methodText, editingPayment?.method === m && styles.methodTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Transaction ID / Reference</Text>
              <TextInput
                style={styles.input}
                value={editingPayment?.txnId ?? ''}
                onChangeText={(v) => setEditingPayment((p) => ({ ...p, txnId: v }))}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={editingPayment?.remarks ?? ''}
                onChangeText={(v) => setEditingPayment((p) => ({ ...p, remarks: v }))}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPayment(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePaymentEdit} disabled={savingPaymentEdit}>
                {savingPaymentEdit ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Component Selection Modal (for slip / bulk report generation) */}
      <Modal
        visible={!!componentModalFor}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!generatingPdf) {
            setComponentModalFor(null);
            setComponentModalTeacher(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.componentModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={componentModalFor === 'bulk' ? 'document-text' : 'receipt-outline'}
                    size={22}
                    color={Colors.pink}
                  />
                  <Text style={styles.modalTitle}>
                    {componentModalFor === 'bulk' ? 'Download Salary Report' : 'Download Salary Slip'}
                  </Text>
                </View>
                <Text style={[styles.modalSubTitle, { color: textSec, marginTop: 2 }]}>
                  {componentModalFor === 'bulk'
                    ? `Period: ${month} ${year} · PDF Report`
                    : `${componentModalTeacher?.teacherName || 'Teacher'} · ${month} ${year}`}
                </Text>
              </View>
              <RNTouchableOpacity
                onPress={() => {
                  if (!generatingPdf) {
                    setComponentModalFor(null);
                    setComponentModalTeacher(null);
                  }
                }}
                disabled={generatingPdf}
                style={[styles.closeModalBtn, generatingPdf && { opacity: 0.3 }]}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary.light} />
              </RNTouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {/* Quick Action Selection Bar */}
              <View style={styles.selectionQuickBar}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <RNTouchableOpacity
                    style={[styles.quickSelectPill, selectedComponents.length === ALL_COMPONENT_KEYS.length && styles.quickSelectPillActive]}
                    onPress={selectAllComponents}
                    disabled={generatingPdf}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={selectedComponents.length === ALL_COMPONENT_KEYS.length ? Colors.white : Colors.primary}
                    />
                    <Text style={[styles.quickSelectPillText, selectedComponents.length === ALL_COMPONENT_KEYS.length && styles.quickSelectPillTextActive]}>
                      Select All
                    </Text>
                  </RNTouchableOpacity>

                  <RNTouchableOpacity
                    style={[styles.quickSelectPill, selectedComponents.length === 0 && styles.quickSelectPillActive]}
                    onPress={deselectAllComponents}
                    disabled={generatingPdf}
                  >
                    <Ionicons
                      name="close-outline"
                      size={14}
                      color={selectedComponents.length === 0 ? Colors.white : textSec}
                    />
                    <Text style={[styles.quickSelectPillText, selectedComponents.length === 0 && styles.quickSelectPillTextActive]}>
                      Clear All
                    </Text>
                  </RNTouchableOpacity>
                </View>

                <View style={styles.selectedCountBadge}>
                  <Text style={styles.selectedCountBadgeText}>
                    {selectedComponents.length}/{ALL_COMPONENT_KEYS.length} Selected
                  </Text>
                </View>
              </View>

              {/* Progress & Generating Box (Visible when generating PDF) */}
              {generatingPdf && (
                <View style={styles.generatingCard}>
                  <View style={styles.generatingHeader}>
                    <View style={styles.generatingIconWrap}>
                      <ActivityIndicator size="small" color={Colors.pink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.generatingTitle}>Generating PDF Document...</Text>
                      <Text style={styles.generatingSubtitle}>{generationStep || 'Processing salary components and layout...'}</Text>
                    </View>
                  </View>
                  <IndeterminateProgressBar active={generatingPdf} />
                  <Text style={styles.generatingHint}>
                    ⏳ Please wait. The save / share dialog will open automatically once ready.
                  </Text>
                </View>
              )}

              {/* Earnings Section */}
              <View style={styles.componentSection}>
                <View style={styles.componentSectionHeader}>
                  <Text style={styles.componentSectionTitle}>💰 Earnings Components</Text>
                  <Text style={styles.componentSectionCount}>
                    {selectedComponents.filter((k) => EARNING_FIELDS.some((f) => f.key === k)).length}/{EARNING_FIELDS.length} included
                  </Text>
                </View>
                <View style={styles.componentCardsGrid}>
                  {EARNING_FIELDS.map((f) => {
                    const isSelected = selectedComponents.includes(f.key);
                    return (
                      <RNTouchableOpacity
                        key={f.key}
                        style={[styles.componentCard, isSelected && styles.componentCardSelected]}
                        onPress={() => !generatingPdf && toggleComponent(f.key)}
                        activeOpacity={0.7}
                        disabled={generatingPdf}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? Colors.pink : Colors.mediumGray}
                        />
                        <Text style={[styles.componentCardText, isSelected && styles.componentCardTextSelected]}>
                          {f.label}
                        </Text>
                      </RNTouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Deductions Section */}
              <View style={styles.componentSection}>
                <View style={styles.componentSectionHeader}>
                  <Text style={styles.componentSectionTitle}>📉 Deductions & Adjustments</Text>
                  <Text style={styles.componentSectionCount}>
                    {selectedComponents.filter((k) => DEDUCTION_FIELDS.some((f) => f.key === k)).length}/{DEDUCTION_FIELDS.length} included
                  </Text>
                </View>
                <View style={styles.componentCardsGrid}>
                  {DEDUCTION_FIELDS.map((f) => {
                    const isSelected = selectedComponents.includes(f.key);
                    return (
                      <RNTouchableOpacity
                        key={f.key}
                        style={[styles.componentCard, isSelected && styles.componentCardSelected]}
                        onPress={() => !generatingPdf && toggleComponent(f.key)}
                        activeOpacity={0.7}
                        disabled={generatingPdf}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? Colors.pink : Colors.mediumGray}
                        />
                        <Text style={[styles.componentCardText, isSelected && styles.componentCardTextSelected]}>
                          {f.label}
                        </Text>
                      </RNTouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, generatingPdf && { opacity: 0.5 }]}
                  onPress={() => {
                    setComponentModalFor(null);
                    setComponentModalTeacher(null);
                  }}
                  disabled={generatingPdf}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (generatingPdf || selectedComponents.length === 0) && { opacity: 0.7 }
                  ]}
                  onPress={handleConfirmComponentSelection}
                  disabled={generatingPdf || selectedComponents.length === 0}
                >
                  {generatingPdf ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={styles.saveBtnText}>Generating PDF...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="cloud-download-outline" size={18} color={Colors.white} />
                      <Text style={styles.saveBtnText}>
                        Generate & Download ({selectedComponents.length})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function IndeterminateProgressBar({ active }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loopAnim;
    if (active) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1100,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
        ])
      );
      loopAnim.start();
    } else {
      anim.setValue(0);
    }
    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [active]);

  const left = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '65%'],
  });

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View style={[styles.progressBarThumb, { left }]} />
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

  paymentRowSummary: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginBottom: 14 },
  paySummaryBlock: { flex: 1, backgroundColor: '#f4f6f8', padding: 12, borderRadius: 12 },
  paySummaryLabel: { fontSize: 11, fontWeight: '700', color: '#8f9bb3', marginBottom: 4 },
  paySummaryVal: { fontSize: 15, fontWeight: '800', color: Colors.navy },
  statusBadgePay: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeTextPay: { fontSize: 12, fontWeight: '800' },

  methodContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  methodPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#e4e9f2' },
  methodPillActive: { backgroundColor: Colors.pink, borderColor: Colors.pink },
  methodText: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  methodTextActive: { color: Colors.white },

  uploadArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, backgroundColor: Colors.primary + '0a', paddingHorizontal: 12 },
  uploadBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 8 },
  proofPreviewArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proofImagePreview: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#e4e9f2' },
  removeProofBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ff3d71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  removeProofText: { color: Colors.white, fontWeight: '700', fontSize: 12 },

  paymentHistoryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f8', borderRadius: 10, padding: 10, marginBottom: 8 },
  paymentHistoryAmount: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  paymentHistoryMeta: { fontSize: 11, color: '#8f9bb3', marginTop: 2 },
  paymentEditBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.primary + '18', justifyContent: 'center', alignItems: 'center' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkRowText: { fontSize: 14, color: Colors.text.light, fontWeight: '600' },

  // Component Selection Modal UI
  componentModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f6f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 12,
  },
  quickSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f4f6f8',
    borderWidth: 1,
    borderColor: '#e4e9f2',
  },
  quickSelectPillActive: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  quickSelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.light,
  },
  quickSelectPillTextActive: {
    color: Colors.white,
  },
  selectedCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.pink + '15',
  },
  selectedCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.pink,
  },
  generatingCard: {
    backgroundColor: Colors.pink + '0c',
    borderWidth: 1,
    borderColor: Colors.pink + '30',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  generatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  generatingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pink + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy || '#152238',
  },
  generatingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary.light,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 8,
  },
  progressBarThumb: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: Colors.pink,
    borderRadius: 3,
  },
  generatingHint: {
    fontSize: 11,
    color: Colors.pink,
    fontWeight: '600',
    marginTop: 4,
  },
  componentSection: {
    marginBottom: 16,
  },
  componentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  componentSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy || '#152238',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  componentSectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary.light,
  },
  componentCardsGrid: {
    gap: 6,
  },
  componentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  componentCardSelected: {
    backgroundColor: Colors.white,
    borderColor: Colors.pink + '40',
    ...Shadows.light,
  },
  componentCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary.light,
    flex: 1,
  },
  componentCardTextSelected: {
    color: Colors.navy || '#152238',
    fontWeight: '700',
  },
});
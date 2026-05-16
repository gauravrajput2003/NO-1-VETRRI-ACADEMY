import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getAdminSalaryDashboardAPI,
  processTeacherSalaryAPI,
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

export default function SalaryManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [month, setMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeTeacher, setActiveTeacher] = useState(null);
  const [config, setConfig] = useState(emptyConfig);

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

  const handleProcessOne = async (teacher) => {
    try {
      await processTeacherSalaryAPI({ teacherId: teacher.teacherId, month, year });
      Toast.show({ type: 'success', text1: `Processed ${teacher.teacherName}` });
      loadData();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Process failed', text2: error.response?.data?.message || 'Unable to process salary' });
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

  const reportCards = useMemo(() => [
    { label: 'Total Payroll', value: summary.totalPayroll || 0, color: Colors.primary },
    { label: 'Already Paid', value: summary.alreadyPaid || 0, color: Colors.success },
    { label: 'Pending', value: summary.pending || 0, color: Colors.warning },
    { label: 'Teachers Paid', value: summary.paidCount || 0, color: Colors.info },
  ], [summary]);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />}
      >
        <View style={styles.header}>
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
                <Text style={[styles.teacherMeta, { color: textSec }]}>Bank: {teacher.bankName || teacher.teacher?.salary?.bankName || '-'}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => { setActiveTeacher(teacher); setConfig({ ...emptyConfig, baseSalary: String(teacher.baseSalary || ''), performanceBonus: String(teacher.performanceBonus || ''), specialAllowance: String(teacher.specialAllowance || ''), providentFund: String(teacher.providentFund || ''), taxDeduction: String(teacher.taxDeduction || ''), otherDeductions: String(teacher.otherDeductions || ''), bankAccount: teacher.bankAccount || '', bankName: teacher.bankName || '', ifscCode: teacher.ifscCode || '', accountHolder: teacher.accountHolder || teacher.teacherName || '', paymentMode: teacher.paymentMode || 'bank_transfer' }); }}>
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: Colors.success }]} onPress={() => handleProcessOne(teacher)}>
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

      <Modal visible={!!activeTeacher} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: 20 }}>
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
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: Colors.text.light },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text.light, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.gray, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text.light },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: Colors.gray, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: Colors.darkGray, fontWeight: '700' },
  saveBtn: { flex: 2, backgroundColor: Colors.pink, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontWeight: '800' },
});

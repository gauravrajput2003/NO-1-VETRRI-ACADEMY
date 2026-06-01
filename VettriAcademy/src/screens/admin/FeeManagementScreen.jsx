import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { fetchAdminFees, updateFee } from '../../redux/slices/adminSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


export default function FeeManagementScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { fees, feeSummary, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [payData, setPayData] = useState({ amountPaid: '', paymentMethod: 'cash', paymentDate: '', transactionId: '', notes: '' });

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchAdminFees(filter !== 'all' ? { status: filter } : {})); }, [filter]);

  const statusColors = { paid: Colors.success, partial: Colors.info, pending: Colors.warning, overdue: Colors.error };
  const filterTabs = ['all', 'paid', 'partial', 'pending', 'overdue'];

  const handleMarkPaid = async () => {
    const dueValue = Number(editModal?.remainingAmount ?? editModal?.dueAmount ?? editModal?.amount ?? 0);
    const amountPaid = Number(payData.amountPaid || dueValue || 0);
    const r = await dispatch(updateFee({
      id: editModal._id,
      updates: {
        status: amountPaid >= dueValue ? 'paid' : 'partial',
        paidAmount: amountPaid,
        dueAmount: editModal?.dueAmount ?? editModal?.amount,
        paymentMethod: payData.paymentMethod,
        paymentDate: payData.paymentDate || new Date().toISOString().split('T')[0],
        transactionId: payData.transactionId,
        notes: payData.notes,
      },
    }));
    if (updateFee.fulfilled.match(r)) {
      Toast.show({ type: 'success', text1: 'Payment Recorded ✅' });
      setEditModal(null);
    }
  };

  const summary = feeSummary || {};
  const collectionRate = summary.collectionRate || '0%';

  const renderHeader = () => (
    <View>
      <View style={styles.summaryRow}>
        {[
          { label: 'Due', value: formatCurrency(summary.totalDue || 0), color: Colors.primary },
          { label: 'Collected', value: formatCurrency(summary.totalPaid || 0), color: Colors.success },
          { label: 'Paid', value: summary.paid || 0, color: Colors.success },
          { label: 'Pending', value: summary.pending || 0, color: Colors.warning },
          { label: 'Partial', value: summary.partial || 0, color: Colors.info },
          { label: 'Overdue', value: summary.overdue || 0, color: Colors.error },
        ].map((s, i) => (
          <View key={i} style={[styles.summaryCard, { backgroundColor: s.color + '14' }]}>
            <Text style={[styles.summaryNum, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.revCard, { backgroundColor: cardBg }]}> 
        <Text style={[styles.revLabel, { color: textSec }]}>Total Revenue</Text>
        <Text style={[styles.revAmount, { color: Colors.success }]}>{formatCurrency(summary.totalPaid || summary.totalRevenue || 0)}</Text>
      </View>
      <View style={[styles.revCard, { backgroundColor: cardBg, marginTop: 12 }]}> 
        <Text style={[styles.revLabel, { color: textSec }]}>Collection Rate</Text>
        <Text style={[styles.revAmount, { color: Colors.primary }]}>{collectionRate}</Text>
      </View>
      <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filterTabs.map((t) => (
          <TouchableOpacity key={t} style={[styles.filterChip, filter === t && styles.filterActive]} onPress={() => setFilter(t)}>
            <Text style={[styles.filterText, filter === t && { color: Colors.white }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}> 
      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={fees} keyExtractor={(i) => i._id} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(24, bottomPadding) }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={[styles.feeCard, { backgroundColor: cardBg }]}>
            <View style={[styles.feeStatus, { backgroundColor: (statusColors[item.status] || Colors.mediumGray) + '18' }]}>
              <Text style={[styles.feeStatusText, { color: statusColors[item.status] }]}>{item.status?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.feeName, { color: textColor }]}>{item.student?.name || 'Student'}</Text>
            <Text style={[styles.feeDetail, { color: textSec }]}>{item.student?.grade || item.course?.title || 'N/A'} • {item.monthYear || item.month || 'N/A'}</Text>
            <Text style={[styles.feeDetail, { color: textSec }]}>Due {formatCurrency(item.dueAmount || item.amount || 0)} · Paid {formatCurrency(item.paidAmount || 0)} · Remaining {formatCurrency(item.remainingAmount || 0)}</Text>
            <View style={styles.feeRow}>
              <Text style={[styles.feeAmount, { color: textColor }]}>{formatCurrency(item.remainingAmount || item.dueAmount || item.amount || 0)}</Text>
              {item.status !== 'paid' && (
                <TouchableOpacity style={styles.payBtn} onPress={() => { setEditModal(item); setPayData({ amountPaid: '', paymentMethod: 'cash', paymentDate: '', transactionId: '', notes: '' }); }}>
                  <Text style={styles.payText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="wallet-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No fee records</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchAdminFees(filter !== 'all' ? { status: filter } : {}))}
      />

      <Modal visible={!!editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, paddingBottom: Math.max(40, bottomPadding) }]}> 
            <Text style={[styles.modalTitle, { color: textColor }]}>Record Payment</Text>
            <Text style={[styles.modalSub, { color: textSec }]}>{editModal?.student?.name} — Due {formatCurrency(editModal?.dueAmount || editModal?.amount)} · Remaining {formatCurrency(editModal?.remainingAmount || 0)}</Text>
            <Text style={[styles.label, { color: textColor }]}>Amount Paid</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} keyboardType="numeric" placeholder="Enter amount paid" placeholderTextColor={Colors.mediumGray} value={payData.amountPaid} onChangeText={(v) => setPayData({ ...payData, amountPaid: v })} />
            <Text style={[styles.label, { color: textColor }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other'].map((m) => (
                <TouchableOpacity key={m} style={[styles.methodChip, payData.paymentMethod === m && styles.methodActive]} onPress={() => setPayData({ ...payData, paymentMethod: m })}>
                  <Text style={[styles.methodText, payData.paymentMethod === m && { color: Colors.white }]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: textColor }]}>Payment Date</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.mediumGray} value={payData.paymentDate} onChangeText={(v) => setPayData({ ...payData, paymentDate: v })} />
            <Text style={[styles.label, { color: textColor }]}>Transaction ID</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Optional" placeholderTextColor={Colors.mediumGray} value={payData.transactionId} onChangeText={(v) => setPayData({ ...payData, transactionId: v })} />
            <Text style={[styles.label, { color: textColor }]}>Notes</Text>
            <TextInput style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Optional" placeholderTextColor={Colors.mediumGray} value={payData.notes} onChangeText={(v) => setPayData({ ...payData, notes: v })} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleMarkPaid}><Text style={styles.confirmText}>Confirm Payment</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 8 },
  summaryCard: { flexBasis: '30%', flexGrow: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  revCard: { marginHorizontal: 16, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadows.light },
  revLabel: { fontSize: 14 },
  revAmount: { fontSize: 20, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, paddingRight: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '10' },
  filterActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  feeCard: { borderRadius: 14, padding: 16, marginBottom: 10, ...Shadows.light },
  feeStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  feeStatusText: { fontSize: 10, fontWeight: '700' },
  feeName: { fontSize: 16, fontWeight: '600' },
  feeDetail: { fontSize: 12, marginTop: 2 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  feeAmount: { fontSize: 20, fontWeight: 'bold' },
  payBtn: { backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  payText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSub: { fontSize: 14, marginTop: 4, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  methodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '10' },
  methodActive: { backgroundColor: Colors.primary },
  methodText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.success },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import React, { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { formatCurrency } from '../../utils/formatters';
import { fetchStudentFeeHistory, recordFeePayment, fetchStudentFeeDirectory } from '../../redux/slices/adminSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../utils/responsive';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const MAX_CONTENT_WIDTH = 640;
const TABLET_BREAKPOINT = 600;

const BRAND = {
  primaryPink: '#FF4F8B',
  primaryTeal: '#11C5C6',
  gold: '#F8C24E',
  white: '#FFFFFF',
  darkText: '#1F2D3D',
  muted: '#64748B',
  bg: '#F8FAFC',
  border: '#EEF1F5',
};

const STATUS = {
  paid: { color: '#16A34A', bg: '#DCFCE7' },
  partial: { color: '#2563EB', bg: '#DBEAFE' },
  pending: { color: '#D97706', bg: '#FEF3C7' },
  overdue: { color: '#DC2626', bg: '#FEE2E2' },
};

function FadeInUp({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export default function StudentFeeHistoryScreen({ route, navigation }) {
  const { studentId, studentName } = route.params;
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { studentFeeHistory, loading } = useSelector((state) => state.admin);
  
  const [payModal, setPayModal] = useState(false);
  const [payData, setPayData] = useState({ amount: '', paymentMethod: 'cash', month: '', remarks: '', status: 'paid' });

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = Math.min(width, height) >= TABLET_BREAKPOINT;
  const { s, vs } = useResponsive();

  const styles = useMemo(() => createStyles({ isTablet, insets, width, s, vs }), [isTablet, insets.top, insets.bottom, width, s, vs]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchStudentFeeHistory(studentId));
  }, [studentId]);

  const handleRecordPayment = async () => {
    if (!payData.amount || !payData.month) {
      Toast.show({ type: 'error', text1: 'Amount and Month are required' });
      return;
    }

    const payload = {
      studentId,
      amount: Number(payData.amount),
      paymentMethod: payData.paymentMethod,
      month: payData.month,
      year: new Date().getFullYear(),
      remarks: payData.remarks,
      status: payData.status
    };

    const r = await dispatch(recordFeePayment(payload));
    if (recordFeePayment.fulfilled.match(r)) {
      Toast.show({ type: 'success', text1: 'Payment recorded successfully' });
      setPayModal(false);
      dispatch(fetchStudentFeeHistory(studentId));
      dispatch(fetchStudentFeeDirectory({ search: '', page: 1, limit: 100 })); // refresh directory so latest payment reflects
    } else {
      Toast.show({ type: 'error', text1: r.payload || 'Failed to record payment' });
    }
  };

  return (
    <View style={styles.container}>
      <FadeInUp>
        <LinearGradient colors={['#FF4F8B', '#FF6AA8']} style={styles.headerGradient}>
          <View style={styles.contentWrap}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={styles.__iconSize + 3} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerBottom}>
              <Text style={styles.headerTitle}>{studentName}'s Fee History</Text>
              <Text style={styles.headerSubtitle}>View past payments or record a new one</Text>
            </View>
          </View>
        </LinearGradient>
      </FadeInUp>

      <FadeInUp delay={80} style={styles.panel}>
        <FlatList
          data={studentFeeHistory}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ paddingBottom: Math.max(vs(24), bottomPadding), paddingHorizontal: styles.__listPadding, flexGrow: 1 }}
          ListHeaderComponent={
            <View style={styles.contentWrap}>
              <View style={styles.actionsRow}>
                <Text style={styles.sectionLabel}>PAYMENT HISTORY</Text>
                <TouchableOpacity style={styles.recordBtn} onPress={() => {
                  setPayData({ amount: '', paymentMethod: 'cash', month: '', remarks: '', status: 'paid' });
                  setPayModal(true);
                }}>
                  <Ionicons name="add-circle" size={18} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.recordBtnText}>Record Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS[item.status] || STATUS.pending;
            
            return (
              <View style={styles.contentWrap}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: st.bg }]}>
                    <Ionicons name={item.status === 'paid' ? "checkmark-done" : "time-outline"} size={20} color={st.color} />
                  </View>

                  <View style={styles.rowMiddle}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.month} {item.year}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.paymentMethod ? item.paymentMethod.toUpperCase().replace('_', ' ') : 'N/A'} • {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {formatCurrency(item.amount)}
                    </Text>
                    <View style={[styles.statusTag, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusTagText, { color: st.color }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading && (
              <View style={[styles.contentWrap, styles.emptyWrap]}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="receipt-outline" size={styles.__iconSize + 11} color={BRAND.primaryTeal} />
                </View>
                <Text style={styles.emptyTitle}>No payment history</Text>
                <Text style={styles.emptySub}>This student has no recorded payments.</Text>
              </View>
            )
          }
          refreshing={loading}
          onRefresh={() => dispatch(fetchStudentFeeHistory(studentId))}
        />
      </FadeInUp>

      <Modal visible={payModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(vs(32), bottomPadding) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalSub}>{studentName}</Text>

            <Text style={styles.label}>Amount Paid</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter amount paid"
              placeholderTextColor="#9CA3AF"
              value={payData.amount}
              onChangeText={(v) => setPayData({ ...payData, amount: v })}
            />

            <Text style={styles.label}>Month / Period</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. July 2026"
              placeholderTextColor="#9CA3AF"
              value={payData.month}
              onChangeText={(v) => setPayData({ ...payData, month: v })}
            />

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {['cash', 'upi', 'bank_transfer', 'cheque', 'card'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, payData.paymentMethod === m && styles.methodActive]}
                  onPress={() => setPayData({ ...payData, paymentMethod: m })}
                >
                  <Text style={[styles.methodText, payData.paymentMethod === m && { color: BRAND.white }]}>
                    {m.toUpperCase().replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.methodRow}>
              {['paid', 'partial'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.methodChip, payData.status === st && styles.methodActive]}
                  onPress={() => setPayData({ ...payData, status: st })}
                >
                  <Text style={[styles.methodText, payData.status === st && { color: BRAND.white }]}>
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Remarks (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Any notes..."
              placeholderTextColor="#9CA3AF"
              value={payData.remarks}
              onChangeText={(v) => setPayData({ ...payData, remarks: v })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleRecordPayment}>
                <Text style={styles.primaryBtnText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles({ isTablet, insets, width, s, vs }) {
  const f = (base, tabletBase = base + 2) => clamp(isTablet ? s(tabletBase) : s(base), base * 0.85, (tabletBase || base) * 1.15);
  const sidePadding = isTablet ? 28 : 20;
  const iconSize = isTablet ? 21 : 19;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BRAND.primaryPink },
    contentWrap: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
    
    headerGradient: { paddingTop: insets.top + vs(12), paddingBottom: vs(32), paddingHorizontal: sidePadding },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
    headerBottom: { marginTop: vs(22) },
    headerTitle: { fontSize: f(24, 27), fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
    headerSubtitle: { fontSize: f(13), fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 4 },

    panel: { flex: 1, backgroundColor: BRAND.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -22, overflow: 'hidden' },

    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: vs(24), marginBottom: vs(12) },
    sectionLabel: { fontSize: f(10.5, 12), fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 },
    recordBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.primaryTeal, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    recordBtnText: { color: '#FFF', fontSize: f(11.5, 13), fontWeight: '700' },

    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: BRAND.border, minHeight: isTablet ? 64 : 56 },
    rowMiddle: { flex: 1, marginLeft: s(12), marginRight: 8 },
    avatar: { width: s(42), height: s(42), borderRadius: s(21), justifyContent: 'center', alignItems: 'center' },
    rowName: { fontSize: f(14.5, 16), fontWeight: '700', color: BRAND.darkText },
    rowMeta: { fontSize: f(12, 13), fontWeight: '500', color: BRAND.muted, marginTop: 2 },
    rowAmount: { fontSize: f(14.5, 16), fontWeight: '800', color: BRAND.darkText },
    statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
    statusTagText: { fontSize: 9.5, fontWeight: '800' },

    emptyWrap: { alignItems: 'center', paddingVertical: vs(60) },
    emptyIconCircle: { width: s(64), height: s(64), borderRadius: s(32), backgroundColor: '#E7FBFB', justifyContent: 'center', alignItems: 'center', marginBottom: vs(16) },
    emptyTitle: { fontSize: f(15.5, 17), fontWeight: '800', color: BRAND.darkText },
    emptySub: { fontSize: f(12.5, 14), fontWeight: '500', color: BRAND.muted, marginTop: 4, textAlign: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: sidePadding + 4,
      width: '100%',
      maxWidth: isTablet ? 560 : undefined,
      borderBottomLeftRadius: isTablet ? 28 : 0,
      borderBottomRightRadius: isTablet ? 28 : 0,
      marginBottom: isTablet ? insets.bottom + 24 : 0,
    },
    modalHandle: { width: 36, height: 4, backgroundColor: BRAND.border, borderRadius: 2, alignSelf: 'center', marginBottom: vs(18) },
    modalTitle: { fontSize: f(18, 20), fontWeight: '800', color: BRAND.darkText },
    modalSub: { fontSize: f(12.5, 14), fontWeight: '500', color: BRAND.muted, marginTop: 5, marginBottom: vs(18) },
    label: { fontSize: f(12, 13.5), fontWeight: '700', color: BRAND.darkText, marginBottom: 8, marginTop: vs(14) },
    input: { borderWidth: 1, borderColor: BRAND.border, borderRadius: 14, paddingHorizontal: s(16), paddingVertical: vs(13), fontSize: f(14, 15.5), fontWeight: '600', color: BRAND.darkText, backgroundColor: BRAND.bg },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    methodChip: { paddingHorizontal: s(14), paddingVertical: vs(9), borderRadius: 10, backgroundColor: BRAND.bg, borderWidth: 1, borderColor: BRAND.border },
    methodActive: { backgroundColor: BRAND.primaryTeal, borderColor: BRAND.primaryTeal },
    methodText: { fontSize: f(11.5, 13), fontWeight: '700', color: BRAND.muted },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: vs(24) },
    cancelBtn: { flex: 1, paddingVertical: vs(15), alignItems: 'center', borderRadius: 14, backgroundColor: BRAND.bg },
    cancelText: { fontSize: f(14, 15.5), fontWeight: '700', color: BRAND.muted },
    primaryBtn: { flex: 1.4, paddingVertical: vs(15), alignItems: 'center', borderRadius: 14, backgroundColor: BRAND.primaryTeal },
    primaryBtnText: { fontSize: f(14, 15.5), fontWeight: '800', color: '#FFF' },
  });

  styles.__iconSize = iconSize;
  styles.__listPadding = sidePadding;
  return styles;
}

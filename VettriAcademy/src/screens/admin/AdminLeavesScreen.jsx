import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { fetchAdminLeaves, updateLeave } from '../../redux/slices/adminSlice';

export default function AdminLeavesScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { leaves, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchAdminLeaves({})); }, []);

  const statusColors = { pending: Colors.warning, approved: Colors.success, rejected: Colors.error };

  const performAction = async (leave, status) => {
    const r = await dispatch(updateLeave({ id: leave._id, status, adminRemarks: '' }));
    if (updateLeave.fulfilled.match(r)) {
      Toast.show({ type: 'success', text1: `Leave ${status} ✅` });
      dispatch(fetchAdminLeaves({}));
      return;
    }

    Toast.show({
      type: 'error',
      text1: 'Action failed',
      text2: r.payload || 'Unable to update leave status',
    });
  };

  const handleAction = (leave, status) => {
    const title = `${status.charAt(0).toUpperCase() + status.slice(1)} leave?`;
    const msg = `${leave.applicant?.name || 'User'}`;

    // React Native Web confirmation fallback for reliable button handling.
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      const ok = globalThis.confirm(`${title}\n${msg}`);
      if (ok) performAction(leave, status);
      return;
    }

    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => performAction(leave, status) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={leaves} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.name, { color: textColor }]}>{item.applicant?.name || 'User'}</Text>
                <Text style={[styles.role, { color: textSec }]}>{item.applicantRole || item.applicant?.role} • {item.leaveType}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.status] || Colors.mediumGray) + '18' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.dates, { color: textSec }]}>📅 {formatDate(item.fromDate)} → {formatDate(item.toDate)}</Text>
            <Text style={[styles.reason, { color: textSec }]} numberOfLines={2}>{item.reason}</Text>
            {item.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => handleAction(item, 'approved')}>
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error }]} onPress={() => handleAction(item, 'rejected')}>
                  <Ionicons name="close" size={18} color={Colors.white} />
                  <Text style={styles.actionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="airplane-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No leave applications</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchAdminLeaves({}))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  role: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  dates: { fontSize: 13, marginBottom: 4 },
  reason: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

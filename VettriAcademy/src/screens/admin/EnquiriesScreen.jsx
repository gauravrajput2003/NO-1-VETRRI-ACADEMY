import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { fetchEnquiries, updateEnquiry } from '../../redux/slices/adminSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


export default function EnquiriesScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { enquiries, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchEnquiries()); }, []);

  const statusColors = { new: Colors.info, contacted: Colors.warning, converted: Colors.success, closed: Colors.mediumGray };
  const newCount = enquiries.filter((item) => item.status === 'new').length;
  const contactedCount = enquiries.filter((item) => item.status === 'contacted').length;

  const handleUpdate = (enquiry, status) => {
    Alert.alert(`Mark as ${status}?`, `${enquiry.name || enquiry.studentName}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        const r = await dispatch(updateEnquiry({ id: enquiry._id, updates: { status } }));
        if (updateEnquiry.fulfilled.match(r)) Toast.show({ type: 'success', text1: `Marked ${status} ✅` });
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>{enquiries.length}</Text>
          <Text style={[styles.summaryLabel, { color: textSec }]}>Total Enquiries</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>{newCount}</Text>
          <Text style={[styles.summaryLabel, { color: textSec }]}>New</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>{contactedCount}</Text>
          <Text style={[styles.summaryLabel, { color: textSec }]}>Contacted</Text>
        </View>
      </View>

      <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16} data={enquiries} keyExtractor={(i) => i._id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: textColor }]}>{item.name || item.studentName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.status] || Colors.mediumGray) + '18' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.detail, { color: textSec }]}>📞 {item.mobile || item.phone}</Text>
            {item.email && <Text style={[styles.detail, { color: textSec }]}>📧 {item.email}</Text>}
            {item.course && <Text style={[styles.detail, { color: textSec }]}>📚 {item.course}</Text>}
            {item.message && <Text style={[styles.msg, { color: textSec }]}>{item.message}</Text>}
            <Text style={[styles.date, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
            {item.status === 'new' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.warning }]} onPress={() => handleUpdate(item, 'contacted')}>
                  <Ionicons name="call" size={16} color={Colors.white} /><Text style={styles.actionText}>Contacted</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => handleUpdate(item, 'converted')}>
                  <Ionicons name="checkmark" size={16} color={Colors.white} /><Text style={styles.actionText}>Converted</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="help-circle-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No enquiries</Text></View>}
        refreshing={loading} onRefresh={() => dispatch(fetchEnquiries())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { margin: 16, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadows.light },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, height: 34, backgroundColor: Colors.lightGray },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  detail: { fontSize: 13, marginTop: 2 },
  msg: { fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  date: { fontSize: 12, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatRelativeTime } from '../../utils/formatters';
import { fetchNotifications, markNotificationRead, markAllRead } from '../../redux/slices/notificationsSlice';
import { NOTIFICATION_TYPES } from '../../utils/constants';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const typeIcons = {
  new_score: 'stats-chart',
  new_material: 'document-text',
  class_reminder: 'alarm',
  leave_update: 'airplane',
  fee_reminder: 'wallet',
  chat: 'chatbubbles',
  announcement: 'megaphone',
  material_unlocked: 'lock-open',
  recording_available: 'videocam',
  new_enquiry: 'mail-outline',
};

export default function NotificationsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list, loading = false } = useSelector((s) => s.notifications);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchNotifications()); }, []);

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }, !item.isRead && styles.unread]}
      onPress={() => {
        if (!item.isRead) dispatch(markNotificationRead(item._id));
        // Navigate based on type
        if (item.type === 'chat') navigation.navigate('Chat');
        else if (item.type === 'new_score') navigation.navigate('ExamScores');
        else if (item.type === 'class_reminder') navigation.navigate('Classes');
        else if (item.type === 'new_enquiry' && user?.role === 'admin') navigation.navigate('Enquiries');
      }}
    >
      <View style={[styles.iconBox, { backgroundColor: Colors.primary + '18' }]}>
        <Ionicons name={typeIcons[item.type] || 'notifications'} size={22} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifTitle, { color: textColor }]}>{item.title}</Text>
        <Text style={[styles.notifMsg, { color: textSec }]} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.notifTime, { color: textSec }]}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {list.length > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={() => dispatch(markAllRead())}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        renderItem={renderNotification}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.mediumGray} />
            <Text style={[styles.emptyText, { color: textSec }]}>No notifications</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => dispatch(fetchNotifications())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  markAllBtn: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, ...Shadows.light },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifTitle: { fontSize: 15, fontWeight: '600' },
  notifMsg: { fontSize: 13, marginTop: 3 },
  notifTime: { fontSize: 11, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

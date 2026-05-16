import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatRelativeTime } from '../../utils/formatters';
import { fetchConversations } from '../../redux/slices/chatSlice';

export default function ChatListScreen({ navigation }) {
  const dispatch = useDispatch();
  const { conversations, loading, unreadCount } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchConversations()); }, []);

  const getOtherParticipant = (conv) => {
    if (!conv.participants) return { name: 'Unknown', isOnline: false };
    return conv.participants.find((p) => p._id !== user?._id) || conv.participants[0] || { name: 'Unknown' };
  };

  const renderConversation = ({ item }) => {
    const other = getOtherParticipant(item);
    const unread = item.unreadCount?.[user?._id] || 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => navigation.navigate('ChatRoom', {
          conversationId: item.conversationId,
          otherUser: other,
        })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(other.displayName || other.name || '?')[0]?.toUpperCase()}
          </Text>
          {other.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: textColor }]}>{other.displayName || other.name}</Text>
          <Text style={[styles.lastMsg, { color: textSec }]} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.timeText, { color: textSec }]}>{formatRelativeTime(item.lastMessageAt)}</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id || item.conversationId}
          renderItem={renderConversation}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.mediumGray} />
              <Text style={[styles.emptyText, { color: textSec }]}>No conversations yet</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => dispatch(fetchConversations())}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.light },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 14, position: 'relative',
  },
  avatarText: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success,
    borderWidth: 2, borderColor: Colors.white,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  lastMsg: { fontSize: 13, marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  timeText: { fontSize: 11 },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { formatRelativeTime } from '../../utils/formatters';
import { fetchChatUsers, fetchConversations } from '../../redux/slices/chatSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 15, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

export default function AdminChatScreen({ navigation }) {
  const dispatch = useDispatch();
  const { chatUsers, conversations, usersLoading, loading } = useSelector((s) => s.chat);
  const { user: currentUser } = useSelector((s) => s.auth);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'teacher' | 'student'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const bgColor = isDark ? Colors.background.dark : '#F8FAFC';
  const cardBg = isDark ? Colors.card.dark : '#FFFFFF';
  const textColor = isDark ? Colors.text.dark : '#1E293B';
  const textSec = isDark ? Colors.textSecondary.dark : '#64748B';

  const teacherCount = useMemo(
    () => (chatUsers || []).filter((u) => u.role?.toLowerCase() === 'teacher').length,
    [chatUsers]
  );
  const studentCount = useMemo(
    () => (chatUsers || []).filter((u) => u.role?.toLowerCase() === 'student').length,
    [chatUsers]
  );

  const loadData = useCallback(() => {
    dispatch(fetchConversations());
    dispatch(fetchChatUsers({ role: 'all', limit: 500 }));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchConversations()),
      dispatch(fetchChatUsers({ role: 'all', limit: 500 })),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleSelectUser = (targetUser) => {
    const adminId = currentUser?._id?.toString() || '';
    const targetId = targetUser._id?.toString() || '';
    const conversationId = [adminId, targetId].sort().join('_');

    navigation.navigate('ChatRoom', {
      conversationId,
      otherUser: targetUser,
    });
  };

  const filteredUsers = useMemo(() => {
    if (!chatUsers || !Array.isArray(chatUsers)) return [];
    return chatUsers.filter((u) => {
      if (activeTab === 'teacher' && u.role?.toLowerCase() !== 'teacher') return false;
      if (activeTab === 'student' && u.role?.toLowerCase() !== 'student') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (u.name || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
        const matchGrade = (u.grade || '').toLowerCase().includes(q);
        const matchMobile = (u.mobile || '').includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        return matchName || matchGrade || matchMobile || matchEmail;
      }
      return true;
    });
  }, [chatUsers, activeTab, searchQuery]);

  const renderUserItem = ({ item }) => {
    const isTeacher = item.role === 'teacher';
    const roleBadgeColor = isTeacher ? '#14B8A6' : '#0EA5E9';
    const roleLabel = isTeacher ? 'Teacher' : item.grade || 'Student';

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
        onPress={() => handleSelectUser(item)}
      >
        <View style={styles.avatarWrap}>
          {item.profilePic ? (
            <Image source={{ uri: item.profilePic }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: roleBadgeColor }]}>
              <Text style={styles.avatarText}>{(item.displayName || item.name || 'U')[0]?.toUpperCase()}</Text>
            </View>
          )}
          {item.isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.userName, { color: textColor }]} numberOfLines={1}>
              {item.displayName || item.name}
            </Text>
            {item.lastMessageAt && (
              <Text style={[styles.timeText, { color: textSec }]}>{formatRelativeTime(item.lastMessageAt)}</Text>
            )}
          </View>

          <View style={styles.cardSubRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor + '20' }]}>
              <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>{roleLabel}</Text>
            </View>
            {item.subjects && item.subjects.length > 0 && (
              <Text style={[styles.subText, { color: textSec }]} numberOfLines={1}>
                · {item.subjects.join(', ')}
              </Text>
            )}
          </View>

          <View style={styles.lastMsgRow}>
            <Text style={[styles.lastMsgText, { color: item.unreadCount > 0 ? textColor : textSec, fontWeight: item.unreadCount > 0 ? '700' : '400' }]} numberOfLines={1}>
              {item.lastMessage || 'Tap to start direct messaging'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      {/* Header Banner */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerBanner}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Direct Messages</Text>
            <Text style={styles.headerSubtitle}>1-on-1 Chat with Teachers & Students</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#FF4FA3" />
            <Text style={styles.headerBadgeText}>Admin Desk</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, grade, or phone..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {[
            { id: 'all', label: `All (${(chatUsers || []).length})`, icon: 'people' },
            { id: 'teacher', label: `Teachers (${teacherCount})`, icon: 'school' },
            { id: 'student', label: `Students (${studentCount})`, icon: 'person' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <RNTouchableOpacity
                key={tab.id}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon} size={15} color={isActive ? '#FFF' : '#94A3B8'} />
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>{tab.label}</Text>
              </RNTouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Directory List */}
      {usersLoading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF4FA3" />
          <Text style={[styles.loadingText, { color: textSec }]}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF4FA3']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#CBD5E1" />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No users found</Text>
              <Text style={[styles.emptySub, { color: textSec }]}>
                {searchQuery ? `No results for "${searchQuery}"` : 'No teachers or students registered yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  backBtn: { padding: 6, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 79, 163, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 163, 0.3)',
  },
  headerBadgeText: { color: '#FF4FA3', fontSize: 11, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, marginHorizontal: 8, padding: 0 },

  tabBar: { flexDirection: 'row', gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabItemActive: { backgroundColor: '#FF4FA3' },
  tabItemText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  tabItemTextActive: { color: '#FFF' },

  // List
  listContainer: { padding: 16, paddingBottom: 30 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  timeText: { fontSize: 11, fontWeight: '500' },

  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  subText: { fontSize: 12, fontWeight: '500', flex: 1 },

  lastMsgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  lastMsgText: { fontSize: 13, flex: 1, marginRight: 10 },
  unreadBadge: {
    backgroundColor: '#FF4FA3',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});

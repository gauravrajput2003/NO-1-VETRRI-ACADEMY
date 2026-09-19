import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { Colors } from '../../utils/colors';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import {
  fetchAdminSupportTickets,
  updateAdminSupportTicket,
  deleteAdminSupportTicket,
} from '../../redux/slices/supportSlice';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 15, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

export default function AdminQueriesScreen({ navigation }) {
  const dispatch = useDispatch();
  const { adminTickets, adminTicketsTotal, adminCounts, adminLoading } = useSelector((s) => s.support);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'student' | 'teacher'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Selected Ticket Modal for details, status update & admin reply
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const bgColor = isDark ? Colors.background.dark : '#F8FAFC';
  const cardBg = isDark ? Colors.card.dark : '#FFFFFF';
  const textColor = isDark ? Colors.text.dark : '#1E293B';
  const textSec = isDark ? Colors.textSecondary.dark : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';

  const loadData = useCallback(() => {
    dispatch(
      fetchAdminSupportTickets({
        role: roleFilter,
        status: activeTab,
        search: searchQuery,
      })
    );
  }, [dispatch, roleFilter, activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(
      fetchAdminSupportTickets({
        role: roleFilter,
        status: activeTab,
        search: searchQuery,
      })
    );
    setRefreshing(false);
  }, [dispatch, roleFilter, activeTab, searchQuery]);

  // ── Status helper ──
  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return { label: 'Resolved', bg: '#DCFCE7', text: '#16A34A', icon: 'checkmark-circle' };
      case 'in_progress':
        return { label: 'In Progress', bg: '#FEF3C7', text: '#D97706', icon: 'time' };
      case 'closed':
        return { label: 'Closed', bg: '#F1F5F9', text: '#64748B', icon: 'lock-closed' };
      default:
        return { label: 'Open', bg: '#E0F2FE', text: '#0284C7', icon: 'radio-button-on' };
    }
  };

  // ── Update Ticket Status / Reply ──
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const payload = { status: newStatus };
      if (replyText.trim()) {
        payload.adminReply = replyText.trim();
      }
      const updated = await dispatch(
        updateAdminSupportTicket({ id: selectedTicket._id, data: payload })
      ).unwrap();

      setSelectedTicket(updated);
      setReplyText('');
      Toast.show({ type: 'success', text1: `Ticket marked as ${newStatus.replace('_', ' ').toUpperCase()}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err || 'Please try again' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Delete Ticket (3-Day Retention Check) ──
  const handleDeleteTicket = (ticket) => {
    const now = Date.now();
    const canDeleteTime = new Date(ticket.canDeleteAfter).getTime();

    if (now < canDeleteTime) {
      const remainingMs = canDeleteTime - now;
      const remainingDays = (remainingMs / (1000 * 60 * 60 * 24)).toFixed(1);
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

      Alert.alert(
        'Deletion Protected (3-Day Safety Policy)',
        `This support query (${ticket.ticketId}) was raised recently. To protect against accidental deletion before resolution, queries can only be deleted after 3 days interval.\n\n⏳ Remaining: ${remainingDays} days (~${remainingHours} hours).`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Query from Database',
      `Are you sure you want to permanently delete ticket ${ticket.ticketId}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteAdminSupportTicket(ticket._id)).unwrap();
              if (selectedTicket?._id === ticket._id) {
                setSelectedTicket(null);
              }
              Toast.show({ type: 'success', text1: `Ticket ${ticket.ticketId} deleted from database` });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Delete failed',
                text2: err.message || 'Please try again',
              });
            }
          },
        },
      ]
    );
  };

  // ── Direct Chat with User about Ticket ──
  const handleChatWithUser = (targetUser) => {
    if (!targetUser || !targetUser._id) return;
    const adminId = targetUser._id ? targetUser._id.toString() : '';
    // Open chat room
    navigation.navigate('ChatRoom', {
      conversationId: null,
      otherUser: targetUser,
    });
  };

  const renderTicketItem = ({ item }) => {
    const status = getStatusBadge(item.status);
    const isTeacher = item.role === 'teacher';
    const roleBadgeColor = isTeacher ? '#14B8A6' : '#0EA5E9';
    const now = Date.now();
    const deleteTime = new Date(item.canDeleteAfter).getTime();
    const isDeletable = now >= deleteTime;
    const remainingHours = Math.ceil((deleteTime - now) / (1000 * 60 * 60));

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => setSelectedTicket(item)}
      >
        <View style={styles.ticketTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.ticketIdBadge, { backgroundColor: isTeacher ? '#0F766E' : '#312E81' }]}>
              <Text style={styles.ticketIdText}>{item.ticketId}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor + '20' }]}>
              <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>
                {isTeacher ? 'Teacher' : item.userId?.grade ? `Grade ${item.userId.grade}` : 'Student'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.text} />
            <Text style={[styles.statusPillText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* User details */}
        <View style={styles.userInfoRow}>
          <Text style={[styles.userName, { color: textColor }]}>
            {item.userId?.displayName || item.userId?.name || 'User'}
          </Text>
          {item.userId?.mobile && (
            <Text style={[styles.userMobile, { color: textSec }]}>· 📞 {item.userId.mobile}</Text>
          )}
        </View>

        <Text style={[styles.ticketCategory, { color: '#FF4FA3' }]}>{item.categoryLabel}</Text>
        <Text style={[styles.ticketSubject, { color: textColor }]} numberOfLines={1}>
          {item.subject}
        </Text>
        <Text style={[styles.ticketDesc, { color: textSec }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Attachments pills */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentRow}>
            {item.attachments.map((att, i) => (
              <View key={i} style={styles.attMiniPill}>
                <Ionicons
                  name={att.fileType === 'image' ? 'image' : att.fileType === 'audio' ? 'mic' : 'document-text'}
                  size={12}
                  color="#0284C7"
                />
                <Text style={styles.attMiniText}>{att.fileName || `File ${i + 1}`}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Admin Reply Preview */}
        {item.adminReply ? (
          <View style={styles.replyPreviewWrap}>
            <Ionicons name="checkmark-done" size={14} color="#8B5CF6" />
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              Replied: {item.adminReply}
            </Text>
          </View>
        ) : null}

        {/* Card Footer with 3-Day Delete Protection Indicator */}
        <View style={styles.cardFooter}>
          <Text style={[styles.cardTimeText, { color: textSec }]}>
            {formatDate(item.createdAt)} · {formatRelativeTime(item.createdAt)}
          </Text>

          <RNTouchableOpacity
            style={[styles.deleteActionBtn, !isDeletable && styles.deleteActionBtnDisabled]}
            onPress={() => handleDeleteTicket(item)}
          >
            {isDeletable ? (
              <>
                <Ionicons name="trash" size={14} color="#EF4444" />
                <Text style={styles.deleteActionText}>Delete</Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                <Text style={styles.deleteActionLockedText}>Delete in {remainingHours}h</Text>
              </>
            )}
          </RNTouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      {/* ── Header Banner ── */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerBanner}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Queries & Tickets Received</Text>
            <Text style={styles.headerSubtitle}>
              {adminCounts.total} total received · {adminCounts.open} pending
            </Text>
          </View>
        </View>

        {/* Stat Summary Cards */}
        <View style={styles.statsSummaryRow}>
          <View style={styles.statSummaryCard}>
            <Text style={styles.statSummaryValue}>{adminCounts.total}</Text>
            <Text style={styles.statSummaryLabel}>Total</Text>
          </View>
          <View style={[styles.statSummaryCard, { borderColor: '#38BDF8' }]}>
            <Text style={[styles.statSummaryValue, { color: '#38BDF8' }]}>{adminCounts.open}</Text>
            <Text style={styles.statSummaryLabel}>Open</Text>
          </View>
          <View style={[styles.statSummaryCard, { borderColor: '#FBBF24' }]}>
            <Text style={[styles.statSummaryValue, { color: '#FBBF24' }]}>{adminCounts.inProgress}</Text>
            <Text style={styles.statSummaryLabel}>In Progress</Text>
          </View>
          <View style={[styles.statSummaryCard, { borderColor: '#4ADE80' }]}>
            <Text style={[styles.statSummaryValue, { color: '#4ADE80' }]}>{adminCounts.resolved}</Text>
            <Text style={styles.statSummaryLabel}>Resolved</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ticket ID (VASQ/VATQ), name, mobile..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <RNTouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </RNTouchableOpacity>
          )}
        </View>

        {/* Role & Status Tabs */}
        <View style={styles.tabsRow}>
          {[
            { id: 'all', label: 'All' },
            { id: 'open', label: `Open (${adminCounts.open})` },
            { id: 'in_progress', label: `In Progress (${adminCounts.inProgress})` },
            { id: 'resolved', label: `Resolved (${adminCounts.resolved})` },
          ].map((tab) => (
            <RNTouchableOpacity
              key={tab.id}
              style={[styles.filterTab, activeTab === tab.id && styles.filterTabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.filterTabText, activeTab === tab.id && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </RNTouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── Query List ── */}
      {adminLoading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF4FA3" />
          <Text style={[styles.loadingText, { color: textSec }]}>Loading queries & tickets...</Text>
        </View>
      ) : (
        <FlatList
          data={adminTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF4FA3']} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color="#CBD5E1" />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No tickets found</Text>
              <Text style={[styles.emptySub, { color: textSec }]}>
                {searchQuery ? `No matching queries for "${searchQuery}"` : 'All student and teacher queries are cleared!'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Ticket Detail & Reply Modal ── */}
      <Modal visible={!!selectedTicket} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: cardBg }]}>
            {selectedTicket && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.ticketIdBadge}>
                        <Text style={styles.ticketIdText}>{selectedTicket.ticketId}</Text>
                      </View>
                      <Text style={[styles.modalUserRole, { color: '#FF4FA3' }]}>
                        {selectedTicket.role?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.modalUserName, { color: textColor }]}>
                      {selectedTicket.userId?.displayName || selectedTicket.userId?.name}
                    </Text>
                    {selectedTicket.userId?.mobile && (
                      <Text style={[styles.modalUserContact, { color: textSec }]}>
                        📞 {selectedTicket.userId.mobile} {selectedTicket.userId.email ? `· ✉️ ${selectedTicket.userId.email}` : ''}
                      </Text>
                    )}
                  </View>

                  <RNTouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTicket(null)}>
                    <Ionicons name="close-circle" size={30} color="#94A3B8" />
                  </RNTouchableOpacity>
                </View>

                {/* Category & Subject */}
                <View style={[styles.modalSectionCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor }]}>
                  <Text style={[styles.modalCategoryLabel, { color: '#8B5CF6' }]}>
                    {selectedTicket.categoryLabel} {selectedTicket.subCategory ? `› ${selectedTicket.subCategory}` : ''}
                  </Text>
                  <Text style={[styles.modalSubjectText, { color: textColor }]}>
                    {selectedTicket.subject}
                  </Text>
                  <Text style={[styles.modalDescText, { color: textColor }]}>
                    {selectedTicket.description}
                  </Text>

                  {/* Attachments in Modal */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.modalAttTitle, { color: textSec }]}>Attached Files:</Text>
                      <View style={styles.modalAttGrid}>
                        {selectedTicket.attachments.map((att, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.modalAttButton}
                            onPress={() => att.url && Linking.openURL(att.url)}
                          >
                            <Ionicons
                              name={att.fileType === 'image' ? 'image' : att.fileType === 'audio' ? 'mic' : 'document-text'}
                              size={16}
                              color="#0284C7"
                            />
                            <Text style={styles.modalAttBtnText} numberOfLines={1}>
                              {att.fileName || `Attachment ${i + 1}`}
                            </Text>
                            <Ionicons name="open-outline" size={14} color="#0284C7" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Status Switcher */}
                <Text style={[styles.modalFieldLabel, { color: textColor }]}>Update Status:</Text>
                <View style={styles.statusButtonRow}>
                  {['open', 'in_progress', 'resolved', 'closed'].map((st) => {
                    const badge = getStatusBadge(st);
                    const isCurrent = selectedTicket.status === st;
                    return (
                      <RNTouchableOpacity
                        key={st}
                        style={[
                          styles.statusChangeBtn,
                          { backgroundColor: isCurrent ? badge.text : badge.bg },
                        ]}
                        onPress={() => handleUpdateStatus(st)}
                        disabled={updatingStatus}
                      >
                        <Text style={[styles.statusChangeBtnText, { color: isCurrent ? '#FFF' : badge.text }]}>
                          {badge.label}
                        </Text>
                      </RNTouchableOpacity>
                    );
                  })}
                </View>

                {/* Admin Reply Input */}
                <Text style={[styles.modalFieldLabel, { color: textColor, marginTop: 16 }]}>
                  Admin Reply / Resolution Note:
                </Text>
                <TextInput
                  style={[styles.modalReplyInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textColor, borderColor }]}
                  placeholder="Type your response to the student/teacher..."
                  placeholderTextColor="#94A3B8"
                  value={replyText || selectedTicket.adminReply || ''}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.sendReplyBtn}
                    onPress={() => handleUpdateStatus(selectedTicket.status)}
                    disabled={updatingStatus || !replyText.trim()}
                  >
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.sendReplyGradient}>
                      {updatingStatus ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#FFF" />
                          <Text style={styles.sendReplyText}>Send Reply to User</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Bottom Delete & Direct Chat Row */}
                <View style={styles.modalBottomTools}>
                  <TouchableOpacity
                    style={styles.modalChatBtn}
                    onPress={() => {
                      setSelectedTicket(null);
                      handleChatWithUser(selectedTicket.userId);
                    }}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#FF4FA3" />
                    <Text style={styles.modalChatText}>1-on-1 Direct Chat</Text>
                  </TouchableOpacity>

                  <RNTouchableOpacity
                    style={styles.modalDeleteBtn}
                    onPress={() => handleDeleteTicket(selectedTicket)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                    <Text style={styles.modalDeleteText}>Delete from DB</Text>
                  </RNTouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  backBtn: { padding: 6, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontSize: 19, fontWeight: '900', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  statsSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statSummaryCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statSummaryValue: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  statSummaryLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, paddingVertical: 4 },

  tabsRow: { flexDirection: 'row', gap: 6 },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: '#FF4FA3' },
  filterTabText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  filterTabTextActive: { color: '#FFF' },

  listContent: { padding: 14, paddingBottom: 40 },
  centered: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 6 },

  ticketCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketIdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ticketIdText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '800' },

  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 14, fontWeight: '800' },
  userMobile: { fontSize: 12, marginLeft: 4 },
  ticketCategory: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  ticketSubject: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  ticketDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8 },

  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  attMiniPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  attMiniText: { fontSize: 10, color: '#0284C7', fontWeight: '700', maxWidth: 100 },

  replyPreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', padding: 8, borderRadius: 8, marginBottom: 8 },
  replyPreviewText: { fontSize: 11, color: '#6D28D9', fontWeight: '600', flex: 1 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cardTimeText: { fontSize: 11 },
  deleteActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEE2E2' },
  deleteActionBtnDisabled: { backgroundColor: '#F1F5F9' },
  deleteActionText: { fontSize: 11, color: '#EF4444', fontWeight: '800' },
  deleteActionLockedText: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },

  // Detail Modal
  detailModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  modalUserRole: { fontSize: 11, fontWeight: '800' },
  modalUserName: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  modalUserContact: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: { padding: 4 },

  modalSectionCard: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 14 },
  modalCategoryLabel: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  modalSubjectText: { fontSize: 15, fontWeight: '900', marginBottom: 6 },
  modalDescText: { fontSize: 13, lineHeight: 19 },
  modalAttTitle: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  modalAttGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalAttButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  modalAttBtnText: { fontSize: 12, color: '#0284C7', fontWeight: '700', maxWidth: 140 },

  modalFieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  statusButtonRow: { flexDirection: 'row', gap: 6 },
  statusChangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  statusChangeBtnText: { fontSize: 11, fontWeight: '800' },

  modalReplyInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, minHeight: 70, textAlignVertical: 'top' },
  modalActionsRow: { marginTop: 10 },
  sendReplyBtn: { borderRadius: 12, overflow: 'hidden' },
  sendReplyGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  sendReplyText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  modalBottomTools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  modalChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  modalChatText: { fontSize: 13, color: '#FF4FA3', fontWeight: '800' },
  modalDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  modalDeleteText: { fontSize: 13, color: '#EF4444', fontWeight: '800' },
});

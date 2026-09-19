import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { Colors } from '../../utils/colors';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import { createSupportTicket, fetchMyTickets } from '../../redux/slices/supportSlice';
import { fetchAdminContact } from '../../redux/slices/chatSlice';
import { uploadSupportAttachmentAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 15, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── Predefined Help Categories (Flipkart / Swiggy / EdTech Style) ─────────────
const SUPPORT_CATEGORIES = [
  {
    id: 'fee_issue',
    label: 'Fee Related',
    icon: 'card',
    color: '#0EA5E9',
    gradient: ['#0284C7', '#38BDF8'],
    subCategories: ['Payment Receipt Needed', 'Fee Verification Pending', 'Due Date Extension', 'Online Payment Failed'],
    placeholder: 'Describe your fee inquiry or transaction reference ID...',
  },
  {
    id: 'study_material',
    label: 'Study Material',
    icon: 'book',
    color: '#8B5CF6',
    gradient: ['#7C3AED', '#A78BFA'],
    subCategories: ['PDF Download Problem', 'Material Locked/Restricted', 'Missing Chapter Notes', 'Wrong Grade Material'],
    placeholder: 'Mention the subject, chapter, and the issue you are facing...',
  },
  {
    id: 'live_class',
    label: 'Live Class',
    icon: 'videocam',
    color: '#EC4899',
    gradient: ['#DB2777', '#F472B6'],
    subCategories: ['Meeting Link Error', 'Audio/Video Not Working', 'Schedule Timing Query', 'Class Recording Request'],
    placeholder: 'Provide subject or class name and the issue encountered...',
  },
  {
    id: 'leave_attendance',
    label: 'Leave & Attendance',
    icon: 'calendar',
    color: '#14B8A6',
    gradient: ['#0D9488', '#2DD4BF'],
    subCategories: ['Attendance Correction', 'Leave Status Pending', 'Medical Certificate Submission', 'Compensation Class'],
    placeholder: 'Specify date(s) and explanation for your attendance/leave...',
  },
  {
    id: 'exam_scores',
    label: 'Exam & Scores',
    icon: 'ribbon',
    color: '#F59E0B',
    gradient: ['#D97706', '#FBBF24'],
    subCategories: ['Marks Not Updated', 'Score Discrepancy', 'Exam Schedule Query', 'Report Card Request'],
    placeholder: 'Mention exam name, subject, and your query...',
  },
  {
    id: 'technical_app',
    label: 'App & Tech Issue',
    icon: 'hardware-chip',
    color: '#6366F1',
    gradient: ['#4F46E5', '#818CF8'],
    subCategories: ['Notification Not Arriving', 'App Freezing / Crash', 'Audio Player Problem', 'Login Credentials Issue'],
    placeholder: 'Describe device model, error message or what went wrong...',
  },
  {
    id: 'other',
    label: 'Other Query',
    icon: 'chatbubble-ellipses',
    color: '#64748B',
    gradient: ['#475569', '#94A3B8'],
    subCategories: ['General Academy Inquiry', 'Admission Form Query', 'Faculty Feedback', 'Custom Request'],
    placeholder: 'Please describe your query in detail...',
  },
];

export default function HelpCenterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { myTickets, myTicketsTotal, loading, submitting } = useSelector((s) => s.support);
  const { adminContact } = useSelector((s) => s.chat);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('raise'); // 'raise' | 'my_tickets'
  const [selectedCatId, setSelectedCatId] = useState('fee_issue');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  const [subjectText, setSubjectText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Success dialog
  const [successTicket, setSuccessTicket] = useState(null);

  const selectedCategory = useMemo(
    () => SUPPORT_CATEGORIES.find((c) => c.id === selectedCatId) || SUPPORT_CATEGORIES[0],
    [selectedCatId]
  );

  const bgColor = isDark ? Colors.background.dark : '#F8FAFC';
  const cardBg = isDark ? Colors.card.dark : '#FFFFFF';
  const textColor = isDark ? Colors.text.dark : '#1E293B';
  const textSec = isDark ? Colors.textSecondary.dark : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';

  const loadData = useCallback(() => {
    dispatch(fetchMyTickets());
    if (!adminContact) {
      dispatch(fetchAdminContact());
    }
  }, [dispatch, adminContact]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchMyTickets());
    setRefreshing(false);
  }, [dispatch]);

  // ── Direct 1-on-1 Chat with Admin ──
  const handleChatWithAdmin = async () => {
    let admin = adminContact;
    if (!admin) {
      const res = await dispatch(fetchAdminContact()).unwrap().catch(() => null);
      admin = res;
    }
    if (admin && user?._id) {
      const conversationId = [user._id.toString(), admin._id.toString()].sort().join('_');
      navigation.navigate('ChatRoom', {
        conversationId,
        otherUser: admin,
      });
    } else {
      Toast.show({ type: 'info', text1: 'Admin Desk currently connecting...' });
    }
  };

  // ── Attachment Pickers ──
  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is needed to attach images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0], 'image');
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Image selection failed' });
    }
  };

  const pickDocumentOrAudio = async (type = 'all') => {
    try {
      const mimeTypes = type === 'audio' ? ['audio/*'] : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadFile(file, type === 'audio' ? 'audio' : 'pdf');
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'File selection failed' });
    }
  };

  const uploadFile = async (asset, expectedType) => {
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      const fileName = asset.name || asset.fileName || `support_file_${Date.now()}`;
      const mimeType = asset.mimeType || asset.type || (expectedType === 'image' ? 'image/jpeg' : expectedType === 'audio' ? 'audio/mpeg' : 'application/pdf');

      if (Platform.OS === 'web') {
        if (asset.file instanceof File) {
          formData.append('file', asset.file, fileName);
        } else {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          formData.append('file', blob, fileName);
        }
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
      }

      const { data } = await uploadSupportAttachmentAPI(formData);
      if (data && data.attachment) {
        setAttachments((prev) => [...prev, data.attachment]);
        Toast.show({ type: 'success', text1: 'Attachment added successfully' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: err.message || 'Please try again' });
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit Ticket ──
  const handleSubmitTicket = async () => {
    if (!descriptionText.trim()) {
      Toast.show({ type: 'error', text1: 'Please describe your query' });
      return;
    }

    const payload = {
      category: selectedCatId,
      categoryLabel: selectedCategory.label,
      subCategory: selectedSubCat,
      subject: subjectText.trim() || `${selectedCategory.label} - ${selectedSubCat || 'Inquiry'}`,
      description: descriptionText.trim(),
      attachments,
    };

    try {
      const res = await dispatch(createSupportTicket(payload)).unwrap();
      if (res.ticket) {
        setSuccessTicket(res.ticket);
        setDescriptionText('');
        setSubjectText('');
        setSelectedSubCat('');
        setAttachments([]);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to submit query', text2: err || 'Please try again' });
    }
  };

  // ── Status Color Helper ──
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      {/* ── Header Banner ── */}
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.headerBanner}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Help & Support Desk</Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'teacher' ? 'Teacher Support & Admin Assistance' : 'Student Help & Queries'}
            </Text>
          </View>
        </View>

        {/* ── Direct Chat with Admin Quick Access Card ── */}
        <TouchableOpacity style={styles.adminChatCard} onPress={handleChatWithAdmin}>
          <LinearGradient colors={['#FF4FA3', '#F43F5E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.adminChatGradient}>
            <View style={styles.adminChatIconWrap}>
              <Ionicons name="chatbubbles" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.adminChatTitle}>Direct Chat with Admin</Text>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
              <Text style={styles.adminChatSub}>Instant 1-on-1 assistance for urgent help</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={26} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Top Tabs ── */}
        <View style={styles.tabBar}>
          <RNTouchableOpacity
            style={[styles.tabBtn, activeTab === 'raise' && styles.tabBtnActive]}
            onPress={() => setActiveTab('raise')}
          >
            <Ionicons name="create-outline" size={16} color={activeTab === 'raise' ? '#FFF' : '#A5B4FC'} />
            <Text style={[styles.tabBtnText, activeTab === 'raise' && styles.tabBtnTextActive]}>Raise a Query</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity
            style={[styles.tabBtn, activeTab === 'my_tickets' && styles.tabBtnActive]}
            onPress={() => setActiveTab('my_tickets')}
          >
            <Ionicons name="albums-outline" size={16} color={activeTab === 'my_tickets' ? '#FFF' : '#A5B4FC'} />
            <Text style={[styles.tabBtnText, activeTab === 'my_tickets' && styles.tabBtnTextActive]}>
              My Tickets ({myTicketsTotal || myTickets.length || 0})
            </Text>
          </RNTouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Tab Content ── */}
      {activeTab === 'raise' ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section 1: Categories */}
          <Text style={[styles.sectionHeading, { color: textColor }]}>Select Issue Category</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Choose what you need help with (Flipkart / EdTech style)</Text>

          <View style={styles.categoryGrid}>
            {SUPPORT_CATEGORIES.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              return (
                <RNTouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: cardBg, borderColor: isSelected ? cat.color : borderColor },
                    isSelected && { borderWidth: 2, transform: [{ scale: 1.02 }] },
                  ]}
                  onPress={() => {
                    setSelectedCatId(cat.id);
                    setSelectedSubCat('');
                  }}
                >
                  <LinearGradient colors={cat.gradient} style={styles.catIconWrap}>
                    <Ionicons name={cat.icon} size={22} color="#FFF" />
                  </LinearGradient>
                  <Text style={[styles.catLabel, { color: textColor, fontWeight: isSelected ? '800' : '600' }]} numberOfLines={1}>
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: cat.color }]}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </RNTouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: Sub-Categories / Quick Topics */}
          {selectedCategory.subCategories.length > 0 && (
            <View style={styles.subCatSection}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Common Topics for {selectedCategory.label}</Text>
              <View style={styles.subCatPills}>
                {selectedCategory.subCategories.map((sub) => {
                  const isSubActive = selectedSubCat === sub;
                  return (
                    <RNTouchableOpacity
                      key={sub}
                      style={[
                        styles.subPill,
                        {
                          backgroundColor: isSubActive ? selectedCategory.color : isDark ? '#1E293B' : '#F1F5F9',
                          borderColor: isSubActive ? selectedCategory.color : borderColor,
                        },
                      ]}
                      onPress={() => {
                        setSelectedSubCat(isSubActive ? '' : sub);
                        if (!subjectText) setSubjectText(sub);
                      }}
                    >
                      <Text style={[styles.subPillText, { color: isSubActive ? '#FFF' : textColor }]}>{sub}</Text>
                    </RNTouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 3: Subject & Description */}
          <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Subject (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textColor, borderColor }]}
              placeholder="e.g. Fee installment query or Chapter 4 PDF notes"
              placeholderTextColor="#94A3B8"
              value={subjectText}
              onChangeText={setSubjectText}
            />

            <Text style={[styles.fieldLabel, { color: textColor, marginTop: 14 }]}>
              Description <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', color: textColor, borderColor },
              ]}
              placeholder={selectedCategory.placeholder}
              placeholderTextColor="#94A3B8"
              value={descriptionText}
              onChangeText={setDescriptionText}
              multiline
              numberOfLines={4}
              maxLength={5000}
            />
            <Text style={styles.charCount}>{descriptionText.length}/5000</Text>

            {/* Section 4: Attachments */}
            <Text style={[styles.fieldLabel, { color: textColor, marginTop: 12 }]}>Attachments (Optional)</Text>
            <Text style={[styles.attachmentHint, { color: textSec }]}>
              Attach screenshot, PDF document, or audio note for faster resolution.
            </Text>

            <View style={styles.attachmentButtonRow}>
              <TouchableOpacity style={[styles.attachActionBtn, { borderColor }]} onPress={pickPhoto} disabled={uploadingMedia}>
                <Ionicons name="image" size={18} color="#FF4FA3" />
                <Text style={[styles.attachActionText, { color: textColor }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.attachActionBtn, { borderColor }]} onPress={() => pickDocumentOrAudio('pdf')} disabled={uploadingMedia}>
                <Ionicons name="document-text" size={18} color="#8B5CF6" />
                <Text style={[styles.attachActionText, { color: textColor }]}>PDF / Doc</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.attachActionBtn, { borderColor }]} onPress={() => pickDocumentOrAudio('audio')} disabled={uploadingMedia}>
                <Ionicons name="mic" size={18} color="#14B8A6" />
                <Text style={[styles.attachActionText, { color: textColor }]}>Audio Note</Text>
              </TouchableOpacity>
            </View>

            {uploadingMedia && (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="small" color="#FF4FA3" />
                <Text style={[styles.uploadingText, { color: textSec }]}>Uploading media attachment...</Text>
              </View>
            )}

            {/* Render selected attachments */}
            {attachments.length > 0 && (
              <View style={styles.attachmentsList}>
                {attachments.map((att, idx) => (
                  <View key={idx} style={[styles.attachmentPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons
                      name={att.fileType === 'image' ? 'image' : att.fileType === 'audio' ? 'mic' : 'document-text'}
                      size={16}
                      color="#0EA5E9"
                    />
                    <Text style={[styles.attachmentName, { color: textColor }]} numberOfLines={1}>
                      {att.fileName || 'Attachment'}
                    </Text>
                    <RNTouchableOpacity onPress={() => removeAttachment(idx)}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </RNTouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, (!descriptionText.trim() || submitting) && { opacity: 0.6 }]}
              onPress={handleSubmitTicket}
              disabled={!descriptionText.trim() || submitting}
            >
              <LinearGradient colors={['#FF4FA3', '#F43F5E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#FFF" />
                    <Text style={styles.submitText}>Submit Support Query</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* ── My Tickets Tab ── */
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF4FA3']} />}
        >
          {loading && !refreshing ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FF4FA3" />
              <Text style={[styles.loadingText, { color: textSec }]}>Loading your tickets...</Text>
            </View>
          ) : myTickets.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="ticket-outline" size={60} color="#CBD5E1" />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No support tickets raised</Text>
              <Text style={[styles.emptySub, { color: textSec }]}>
                Have a query? Tap "Raise a Query" above to submit an inquiry to the administration.
              </Text>
            </View>
          ) : (
            myTickets.map((t) => {
              const status = getStatusBadge(t.status);
              return (
                <View key={t._id} style={[styles.ticketCard, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketIdBadge}>
                      <Text style={styles.ticketIdText}>{t.ticketId}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon} size={12} color={status.text} />
                      <Text style={[styles.statusPillText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.ticketSubject, { color: textColor }]}>{t.subject || t.categoryLabel}</Text>
                  <Text style={[styles.ticketDesc, { color: textSec }]} numberOfLines={3}>
                    {t.description}
                  </Text>

                  {/* Attachments preview */}
                  {t.attachments && t.attachments.length > 0 && (
                    <View style={styles.ticketAttachmentsRow}>
                      {t.attachments.map((att, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.ticketAttPill}
                          onPress={() => att.url && Linking.openURL(att.url)}
                        >
                          <Ionicons
                            name={att.fileType === 'image' ? 'image' : att.fileType === 'audio' ? 'mic' : 'document-text'}
                            size={14}
                            color="#0284C7"
                          />
                          <Text style={styles.ticketAttText} numberOfLines={1}>
                            {att.fileName || `Attachment ${i + 1}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Admin Reply Box */}
                  {t.adminReply ? (
                    <View style={styles.adminReplyBox}>
                      <View style={styles.adminReplyHeader}>
                        <Ionicons name="shield-checkmark" size={15} color="#8B5CF6" />
                        <Text style={styles.adminReplyTitle}>Admin Desk Response</Text>
                        {t.adminRepliedAt && (
                          <Text style={styles.adminReplyTime}>{formatRelativeTime(t.adminRepliedAt)}</Text>
                        )}
                      </View>
                      <Text style={styles.adminReplyBody}>{t.adminReply}</Text>
                    </View>
                  ) : null}

                  <View style={styles.ticketFooter}>
                    <Text style={[styles.ticketTime, { color: textSec }]}>
                      Raised {formatDate(t.createdAt)} · {formatRelativeTime(t.createdAt)}
                    </Text>
                    <TouchableOpacity style={styles.ticketChatBtn} onPress={handleChatWithAdmin}>
                      <Ionicons name="chatbubbles-outline" size={15} color="#FF4FA3" />
                      <Text style={styles.ticketChatText}>Chat with Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Success Modal Dialog ── */}
      <Modal visible={!!successTicket} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={44} color="#FFF" />
            </LinearGradient>

            <Text style={[styles.modalSuccessTitle, { color: textColor }]}>Ticket Raised Successfully!</Text>
            <Text style={[styles.modalSuccessSub, { color: textSec }]}>
              Your support query has been assigned the ticket ID below. Academy admin has been notified with high priority.
            </Text>

            <View style={styles.ticketHighlightBox}>
              <Text style={styles.ticketHighlightLabel}>YOUR TICKET NUMBER</Text>
              <Text style={styles.ticketHighlightId}>{successTicket?.ticketId}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setSuccessTicket(null);
                setActiveTab('my_tickets');
              }}
            >
              <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.modalCloseGradient}>
                <Text style={styles.modalCloseBtnText}>View My Tickets</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  backBtn: { padding: 6, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  headerSubtitle: { fontSize: 12, color: '#C7D2FE', marginTop: 2, fontWeight: '500' },

  adminChatCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  adminChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  adminChatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminChatTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  adminChatSub: { fontSize: 11, color: '#FFE4E6', marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 10, color: '#4ADE80', fontWeight: '800' },

  tabBar: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#C7D2FE' },
  tabBtnTextActive: { color: '#FFF' },

  body: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeading: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  categoryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  catIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catLabel: { fontSize: 13, textAlign: 'center' },
  selectedCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  subCatSection: { marginBottom: 16 },
  subCatPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  subPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subPillText: { fontSize: 12, fontWeight: '600' },

  formCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right', marginTop: 4 },

  attachmentHint: { fontSize: 11, marginBottom: 10 },
  attachmentButtonRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  attachActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  attachActionText: { fontSize: 12, fontWeight: '700' },

  uploadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  uploadingText: { fontSize: 12 },

  attachmentsList: { gap: 6, marginBottom: 12 },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  attachmentName: { flex: 1, fontSize: 12, fontWeight: '600' },

  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '900' },

  // My Tickets
  centered: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 6 },

  ticketCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketIdBadge: { backgroundColor: '#312E81', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticketIdText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  ticketSubject: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  ticketDesc: { fontSize: 13, lineHeight: 18 },

  ticketAttachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  ticketAttPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ticketAttText: { fontSize: 11, color: '#0284C7', fontWeight: '700', maxWidth: 120 },

  adminReplyBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  adminReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  adminReplyTitle: { fontSize: 12, fontWeight: '800', color: '#6D28D9' },
  adminReplyTime: { fontSize: 10, color: '#8B5CF6', marginLeft: 'auto' },
  adminReplyBody: { fontSize: 13, color: '#4C1D95', lineHeight: 18 },

  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  ticketTime: { fontSize: 11 },
  ticketChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketChatText: { fontSize: 12, color: '#FF4FA3', fontWeight: '800' },

  // Success Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', maxWidth: 360 },
  modalSuccessIcon: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalSuccessTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  modalSuccessSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  ticketHighlightBox: { backgroundColor: '#EEF2FF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center', width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#C7D2FE' },
  ticketHighlightLabel: { fontSize: 11, fontWeight: '800', color: '#4F46E5', letterSpacing: 0.5 },
  ticketHighlightId: { fontSize: 24, fontWeight: '900', color: '#1E1B4B', marginTop: 4, letterSpacing: 1 },
  modalCloseBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  modalCloseGradient: { paddingVertical: 14, alignItems: 'center' },
  modalCloseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import {
  clearDoubtDetail,
  fetchDoubtDetail,
  patchDoubtAssignment,
  patchDoubtStatus,
  postDoubtReply,
  upsertRealtimeReply,
  applyRealtimeStatus,
} from '../../redux/slices/doubtsSlice';
import {
  deleteDoubtContentAPI,
  searchDoubtTeachersAPI,
  uploadDoubtAttachmentAPI,
} from '../../services/api';
import { joinRoom, leaveRoom, onSocketEvent } from '../../services/socket';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

const ROLE_BADGE = {
  student: { label: 'Student', color: '#00A8AB', bg: '#E6FAF7' },
  teacher: { label: 'Teacher', color: '#6C5CE7', bg: '#EFEAFF' },
  admin: { label: 'Admin', color: '#E17055', bg: '#FDEBE6' },
};

const STATUS_LABEL = {
  open: 'Open',
  teacher_responded: 'Teacher Responded',
  waiting_for_student: 'Waiting For Student',
  resolved: 'Resolved',
  closed: 'Closed',
};

const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const toUploadFile = (asset) => ({
  uri: asset.uri,
  name: asset.name || asset.fileName || `attachment-${Date.now()}`,
  type: asset.mimeType || asset.type || 'application/octet-stream',
});

function AttachmentChip({ attachment, onOpen }) {
  const isAudio = attachment.attachmentType === 'audio';
  const isPdf = attachment.attachmentType === 'pdf';
  const icon = isAudio ? 'mic' : isPdf ? 'document-text' : 'image';
  return (
    <TouchableOpacity style={styles.attachChip} onPress={onOpen}>
      <Ionicons name={icon} size={14} color={Colors.primary} />
      <Text style={styles.attachChipText} numberOfLines={1}>{attachment.originalFilename || attachment.attachmentType}</Text>
    </TouchableOpacity>
  );
}

function AudioAttachmentPlayer({ attachment }) {
  const player = useAudioPlayer(attachment.url);
  const playerStatus = useAudioRecorderState ? useAudioPlayerStatus(player) : null;

  const togglePlay = async () => {
    try {
      if (playerStatus?.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Audio error', text2: 'Unable to play this audio file.' });
    }
  };

  const seekBy = async (deltaMs) => {
    try {
      const currentTimeSec = playerStatus?.currentTime || 0;
      const durationSec = playerStatus?.duration || 0;
      const nextSec = Math.max(0, Math.min(currentTimeSec + deltaMs / 1000, durationSec));
      await player.seekTo(nextSec);
    } catch {}
  };

  return (
    <View style={styles.audioPlayer}>
      <TouchableOpacity style={styles.audioBtn} onPress={() => seekBy(-10000)}>
        <Ionicons name="play-back" size={18} color={Colors.navy} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.audioBtn, { backgroundColor: Colors.primary }]} onPress={togglePlay}>
        <Ionicons name={playerStatus?.playing ? 'pause' : 'play'} size={18} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.audioBtn} onPress={() => seekBy(10000)}>
        <Ionicons name="play-forward" size={18} color={Colors.navy} />
      </TouchableOpacity>
      <Text style={styles.audioTime}>{Math.floor(playerStatus?.currentTime || 0)}s / {Math.floor(playerStatus?.duration || 0)}s</Text>
    </View>
  );
}

export default function DoubtThreadScreen({ route, navigation }) {
  const doubtId = route.params?.doubtId;
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { currentDoubt, replies, loadingDetail, replying } = useSelector((s) => s.doubts);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingDurationSec = Math.floor((recorderState?.durationMillis || 0) / 1000);
  const recording = Boolean(recorderState?.isRecording || recordingPaused);

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Microphone permission required' });
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingPaused(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to start recording' });
    }
  };

  const pauseOrResumeRecording = async () => {
    if (!recording) return;
    try {
      if (recordingPaused) {
        recorder.record();
        setRecordingPaused(false);
      } else {
        recorder.pause();
        setRecordingPaused(true);
      }
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setReplyAttachments((prev) => [
          ...prev,
          {
            uri,
            name: `voice-${Date.now()}.m4a`,
            type: 'audio/mp4',
          },
        ]);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to stop recording' });
    } finally {
      setRecordingPaused(false);
    }
  };

  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherSuggestions, setTeacherSuggestions] = useState([]);
  const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const canManageAssignments = user?.role === 'admin';
  const canMarkResolved = user?.role === 'student' && currentDoubt?.status !== 'resolved' && currentDoubt?.status !== 'closed';
  const canClose = user?.role === 'teacher' && currentDoubt?.status !== 'closed';

  const loadDetail = useCallback(() => {
    if (!doubtId) return;
    dispatch(fetchDoubtDetail(doubtId));
  }, [dispatch, doubtId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
      if (doubtId) {
        joinRoom(`doubt:${doubtId}`);
      }

      const unsubReply = onSocketEvent('doubt:reply', (payload) => {
        if (payload?.doubtId === doubtId && payload.reply) {
          dispatch(upsertRealtimeReply(payload.reply));
        }
      });

      const unsubStatus = onSocketEvent('doubt:status', (payload) => {
        if (payload?.doubtId === doubtId) {
          dispatch(applyRealtimeStatus(payload));
        }
      });

      return () => {
        dispatch(clearDoubtDetail());
        if (doubtId) {
          leaveRoom(`doubt:${doubtId}`);
        }
        unsubReply();
        unsubStatus();
      };
    }, [dispatch, doubtId, loadDetail])
  );

  useEffect(() => {
    if (!assignModalOpen || !teacherQuery.trim() || teacherQuery.trim().length < 2) {
      setTeacherSuggestions([]);
      setTeacherSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setTeacherSearchLoading(true);
        const { data } = await searchDoubtTeachersAPI(teacherQuery.trim());
        setTeacherSuggestions(data.teachers || []);
      } catch {
        setTeacherSuggestions([]);
      } finally {
        setTeacherSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [teacherQuery, assignModalOpen]);

  useEffect(() => {
    if (currentDoubt?.assignedTeachers) {
      setSelectedTeachers(currentDoubt.assignedTeachers.map((t) => t._id));
    }
  }, [currentDoubt]);

  const onPickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ['image/jpeg', 'image/png', 'application/pdf', 'audio/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const files = (result.assets || []).map(toUploadFile);
    setReplyAttachments((prev) => [...prev, ...files]);
  };

  const uploadAttachments = async (files) => {
    if (!files.length) return [];
    const uploaded = [];
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadDoubtAttachmentAPI(file);
        uploaded.push(res.data.attachment);
      }
      return uploaded;
    } finally {
      setUploading(false);
    }
  };

  const onSendReply = async () => {
    if (!message.trim() && !replyAttachments.length) {
      return;
    }

    try {
      const uploaded = await uploadAttachments(replyAttachments);
      await dispatch(postDoubtReply({ doubtId, payload: { message: message.trim(), attachments: uploaded } })).unwrap();
      setMessage('');
      setReplyAttachments([]);
      Toast.show({ type: 'success', text1: 'Reply sent' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Reply failed', text2: String(err || '') });
    }
  };

  const onUpdateStatus = async (status) => {
    try {
      await dispatch(patchDoubtStatus({ doubtId, status })).unwrap();
      Toast.show({ type: 'success', text1: 'Status updated' });
      loadDetail();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Status failed', text2: String(err || '') });
    }
  };

  const onReassign = async () => {
    try {
      await dispatch(patchDoubtAssignment({ doubtId, assignedTeachers: selectedTeachers })).unwrap();
      setAssignModalOpen(false);
      Toast.show({ type: 'success', text1: 'Teachers reassigned' });
      loadDetail();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Assignment failed', text2: String(err || '') });
    }
  };

  const onDeleteReply = async (replyId) => {
    try {
      await deleteDoubtContentAPI(doubtId, { type: 'reply', replyId, reason: 'abuse_content' });
      Toast.show({ type: 'success', text1: 'Reply removed' });
      loadDetail();
    } catch {
      Toast.show({ type: 'error', text1: 'Delete failed' });
    }
  };

  const renderReply = ({ item }) => {
    const role = item.senderRole || item.senderId?.role || 'student';
    const roleBadge = ROLE_BADGE[role] || ROLE_BADGE.student;

    return (
      <View style={[
        styles.replyCard,
        role === 'teacher' ? styles.replyCardTeacher :
        role === 'admin' ? styles.replyCardAdmin :
        styles.replyCardStudent
      ]}>
        <View style={styles.replyHead}>
          <View style={styles.replyUserRow}>
            <Text style={styles.replyName}>{item.senderId?.displayName || item.senderId?.name || 'User'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
            </View>
          </View>
          <Text style={styles.replyTime}>{formatTime(item.createdAt)}</Text>
        </View>

        {item.message ? <Text style={styles.replyMessage}>{item.message}</Text> : null}

        {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
          <View style={styles.replyAttachWrap}>
            {item.attachments.map((att, idx) => (
              <View key={`${att.publicId || idx}-${idx}`}>
                <AttachmentChip attachment={att} onOpen={() => navigation.navigate('DocumentViewer', { url: att.url, title: att.originalFilename || att.attachmentType || 'Attachment', fileType: att.attachmentType, mimeType: att.mimeType, allowDownload: true })} />
                {att.attachmentType === 'audio' ? <AudioAttachmentPlayer attachment={att} /> : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.replyFooter}>
          <Text style={styles.readText}>Read by {Array.isArray(item.readBy) ? item.readBy.length : 0}</Text>
          {user?.role === 'admin' ? (
            <TouchableOpacity onPress={() => onDeleteReply(item._id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const filteredTeacherSuggestions = useMemo(
    () => teacherSuggestions.filter((t) => !selectedTeachers.includes(t._id)),
    [teacherSuggestions, selectedTeachers]
  );

  if (loadingDetail || !currentDoubt) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const priorityColors = {
    high: { bg: '#FEF2F2', border: '#EF4444' },
    medium: { bg: '#FFFBEB', border: '#F59E0B' },
    low: { bg: '#F0FDF4', border: '#10B981' },
  };
  const priorityColor = priorityColors[currentDoubt.priority] || priorityColors.medium;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A3C40', '#11C5C6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Doubt Thread</Text>
          <Text style={styles.subtitle}>{STATUS_LABEL[currentDoubt.status] || currentDoubt.status}</Text>
        </View>
        {canManageAssignments ? (
          <TouchableOpacity style={styles.headerAction} onPress={() => setAssignModalOpen(true)}>
            <Ionicons name="people" size={18} color={Colors.white} />
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={replies}
        keyExtractor={(item) => item._id}
        renderItem={renderReply}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 120 }}
        refreshControl={<RefreshControl refreshing={loadingDetail} onRefresh={loadDetail} colors={[Colors.primary]} />}
        ListHeaderComponent={(
          <View style={[styles.rootCard, { backgroundColor: priorityColor.bg, borderLeftColor: priorityColor.border }]}>
            <Text style={styles.rootTitle}>{currentDoubt.title}</Text>
            <Text style={styles.rootMeta}>Subject: {currentDoubt.subject} • Priority: {currentDoubt.priority.toUpperCase()}</Text>
            <Text style={styles.rootDesc}>{currentDoubt.description}</Text>
            {!!currentDoubt.attachments?.length && (
              <View style={styles.replyAttachWrap}>
                {currentDoubt.attachments.map((att, idx) => (
                  <View key={`${att.publicId || idx}-${idx}`}>
                    <AttachmentChip attachment={att} onOpen={() => navigation.navigate('DocumentViewer', { url: att.url, title: att.originalFilename || att.attachmentType || 'Attachment', fileType: att.attachmentType, mimeType: att.mimeType, allowDownload: true })} />
                    {att.attachmentType === 'audio' ? <AudioAttachmentPlayer attachment={att} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />

      <View style={styles.statusBar}>
        {canMarkResolved ? (
          <ParticleWrapper particleCount={12} size="small">
            <TouchableOpacity style={styles.statusBtn} onPress={() => onUpdateStatus('resolved')}>
              <Text style={styles.statusBtnText}>Mark Resolved</Text>
            </TouchableOpacity>
          </ParticleWrapper>
        ) : null}
        {canClose ? (
          <ParticleWrapper particleCount={12} size="small">
            <TouchableOpacity style={styles.statusBtnSecondary} onPress={() => onUpdateStatus('closed')}>
              <Text style={styles.statusBtnSecondaryText}>Close</Text>
            </TouchableOpacity>
          </ParticleWrapper>
        ) : null}
      </View>

      <View style={[styles.composer, { paddingBottom: Math.max(10, bottomPadding) }]}>
        <TextInput
          style={styles.composerInput}
          placeholder="Write reply..."
          placeholderTextColor={Colors.mediumGray}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <View style={styles.composerRow}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={onPickAttachment}>
              <Ionicons name="attach" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {!recording ? (
              <TouchableOpacity style={styles.iconBtn} onPress={startRecording}>
                <Ionicons name="mic" size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity style={styles.iconBtn} onPress={pauseOrResumeRecording}>
                  <Ionicons name={recordingPaused ? 'play' : 'pause'} size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FDE7F1' }]} onPress={stopRecording}>
                  <Ionicons name="stop" size={18} color={Colors.pink} />
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: Colors.pink, fontWeight: 'bold' }}>{recordingDurationSec}s</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={onSendReply} disabled={replying || uploading}>
            {replying || uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="send" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>
        {replyAttachments.length ? (
          <View style={styles.pendingWrap}>
            {replyAttachments.map((f, idx) => (
              <View key={`${f.name}-${idx}`} style={styles.pendingChip}>
                <Text style={styles.pendingText} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                  <Ionicons name="close" size={14} color={Colors.pink} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Modal visible={assignModalOpen} transparent animationType="slide" onRequestClose={() => setAssignModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Teachers</Text>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={16} color={Colors.mediumGray} />
              <TextInput
                style={styles.searchInput}
                value={teacherQuery}
                onChangeText={setTeacherQuery}
                placeholder="Type at least 2 letters"
                placeholderTextColor={Colors.mediumGray}
                autoCapitalize="words"
              />
              {teacherSearchLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
            </View>
            <View style={styles.selectedWrap}>
              {selectedTeachers.map((id) => {
                const teacher = (currentDoubt.assignedTeachers || []).find((t) => t._id === id)
                  || teacherSuggestions.find((t) => t._id === id);
                return (
                  <View key={id} style={styles.selectedChip}>
                    <Text style={styles.selectedText}>{teacher?.displayName || teacher?.name || 'Teacher'}</Text>
                    <TouchableOpacity onPress={() => setSelectedTeachers((prev) => prev.filter((v) => v !== id))}>
                      <Ionicons name="close" size={14} color={Colors.pink} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <View style={styles.suggestionWrap}>
              {teacherSearchLoading ? (
                <Text style={styles.searchHint}>Searching teachers...</Text>
              ) : teacherQuery.trim().length < 2 ? (
                <Text style={styles.searchHint}>Search teachers by name</Text>
              ) : null}

              {!teacherSearchLoading && teacherQuery.trim().length >= 2 && filteredTeacherSuggestions.length === 0 ? (
                <Text style={styles.searchHint}>No teacher found</Text>
              ) : null}

              <FlatList
                data={filteredTeacherSuggestions}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.teacherRow} onPress={() => setSelectedTeachers((prev) => [...prev, item._id])}>
                    <Text style={styles.teacherName}>{item.displayName || item.name}</Text>
                    <Text style={styles.teacherSub}>{(item.subjects || []).join(', ') || 'Teacher'}</Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 180 }}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAssignModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={onReassign}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.22)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 },
  headerAction: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.22)', alignItems: 'center', justifyContent: 'center' },

  rootCard: { borderRadius: 16, padding: 16, marginVertical: 12, borderLeftWidth: 5, ...Shadows.medium },
  rootTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy },
  rootMeta: { fontSize: 12, color: Colors.mediumGray, marginTop: 4 },
  rootDesc: { fontSize: 14, color: Colors.navy, marginTop: 8, lineHeight: 20 },

  replyCard: { borderRadius: 14, padding: 12, marginBottom: 10, ...Shadows.light },
  replyCardTeacher: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#E0DBFF' },
  replyCardAdmin: { backgroundColor: '#FFF5F2', borderWidth: 1, borderColor: '#FFDEC9' },
  replyCardStudent: { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#F1F5F9' },
  replyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  replyUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  replyName: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  replyTime: { fontSize: 11, color: Colors.mediumGray },
  roleBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  replyMessage: { marginTop: 8, fontSize: 14, color: Colors.navy, lineHeight: 20 },
  replyAttachWrap: { marginTop: 10, gap: 8 },
  replyFooter: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  readText: { fontSize: 11, color: Colors.mediumGray },
  deleteText: { fontSize: 11, color: Colors.pink, fontWeight: '700' },

  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '100%' },
  attachChipText: { fontSize: 12, color: Colors.navy, flex: 1 },

  audioPlayer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  audioBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  audioTime: { fontSize: 11, color: Colors.mediumGray, marginLeft: 4 },

  statusBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  statusBtn: { backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  statusBtnText: { color: Colors.white, fontWeight: '700' },
  statusBtnSecondary: { backgroundColor: Colors.navy, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  statusBtnSecondaryText: { color: Colors.white, fontWeight: '700' },

  composer: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: '#ECEDF2', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  composerInput: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, maxHeight: 100, color: Colors.navy },
  composerRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF6FF', alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  pendingWrap: { marginTop: 8, gap: 6 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pendingText: { color: Colors.navy, fontSize: 12, flex: 1, marginRight: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy, marginBottom: 10 },
  searchInputWrap: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, color: Colors.navy, fontSize: 13 },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDE7F1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  selectedText: { color: Colors.navy, fontSize: 12 },
  suggestionWrap: { borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 10, paddingHorizontal: 10, backgroundColor: '#FAFCFF' },
  searchHint: { color: '#64748B', fontSize: 12, paddingTop: 8, paddingBottom: 4 },
  teacherRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  teacherName: { color: Colors.navy, fontSize: 14, fontWeight: '700' },
  teacherSub: { color: Colors.mediumGray, fontSize: 12, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalCancel: { flex: 1, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: Colors.navy, fontWeight: '700' },
  modalSave: { flex: 1, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: 10 },
  modalSaveText: { color: Colors.white, fontWeight: '700' },
});

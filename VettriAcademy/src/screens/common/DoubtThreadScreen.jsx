import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

// ---- BRAND PALETTE: teal + pink + golden + white ----
const D = {
  pink: '#FF4F8B',
  pinkDark: '#D63D73',
  pinkLight: '#FFE3EE',
  teal: '#14C8C4',
  tealDark: '#0C8E8B',
  tealLight: '#DDFBF9',
  golden: '#FFB800',
  goldenDark: '#B87F00',
  goldenLight: '#FFF3D2',
  white: '#FFFFFF',
  ink: '#1E2A3A',
  muted: '#64748B',
  bg: '#F7F8FC',
};

const ROLE_BADGE = {
  student: { label: 'Student', color: D.tealDark, bg: D.tealLight, icon: 'school' },
  teacher: { label: 'Teacher', color: '#7C3AED', bg: '#EFEAFF', icon: 'ribbon' },
  admin: { label: 'Admin', color: D.goldenDark, bg: D.goldenLight, icon: 'shield-checkmark' },
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
  const color = isAudio ? D.pinkDark : isPdf ? D.goldenDark : D.tealDark;
  const bg = isAudio ? D.pinkLight : isPdf ? D.goldenLight : D.tealLight;
  return (
    <TouchableOpacity style={[styles.attachChip, { backgroundColor: bg }]} onPress={onOpen}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.attachChipText, { color }]} numberOfLines={1}>{attachment.originalFilename || attachment.attachmentType}</Text>
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

  const progress = playerStatus?.duration ? Math.min(1, (playerStatus.currentTime || 0) / playerStatus.duration) : 0;

  return (
    <View style={styles.audioPlayer}>
      <TouchableOpacity style={styles.audioBtn} onPress={() => seekBy(-10000)}>
        <Ionicons name="play-back" size={20} color={D.tealDark} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.audioPlayBtn} onPress={togglePlay}>
        <Ionicons name={playerStatus?.playing ? 'pause' : 'play'} size={22} color={D.white} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.audioBtn} onPress={() => seekBy(10000)}>
        <Ionicons name="play-forward" size={20} color={D.tealDark} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={styles.audioTrack}>
          <View style={[styles.audioTrackFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.audioTime}>{Math.floor(playerStatus?.currentTime || 0)}s / {Math.floor(playerStatus?.duration || 0)}s</Text>
      </View>
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
    const isMine = item.senderId?._id === user?._id;

    return (
      <View style={[styles.replyCard, isMine && styles.replyCardMine]}>
        <View style={styles.replyHead}>
          <View style={styles.replyUserRow}>
            <View style={[styles.replyAvatar, { backgroundColor: roleBadge.bg }]}>
              <Ionicons name={roleBadge.icon} size={16} color={roleBadge.color} />
            </View>
            <View>
              <Text style={styles.replyName}>{item.senderId?.displayName || item.senderId?.name || 'User'}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
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
          <View style={styles.readRow}>
            <Ionicons name="checkmark-done" size={14} color={D.muted} />
            <Text style={styles.readText}>Read by {Array.isArray(item.readBy) ? item.readBy.length : 0}</Text>
          </View>
          {user?.role === 'admin' ? (
            <TouchableOpacity onPress={() => onDeleteReply(item._id)} style={styles.deleteBtn}>
              <Ionicons name="trash" size={13} color={D.pinkDark} />
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
        <ActivityIndicator size="large" color={D.pink} />
      </View>
    );
  }



  const statusPillColors = {
    open: { bg: 'rgba(59,130,246,0.2)', text: '#DBEAFE' },
    teacher_responded: { bg: 'rgba(139,92,246,0.25)', text: '#EDE9FE' },
    waiting_for_student: { bg: 'rgba(239,68,68,0.25)', text: '#FEE2E2' },
    resolved: { bg: 'rgba(16,185,129,0.25)', text: '#D1FAE5' },
    closed: { bg: 'rgba(255,255,255,0.2)', text: '#FFFFFF' },
  };
  const statusPill = statusPillColors[currentDoubt.status] || statusPillColors.open;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[D.pink, D.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={D.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Doubt Thread</Text>
          <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
            <Text style={styles.subtitle}>{STATUS_LABEL[currentDoubt.status] || currentDoubt.status}</Text>
          </View>
        </View>
        {canManageAssignments ? (
          <TouchableOpacity style={styles.headerAction} onPress={() => setAssignModalOpen(true)}>
            <Ionicons name="people" size={20} color={D.white} />
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={replies}
        keyExtractor={(item) => item._id}
        renderItem={renderReply}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 130 }}
        refreshControl={<RefreshControl refreshing={loadingDetail} onRefresh={loadDetail} colors={[D.pink]} />}
        ListHeaderComponent={(
          <View style={[styles.rootCard, { backgroundColor: D.white, borderLeftColor: D.pink }]}>
            <Text style={styles.rootTitle}>{currentDoubt.title}</Text>
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

      {(canMarkResolved || canClose) && (
        <View style={styles.statusBar}>
          {canMarkResolved ? (
            <ParticleWrapper particleCount={12} size="small" style={{ flex: 1 }}>
              <TouchableOpacity style={styles.statusBtnWrap} onPress={() => onUpdateStatus('resolved')} activeOpacity={0.9}>
                <LinearGradient colors={[D.teal, D.tealDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statusBtn}>
                  <Ionicons name="checkmark-circle" size={18} color={D.white} />
                  <Text style={styles.statusBtnText}>Mark Resolved</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ParticleWrapper>
          ) : null}
          {canClose ? (
            <ParticleWrapper particleCount={12} size="small" style={{ flex: 1 }}>
              <TouchableOpacity style={styles.statusBtnSecondary} onPress={() => onUpdateStatus('closed')}>
                <Ionicons name="lock-closed" size={16} color={D.ink} />
                <Text style={styles.statusBtnSecondaryText}>Close</Text>
              </TouchableOpacity>
            </ParticleWrapper>
          ) : null}
        </View>
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(12, bottomPadding) }]}>
        {replyAttachments.length ? (
          <View style={styles.pendingWrap}>
            {replyAttachments.map((f, idx) => (
              <View key={`${f.name}-${idx}`} style={styles.pendingChip}>
                <Ionicons name="document-attach" size={15} color={D.muted} style={{ marginRight: 6 }} />
                <Text style={styles.pendingText} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                  <Ionicons name="close-circle" size={17} color={D.pink} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.composerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onPickAttachment}>
            <Ionicons name="attach" size={22} color={D.tealDark} />
          </TouchableOpacity>

          <TextInput
            style={styles.composerInput}
            placeholder="Write reply..."
            placeholderTextColor={D.muted}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          {!recording ? (
            <TouchableOpacity style={styles.iconBtn} onPress={startRecording}>
              <Ionicons name="mic" size={22} color={D.tealDark} />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TouchableOpacity style={styles.iconBtn} onPress={pauseOrResumeRecording}>
                <Ionicons name={recordingPaused ? 'play' : 'pause'} size={20} color={D.tealDark} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: D.pinkLight }]} onPress={stopRecording}>
                <Ionicons name="stop" size={20} color={D.pinkDark} />
              </TouchableOpacity>
              <Text style={styles.recordingTimeText}>{recordingDurationSec}s</Text>
            </View>
          )}

          <TouchableOpacity onPress={onSendReply} disabled={replying || uploading} activeOpacity={0.9}>
            <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtn}>
              {replying || uploading ? <ActivityIndicator size="small" color={D.white} /> : <Ionicons name="send" size={20} color={D.white} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={assignModalOpen} transparent animationType="slide" onRequestClose={() => setAssignModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign Teachers</Text>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={18} color={D.muted} />
              <TextInput
                style={styles.searchInput}
                value={teacherQuery}
                onChangeText={setTeacherQuery}
                placeholder="Type at least 2 letters"
                placeholderTextColor={D.muted}
                autoCapitalize="words"
              />
              {teacherSearchLoading ? <ActivityIndicator size="small" color={D.pink} /> : null}
            </View>
            {selectedTeachers.length > 0 && (
              <View style={styles.selectedWrap}>
                {selectedTeachers.map((id) => {
                  const teacher = (currentDoubt.assignedTeachers || []).find((t) => t._id === id)
                    || teacherSuggestions.find((t) => t._id === id);
                  return (
                    <View key={id} style={styles.selectedChip}>
                      <Text style={styles.selectedText}>{teacher?.displayName || teacher?.name || 'Teacher'}</Text>
                      <TouchableOpacity onPress={() => setSelectedTeachers((prev) => prev.filter((v) => v !== id))}>
                        <Ionicons name="close-circle" size={18} color={D.pinkDark} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
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
              <TouchableOpacity style={styles.modalSaveWrap} onPress={onReassign} activeOpacity={0.9}>
                <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalSave}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  title: { fontSize: 22, fontWeight: '900', color: D.white },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  subtitle: { fontSize: 12.5, color: D.white, fontWeight: '700' },
  headerAction: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },

  rootCard: { borderRadius: 20, padding: 18, marginVertical: 14, borderLeftWidth: 5, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  rootTitle: { fontSize: 19, fontWeight: '900', color: D.ink },
  rootMetaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rootMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rootMetaText: { fontSize: 12, fontWeight: '700', color: D.ink },
  rootDesc: { fontSize: 15, color: D.ink, marginTop: 12, lineHeight: 22 },

  replyCard: { borderRadius: 18, padding: 16, marginBottom: 12, backgroundColor: D.white, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  replyCardMine: { backgroundColor: D.pinkLight, borderColor: '#FFD3E4' },
  replyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  replyUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  replyAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  replyName: { fontSize: 14.5, fontWeight: '800', color: D.ink },
  replyTime: { fontSize: 11.5, color: D.muted, fontWeight: '600' },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  roleBadgeText: { fontSize: 10.5, fontWeight: '800' },
  replyMessage: { marginTop: 10, fontSize: 14.5, color: D.ink, lineHeight: 21 },
  replyAttachWrap: { marginTop: 12, gap: 10 },
  replyFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readText: { fontSize: 11.5, color: D.muted, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { fontSize: 11.5, color: D.pinkDark, fontWeight: '800' },

  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxWidth: '100%' },
  attachChipText: { fontSize: 13, fontWeight: '700', flex: 1 },

  audioPlayer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: D.tealLight, borderRadius: 14, padding: 10 },
  audioBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: D.white, alignItems: 'center', justifyContent: 'center' },
  audioPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: D.tealDark, alignItems: 'center', justifyContent: 'center' },
  audioTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(12,142,139,0.2)', overflow: 'hidden' },
  audioTrackFill: { height: '100%', backgroundColor: D.tealDark, borderRadius: 3 },
  audioTime: { fontSize: 11, color: D.tealDark, marginTop: 4, fontWeight: '700' },

  statusBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: D.white, borderTopWidth: 1, borderTopColor: '#EEF1F5' },
  statusBtnWrap: { flex: 1 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 13 },
  statusBtnText: { color: D.white, fontWeight: '800', fontSize: 14 },
  statusBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EEF1F5', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18 },
  statusBtnSecondaryText: { color: D.ink, fontWeight: '800', fontSize: 14 },

  composer: { backgroundColor: D.white, borderTopWidth: 1, borderTopColor: '#ECEDF2', paddingHorizontal: 14, paddingTop: 12 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, maxHeight: 100, color: D.ink, fontSize: 15 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: D.tealLight, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: D.pink, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  recordingTimeText: { fontSize: 13, color: D.pinkDark, fontWeight: '800' },

  pendingWrap: { marginBottom: 10, gap: 8 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F7FA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pendingText: { color: D.ink, fontSize: 13, flex: 1, marginRight: 8, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: D.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '85%' },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 21, fontWeight: '900', color: D.ink, marginBottom: 14 },
  searchInputWrap: { borderWidth: 1.5, borderColor: '#E7EAF0', borderRadius: 14, paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, backgroundColor: '#FAFBFD' },
  searchInput: { flex: 1, color: D.ink, fontSize: 14.5 },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: D.pinkLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  selectedText: { color: D.pinkDark, fontSize: 13, fontWeight: '700' },
  suggestionWrap: { borderWidth: 1.5, borderColor: '#EEF2F6', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#FAFCFF' },
  searchHint: { color: D.muted, fontSize: 13, paddingTop: 10, paddingBottom: 6 },
  teacherRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 11 },
  teacherName: { color: D.ink, fontSize: 14.5, fontWeight: '700' },
  teacherSub: { color: D.muted, fontSize: 12.5, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: { flex: 1, borderRadius: 14, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  modalCancelText: { color: D.ink, fontWeight: '800', fontSize: 15 },
  modalSaveWrap: { flex: 1 },
  modalSave: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  modalSaveText: { color: D.white, fontWeight: '800', fontSize: 15 },
});
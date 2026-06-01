import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import {
  createDoubt,
  fetchDoubtMetrics,
  fetchDoubts,
} from '../../redux/slices/doubtsSlice';
import {
  exportDoubtsAPI,
  searchDoubtTeachersAPI,
  updateDoubtRetentionAPI,
  uploadDoubtAttachmentAPI,
  getDoubtRetentionAPI,
} from '../../services/api';

const STATUS_LABEL = {
  open: 'Open',
  teacher_responded: 'Teacher Responded',
  waiting_for_student: 'Waiting For Student',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLOR = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'high_priority', label: 'High Priority' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'my_doubts', label: 'My Doubts' },
  { key: 'assigned_to_me', label: 'Assigned To Me' },
];

const toUploadFile = (asset) => ({
  uri: asset.uri,
  name: asset.fileName || asset.name || `upload-${Date.now()}`,
  type: asset.mimeType || asset.type || 'application/octet-stream',
});
const formatDateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildQueryParams = ({ filter, keyword, role }) => {
  const params = { limit: 50 };

  if (keyword.trim()) {
    params.keyword = keyword.trim();
  }

  if (filter === 'open') {
    params.status = 'open';
  } else if (filter === 'resolved') {
    params.status = 'resolved';
  } else if (filter === 'high_priority') {
    params.priority = 'high';
  } else if (filter === 'unanswered') {
    params.unanswered = true;
  } else if (filter === 'my_doubts' && role === 'student') {
    params.myDoubts = true;
  } else if (filter === 'assigned_to_me' && role === 'teacher') {
    params.assignedToMe = true;
  }

  return params;
};

function DoubtCard({ item, onPress }) {
  const priorityColor = PRIORITY_COLOR[item.priority] || Colors.primary;
  const statusColors = {
    open: '#3B82F6',
    teacher_responded: '#8B5CF6',
    waiting_for_student: '#EF4444',
    resolved: '#10B981',
    closed: '#6B7280',
  };
  const statusColor = statusColors[item.status] || '#6B7280';

  return (
    <ParticleWrapper particleCount={12} size="small">
      <TouchableOpacity 
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: priorityColor }]} 
        onPress={onPress} 
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.priorityPill, { backgroundColor: `${priorityColor}1E` }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {item.priority?.toUpperCase() || 'MEDIUM'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.subject}</Text>
          </View>
          {item.chapter ? (
            <View style={[styles.tagBadge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.tagText, { color: '#475569' }]}>{item.chapter}</Text>
            </View>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.authorRow}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>
                {(item.studentId?.displayName || item.studentId?.name || 'S')?.[0]?.toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.footerAuthorName}>
                {item.studentId?.displayName || item.studentId?.name || 'Student'}
              </Text>
              <Text style={styles.createdAtText}>
                Posted: {formatDateTime(item.createdAt || item.updatedAt || item.date)}
              </Text>
            </View>
          </View>
          <View style={styles.teachersBadge}>
            <Ionicons name="people-outline" size={12} color="#64748B" style={{ marginRight: 3 }} />
            <Text style={styles.teachersBadgeText}>
              {(item.assignedTeachers || []).length} {(item.assignedTeachers || []).length === 1 ? 'Teacher' : 'Teachers'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </ParticleWrapper>
  );
}

export default function DiscussScenarioScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list, metrics, loadingList, loadingMetrics, creating } = useSelector((s) => s.doubts);

  const role = user?.role || 'student';
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const [activeFilter, setActiveFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [retentionDays, setRetentionDays] = useState('180');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tags, setTags] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [recordingPaused, setRecordingPaused] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingDurationSec = Math.floor((recorderState?.durationMillis || 0) / 1000);
  const recording = Boolean(recorderState?.isRecording || recordingPaused);

  const queryParams = useMemo(() => buildQueryParams({ filter: activeFilter, keyword, role }), [activeFilter, keyword, role]);

  const loadList = useCallback(() => {
    dispatch(fetchDoubts(queryParams));
  }, [dispatch, queryParams]);

  const loadMetrics = useCallback(() => {
    dispatch(fetchDoubtMetrics());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadList();
      loadMetrics();
      if (role === 'admin') {
        getDoubtRetentionAPI()
          .then(({ data }) => setRetentionDays(String(data.retentionDays || 180)))
          .catch(() => {});
      }
    }, [loadList, loadMetrics, role])
  );

  useEffect(() => {
    if (!showCreateModal || !teacherQuery.trim() || teacherQuery.trim().length < 2) {
      setTeacherResults([]);
      setTeacherSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setTeacherSearchLoading(true);
        const { data } = await searchDoubtTeachersAPI(teacherQuery.trim());
        const candidates = data?.teachers || data?.results || data?.users || [];
        setTeacherResults(Array.isArray(candidates) ? candidates : []);
      } catch {
        setTeacherResults([]);
      } finally {
        setTeacherSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [teacherQuery, showCreateModal]);

  useEffect(() => {
    loadList();
  }, [activeFilter]);

  const selectedTeacherIds = useMemo(() => selectedTeachers.map((t) => t._id), [selectedTeachers]);

  const onPickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (result.canceled) return;
    const files = (result.assets || []).map((asset) => toUploadFile({ ...asset, mimeType: asset.mimeType || 'image/jpeg' }));
    setAttachments((prev) => [...prev, ...files]);
  };

  const onPickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    const files = (result.assets || []).map(toUploadFile);
    setAttachments((prev) => [...prev, ...files]);
  };

  const onPickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    const files = (result.assets || []).map(toUploadFile);
    setAttachments((prev) => [...prev, ...files]);
  };

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
        setAttachments((prev) => [
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

  const uploadAllAttachments = async () => {
    if (!attachments.length) return [];
    setUploading(true);
    const uploaded = [];
    try {
      for (const file of attachments) {
        const res = await uploadDoubtAttachmentAPI(file);
        uploaded.push(res.data.attachment);
      }
      return uploaded;
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setChapter('');
    setPriority('medium');
    setTags('');
    setTeacherQuery('');
    setTeacherResults([]);
    setSelectedTeachers([]);
    setAttachments([]);
    setRecordingPaused(false);
  };

  const onCreateDoubt = async () => {
    if (role !== 'student') return;

    if (!title.trim() || !description.trim() || !subject.trim()) {
      Toast.show({ type: 'error', text1: 'Title, description and subject are required' });
      return;
    }

    try {
      const uploadedAttachments = await uploadAllAttachments();
      await dispatch(
        createDoubt({
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          chapter: chapter.trim(),
          priority,
          tags,
          assignedTeachers: selectedTeacherIds,
          attachments: uploadedAttachments,
        })
      ).unwrap();

      Toast.show({ type: 'success', text1: 'Doubt created successfully' });
      setShowCreateModal(false);
      resetForm();
      loadList();
      loadMetrics();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to create doubt', text2: String(err || '') });
    }
  };

  const onExport = async (format) => {
    try {
      await exportDoubtsAPI({ format });
      Toast.show({ type: 'success', text1: `${format.toUpperCase()} export generated` });
    } catch {
      Toast.show({ type: 'error', text1: 'Export failed' });
    }
  };

  const onUpdateRetention = async () => {
    const days = parseInt(retentionDays, 10);
    if (!Number.isFinite(days) || days < 30 || days > 3650) {
      Toast.show({ type: 'error', text1: 'Retention must be between 30 and 3650 days' });
      return;
    }

    try {
      await updateDoubtRetentionAPI(days);
      Toast.show({ type: 'success', text1: 'Retention updated' });
    } catch {
      Toast.show({ type: 'error', text1: 'Retention update failed' });
    }
  };

  const renderMetricCards = () => {
    if (!metrics) return null;

    const rows = role === 'student'
      ? [
          { label: 'Total', value: metrics.totalDoubts || 0, color: '#6C5CE7' },
          { label: 'Resolved', value: metrics.resolvedDoubts || 0, color: '#00B894' },
          { label: 'Pending', value: metrics.pendingDoubts || 0, color: '#E17055' },
        ]
      : role === 'teacher'
        ? [
            { label: 'Assigned', value: metrics.assignedDoubts || 0, color: '#6C5CE7' },
            { label: 'Pending', value: metrics.pendingDoubts || 0, color: '#E17055' },
            { label: 'Response %', value: `${metrics.responseRate || 0}%`, color: '#00B894' },
          ]
        : [
            { label: 'Total', value: metrics.totalDoubts || 0, color: '#6C5CE7' },
            { label: 'Open', value: metrics.openDoubts || 0, color: '#E17055' },
            { label: 'Resolved', value: metrics.resolvedDoubts || 0, color: '#00B894' },
          ];

    return (
      <View style={styles.metricRow}>
        {rows.map((m) => (
          <LinearGradient
            key={m.label}
            colors={[`${m.color}15`, '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.metricCard, { borderLeftWidth: 4, borderLeftColor: m.color }]}
          >
            <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </LinearGradient>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <LinearGradient
          colors={['#1A3C40', '#11C5C6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Doubt Resolution</Text>
          <Text style={styles.headerSub}>Create, track, and resolve academic doubts in one thread</Text>
        </LinearGradient>
      </View>

      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={list}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DoubtCard
            item={item}
            onPress={() => navigation.navigate('DoubtDetail', { doubtId: item._id })}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 40 }}
        refreshControl={<RefreshControl refreshing={loadingList || loadingMetrics} onRefresh={() => { loadList(); loadMetrics(); }} colors={[Colors.primary]} />}
        ListHeaderComponent={(
          <View>
            {renderMetricCards()}

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.mediumGray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by subject, keyword, chapter"
                placeholderTextColor={Colors.mediumGray}
                value={keyword}
                onChangeText={setKeyword}
                onSubmitEditing={loadList}
              />
              <TouchableOpacity onPress={loadList}>
                <Ionicons name="arrow-forward-circle" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterWrap}>
              {FILTERS
                .filter((f) => {
                  if (f.key === 'my_doubts') return role === 'student';
                  if (f.key === 'assigned_to_me') return role === 'teacher';
                  return true;
                })
                .map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                    onPress={() => {
                      setActiveFilter(f.key);
                    }}
                  >
                    <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <View style={styles.actionRow}>
              {role === 'student' ? (
                <ParticleWrapper particleCount={18} size="small">
                  <TouchableOpacity style={styles.primaryAction} onPress={() => setShowCreateModal(true)}>
                    <Ionicons name="add-circle" size={18} color={Colors.white} />
                    <Text style={styles.primaryActionText}>Create Doubt</Text>
                  </TouchableOpacity>
                </ParticleWrapper>
              ) : null}

              {role === 'admin' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.secondaryAction} onPress={() => onExport('json')}>
                    <Text style={styles.secondaryActionText}>Export JSON</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryAction} onPress={() => onExport('csv')}>
                    <Text style={styles.secondaryActionText}>Export CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryAction} onPress={() => setShowAdminPanel(true)}>
                    <Text style={styles.secondaryActionText}>Retention</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {!loadingList && list.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="help-circle-outline" size={48} color={Colors.mediumGray} />
                <Text style={styles.emptyTitle}>No doubts found</Text>
                <Text style={styles.emptySub}>Try changing filters or create a new doubt.</Text>
              </View>
            ) : null}
          </View>
        )}
        ListFooterComponent={loadingList ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 12 }} /> : <View style={{ height: 8 }} />}
      />

      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Create Doubt</Text>

            <TextInput style={styles.input} placeholder="Title" placeholderTextColor={Colors.mediumGray} value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Subject" placeholderTextColor={Colors.mediumGray} value={subject} onChangeText={setSubject} />
            <TextInput style={styles.input} placeholder="Chapter" placeholderTextColor={Colors.mediumGray} value={chapter} onChangeText={setChapter} />
            <TextInput style={styles.input} placeholder="Tags (comma separated)" placeholderTextColor={Colors.mediumGray} value={tags} onChangeText={setTags} />
            <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={4} placeholder="Describe your doubt" placeholderTextColor={Colors.mediumGray} value={description} onChangeText={setDescription} />

            <View style={styles.priorityRow}>
              {['low', 'medium', 'high'].map((p) => (
                <TouchableOpacity key={p} style={[styles.priorityChip, priority === p && { backgroundColor: `${PRIORITY_COLOR[p]}22` }]} onPress={() => setPriority(p)}>
                  <Text style={[styles.priorityChipText, { color: PRIORITY_COLOR[p] }]}>{p.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.teacherSearchWrap}>
              <Ionicons name="search" size={16} color={Colors.mediumGray} />
              <TextInput
                style={styles.teacherSearchField}
                placeholder="Type at least 2 letters"
                placeholderTextColor={Colors.mediumGray}
                value={teacherQuery}
                onChangeText={setTeacherQuery}
                autoCapitalize="words"
              />
              {teacherSearchLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
            </View>
            <View style={styles.teacherResultWrap}>
              {teacherSearchLoading ? (
                <Text style={styles.teacherHint}>Searching teachers...</Text>
              ) : teacherQuery.trim().length >= 2 ? (
                teacherResults
                  .filter((t) => !selectedTeacherIds.includes(t._id))
                  .slice(0, 6)
                  .map((teacher) => (
                    <TouchableOpacity key={teacher._id} style={styles.teacherRow} onPress={() => setSelectedTeachers((prev) => [...prev, teacher])}>
                      <Text style={styles.teacherName}>{teacher.displayName || teacher.name}</Text>
                      <Text style={styles.teacherSub}>{(teacher.subjects || []).join(', ') || 'Teacher'}</Text>
                    </TouchableOpacity>
                  ))
              ) : (
                <Text style={styles.teacherHint}>Search teachers by name</Text>
              )}

              {!teacherSearchLoading && teacherQuery.trim().length >= 2 && teacherResults.filter((t) => !selectedTeacherIds.includes(t._id)).length === 0 ? (
                <Text style={styles.teacherHint}>No teachers found for this search</Text>
              ) : null}
            </View>

            <View style={styles.selectedWrap}>
              {selectedTeachers.map((teacher) => (
                <View key={teacher._id} style={styles.selectedChip}>
                  <Text style={styles.selectedText}>{teacher.displayName || teacher.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedTeachers((prev) => prev.filter((t) => t._id !== teacher._id))}>
                    <Ionicons name="close" size={14} color={Colors.pink} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.attachRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={onPickImage}>
                <Ionicons name="image" size={16} color={Colors.primary} />
                <Text style={styles.attachText}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachBtn} onPress={onPickPdf}>
                <Ionicons name="document" size={16} color={Colors.primary} />
                <Text style={styles.attachText}>PDF</Text>
              </TouchableOpacity>
              {!recording ? (
                <>
                  <TouchableOpacity style={styles.attachBtn} onPress={onPickAudio}>
                    <Ionicons name="musical-notes" size={16} color={Colors.primary} />
                    <Text style={styles.attachText}>Audio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={startRecording}>
                    <Ionicons name="mic" size={16} color={Colors.primary} />
                    <Text style={styles.attachText}>Record</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.recordingWrap}>
                  <TouchableOpacity style={styles.attachBtn} onPress={pauseOrResumeRecording}>
                    <Ionicons name={recordingPaused ? 'play' : 'pause'} size={16} color={Colors.primary} />
                    <Text style={styles.attachText}>{recordingPaused ? 'Resume' : 'Pause'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FDE7F1' }]} onPress={stopRecording}>
                    <Ionicons name="stop" size={16} color={Colors.pink} />
                    <Text style={[styles.attachText, { color: Colors.pink }]}>Send {recordingDurationSec}s</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.pendingWrap}>
              {attachments.map((file, idx) => (
                <View key={`${file.name}-${idx}`} style={styles.pendingChip}>
                  <Text style={styles.pendingText} numberOfLines={1}>{file.name}</Text>
                  <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="close" size={14} color={Colors.pink} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={onCreateDoubt} disabled={creating || uploading}>
                {creating || uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.submitText}>Post Doubt</Text>}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdminPanel} transparent animationType="fade" onRequestClose={() => setShowAdminPanel(false)}>
        <View style={styles.adminBackdrop}>
          <View style={styles.adminCard}>
            <Text style={styles.modalTitle}>Retention Policy</Text>
            <Text style={styles.adminInfo}>Set retention days for doubt attachments and thread content.</Text>
            <TextInput
              style={styles.input}
              value={retentionDays}
              onChangeText={setRetentionDays}
              keyboardType="number-pad"
              placeholder="Retention days"
              placeholderTextColor={Colors.mediumGray}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdminPanel(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={onUpdateRetention}>
                <Text style={styles.submitText}>Save</Text>
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
  headerBg: { backgroundColor: Colors.white },
  headerGradient: { paddingTop: 54, paddingBottom: 18, paddingHorizontal: 18 },
  headerTitle: { fontSize: 25, fontWeight: '900', color: Colors.white, letterSpacing: 0.2 },
  headerSub: { marginTop: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.75)', fontWeight: '500' },

  metricRow: { marginTop: 14, marginBottom: 10, flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: Colors.white, ...Shadows.light },
  metricValue: { fontSize: 24, fontWeight: '900' },
  metricLabel: { marginTop: 4, fontSize: 12, color: Colors.navy, fontWeight: '700' },

  searchBox: { marginTop: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, backgroundColor: Colors.white, ...Shadows.light },
  searchInput: { flex: 1, fontSize: 14, color: Colors.navy, paddingVertical: 11 },

  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: { backgroundColor: '#E8EEF5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: '#4B5563', fontWeight: '700' },
  filterTextActive: { color: Colors.white },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  primaryActionText: { color: Colors.white, fontWeight: '800' },
  secondaryAction: { backgroundColor: '#EEF2F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  secondaryActionText: { color: Colors.navy, fontWeight: '700', fontSize: 12 },

  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.medium },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.navy },
  cardDesc: { marginTop: 8, fontSize: 13, color: '#334155', lineHeight: 18, fontWeight: '500' },
  priorityPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 10, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  tagBadge: { backgroundColor: '#FF4F8B1A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF4F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FF4FA330' },
  avatarMiniText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  footerAuthorName: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  createdAtText: { fontSize: 10, color: '#64748B', fontWeight: '500', marginTop: 1 },
  teachersBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  teachersBadgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { marginTop: 12, fontSize: 16, color: Colors.navy, fontWeight: '800' },
  emptySub: { marginTop: 4, fontSize: 13, color: Colors.mediumGray },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  adminBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14, maxHeight: '96%', minHeight: '92%' },
  adminCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.navy, marginBottom: 10 },
  adminInfo: { color: Colors.gray, fontSize: 13, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: Colors.navy, marginBottom: 8 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },

  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  priorityChip: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F1F5F9' },
  priorityChipText: { fontSize: 11, fontWeight: '800' },

  teacherSearchWrap: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, height: 42, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  teacherSearchField: { flex: 1, color: Colors.navy, fontSize: 13 },
  teacherResultWrap: { maxHeight: 160, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEF2F6', paddingHorizontal: 10, backgroundColor: '#FAFCFF' },
  teacherRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8 },
  teacherName: { color: Colors.navy, fontWeight: '700', fontSize: 13 },
  teacherSub: { color: Colors.mediumGray, fontSize: 11, marginTop: 2 },
  teacherHint: { color: '#64748B', fontSize: 12, paddingVertical: 10 },

  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FDE7F1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  selectedText: { color: Colors.navy, fontSize: 12 },

  attachRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  attachText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  recordingWrap: { flexDirection: 'row', gap: 8 },

  pendingWrap: { gap: 6, marginBottom: 8 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pendingText: { color: Colors.navy, fontSize: 12, flex: 1, marginRight: 8 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: Colors.navy, fontWeight: '700' },
  submitBtn: { flex: 1.3, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', paddingVertical: 10 },
  submitText: { color: Colors.white, fontWeight: '800' },
});
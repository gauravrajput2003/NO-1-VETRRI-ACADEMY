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
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { containsContactInfo, contactInfoErrorMessage } from '../../utils/contactInfoFilter';
import {
  createDoubt,
  fetchDoubtMetrics,
  fetchDoubts,
  selectTotalUnreadDoubtReplies,
} from '../../redux/slices/doubtsSlice';
import {
  exportDoubtsAPI,
  updateDoubtRetentionAPI,
  uploadDoubtAttachmentAPI,
  getDoubtRetentionAPI,
  getTeacherStudentsAPI,
  getMyTeachersAPI,
} from '../../services/api';

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
  violet: '#7C3AED',
  violetDark: '#5B21B6',
};
const showContactInfoBlockedToast = (reason) => {
  Toast.show({
    type: 'error',
    position: 'top',
    text1: '🚫 Not Allowed',
    text2: contactInfoErrorMessage(reason),
    visibilityTime: 3000,
  });
};
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
  { key: 'all', label: 'All', tint: D.pink },
  { key: 'open', label: 'Open', tint: '#3B82F6' },
  { key: 'resolved', label: 'Resolved', tint: D.teal },
  { key: 'high_priority', label: 'High Priority', tint: '#EF4444' },
  { key: 'unanswered', label: 'Unanswered', tint: D.golden },
  { key: 'my_doubts', label: 'My Doubts', tint: '#8B5CF6' },
  { key: 'assigned_to_me', label: 'Assigned To Me', tint: '#8B5CF6' },
];

const toUploadFile = (asset) => ({
  uri: asset.uri,
  name: asset.fileName || asset.name || `upload-${Date.now()}`,
  type: asset.mimeType || asset.type || 'application/octet-stream',
  file: asset.file,  // preserve File object on web (expo-image-picker returns it)
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
  const priorityColor = PRIORITY_COLOR[item.priority] || D.pink;
  const statusColors = {
    open: '#F59E0B',
    teacher_responded: '#3B82F6',
    waiting_for_student: '#EF4444',
    resolved: '#10B981',
    closed: '#10B981',
  };
  const statusColor = statusColors[item.status] || '#6B7280';
  const unread = item.unreadRepliesCount || 0;
  const hasUnread = unread > 0;

  const teachersCount = (item.assignedTeachers || []).length;
  const teacherText = teachersCount === 1 ? '1 Teacher' : `${teachersCount} Teachers`;

  return (
    <ParticleWrapper particleCount={12} size="small">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={hasUnread ? [D.violetDark, D.violet] : [D.tealDark, '#09706D']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.card, hasUnread && styles.cardUnread]}
        >
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: D.white, flex: 1, paddingRight: 8 }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.messageIconWrap}>
            <Ionicons name={hasUnread ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={D.white} />
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>

        {hasUnread && (
          <View style={styles.newMessagesPill}>
            <Ionicons name="mail-unread" size={13} color={D.white} />
            <Text style={styles.newMessagesPillText}>
              {unread} new message{unread === 1 ? '' : 's'}
            </Text>
          </View>
        )}

        <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={2}>{item.description}</Text>

        <View style={[styles.metaRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.95)', height: 30, borderRadius: 999, paddingVertical: 0 }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[item.status] || item.status}
            </Text>
          </View>
          
          <View style={{ backgroundColor: '#E8F4FD', height: 30, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="person" size={13} color="#0284C7" style={{ marginRight: 6 }} />
            <Text style={{ color: '#0284C7', fontWeight: '600', fontSize: 13 }} numberOfLines={1} ellipsizeMode="tail">
              {teacherText}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />

        <View style={styles.cardFooter}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
            📅 Posted: {formatDateTime(item.createdAt || item.updatedAt || item.date)}
          </Text>
        </View>
        </LinearGradient>
      </TouchableOpacity>
    </ParticleWrapper>
  );
}

export default function DiscussScenarioScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list, metrics, loadingList, loadingMetrics, creating } = useSelector((s) => s.doubts);
  const totalUnread = useSelector(selectTotalUnreadDoubtReplies);

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
  const [teacherQuery, setTeacherQuery] = useState('');
const [myTeachers, setMyTeachers] = useState([]);
const [myTeachersLoading, setMyTeachersLoading] = useState(false);
const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Teacher-initiated conversation state
  const [showMessageStudentModal, setShowMessageStudentModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [creatingTeacherDoubt, setCreatingTeacherDoubt] = useState(false);

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
  if (role !== 'student') return;
  setMyTeachersLoading(true);
  getMyTeachersAPI()
    .then(({ data }) => setMyTeachers(data.teachers || []))
    .catch(() => setMyTeachers([]))
    .finally(() => setMyTeachersLoading(false));
}, [role]);

const teacherResults = useMemo(() => {
  const q = teacherQuery.trim().toLowerCase();
  if (!q) return myTeachers;
  return myTeachers.filter((t) =>
    (t.name || '').toLowerCase().includes(q) ||
    (t.displayName || '').toLowerCase().includes(q) ||
    (t.subjects || []).some((s) => (s || '').toLowerCase().includes(q))
  );
  }, [teacherQuery, myTeachers]);

  // Student search effect for teacher-initiated conversations
  useEffect(() => {
    if (!showMessageStudentModal || !studentQuery.trim() || studentQuery.trim().length < 2) {
      setStudentResults([]);
      setStudentSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setStudentSearchLoading(true);
        const { data } = await getTeacherStudentsAPI();
        const candidates = data?.students || data?.results || data?.users || [];
        const filtered = Array.isArray(candidates) 
          ? candidates.filter((s) => 
              (s.name && s.name.toLowerCase().includes(studentQuery.toLowerCase())) ||
              (s.displayName && s.displayName.toLowerCase().includes(studentQuery.toLowerCase())) ||
              (s.email && s.email.toLowerCase().includes(studentQuery.toLowerCase()))
            )
          : [];
        setStudentResults(filtered);
      } catch {
        setStudentResults([]);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentQuery, showMessageStudentModal]);

  const selectedTeacherIds = useMemo(() => selectedTeachers.map((t) => t._id), [selectedTeachers]);

  // ---- Attachments ----
  const onTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Camera permission required' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const file = toUploadFile({ ...asset, mimeType: asset.mimeType || 'image/jpeg' });
      setAttachments((prev) => [...prev, file]);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to open camera' });
    }
  };

  const onPickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({ type: 'error', text1: 'Photo library permission required' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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

  const onPickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: ['video/mp4', 'video/quicktime', 'video/webm'],
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
    setTeacherQuery('');
    setTeacherResults([]);
    setSelectedTeachers([]);
    setAttachments([]);
    setRecordingPaused(false);
  };

  
const onCreateDoubt = async () => {
  if (role !== 'student') return;

  if (!title.trim() || !description.trim()) {
    Toast.show({ type: 'error', text1: 'Title and description are required' });
    return;
  }

  const titleCheck = containsContactInfo(title);
  const descCheck = containsContactInfo(description);
  if (titleCheck.blocked || descCheck.blocked) {
    showContactInfoBlockedToast((titleCheck.blocked ? titleCheck : descCheck).reason);
    return;
  }

  try {
    const uploadedAttachments = await uploadAllAttachments();
    await dispatch(
      createDoubt({
        title: title.trim(),
        description: description.trim(),
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
    // Backend rejects too (defense in depth) — surface that specific error nicely
    const backendPayload = err?.response?.data || err;
    if (backendPayload?.code === 'CONTACT_INFO_BLOCKED') {
      showContactInfoBlockedToast();
    } else {
      Toast.show({ type: 'error', text1: 'Failed to create doubt', text2: String(err || '') });
    }
  }
};


const onCreateTeacherDoubt = async () => {
  if (role !== 'teacher') return;

  if (!selectedStudent) {
    Toast.show({ type: 'error', text1: 'Please select a student first' });
    return;
  }

  if (!title.trim() || !description.trim()) {
    Toast.show({ type: 'error', text1: 'Title and description are required' });
    return;
  }

  const titleCheck = containsContactInfo(title);
  const descCheck = containsContactInfo(description);
  if (titleCheck.blocked || descCheck.blocked) {
    showContactInfoBlockedToast((titleCheck.blocked ? titleCheck : descCheck).reason);
    return;
  }

  try {
    setCreatingTeacherDoubt(true);
    const uploadedAttachments = await uploadAllAttachments();
    await dispatch(
      createDoubt({
        title: title.trim(),
        description: description.trim(),
        targetStudentId: selectedStudent._id,
        attachments: uploadedAttachments,
      })
    ).unwrap();

    Toast.show({ type: 'success', text1: 'Conversation started successfully' });
    setShowMessageStudentModal(false);
    resetForm();
    
    loadList();
    loadMetrics();
  } catch (err) {
    const backendPayload = err?.response?.data || err;
    if (backendPayload?.code === 'CONTACT_INFO_BLOCKED') {
      showContactInfoBlockedToast();
    } else {
      Toast.show({ type: 'error', text1: 'Failed to start conversation', text2: String(err || '') });
    }
  } finally {
    setCreatingTeacherDoubt(false);
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
          { label: 'Total', value: metrics.totalDoubts || 0, colors: [D.pink, D.pinkDark], icon: 'albums' },
          { label: 'Resolved', value: metrics.resolvedDoubts || 0, colors: [D.teal, D.tealDark], icon: 'checkmark-circle' },
          { label: 'Pending', value: metrics.pendingDoubts || 0, colors: [D.golden, D.goldenDark], icon: 'time' },
        ]
      : role === 'teacher'
        ? [
            { label: 'Assigned', value: metrics.assignedDoubts || 0, colors: [D.pink, D.pinkDark], icon: 'albums' },
            { label: 'Pending', value: metrics.pendingDoubts || 0, colors: [D.golden, D.goldenDark], icon: 'time' },
            { label: 'Response %', value: `${metrics.responseRate || 0}%`, colors: [D.teal, D.tealDark], icon: 'trending-up' },
          ]
        : [
            { label: 'Total', value: metrics.totalDoubts || 0, colors: [D.pink, D.pinkDark], icon: 'albums' },
            { label: 'Open', value: metrics.openDoubts || 0, colors: [D.golden, D.goldenDark], icon: 'time' },
            { label: 'Resolved', value: metrics.resolvedDoubts || 0, colors: [D.teal, D.tealDark], icon: 'checkmark-circle' },
          ];

    return (
      <View style={styles.metricRow}>
        {rows.map((m) => (
          <LinearGradient key={m.label} colors={m.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.metricCard, { shadowColor: m.colors[1] }]}>
            <View style={styles.metricTop}>
              <View style={styles.metricIconWrap}>
                <Ionicons name={m.icon} size={14} color={D.white} />
              </View>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </LinearGradient>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[D.bg, '#FFF6FA', D.tealLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.headerBg}>
        <LinearGradient
          colors={[D.pink, D.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Doubt Resolution</Text>
              <Text style={styles.headerSub}>Create, track, and resolve academic doubts</Text>
            </View>
            <View style={styles.headerMsgIcon}>
              <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
              {totalUnread > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
                </View>
              )}
            </View>
          </View>
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
        refreshControl={<RefreshControl refreshing={loadingList || loadingMetrics} onRefresh={() => { loadList(); loadMetrics(); }} colors={[D.pink]} />}
        ListHeaderComponent={(
          <View>
            {totalUnread > 0 && (
              <View style={styles.unreadBanner}>
                <View style={styles.unreadBannerIcon}>
                  <Ionicons name="mail-unread" size={18} color={D.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unreadBannerTitle}>
                    {totalUnread} new message{totalUnread === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.unreadBannerSub}>
                    Open a doubt below to read teacher replies
                  </Text>
                </View>
              </View>
            )}
            {renderMetricCards()}

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={D.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by subject, keyword, chapter"
                placeholderTextColor={D.muted}
                value={keyword}
                onChangeText={setKeyword}
                onSubmitEditing={loadList}
              />
              <TouchableOpacity onPress={loadList} style={styles.searchGoBtn}>
                <Ionicons name="arrow-forward" size={18} color={D.white} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={styles.filterWrap}>
              {FILTERS
                .filter((f) => {
                  if (f.key === 'my_doubts') return role === 'student';
                  if (f.key === 'assigned_to_me') return role === 'teacher';
                  return true;
                })
                .map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      { backgroundColor: `${f.tint}1C`, borderColor: `${f.tint}40` },
                      activeFilter === f.key && { backgroundColor: f.tint, borderColor: f.tint },
                    ]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Text style={[styles.filterText, { color: f.tint }, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.actionRow}>
              {role === 'student' ? (
                <ParticleWrapper particleCount={18} size="small">
                  <TouchableOpacity style={styles.primaryActionWrap} onPress={() => setShowCreateModal(true)} activeOpacity={0.9}>
                    <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryAction}>
                      <Ionicons name="add-circle" size={22} color={D.white} />
                      <Text style={styles.primaryActionText}>Create Doubt</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ParticleWrapper>
              ) : null}

              {role === 'teacher' ? (
                <ParticleWrapper particleCount={18} size="small">
                  <TouchableOpacity style={styles.primaryActionWrap} onPress={() => setShowMessageStudentModal(true)} activeOpacity={0.9}>
                    <LinearGradient colors={[D.teal, D.tealDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryAction}>
                      <Ionicons name="chatbubbles" size={22} color={D.white} />
                      <Text style={styles.primaryActionText}>Message a Student</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ParticleWrapper>
              ) : null}

              {role === 'admin' ? (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="help-circle" size={44} color={D.pink} />
                </View>
                <Text style={styles.emptyTitle}>No doubts found</Text>
                <Text style={styles.emptySub}>Try changing filters or create a new doubt.</Text>
              </View>
            ) : null}
          </View>
        )}
        ListFooterComponent={loadingList ? <ActivityIndicator size="small" color={D.pink} style={{ marginTop: 12 }} /> : <View style={{ height: 8 }} />}
      />

      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={[D.tealLight, D.pinkLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Create Doubt</Text>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Confused about photosynthesis" placeholderTextColor={D.muted} value={title} onChangeText={setTitle} />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={4} placeholder="Describe your doubt in detail" placeholderTextColor={D.muted} value={description} onChangeText={setDescription} />

           

// AFTER
<Text style={styles.fieldLabel}>Assign teacher(s) (optional)</Text>
<View style={styles.teacherSearchWrap}>
  <Ionicons name="search" size={18} color={D.muted} />
  <TextInput
    style={styles.teacherSearchField}
    placeholder="Search your teachers"
    placeholderTextColor={D.muted}
    value={teacherQuery}
    onChangeText={setTeacherQuery}
    autoCapitalize="words"
  />
  {myTeachersLoading ? <ActivityIndicator size="small" color={D.pink} /> : null}
</View>
<View style={styles.teacherResultWrap}>
  {myTeachersLoading ? (
    <Text style={styles.teacherHint}>Loading your teachers...</Text>
  ) : myTeachers.length === 0 ? (
    <Text style={styles.teacherHint}>No teachers assigned to you yet. Contact admin.</Text>
  ) : teacherResults.filter((t) => !selectedTeacherIds.includes(t._id)).length > 0 ? (
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
    <Text style={styles.teacherHint}>No matching teacher found</Text>
  )}
</View>

              {selectedTeachers.length > 0 && (
                <View style={styles.selectedWrap}>
                  {selectedTeachers.map((teacher) => (
                    <View key={teacher._id} style={styles.selectedChip}>
                      <Text style={styles.selectedText}>{teacher.displayName || teacher.name}</Text>
                      <TouchableOpacity onPress={() => setSelectedTeachers((prev) => prev.filter((t) => t._id !== teacher._id))}>
                        <Ionicons name="close-circle" size={18} color={D.pink} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Attach</Text>
              <View style={styles.attachRow}>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FFE4E6', borderColor: '#FECDD3', borderWidth: 1 }]} onPress={onTakePhoto}>
                  <Ionicons name="camera" size={24} color={D.pinkDark} />
                  <Text style={styles.attachText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4', borderWidth: 1 }]} onPress={onPickImage}>
                  <Ionicons name="images" size={24} color={D.tealDark} />
                  <Text style={styles.attachText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]} onPress={onPickPdf}>
                  <Ionicons name="document-text" size={24} color={D.goldenDark} />
                  <Text style={styles.attachText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE', borderWidth: 1 }]} onPress={onPickVideo}>
                  <Ionicons name="videocam" size={24} color={'#A855F7'} />
                  <Text style={styles.attachText}>Video</Text>
                </TouchableOpacity>
                {!recording ? (
                  <>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE', borderWidth: 1 }]} onPress={onPickAudio}>
                      <Ionicons name="musical-notes" size={24} color={'#4F46E5'} />
                      <Text style={styles.attachText}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FCE7F3', borderColor: '#FBCFE8', borderWidth: 1 }]} onPress={startRecording}>
                      <Ionicons name="mic" size={24} color={'#DB2777'} />
                      <Text style={styles.attachText}>Record</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.recordingWrap}>
                    <TouchableOpacity style={styles.attachBtn} onPress={pauseOrResumeRecording}>
                      <Ionicons name={recordingPaused ? 'play' : 'pause'} size={22} color={D.pinkDark} />
                      <Text style={styles.attachText}>{recordingPaused ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: D.pinkLight }]} onPress={stopRecording}>
                      <Ionicons name="stop-circle" size={22} color={D.pinkDark} />
                      <Text style={[styles.attachText, { color: D.pinkDark }]}>Send {recordingDurationSec}s</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {attachments.length > 0 && (
                <View style={styles.pendingWrap}>
                  {attachments.map((file, idx) => (
                    <View key={`${file.name}-${idx}`} style={styles.pendingChip}>
                      <Ionicons name="document-attach" size={16} color={D.muted} style={{ marginRight: 6 }} />
                      <Text style={styles.pendingText} numberOfLines={1}>{file.name}</Text>
                      <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                        <Ionicons name="close-circle" size={18} color={D.pink} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateModal(false); resetForm(); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtnWrap} onPress={onCreateDoubt} disabled={creating || uploading} activeOpacity={0.9}>
                  <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                    {creating || uploading ? <ActivityIndicator size="small" color={D.white} /> : <Text style={styles.submitText}>Post Doubt</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      {/* Teacher-initiated: Message a Student Modal */}
      <Modal visible={showMessageStudentModal} transparent animationType="slide" onRequestClose={() => { setShowMessageStudentModal(false); resetForm(); }}>
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={[D.tealLight, D.pinkLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Message a Student</Text>

              <Text style={styles.fieldLabel}>Select Student</Text>
              <View style={styles.teacherSearchWrap}>
                <Ionicons name="search" size={18} color={D.muted} />
                <TextInput
                  style={styles.teacherSearchField}
                  placeholder="Type at least 2 letters to search students"
                  placeholderTextColor={D.muted}
                  value={studentQuery}
                  onChangeText={setStudentQuery}
                  autoCapitalize="words"
                />
                {studentSearchLoading ? <ActivityIndicator size="small" color={D.pink} /> : null}
              </View>
              <View style={styles.teacherResultWrap}>
                {studentSearchLoading ? (
                  <Text style={styles.teacherHint}>Searching students...</Text>
                ) : studentQuery.trim().length >= 2 ? (
                  studentResults.length > 0 ? (
                    studentResults.map((student) => (
                      <TouchableOpacity key={student._id} style={styles.teacherRow} onPress={() => setSelectedStudent(student)}>
                        <Text style={styles.teacherName}>{student.displayName || student.name}</Text>
                        <Text style={styles.teacherSub}>{student.email || 'Student'} • {student.course?.title || student.grade || 'N/A'}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.teacherHint}>No students found for this search</Text>
                  )
                ) : (
                  <Text style={styles.teacherHint}>Search for a student by name or email</Text>
                )}
              </View>

              {selectedStudent && (
                <View style={styles.selectedWrap}>
                  <View style={styles.selectedChip}>
                    <Text style={styles.selectedText}>{selectedStudent.displayName || selectedStudent.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                      <Ionicons name="close-circle" size={18} color={D.pink} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Follow up on homework" placeholderTextColor={D.muted} value={title} onChangeText={setTitle} />

              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput style={[styles.input, styles.textarea]} multiline numberOfLines={4} placeholder="Type your message..." placeholderTextColor={D.muted} value={description} onChangeText={setDescription} />

              <Text style={styles.fieldLabel}>Attach</Text>
              <View style={styles.attachRow}>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FFE4E6', borderColor: '#FECDD3', borderWidth: 1 }]} onPress={onTakePhoto}>
                  <Ionicons name="camera" size={24} color={D.pinkDark} />
                  <Text style={styles.attachText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4', borderWidth: 1 }]} onPress={onPickImage}>
                  <Ionicons name="images" size={24} color={D.tealDark} />
                  <Text style={styles.attachText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]} onPress={onPickPdf}>
                  <Ionicons name="document-text" size={24} color={D.goldenDark} />
                  <Text style={styles.attachText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE', borderWidth: 1 }]} onPress={onPickVideo}>
                  <Ionicons name="videocam" size={24} color={'#A855F7'} />
                  <Text style={styles.attachText}>Video</Text>
                </TouchableOpacity>
                {!recording ? (
                  <>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE', borderWidth: 1 }]} onPress={onPickAudio}>
                      <Ionicons name="musical-notes" size={24} color={'#4F46E5'} />
                      <Text style={styles.attachText}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: '#FCE7F3', borderColor: '#FBCFE8', borderWidth: 1 }]} onPress={startRecording}>
                      <Ionicons name="mic" size={24} color={'#DB2777'} />
                      <Text style={styles.attachText}>Record</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.recordingWrap}>
                    <TouchableOpacity style={styles.attachBtn} onPress={pauseOrResumeRecording}>
                      <Ionicons name={recordingPaused ? 'play' : 'pause'} size={22} color={D.pinkDark} />
                      <Text style={styles.attachText}>{recordingPaused ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.attachBtn, { backgroundColor: D.pinkLight }]} onPress={stopRecording}>
                      <Ionicons name="stop-circle" size={22} color={D.pinkDark} />
                      <Text style={[styles.attachText, { color: D.pinkDark }]}>Send {recordingDurationSec}s</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {attachments.length > 0 && (
                <View style={styles.pendingWrap}>
                  {attachments.map((file, idx) => (
                    <View key={`${file.name}-${idx}`} style={styles.pendingChip}>
                      <Ionicons name="document-attach" size={16} color={D.muted} style={{ marginRight: 6 }} />
                      <Text style={styles.pendingText} numberOfLines={1}>{file.name}</Text>
                      <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                        <Ionicons name="close-circle" size={18} color={D.pink} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowMessageStudentModal(false); resetForm(); }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtnWrap} onPress={onCreateTeacherDoubt} disabled={creatingTeacherDoubt || uploading} activeOpacity={0.9}>
                  <LinearGradient colors={[D.teal, D.tealDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                    {creatingTeacherDoubt || uploading ? <ActivityIndicator size="small" color={D.white} /> : <Text style={styles.submitText}>Start Conversation</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
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
              placeholderTextColor={D.muted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdminPanel(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtnWrap} onPress={onUpdateRetention} activeOpacity={0.9}>
                <LinearGradient colors={[D.pink, D.pinkDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                  <Text style={styles.submitText}>Save</Text>
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
  headerBg: { backgroundColor: D.white },
  headerGradient: { paddingTop: 54, paddingBottom: 22, paddingHorizontal: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: D.white, letterSpacing: 0.2 },
  headerSub: { marginTop: 5, fontSize: 13.5, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  metricRow: { marginTop: 16, marginBottom: 14, flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, borderRadius: 16, padding: 12,
    shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metricIconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)' },
  metricValue: { fontSize: 20, fontWeight: '900', color: D.white },
  metricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  searchBox: { marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, backgroundColor: D.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  searchInput: { flex: 1, fontSize: 15, color: D.ink, paddingVertical: 13 },
  searchGoBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: D.pink, justifyContent: 'center', alignItems: 'center' },

  filterWrap: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  filterChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5 },
  filterText: { fontSize: 13.5, fontWeight: '800' },
  filterTextActive: { color: D.white },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  primaryActionWrap: { flex: 1 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, shadowColor: D.pink, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  primaryActionText: { color: D.white, fontWeight: '800', fontSize: 15.5 },
  secondaryAction: { backgroundColor: D.white, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#E7EAF0' },
  secondaryActionText: { color: D.ink, fontWeight: '700', fontSize: 12.5 },

  card: { backgroundColor: D.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardUnread: { borderWidth: 2, borderColor: '#C4B5FD', shadowColor: D.violet, shadowOpacity: 0.35 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: D.ink },
  cardDesc: { marginTop: 8, fontSize: 14, color: '#334155', lineHeight: 20, fontWeight: '500' },
  messageIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  unreadBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 11, minWidth: 22, height: 22,
    paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: D.white,
  },
  unreadBadgeText: { color: D.white, fontSize: 11, fontWeight: '900' },
  newMessagesPill: {
    alignSelf: 'flex-start', marginTop: 10, marginBottom: 2,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.95)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  newMessagesPillText: { color: D.white, fontSize: 12, fontWeight: '800' },
  headerMsgIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  headerUnreadBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20,
    paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: D.white,
  },
  headerUnreadText: { color: D.white, fontSize: 10, fontWeight: '900' },
  unreadBanner: {
    marginTop: 14, marginBottom: 4, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.violet,
  },
  unreadBannerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  unreadBannerTitle: { color: D.white, fontSize: 15, fontWeight: '900' },
  unreadBannerSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  priorityPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  priorityText: { fontSize: 11, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  tagBadge: { backgroundColor: D.pinkLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 12, color: D.pinkDark, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#EEF1F5', marginVertical: 14 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarMini: { width: 34, height: 34, borderRadius: 17, backgroundColor: D.pinkLight, justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: D.pinkDark, fontSize: 13, fontWeight: '800' },
  footerAuthorName: { fontSize: 13, fontWeight: '700', color: D.ink },
  createdAtText: { fontSize: 11, color: D.muted, fontWeight: '500', marginTop: 1 },
  teachersBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.tealLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  teachersBadgeText: { fontSize: 12, color: D.tealDark, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: D.pinkLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { marginTop: 10, fontSize: 17, color: D.ink, fontWeight: '800' },
  emptySub: { marginTop: 4, fontSize: 14, color: D.muted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  adminBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '96%' },
  adminCard: { backgroundColor: D.white, borderRadius: 20, padding: 20 },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: D.pinkDark, marginBottom: 16 },
  adminInfo: { color: D.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  fieldLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: D.ink, marginBottom: 8, backgroundColor: '#F8FAFC' },
  textarea: { minHeight: 140, textAlignVertical: 'top' },

  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 14, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityChipText: { fontSize: 14, fontWeight: '800' },

  teacherSearchWrap: { borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 16, paddingHorizontal: 16, height: 60, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC' },
  teacherSearchField: { flex: 1, color: D.ink, fontSize: 16, height: '100%', outlineStyle: 'none' },
  teacherResultWrap: { maxHeight: 170, borderRadius: 16, marginBottom: 10, borderWidth: 2, borderColor: '#EEF2F6', paddingHorizontal: 12, backgroundColor: '#FAFCFF' },
  teacherRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10 },
  teacherName: { color: D.ink, fontWeight: '700', fontSize: 14 },
  teacherSub: { color: D.muted, fontSize: 12, marginTop: 2 },
  teacherHint: { color: D.muted, fontSize: 13, paddingVertical: 12 },

  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: D.pinkLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  selectedText: { color: D.pinkDark, fontSize: 13, fontWeight: '700' },

  attachRow: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  attachBtn: { alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F5F7FA', borderRadius: 16, width: 84, paddingVertical: 14 },
  attachText: { color: D.ink, fontSize: 13, fontWeight: '800' },
  recordingWrap: { flexDirection: 'row', gap: 10 },

  pendingWrap: { gap: 8, marginBottom: 12 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F7FA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pendingText: { color: D.ink, fontSize: 14, flex: 1, marginRight: 8, fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 },
  cancelBtn: { flex: 1, borderRadius: 14, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  cancelText: { color: D.ink, fontWeight: '800', fontSize: 16 },
  submitBtnWrap: { flex: 1.4 },
  submitBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, shadowColor: D.pink, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  submitText: { color: D.white, fontWeight: '800', fontSize: 16 },
});
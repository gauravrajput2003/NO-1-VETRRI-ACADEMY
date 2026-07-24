import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet, Modal, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { createAnnouncement, removeAnnouncement } from '../../redux/slices/adminSlice';
import { getAnnouncementsAPI, getCloudinaryUploadParamsAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import VoiceMessageSheet from '../../components/announcements/VoiceMessageSheet';
import VideoMessageSheet from '../../components/announcements/VideoMessageSheet';
import { formatDate } from '../../utils/formatters';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = 'small', colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── Determine Cloudinary resource_type from mime ───────────────────────────
const getResourceType = (mimeType = '') => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary uses "video" for audio
  return 'raw';
};

// ─── Determine our media type enum from mime ─────────────────────────────────
const getMediaType = (mimeType = '') => {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'image';
};

// ─── Upload a single file to Cloudinary via signed params ────────────────────
const uploadToCloudinary = async (file, onProgress) => {
  const { data } = await getCloudinaryUploadParamsAPI({
    folder: 'announcements',
    filename: file.name,
  });
  if (!data.success) throw new Error(data.message || 'Failed to get upload params');

  const { signature, timestamp, apiKey, cloudName, publicId } = data;
  const resourceType = getResourceType(file.mimeType);

  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType });
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', 'announcements');
  if (publicId) formData.append('public_id', publicId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            type: getMediaType(file.mimeType),
            originalFilename: file.name,
            mimeType: file.mimeType,
            fileSize: result.bytes,
            ...(file.duration != null ? { duration: file.duration } : {}),
            ...(file.thumbnail
              ? { thumbnail: file.thumbnail }
              : getMediaType(file.mimeType) === 'video' && result.secure_url
                ? {
                    // Cloudinary video poster frame
                    thumbnail: result.secure_url.replace('/upload/', '/upload/so_0,w_640,h_360,c_fill/').replace(/\.(mp4|mov|webm)$/i, '.jpg'),
                  }
                : {}),
            ...(result.duration != null && file.duration == null
              ? { duration: Math.round(result.duration) }
              : {}),
          });
        } else {
          reject(new Error(result.error?.message || 'Upload failed'));
        }
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};

// ─── Media Chip Component ─────────────────────────────────────────────────────
function MediaChip({ item, index, onRemove, uploadProgress }) {
  const isUploading = uploadProgress[index] !== undefined && uploadProgress[index] < 100;
  const isDone = uploadProgress[index] === 100;

  const iconName = item.mimeType?.startsWith('video/') ? 'videocam'
    : item.mimeType?.startsWith('audio/') ? 'mic'
    : 'image';

  return (
    <View style={chipStyles.chip}>
      {item.mimeType?.startsWith('image/') && item.uri ? (
        <Image source={{ uri: item.uri }} style={chipStyles.thumbnail} contentFit="cover" />
      ) : (
        <View style={chipStyles.iconBox}>
          <Ionicons name={iconName} size={16} color={Colors.white} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={chipStyles.name} numberOfLines={1}>{item.name}</Text>
        {isUploading && (
          <View style={chipStyles.progressBar}>
            <View style={[chipStyles.progressFill, { width: `${uploadProgress[index]}%` }]} />
          </View>
        )}
        {isDone && <Text style={chipStyles.done}>✓ Uploaded</Text>}
      </View>
      <RNTouchableOpacity onPress={() => onRemove(index)} style={chipStyles.removeBtn}>
        <Ionicons name="close-circle" size={18} color={Colors.error} />
      </RNTouchableOpacity>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 10, padding: 8, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  thumbnail: { width: 36, height: 36, borderRadius: 6 },
  iconBox: {
    width: 36, height: 36, borderRadius: 6,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 12, color: Colors.darkGray, flex: 1 },
  progressBar: { height: 3, backgroundColor: Colors.lightGray, borderRadius: 2, marginTop: 3, width: '100%' },
  progressFill: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  done: { fontSize: 10, color: Colors.success, marginTop: 2 },
  removeBtn: { padding: 2 },
});

// ─── Media Badge for announcement cards ──────────────────────────────────────
function MediaBadge({ media }) {
  if (!media || media.length === 0) return null;
  const images = media.filter((m) => m.type === 'image').length;
  const videos = media.filter((m) => m.type === 'video').length;
  const audios = media.filter((m) => m.type === 'audio').length;
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
      {images > 0 && (
        <View style={badgeStyle.pill}>
          <Ionicons name="image-outline" size={10} color={Colors.info} />
          <Text style={[badgeStyle.text, { color: Colors.info }]}>{images}</Text>
        </View>
      )}
      {videos > 0 && (
        <View style={badgeStyle.pill}>
          <Ionicons name="videocam-outline" size={10} color="#8B5CF6" />
          <Text style={[badgeStyle.text, { color: '#8B5CF6' }]}>{videos}</Text>
        </View>
      )}
      {audios > 0 && (
        <View style={badgeStyle.pill}>
          <Ionicons name="mic-outline" size={10} color={Colors.success} />
          <Text style={[badgeStyle.text, { color: Colors.success }]}>{audios}</Text>
        </View>
      )}
    </View>
  );
}

const badgeStyle = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.info + '18', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  text: { fontSize: 10, fontWeight: '600' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AnnouncementsScreen() {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [showForm, setShowForm] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', targetRole: 'all', isPinned: false });

  // Media state
  const [mediaFiles, setMediaFiles] = useState([]); // [{uri, name, mimeType, duration?, thumbnail?}]
  const [uploadProgress, setUploadProgress] = useState({}); // {index: percent}
  const [isUploading, setIsUploading] = useState(false);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [videoSheetOpen, setVideoSheetOpen] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const loadAnnouncements = async () => {
    try {
      const { data } = await getAnnouncementsAPI();
      setAnnouncements(data.announcements || []);
    } catch {}
  };

  useEffect(() => { loadAnnouncements(); }, []);

  // ── Pick image/poster ───────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Allow media library access to attach images' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `image_${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
      }));
      setMediaFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // ── Video Message (camera or gallery via sheet) ─────────────────────────────
  const onVideoMessageReady = (file) => {
    setMediaFiles((prev) => [...prev, file]);
  };

  // ── Voice Message (in-app recorder via sheet) ───────────────────────────────
  const onVoiceMessageReady = (file) => {
    setMediaFiles((prev) => [...prev, file]);
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // ── Create announcement with media upload ───────────────────────────────────
  const handleCreate = async () => {
    if (!form.title || !form.content) {
      Toast.show({ type: 'error', text1: 'Title and content required' });
      return;
    }

    setIsUploading(true);
    let uploadedMedia = [];

    try {
      // Upload each media file to Cloudinary
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        setUploadProgress((prev) => ({ ...prev, [i]: 0 }));
        const uploaded = await uploadToCloudinary(file, (pct) => {
          setUploadProgress((prev) => ({ ...prev, [i]: pct }));
        });
        setUploadProgress((prev) => ({ ...prev, [i]: 100 }));
        uploadedMedia.push(uploaded);
      }

      const payload = { ...form, media: uploadedMedia };
      const r = await dispatch(createAnnouncement(payload));

      if (createAnnouncement.fulfilled.match(r)) {
        Toast.show({ type: 'success', text1: 'Announcement Created' });
        setShowForm(false);
        setForm({ title: '', content: '', targetRole: 'all', isPinned: false });
        setMediaFiles([]);
        setUploadProgress({});
        loadAnnouncements();
      } else {
        Toast.show({ type: 'error', text1: r.payload || 'Failed to create announcement' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Upload failed', text2: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    await dispatch(removeAnnouncement(id));
    Toast.show({ type: 'success', text1: 'Removed' });
    loadAnnouncements();
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm({ title: '', content: '', targetRole: 'all', isPinned: false });
    setMediaFiles([]);
    setUploadProgress({});
  };

  const targetRoles = ['all', 'student', 'teacher'];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.createText}>New Announcement</Text>
      </TouchableOpacity>

      <FlatList
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
        data={announcements}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                {item.isPinned && <Text style={styles.pinBadge}>📌 Pinned</Text>}
                <Text style={[styles.cardTitle, { color: textColor }]}>{item.title}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardContent, { color: textSec }]} numberOfLines={3}>{item.content}</Text>

            {/* Media preview thumbnail (first image if any) */}
            {item.media?.length > 0 && item.media[0].type === 'image' && (
              <Image
                source={{ uri: item.media[0].url }}
                style={styles.cardMediaThumb}
                contentFit="cover"
              />
            )}
            {item.media?.some((m) => m.type !== 'image') && (
              <View style={styles.cardMediaRow}>
                {item.media.filter((m) => m.type === 'video').length > 0 && (
                  <View style={styles.cardMediaPill}>
                    <Ionicons name="videocam" size={12} color="#8B5CF6" />
                    <Text style={[styles.cardMediaPillText, { color: '#8B5CF6' }]}>
                      {item.media.filter((m) => m.type === 'video').length} video
                    </Text>
                  </View>
                )}
                {item.media.filter((m) => m.type === 'audio').length > 0 && (
                  <View style={styles.cardMediaPill}>
                    <Ionicons name="mic" size={12} color={Colors.success} />
                    <Text style={[styles.cardMediaPillText, { color: Colors.success }]}>
                      {item.media.filter((m) => m.type === 'audio').length} voice
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.cardMeta}>
              <Text style={[styles.metaText, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
              <View style={[styles.targetBadge, { backgroundColor: Colors.info + '18' }]}>
                <Text style={[styles.targetText, { color: Colors.info }]}>@{item.targetRole}</Text>
              </View>
            </View>
            <MediaBadge media={item.media} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={48} color={Colors.mediumGray} />
            <Text style={[styles.emptyText, { color: textSec }]}>No announcements</Text>
          </View>
        }
        refreshing={false}
        onRefresh={loadAnnouncements}
      />

      {/* Create Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, paddingBottom: Math.max(24, bottomPadding) }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.modalTitle, { color: textColor }]}>New Announcement</Text>

              <TextInput
                style={[styles.input, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                placeholder="Title"
                placeholderTextColor={Colors.mediumGray}
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
              />
              <TextInput
                style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]}
                placeholder="Content"
                placeholderTextColor={Colors.mediumGray}
                multiline
                value={form.content}
                onChangeText={(v) => setForm({ ...form, content: v })}
              />

              {/* Target Role */}
              <Text style={[styles.label, { color: textColor }]}>Target</Text>
              <View style={styles.roleRow}>
                {targetRoles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, form.targetRole === r && styles.roleActive]}
                    onPress={() => setForm({ ...form, targetRole: r })}
                  >
                    <Text style={[styles.roleText, form.targetRole === r && { color: Colors.white }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pin toggle */}
              <TouchableOpacity style={styles.pinToggle} onPress={() => setForm({ ...form, isPinned: !form.isPinned })}>
                <Ionicons name={form.isPinned ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />
                <Text style={[styles.pinText, { color: textColor }]}>Pin this announcement</Text>
              </TouchableOpacity>

              {/* ── Media Attachments ── */}
              <Text style={[styles.label, { color: textColor, marginTop: 16 }]}>Attach Media</Text>

              <View style={styles.attachRow}>
                <RNTouchableOpacity style={styles.attachBtn} onPress={pickImage} disabled={isUploading}>
                  <Ionicons name="image-outline" size={18} color={Colors.info} />
                  <Text style={[styles.attachBtnText, { color: Colors.info }]}>Image</Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={styles.attachBtn}
                  onPress={() => setVideoSheetOpen(true)}
                  disabled={isUploading}
                >
                  <Ionicons name="videocam-outline" size={18} color="#8B5CF6" />
                  <Text style={[styles.attachBtnText, { color: '#8B5CF6' }]}>Video Message</Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={styles.attachBtn}
                  onPress={() => setVoiceSheetOpen(true)}
                  disabled={isUploading}
                >
                  <Ionicons name="mic-outline" size={18} color={Colors.success} />
                  <Text style={[styles.attachBtnText, { color: Colors.success }]}>Voice Message</Text>
                </RNTouchableOpacity>
              </View>

              {/* Selected file chips */}
              {mediaFiles.map((file, index) => (
                <MediaChip
                  key={`${file.name}-${index}`}
                  item={file}
                  index={index}
                  onRemove={removeMedia}
                  uploadProgress={uploadProgress}
                />
              ))}

              {/* Action buttons */}
              <View style={styles.modalActions}>
                <RNTouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isUploading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={[styles.confirmBtn, isUploading && { opacity: 0.7 }]}
                  onPress={handleCreate}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmBtnText}>Publish</Text>
                  )}
                </RNTouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <VoiceMessageSheet
        visible={voiceSheetOpen}
        onClose={() => setVoiceSheetOpen(false)}
        onSend={onVoiceMessageReady}
      />
      <VideoMessageSheet
        visible={videoSheetOpen}
        onClose={() => setVideoSheetOpen(false)}
        onSend={onVideoMessageReady}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.pink, margin: 16, borderRadius: 12, paddingVertical: 14,
  },
  createText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  pinBadge: { fontSize: 11, color: Colors.gold, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardContent: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  cardMediaThumb: { width: '100%', height: 160, borderRadius: 10, marginTop: 10 },
  cardMediaRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  cardMediaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#8B5CF618', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  cardMediaPillText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaText: { fontSize: 12 },
  targetBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  targetText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, maxHeight: '92%' },
  modalScrollContent: { paddingTop: 24, paddingBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '10' },
  roleActive: { backgroundColor: Colors.primary },
  roleText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  pinText: { fontSize: 14 },
  // Media attach
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  attachBtn: {
    minWidth: '30%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.lightGray,
    backgroundColor: Colors.lightGray + '30',
  },
  attachBtnText: { fontSize: 10, fontWeight: '700' },
  // Action buttons
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

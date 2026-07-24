import React, { useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Video Message sheet — record with camera or pick from gallery, then preview/send.
 * onSend({ uri, name, mimeType, duration, thumbnail })
 */
export default function VideoMessageSheet({ visible, onClose, onSend }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { uri, name, mimeType, duration }

  const reset = () => setPreview(null);

  const handleCancel = () => {
    reset();
    onClose();
  };

  const applyAsset = (asset) => {
    if (!asset?.uri) return;
    setPreview({
      uri: asset.uri,
      name: asset.fileName || `video_msg_${Date.now()}.mp4`,
      mimeType: asset.mimeType || 'video/mp4',
      duration: asset.duration ? Math.round(asset.duration) : 0,
      thumbnail: asset.uri, // local poster fallback until Cloudinary URL exists
    });
  };

  const recordVideo = async () => {
    try {
      setBusy(true);
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Toast.show({ type: 'error', text1: 'Camera permission required' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 120,
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled) return;
      applyAsset(result.assets?.[0]);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to open camera' });
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      setBusy(true);
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Toast.show({ type: 'error', text1: 'Gallery permission required' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        videoMaxDuration: 300,
        quality: 0.7,
      });
      if (result.canceled) return;
      applyAsset(result.assets?.[0]);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to open gallery' });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => {
    if (!preview) return;
    onSend(preview);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Video Message</Text>
          <Text style={styles.subtitle}>Record or choose a video, then attach</Text>

          {busy && (
            <View style={styles.busyRow}>
              <ActivityIndicator color={Colors.pink} />
              <Text style={styles.busyText}>Opening…</Text>
            </View>
          )}

          {!preview ? (
            <View style={styles.options}>
              <TouchableOpacity style={styles.optionBtn} onPress={recordVideo} disabled={busy}>
                <View style={[styles.optionIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="videocam" size={26} color={Colors.white} />
                </View>
                <Text style={styles.optionTitle}>Record Video</Text>
                <Text style={styles.optionSub}>Open camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionBtn} onPress={pickFromGallery} disabled={busy}>
                <View style={[styles.optionIcon, { backgroundColor: Colors.teal }]}>
                  <Ionicons name="images" size={26} color={Colors.white} />
                </View>
                <Text style={styles.optionTitle}>From Gallery</Text>
                <Text style={styles.optionSub}>Choose existing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewWrap}>
              <View style={styles.videoBox}>
                <WebView
                  source={{ uri: preview.uri }}
                  style={{ flex: 1 }}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                />
                {preview.duration > 0 && (
                  <View style={styles.durationPill}>
                    <Text style={styles.durationText}>{formatDuration(preview.duration)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
                  <Ionicons name="refresh" size={18} color={Colors.navy} />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={18} color={Colors.white} />
                  <Text style={styles.sendText}>Attach</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.gray, marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.navy, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.gray, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  busyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  busyText: { fontSize: 13, color: Colors.gray, fontWeight: '600' },
  options: { flexDirection: 'row', gap: 12 },
  optionBtn: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.offWhite, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 8,
  },
  optionIcon: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  optionSub: { fontSize: 11, fontWeight: '600', color: Colors.gray },
  previewWrap: { gap: 12 },
  videoBox: {
    height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', position: 'relative',
  },
  durationPill: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  durationText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  previewActions: { flexDirection: 'row', gap: 12 },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.offWhite, paddingVertical: 14, borderRadius: 14,
  },
  retakeText: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  sendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 14,
  },
  sendText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  cancelLink: { alignItems: 'center', marginTop: 16 },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.gray },
});

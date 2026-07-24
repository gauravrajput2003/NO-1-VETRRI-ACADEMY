import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus,
  AudioModule, RecordingPresets,
} from 'expo-audio';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function PreviewPlayer({ uri }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    try {
      if (status?.playing) player.pause();
      else player.play();
    } catch {}
  };
  return (
    <View style={styles.previewRow}>
      <TouchableOpacity style={styles.playBtn} onPress={toggle}>
        <Ionicons name={status?.playing ? 'pause' : 'play'} size={22} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.previewLabel}>Preview voice message</Text>
    </View>
  );
}

/**
 * WhatsApp-style voice message recorder bottom sheet.
 * onSend({ uri, name, mimeType, duration }) — only called when user confirms.
 * Cancel / delete never uploads.
 */
export default function VoiceMessageSheet({ visible, onClose, onSend }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [paused, setPaused] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [durationSec, setDurationSec] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  const recording = Boolean(recorderState?.isRecording || paused);
  const liveDuration = Math.floor((recorderState?.durationMillis || 0) / 1000);

  useEffect(() => {
    if (!visible) {
      resetAll();
    }
  }, [visible]);

  useEffect(() => {
    if (recorderState?.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [recorderState?.isRecording]);

  const resetAll = async () => {
    try {
      if (recorderState?.isRecording || paused) {
        await recorder.stop();
      }
    } catch {}
    setPaused(false);
    setPreviewUri(null);
    setDurationSec(0);
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Microphone permission required' });
        return;
      }
      setPreviewUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPaused(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to start recording' });
    }
  };

  const pauseOrResume = async () => {
    if (!recording) return;
    try {
      if (paused) {
        recorder.record();
        setPaused(false);
      } else {
        recorder.pause();
        setPaused(true);
      }
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const secs = Math.floor((recorderState?.durationMillis || 0) / 1000);
      setDurationSec(secs);
      setPreviewUri(uri || null);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to stop recording' });
    } finally {
      setPaused(false);
    }
  };

  const deleteRecording = async () => {
    await resetAll();
  };

  const handleSend = () => {
    if (!previewUri) return;
    onSend({
      uri: previewUri,
      name: `voice_${Date.now()}.m4a`,
      mimeType: 'audio/mp4',
      duration: durationSec || liveDuration,
    });
    onClose();
  };

  const handleCancel = async () => {
    await resetAll();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Voice Message</Text>
          <Text style={styles.subtitle}>Record, preview, then attach</Text>

          <View style={styles.meter}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulse }] }]} />
            <Text style={styles.timer}>
              {formatDuration(previewUri ? durationSec : liveDuration)}
            </Text>
            {(recorderState?.isRecording || paused) && (
              <Text style={styles.liveLabel}>{paused ? 'Paused' : 'Recording'}</Text>
            )}
          </View>

          {previewUri ? <PreviewPlayer uri={previewUri} /> : null}

          <View style={styles.controls}>
            {!recording && !previewUri && (
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                <Ionicons name="mic" size={28} color={Colors.white} />
                <Text style={styles.recordBtnText}>Start Recording</Text>
              </TouchableOpacity>
            )}

            {recording && (
              <>
                <TouchableOpacity style={styles.ctrlBtn} onPress={pauseOrResume}>
                  <Ionicons name={paused ? 'play' : 'pause'} size={22} color={Colors.teal} />
                  <Text style={styles.ctrlLabel}>{paused ? 'Resume' : 'Pause'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctrlBtn, styles.stopBtn]} onPress={stopRecording}>
                  <Ionicons name="stop" size={22} color={Colors.pink} />
                  <Text style={[styles.ctrlLabel, { color: Colors.pink }]}>Stop</Text>
                </TouchableOpacity>
              </>
            )}

            {previewUri && (
              <>
                <TouchableOpacity style={styles.ctrlBtn} onPress={deleteRecording}>
                  <Ionicons name="trash-outline" size={22} color={Colors.error} />
                  <Text style={[styles.ctrlLabel, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recordBtn} onPress={handleSend}>
                  <Ionicons name="send" size={20} color={Colors.white} />
                  <Text style={styles.recordBtnText}>Attach</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

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
  meter: { alignItems: 'center', marginBottom: 18, gap: 6 },
  pulseDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.pink,
  },
  timer: { fontSize: 32, fontWeight: '900', color: Colors.navy, letterSpacing: 1 },
  liveLabel: { fontSize: 12, fontWeight: '700', color: Colors.pink },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardPink, borderRadius: 14, padding: 12, marginBottom: 16,
  },
  playBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.pink,
    alignItems: 'center', justifyContent: 'center',
  },
  previewLabel: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.pink, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 28,
  },
  recordBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  ctrlBtn: {
    alignItems: 'center', gap: 4,
    backgroundColor: Colors.offWhite, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
    minWidth: 80,
  },
  stopBtn: { backgroundColor: Colors.cardPink },
  ctrlLabel: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  cancelLink: { alignItems: 'center', marginTop: 18 },
  cancelText: { fontSize: 14, fontWeight: '700', color: Colors.gray },
});

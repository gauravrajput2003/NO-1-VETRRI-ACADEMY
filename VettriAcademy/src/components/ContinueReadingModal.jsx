import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { Colors } from '../utils/colors';

export default function ContinueReadingModal({
  visible, onContinue, onStartOver, onClose, progress, materialTitle,
}) {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  if (!progress || !visible) return null;

  const { lastPage, totalPages, completedPercentage } = progress;
  const pct = completedPercentage || (totalPages ? Math.round((lastPage / totalPages) * 100) : 0);

  const bg = isDark ? '#152238' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';

  // Ring progress
  const ringSize = 80;
  const ringStroke = 6;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: bg }]} onStartShouldSetResponder={() => true}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={mutedColor} />
          </TouchableOpacity>

          {/* Progress ring */}
          <View style={[styles.ring, { width: ringSize, height: ringSize }]}>
            <View style={[styles.ringBg, {
              width: ringSize, height: ringSize, borderRadius: ringSize / 2,
              borderWidth: ringStroke, borderColor: isDark ? '#0A1628' : '#F0F0F0',
            }]} />
            <View style={styles.ringContent}>
              <Text style={[styles.ringPct, { color: Colors.pink }]}>{pct}%</Text>
            </View>
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: textColor }]}>Continue Reading?</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]} numberOfLines={2}>
            {materialTitle || 'This document'}
          </Text>
          <Text style={[styles.pageInfo, { color: textColor }]}>
            You were on page {lastPage} of {totalPages || '?'}
          </Text>

          {/* Last read time */}
          {progress.updatedAt && (
            <Text style={[styles.lastRead, { color: mutedColor }]}>
              Last read: {new Date(progress.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          )}

          {/* Buttons */}
          <TouchableOpacity style={styles.continueBtn} onPress={onContinue}>
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={styles.continueBtnText}>Continue from Page {lastPage}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.startOverBtn, { borderColor: isDark ? '#30475E' : '#E0E0E0' }]}
            onPress={onStartOver}>
            <Text style={[styles.startOverText, { color: mutedColor }]}>Start from Beginning</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 340, borderRadius: 24, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
  },
  closeBtn: { position: 'absolute', top: 14, right: 14, padding: 4 },
  ring: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ringBg: { position: 'absolute' },
  ringContent: { alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 22, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  pageInfo: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  lastRead: { fontSize: 12, marginTop: 6, marginBottom: 20 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF4F8B', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 16, width: '100%', justifyContent: 'center',
  },
  continueBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  startOverBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, width: '100%', alignItems: 'center',
  },
  startOverText: { fontSize: 14, fontWeight: '600' },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../utils/colors';
import { formatBytes } from '../utils/offlineManager';

const TYPE_ICONS = {
  pdf: { icon: 'document-text', color: '#E74C3C', bg: '#FDEDEC' },
  ppt: { icon: 'easel', color: '#E67E22', bg: '#FDEBD0' },
  video: { icon: 'videocam', color: '#9B59B6', bg: '#F4ECF7' },
  image: { icon: 'image', color: '#3498DB', bg: '#EBF5FB' },
  document: { icon: 'document', color: '#1ABC9C', bg: '#E8F8F5' },
  archive: { icon: 'file-tray-full', color: '#F39C12', bg: '#FEF9E7' },
};

export default function MaterialCard({ material, onPress, progress, isDownloaded, isDark }) {
  const typeConfig = TYPE_ICONS[material.type] || TYPE_ICONS.document;
  const hasThumbnail = !!material.thumbnailUrl;
  const progressPct = progress?.completedPercentage || 0;
  const isLocked = material.isLocked;

  const cardBg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';
  const borderColor = isDark ? '#30475E' : '#F0F0F0';

  const formattedDate = material.createdAt
    ? new Date(material.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isLocked}
      style={[styles.card, { backgroundColor: cardBg, borderColor, opacity: isLocked ? 0.65 : 1 }]}
    >
      {/* Thumbnail or Icon */}
      <View style={styles.thumbnailWrap}>
        {hasThumbnail ? (
          <Image source={{ uri: material.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.iconBox, { backgroundColor: typeConfig.bg }]}>
            <Ionicons name={typeConfig.icon} size={28} color={typeConfig.color} />
          </View>
        )}
        {hasThumbnail && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.thumbnailOverlay}
          />
        )}
        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
          <Text style={styles.typeBadgeText}>{(material.type || '').toUpperCase()}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {material.title}
        </Text>

        <View style={styles.metaRow}>
          {material.subject && (
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{material.subject}</Text>
            </View>
          )}
          <Text style={[styles.metaText, { color: mutedColor }]}>
            {material.fileSize ? formatBytes(material.fileSize) : ''} · {formattedDate}
          </Text>
        </View>

        {/* Progress bar */}
        {progressPct > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#0A1628' : '#EEE' }]}>
              <LinearGradient
                colors={['#FF4F8B', '#FF2E5E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: Colors.pink }]}>
              {Math.round(progressPct)}%
            </Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeRow}>
          {isLocked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={12} color="#E74C3C" />
              <Text style={styles.lockText}>Locked</Text>
            </View>
          )}
          {isDownloaded && (
            <View style={styles.downloadedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.downloadedText}>Downloaded</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowWrap}>
        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', borderRadius: 16, marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  thumbnailWrap: { width: 90, minHeight: 100, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconBox: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  content: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 6 },
  subjectBadge: {
    backgroundColor: 'rgba(17,197,198,0.12)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6,
  },
  subjectText: { color: Colors.teal, fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 11 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  lockText: { fontSize: 10, color: '#E74C3C', fontWeight: '600' },
  downloadedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  downloadedText: { fontSize: 10, color: '#4CAF50', fontWeight: '600' },
  arrowWrap: { justifyContent: 'center', paddingRight: 12 },
});

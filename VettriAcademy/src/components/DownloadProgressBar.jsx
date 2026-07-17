import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';

export default function DownloadProgressBar({ progress, fileSize, isDownloading, onCancel }) {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  if (!isDownloading) return null;

  const pct = Math.round((progress || 0) * 100);
  const bg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.info}>
        <Text style={[styles.label, { color: textColor }]}>Downloading...</Text>
        <Text style={[styles.pct, { color: '#FF4F8B' }]}>{pct}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: isDark ? '#0A1628' : '#E8E8E8' }]}>
        <LinearGradient
          colors={['#FF4F8B', '#FF2E5E']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct}%` }]}
        />
      </View>
      {fileSize ? (
        <Text style={[styles.sizeText, { color: mutedColor }]}>
          {fileSize}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginHorizontal: 16,
    marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  info: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  pct: { fontSize: 13, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  sizeText: { fontSize: 11, marginTop: 4, textAlign: 'right' },
});

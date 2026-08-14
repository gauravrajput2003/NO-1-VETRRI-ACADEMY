import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { formatDate } from '../../utils/formatters';

function formatMediaTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function AudioRow({ audio }) {
  // Use audio.url directly, not { uri: audio.url } per expo-audio API changes
  const player = useAudioPlayer(audio.url);
  const status = useAudioPlayerStatus(player);
  
  const playing = Boolean(status?.playing);
  const current = status?.currentTime || 0;
  const duration = status?.duration || audio.duration || 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const togglePlay = () => {
    try {
      if (playing) player.pause();
      else player.play();
    } catch (err) {
      console.log('Audio play error', err);
    }
  };

  const seekTo = async (ratio) => {
    try {
      if (!duration) return;
      await player.seekTo(ratio * duration);
    } catch {}
  };

  return (
    <View style={st.annAudioRow}>
      <TouchableOpacity style={st.annAudioBtn} onPress={togglePlay} activeOpacity={0.8}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={st.annAudioName} numberOfLines={1}>{audio.originalFilename || 'Voice Message'}</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            seekTo(Math.min(1, Math.max(0, x / 200)));
          }}
          style={st.annSeekTrack}
        >
          <View style={[st.annSeekFill, { width: `${progress * 100}%` }]} />
        </TouchableOpacity>
        <View style={st.annTimeRow}>
          <Text style={st.annTimeText}>{formatMediaTime(current)}</Text>
          <Text style={st.annTimeText}>{formatMediaTime(duration)}</Text>
        </View>
      </View>
      <Ionicons name="mic" size={16} color={Colors.primary} />
    </View>
  );
}

export default function AnnouncementCard({ ann, onDelete, showTargetBadge, showPinBadge }) {
  const images = (ann.media || []).filter((m) => m.type === 'image');
  const videos = (ann.media || []).filter((m) => m.type === 'video');
  const audios = (ann.media || []).filter((m) => m.type === 'audio');
  const documents = (ann.media || []).filter((m) => m.type === 'document' || m.type === 'raw');
  
  const [activeVideo, setActiveVideo] = useState(null);

  const openLink = (url) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFBFC']} style={st.annCard}>
      {/* Header row */}
      <View style={st.annCardTop}>
        <View style={st.annIconWrap}>
          <Ionicons name="megaphone" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          {showPinBadge && ann.isPinned && <Text style={st.pinBadge}>📌 Pinned</Text>}
          <Text style={st.annTitle} numberOfLines={1}>{ann.title}</Text>
          <Text style={st.annBody} numberOfLines={ann.media?.length > 0 ? 2 : 4}>{ann.content}</Text>
        </View>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={st.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Images / Poster - Make it clickable */}
      {images.length > 0 && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => openLink(images[0].url)}>
          <Image source={{ uri: images[0].url }} style={st.annMediaImg} contentFit="cover" />
          <View style={st.tapToOpenBadge}>
            <Ionicons name="expand" size={14} color="#FFF" />
            <Text style={st.tapToOpenText}>Tap to view full</Text>
          </View>
          {images.length > 1 && (
            <Text style={st.annMoreImages}>+{images.length - 1} more image{images.length > 2 ? 's' : ''}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Video messages */}
      {videos.map((v, idx) => {
        const playing = activeVideo === idx;
        const thumb = v.thumbnail || v.url;
        return (
          <View key={`vid-${idx}`} style={st.annVideoWrap}>
            {playing ? (
              <WebView
                source={{ uri: v.url }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                allowsFullscreenVideo
              />
            ) : (
              <TouchableOpacity style={st.annVideoPoster} onPress={() => setActiveVideo(idx)} activeOpacity={0.9}>
                <Image source={{ uri: thumb }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={st.annVideoPlay}>
                  <Ionicons name="play" size={28} color="#FFFFFF" />
                </View>
                {v.duration > 0 && (
                  <View style={st.annVideoDur}>
                    <Text style={st.annVideoDurText}>{formatMediaTime(v.duration)}</Text>
                  </View>
                )}
                <Text style={st.annVideoLabel}>Video Message</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Voice messages */}
      {audios.map((a, idx) => (
        <AudioRow key={`aud-${idx}`} audio={a} />
      ))}
      
      {/* Document / PDF Attachments */}
      {documents.map((d, idx) => (
        <TouchableOpacity key={`doc-${idx}`} style={st.documentRow} onPress={() => openLink(d.url)} activeOpacity={0.8}>
          <View style={st.documentIconWrap}>
            <Ionicons name="document-text" size={20} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.documentName} numberOfLines={1}>{d.originalFilename || 'File Attachment'}</Text>
            <Text style={st.documentSub}>Tap to open / download</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={Colors.textSecondary?.light || '#64748B'} />
        </TouchableOpacity>
      ))}

      {/* Meta Footer */}
      {(showTargetBadge || ann.createdAt) && (
        <View style={st.cardMeta}>
          <Text style={st.metaText}>{formatDate(ann.createdAt)}</Text>
          {showTargetBadge && (
            <View style={st.targetBadge}>
              <Text style={st.targetText}>@{ann.targetRole || 'all'}</Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  annCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  annCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  annIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  annTitle: { fontSize: 17, fontWeight: '800', color: Colors.text?.light || '#1E293B', marginBottom: 4 },
  annBody: { fontSize: 14, color: Colors.textSecondary?.light || '#64748B', lineHeight: 20 },
  pinBadge: { fontSize: 11, color: '#F59E0B', marginBottom: 2, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  
  annMediaImg: { width: '100%', height: 180, borderRadius: 14, backgroundColor: '#E2E8F0', marginTop: 4 },
  tapToOpenBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  tapToOpenText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  annMoreImages: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '700' },

  annVideoWrap: { width: '100%', height: 200, borderRadius: 14, overflow: 'hidden', marginTop: 12, backgroundColor: '#000' },
  annVideoPoster: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  annVideoPlay: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  annVideoDur: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  annVideoDurText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  annVideoLabel: { position: 'absolute', top: 12, left: 12, backgroundColor: '#8B5CF6', color: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '700' },

  annAudioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  annAudioBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  annAudioName: { fontSize: 14, fontWeight: '700', color: Colors.text?.light || '#1E293B', marginBottom: 6 },
  annSeekTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, width: '100%', overflow: 'hidden' },
  annSeekFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  annTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  annTimeText: { fontSize: 11, color: Colors.textSecondary?.light || '#64748B', fontWeight: '600' },
  
  documentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#FDE68A' },
  documentIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  documentName: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  documentSub: { fontSize: 11, color: '#B45309' },

  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaText: { fontSize: 12, color: Colors.textSecondary?.light || '#64748B', fontWeight: '500' },
  targetBadge: { backgroundColor: Colors.info + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  targetText: { fontSize: 11, fontWeight: '700', color: Colors.info },
});

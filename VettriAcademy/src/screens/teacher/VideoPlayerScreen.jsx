import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { updateWatchProgressAPI, markVideoCompleteAPI } from '../../services/api';

let WebView;
try {
  WebView = require('react-native-webview').WebView;
} catch (e) {
  WebView = null;
}

export default function VideoPlayerScreen({ route, navigation }) {
  const { video } = route.params;
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
      if (secs > 0 && secs % 30 === 0) {
        updateWatchProgressAPI(video._id, secs, secs).catch(() => {});
      }
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
      const final = Math.floor((Date.now() - startRef.current) / 1000);
      updateWatchProgressAPI(video._id, final, final).catch(() => {});
    };
  }, [video._id]);

  const handleComplete = async () => {
    try {
      await markVideoCompleteAPI(video._id, elapsed || video.duration);
      navigation.goBack();
    } catch (e) { console.error(e); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const videoHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;justify-content:center;align-items:center;height:100vh}
video{width:100%;max-height:100vh;object-fit:contain}</style></head>
<body><video controls autoplay playsinline src="${video.cloudinaryUrl}"></video></body></html>`;

  const renderPlayer = () => {
    if (isWeb || !WebView) {
      // Web: use native HTML5 video via iframe or direct element
      return (
        <View style={styles.webviewWrap}>
          {loading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadTxt}>Loading video...</Text>
            </View>
          )}
          <iframe
            srcDoc={videoHtml}
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
            onLoad={() => setLoading(false)}
            title={video.title}
            allow="autoplay; fullscreen"
          />
        </View>
      );
    }
    // Native: use WebView
    return (
      <View style={styles.webviewWrap}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadTxt}>Loading video...</Text>
          </View>
        )}
        <WebView
          source={{ html: videoHtml }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
          <Text style={styles.elapsedTxt}>{formatTime(elapsed)} watched</Text>
        </View>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.completeTxt}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Video */}
      {renderPlayer()}

      {/* Bottom info */}
      <View style={styles.bottomBar}>
        <View style={styles.infoChip}>
          <Ionicons name="time-outline" size={14} color={Colors.gold} />
          <Text style={styles.infoTxt}>Duration: {formatTime(video.duration || 0)}</Text>
        </View>
        {video.isMandatory && (
          <View style={[styles.infoChip, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
            <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: '700' }}>★ Mandatory</Text>
          </View>
        )}
        <View style={styles.infoChip}>
          <Ionicons name="folder-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.infoTxt}>{video.category?.replace('-', ' ') || 'General'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'web' ? 12 : 48, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.85)' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  videoTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  elapsedTxt: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00B894', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 5 },
  completeTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  webviewWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: '#000' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 10 },
  loadTxt: { color: 'rgba(255,255,255,0.6)', marginTop: 12, fontSize: 13 },
  bottomBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingBottom: Platform.OS === 'web' ? 14 : 32, backgroundColor: 'rgba(0,0,0,0.85)' },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  infoTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});

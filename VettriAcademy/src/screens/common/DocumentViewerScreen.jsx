/**
 * ─── DocumentViewerScreen ─────────────────────────────────────────────────────
 * 
 * Universal in-app document/website viewer for the EdTech platform.
 * 
 * Handles:
 * - PDFs → Google Docs viewer in WebView (reliable cross-platform)
 * - Images → Native Image component with zoom (ScrollView)
 * - Videos → HTML5 video player in WebView
 * - Office docs → Microsoft Office Online viewer in WebView
 * - Text → WebView rendering
 * - Websites → WebView with blocked-site detection
 * - Blocked sites (NCERT etc.) → Auto-fallback to external browser
 * 
 * Architecture:
 * - Platform-aware: uses WebView on native, iframe on web
 * - Downloads files to cache for offline viewing
 * - Auto-detects file type from URL/MIME/extension
 * - Elegant error states with retry support
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity as RNTouchableOpacity, ActivityIndicator,
  Platform, Linking, Image, ScrollView, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import {
  detectFileType, getPreviewStrategy, checkBlockedSite,
  buildGoogleDocsViewerUrl, downloadFileToCache, downloadAndOpenFile,
  FILE_TYPE_ICONS, getMimeType,
} from '../../utils/fileUtils';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};

let WebView;
try { WebView = require('react-native-webview').WebView; } catch (e) { WebView = null; }

const isWeb = Platform.OS === 'web';

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Loading state with download progress */
const LoadingOverlay = ({ message, progress, onCancel }) => (
  <View style={s.overlay}>
    <View style={s.loadingCard}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={s.loadingTitle}>{message || 'Loading...'}</Text>
      {progress > 0 && progress < 1 && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={s.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}
      {onCancel && (
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

/** Error state with retry */
const ErrorState = ({ title, message, onRetry, onGoBack, onOpenExternal, url }) => (
  <View style={s.overlay}>
    <View style={s.errorCard}>
      <View style={s.errorIconWrap}>
        <Ionicons name="alert-circle" size={56} color="#F44336" />
      </View>
      <Text style={s.errorTitle}>{title || 'Failed to Load'}</Text>
      <Text style={s.errorMsg}>{message || 'Something went wrong. Please try again.'}</Text>
      <View style={s.errorActions}>
        {onRetry && (
          <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
        {url && onOpenExternal && (
          <TouchableOpacity style={s.extBtn} onPress={() => onOpenExternal(url)}>
            <Ionicons name="open-outline" size={18} color="#6C63FF" />
            <Text style={s.extBtnText}>Open in Browser</Text>
          </TouchableOpacity>
        )}
      </View>
      {onGoBack && (
        <TouchableOpacity style={s.goBackBtn} onPress={onGoBack}>
          <Text style={s.goBackText}>← Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

/** Unsupported file type state */
const UnsupportedState = ({ fileType, filename, onDownload, onGoBack, downloading, progress }) => (
  <View style={s.overlay}>
    <View style={s.errorCard}>
      <View style={[s.errorIconWrap, { backgroundColor: 'rgba(156,39,176,0.1)' }]}>
        <Ionicons name="document-attach" size={56} color="#9C27B0" />
      </View>
      <Text style={s.errorTitle}>Preview Not Available</Text>
      <Text style={s.errorMsg}>
        {fileType === 'archive' 
          ? 'Archive files cannot be previewed. Download to extract.'
          : `This file type (${fileType}) cannot be previewed in the app.`}
      </Text>
      {filename && <Text style={s.filenameText}>{filename}</Text>}
      <TouchableOpacity 
        style={[s.retryBtn, { backgroundColor: '#9C27B0' }]} 
        onPress={onDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={s.retryText}>{progress > 0 ? `${Math.round(progress * 100)}%` : 'Downloading...'}</Text>
          </>
        ) : (
          <>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={s.retryText}>Download & Open</Text>
          </>
        )}
      </TouchableOpacity>
      {onGoBack && (
        <TouchableOpacity style={s.goBackBtn} onPress={onGoBack}>
          <Text style={s.goBackText}>← Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DocumentViewerScreen({ route, navigation }) {
  const {
    url,                    // Direct URL to view
    title = 'Document',     // Display title
    fileType: explicitType, // Optional: explicit file type
    mimeType,               // Optional: MIME type
    extension,              // Optional: file extension
    filename,               // Optional: original filename
    allowDownload = true,   // Show download button
  } = route.params || {};

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webviewError, setWebviewError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const webRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Detect file type and preview strategy
  const detectedType = detectFileType({ type: explicitType, mimeType, extension, url, filename });
  const strategy = getPreviewStrategy(detectedType, url);

  // Handle blocked sites on mount
  useEffect(() => {
    if (strategy.strategy === 'external') {
      // Auto-redirect to browser for blocked sites
      Linking.openURL(url);
      navigation.goBack();
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [retryKey]);

  const handleRetry = () => {
    setError(null);
    setWebviewError(false);
    setLoading(true);
    setRetryKey(k => k + 1);
  };

  const handleOpenExternal = (externalUrl) => {
    Linking.openURL(externalUrl || url);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDlProgress(0);
      await downloadAndOpenFile(url, filename || `${title}.${extension || 'pdf'}`, (p) => setDlProgress(p));
    } catch (e) {
      setError({ title: 'Download Failed', message: e.message || 'Could not download the file.' });
    } finally {
      setDownloading(false);
      setDlProgress(0);
    }
  };

  const handleShare = async () => {
    try {
      setDownloading(true);
      const file = await downloadFileToCache(url, filename || `${title}.${extension || 'pdf'}`, (p) => setDlProgress(p));
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: getMimeType(filename || title) });
      }
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setDownloading(false);
      setDlProgress(0);
    }
  };

  // ─── Render content based on strategy ─────────────────────────────────────

  const renderContent = () => {
    if (error) {
      return (
        <ErrorState
          title={error.title}
          message={error.message}
          onRetry={handleRetry}
          onGoBack={() => navigation.goBack()}
          onOpenExternal={handleOpenExternal}
          url={url}
        />
      );
    }

    // Strategy: can't preview in app
    if (!strategy.canPreviewInApp) {
      return (
        <UnsupportedState
          fileType={detectedType}
          filename={filename}
          onDownload={handleDownload}
          onGoBack={() => navigation.goBack()}
          downloading={downloading}
          progress={dlProgress}
        />
      );
    }

    // Strategy: Image preview
    if (strategy.strategy === 'image') {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#000' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          bouncesZoom
        >
          {imageLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ position: 'absolute' }} />}
          <Image
            source={{ uri: url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => { setImageLoading(false); setLoading(false); }}
            onError={() => {
              setImageLoading(false);
              setLoading(false);
              setError({ title: 'Image Load Failed', message: 'Could not load this image. Check your network.' });
            }}
          />
        </ScrollView>
      );
    }

    // Strategy: Video in WebView
    if (strategy.strategy === 'video-webview') {
      const videoHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>*{margin:0;padding:0}body{background:#000;display:flex;justify-content:center;align-items:center;height:100vh}
        video{width:100%;max-height:100vh;object-fit:contain}</style></head>
        <body><video controls autoplay playsinline src="${url}"></video></body></html>`;

      if (isWeb || !WebView) {
        return (
          <View style={{ flex: 1 }}>
            <iframe
              srcDoc={videoHtml}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
              onLoad={() => setLoading(false)}
              title={title}
              allow="autoplay; fullscreen"
            />
          </View>
        );
      }
      return (
        <WebView
          key={retryKey}
          source={{ html: videoHtml }}
          style={{ flex: 1, backgroundColor: '#000' }}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError({ title: 'Video Error', message: 'Failed to load video.' })}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
        />
      );
    }

    // Strategy: PDF, Office, Text, or Website via WebView
    const viewUrl = strategy.viewerUrl || url;

    if (isWeb || !WebView) {
      return (
        <View style={{ flex: 1, position: 'relative' }}>
          {loading && <LoadingOverlay message={`Loading ${detectedType === 'pdf' ? 'PDF' : 'document'}...`} />}
          <iframe
            src={viewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setLoading(false)}
            title={title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </View>
      );
    }

    // Native WebView
    return (
      <WebView
        key={retryKey}
        ref={webRef}
        source={{ uri: viewUrl }}
        style={{ flex: 1 }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(nav) => {
          setCanGoBack(nav.canGoBack);
          setCanGoForward(nav.canGoForward);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setLoading(false);
          setWebviewError(true);
          setError({
            title: 'Page Load Failed',
            message: nativeEvent.description || 'The page could not be loaded. This might be due to CSP restrictions or network issues.',
          });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.statusCode >= 400) {
            setLoading(false);
            setError({
              title: `Error ${nativeEvent.statusCode}`,
              message: 'The server returned an error. Try opening in external browser.',
            });
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit
        startInLoadingState
        renderLoading={() => <LoadingOverlay message="Loading content..." />}
      />
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  const iconData = FILE_TYPE_ICONS[detectedType] || FILE_TYPE_ICONS.unknown;

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />

      {/* Header */}
      <LinearGradient colors={['#6C63FF', '#8B7DFF']} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={s.headerMeta}>
            <Ionicons name={iconData.name} size={12} color="rgba(255,255,255,0.7)" />
            <Text style={s.headerSubtitle}>{detectedType.toUpperCase()}</Text>
            {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
          </View>
        </View>
        <View style={s.headerActions}>
          {allowDownload && (
            <TouchableOpacity style={s.headerBtn} onPress={handleDownload} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={20} color="#fff" />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.headerBtn} onPress={handleShare} disabled={downloading}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => handleOpenExternal(url)}>
            <Ionicons name="open-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {renderContent()}
        {loading && !error && strategy.canPreviewInApp && strategy.strategy !== 'image' && (
          <LoadingOverlay message={`Loading ${detectedType}...`} />
        )}
      </View>

      {/* Bottom nav for WebView-based viewers */}
      {!isWeb && WebView && strategy.canPreviewInApp && !error && ['pdf-webview', 'office-viewer', 'text-webview'].includes(strategy.strategy) && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={[s.navBtn, !canGoBack && s.navDisabled]} onPress={() => webRef.current?.goBack()} disabled={!canGoBack}>
            <Ionicons name="chevron-back" size={22} color={canGoBack ? '#6C63FF' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.navBtn, !canGoForward && s.navDisabled]} onPress={() => webRef.current?.goForward()} disabled={!canGoForward}>
            <Ionicons name="chevron-forward" size={22} color={canGoForward ? '#6C63FF' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} onPress={() => webRef.current?.reload()}>
            <Ionicons name="refresh" size={20} color="#6C63FF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.openExtBtn} onPress={() => handleOpenExternal(url)}>
            <Ionicons name="open-outline" size={14} color="#fff" />
            <Text style={s.openExtText}>Browser</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 12 : 48, paddingBottom: 12, paddingHorizontal: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  // Loading
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', zIndex: 100 },
  loadingCard: { alignItems: 'center', padding: 32 },
  loadingTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 16 },
  progressWrap: { width: 200, marginTop: 16, alignItems: 'center' },
  progressTrack: { width: '100%', height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#666', marginTop: 6, fontWeight: '600' },
  cancelBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  cancelText: { fontSize: 13, color: '#666', fontWeight: '600' },

  // Error
  errorCard: { alignItems: 'center', padding: 32, maxWidth: 320 },
  errorIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(244,67,54,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#333', textAlign: 'center' },
  errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errorActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6C63FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 6 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  extBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#6C63FF', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 24, gap: 6 },
  extBtnText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  goBackBtn: { marginTop: 16, padding: 8 },
  goBackText: { fontSize: 14, color: '#999', fontWeight: '600' },
  filenameText: { fontSize: 12, color: '#999', marginTop: 8, fontStyle: 'italic' },

  // Bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: Platform.OS === 'web' ? 8 : 28, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  navBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  navDisabled: { opacity: 0.3 },
  openExtBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6C63FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, gap: 4 },
  openExtText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

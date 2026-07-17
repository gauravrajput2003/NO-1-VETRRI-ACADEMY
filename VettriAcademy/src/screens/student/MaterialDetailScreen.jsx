import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
/**
 * ─── MaterialDetailScreen ─────────────────────────────────────────────────────
 * 
 * Shows material details and handles preview/download for all file types.
 * 
 * Preview routing:
 * - PDFs → PdfViewerScreen (pdf.js in WebView — in-app reading with bookmarks, notes, progress)
 * - Images → In-app native Image preview with zoom
 * - Videos → DocumentViewer (HTML5 video player)
 * - Office docs → DocumentViewer (MS Office Online viewer)
 * - Archives/unsupported → Download & open with native app
 * 
 * Download:
 * - Downloads to cache using expo-file-system
 * - Opens share sheet via expo-sharing for saving/opening in other apps
 * - Progress tracking with visual indicator
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity as RNTouchableOpacity,
  Linking, Image, ScrollView, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fetchPreviewUrl, fetchDownloadUrl } from '../../redux/slices/materialsSlice';
import {
  detectFileType, getPreviewStrategy, downloadAndOpenFile,
  FILE_TYPE_ICONS, normalizeMaterialFileUrl,
} from '../../utils/fileUtils';
import { getSignedPdfUrlAPI } from '../../services/api';
import { getToken } from '../../services/storage';
import { API_BASE_URL } from '../../utils/constants';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


export default function MaterialDetailScreen({ route, navigation }) {
  const { material } = route.params;
  if (!material || !material._id) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background.light }]}>
        <Text>Error: Material data not available</Text>
      </View>
    );
  }

  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const { previewLoading } = useSelector((s) => s.materials);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [viewUrl, setViewUrl] = useState(null);
  const [viewType, setViewType] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  // Build full URL from relative or absolute path
  const buildFullUrl = (path) => {
    if (!path) return '';
    return normalizeMaterialFileUrl(path, {
      resourceType: material?.resourceType,
      publicId: material?.publicId,
    });
  };

  // ─── Preview Handler ────────────────────────────────────────────────────────
  const handleView = async () => {
    if (material.isLocked) {
      Toast.show({ type: 'error', text1: 'Material Locked 🔒', text2: 'This material has not been unlocked yet.' });
      return;
    }

    const result = await dispatch(fetchPreviewUrl(material._id));
    if (!fetchPreviewUrl.fulfilled.match(result)) {
      Toast.show({ type: 'error', text1: 'Access Denied', text2: result.payload || 'Cannot view material' });
      return;
    }

    const url = buildFullUrl(result.payload.url);
    const apiType = result.payload.type;
    const mimeType = result.payload.mimeType;

    // Detect file type using the waterfall strategy
    const fileType = detectFileType({
      type: apiType || material?.type,
      mimeType: mimeType || material?.mimeType,
      extension: material?.extension,
      url,
      filename: material?.originalFilename,
    });

    const strategy = getPreviewStrategy(fileType, url);

    // Route based on preview strategy
    switch (strategy.strategy) {
      case 'image':
        // In-app image preview with native Image component
        setImageLoading(false);
        setImageError(false);
        setViewType('image');
        setViewUrl(url);
        break;

      case 'pdf-webview': {
        // Raw Cloudinary PDFs are more reliable through the generic document viewer.
        if (material?.resourceType === 'raw' || url.includes('/raw/upload/')) {
          navigation.navigate('DocumentViewer', {
            url,
            title: material.title,
            fileType: 'pdf',
            mimeType: mimeType || material?.mimeType,
            extension: material?.extension || 'pdf',
            filename: material?.originalFilename,
          });
          break;
        }

        // Route other PDFs to the dedicated PdfViewerScreen with signed URL
        try {
          const signedRes = await getSignedPdfUrlAPI(material._id);
          const signedData = signedRes.data;
          if (signedData.success) {
            navigation.navigate('PdfViewer', {
              materialId: material._id,
              title: material.title,
              pdfUrl: signedData.url,
              totalPages: signedData.material?.totalPages || material.totalPages || 0,
            });
          } else {
            // Fallback: use the preview URL
            navigation.navigate('PdfViewer', {
              materialId: material._id,
              title: material.title,
              pdfUrl: url,
              totalPages: material.totalPages || 0,
            });
          }
        } catch (signErr) {
          // Fallback: use preview URL directly
          navigation.navigate('PdfViewer', {
            materialId: material._id,
            title: material.title,
            pdfUrl: url,
            totalPages: material.totalPages || 0,
          });
        }
        break;
      }

      case 'office-viewer':
      case 'video-webview':
      case 'text-webview':
        // Navigate to universal DocumentViewer for all these types
        navigation.navigate('DocumentViewer', {
          url,
          title: material.title,
          fileType,
          mimeType: mimeType || material?.mimeType,
          extension: material?.extension,
          filename: material?.originalFilename,
        });
        break;

      case 'download-open':
        // Download and open with native app
        try {
          setDownloading(true);
          setDlProgress(0);
          await downloadAndOpenFile(
            url,
            material?.originalFilename || `${material.title}.${material?.extension || 'bin'}`,
            (p) => setDlProgress(p),
          );
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Download Failed', text2: e.message });
        } finally {
          setDownloading(false);
          setDlProgress(0);
        }
        break;

      case 'external':
        // Open in external browser (blocked sites)
        Linking.openURL(url);
        break;

      default:
        // Try to open externally as last resort
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Toast.show({ type: 'error', text1: 'Preview not supported', text2: 'No preview available for this file.' });
        }
    }
  };

  // ─── Download Handler ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (material.isLocked) {
      Toast.show({ type: 'error', text1: 'Material Locked 🔒', text2: 'This material has not been unlocked yet.' });
      return;
    }

    try {
      setDownloading(true);
      setDlProgress(0);
      let directUrl = normalizeMaterialFileUrl(material.fileUrl, {
        resourceType: material?.resourceType,
        publicId: material?.publicId,
      });

      if (!directUrl) {
        const previewResult = await dispatch(fetchPreviewUrl(material._id));
        if (fetchPreviewUrl.fulfilled.match(previewResult)) {
          directUrl = normalizeMaterialFileUrl(previewResult.payload?.url, {
            resourceType: material?.resourceType,
            publicId: material?.publicId,
          });
        }
      }

      if (!directUrl) {
        const result = await dispatch(fetchDownloadUrl(material._id));
        if (!fetchDownloadUrl.fulfilled.match(result)) {
          Toast.show({
            type: 'error',
            text1: 'Download Failed',
            text2: result.payload || 'Could not generate download link',
          });
          return;
        }

        directUrl = normalizeMaterialFileUrl(result.payload?.url, {
          resourceType: result.payload?.resourceType || material?.resourceType,
          publicId: material?.publicId,
        });
      }

      if (!directUrl) {
        Toast.show({ type: 'error', text1: 'Download Failed', text2: 'No file URL available for this material' });
        return;
      }
      const filename = material?.originalFilename || `${material.title}.${material?.extension || 'bin'}`;
      try {
        await downloadAndOpenFile(directUrl, filename, (p) => setDlProgress(p));
      } catch (downloadErr) {
        const statusText = String(downloadErr?.message || '');
        const shouldRetryWithPreview =
          statusText.includes('401') || statusText.includes('403') || statusText.includes('404');

        if (!shouldRetryWithPreview) {
          throw downloadErr;
        }

        const previewResult = await dispatch(fetchPreviewUrl(material._id));
        if (!fetchPreviewUrl.fulfilled.match(previewResult)) {
          throw downloadErr;
        }

        const previewUrl = normalizeMaterialFileUrl(previewResult.payload?.url, {
          resourceType: material?.resourceType,
          publicId: material?.publicId,
        });

        if (!previewUrl || previewUrl === directUrl) {
          const token = await getToken();
          if (!token) throw downloadErr;

          const proxyUrl = `${API_BASE_URL}/student/materials/${material._id}/direct-download`;
          await downloadAndOpenFile(
            proxyUrl,
            filename,
            (p) => setDlProgress(p),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return;
        }

        await downloadAndOpenFile(previewUrl, filename, (p) => setDlProgress(p));
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Download Failed', text2: e.message || 'An error occurred' });
    } finally {
      setDownloading(false);
      setDlProgress(0);
    }
  };

  // ─── File type visual info ──────────────────────────────────────────────────
  const fileType = detectFileType({
    type: material?.type,
    mimeType: material?.mimeType,
    extension: material?.extension,
    filename: material?.originalFilename,
  });
  const iconInfo = FILE_TYPE_ICONS[fileType] || FILE_TYPE_ICONS.unknown;
  const canPreview = getPreviewStrategy(fileType, '').canPreviewInApp;

  // ─── Image preview mode ─────────────────────────────────────────────────────
  if (viewUrl && viewType === 'image') {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.imgHeader}>
          <TouchableOpacity onPress={() => { setViewUrl(null); setViewType(null); }} style={styles.imgBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.imgTitle} numberOfLines={1}>{material.title}</Text>
          <TouchableOpacity onPress={handleDownload} disabled={downloading}>
            {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
        <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          bouncesZoom
        >
          {imageLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ position: 'absolute' }} />}
          {!imageError ? (
            <Image
              source={{ uri: viewUrl }}
              style={styles.imagePreview}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : (
            <View style={styles.imgErrorBox}>
              <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
              <Text style={styles.imgErrorTitle}>Failed to load image</Text>
              <Text style={styles.imgErrorSub}>Check your network connection</Text>
              <TouchableOpacity style={styles.imgRetryBtn} onPress={() => { setImageError(false); setImageLoading(true); }}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Main material detail view ──────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: bgColor, padding: 16 }]}>
      {/* Material Card */}
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <LinearGradient
          colors={[iconInfo.color + '20', iconInfo.color + '08']}
          style={styles.iconBox}
        >
          <Ionicons name={iconInfo.name} size={40} color={iconInfo.color} />
        </LinearGradient>

        <Text style={[styles.title, { color: textColor }]}>{material?.title || 'Untitled'}</Text>
        {material?.description && <Text style={[styles.desc, { color: textSec }]}>{material.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={14} color={textSec} />
            <Text style={[styles.metaText, { color: textSec }]}>{material?.subject || 'N/A'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name={iconInfo.name} size={14} color={iconInfo.color} />
            <Text style={[styles.metaText, { color: textSec }]}>{(fileType || 'Unknown').toUpperCase()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="resize-outline" size={14} color={textSec} />
            <Text style={[styles.metaText, { color: textSec }]}>{formatFileSize(material?.fileSize || 0)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={textSec} />
            <Text style={[styles.metaText, { color: textSec }]}>Uploaded {formatDate(material?.createdAt || new Date())}</Text>
          </View>
        </View>

        {/* Preview capability badge */}
        <View style={[styles.capBadge, { backgroundColor: canPreview ? '#E8F5E9' : '#FFF3E0' }]}>
          <Ionicons
            name={canPreview ? 'eye' : 'download'}
            size={16}
            color={canPreview ? '#4CAF50' : '#FF9800'}
          />
          <Text style={{ color: canPreview ? '#4CAF50' : '#FF9800', fontWeight: '600', fontSize: 13 }}>
            {canPreview ? 'Can preview in app' : 'Download to view'}
          </Text>
        </View>

        {/* Lock status */}
        <View style={[styles.lockBadge, { backgroundColor: material?.isLocked ? Colors.error + '14' : Colors.success + '14' }]}>
          <Ionicons name={material?.isLocked ? 'lock-closed' : 'lock-open'} size={18} color={material?.isLocked ? Colors.error : Colors.success} />
          <Text style={{ color: material?.isLocked ? Colors.error : Colors.success, fontWeight: '600', fontSize: 14 }}>
            {material?.isLocked ? 'Locked — Contact your teacher' : 'Available to view'}
          </Text>
        </View>
      </View>

      {/* Download progress */}
      {downloading && dlProgress > 0 && (
        <View style={styles.dlProgressWrap}>
          <View style={styles.dlProgressTrack}>
            <View style={[styles.dlProgressFill, { width: `${Math.round(dlProgress * 100)}%` }]} />
          </View>
          <Text style={[styles.dlProgressText, { color: textSec }]}>Downloading... {Math.round(dlProgress * 100)}%</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.previewBtn, material?.isLocked && styles.disabledBtn]}
          onPress={handleView}
          disabled={previewLoading || material?.isLocked || downloading}
        >
          {previewLoading || downloading ? <ActivityIndicator color={Colors.primary} /> : (
            <>
              <Ionicons name={canPreview ? 'eye-outline' : 'open-outline'} size={20} color={material?.isLocked ? Colors.white : Colors.primary} />
              <Text style={[styles.actionText, { color: material?.isLocked ? Colors.white : Colors.primary }]}>
                {canPreview ? 'Preview' : 'Open'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.downloadBtn, material?.isLocked && styles.disabledBtn]}
          onPress={handleDownload}
          disabled={material?.isLocked || downloading}
        >
          {downloading ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="download-outline" size={20} color={Colors.white} />
              <Text style={styles.dlActionText}>Download</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 24, alignItems: 'center', ...Shadows.medium },
  iconBox: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  capBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 14 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  previewBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  downloadBtn: { backgroundColor: Colors.pink, borderWidth: 1.5, borderColor: Colors.pink },
  disabledBtn: { backgroundColor: Colors.mediumGray, borderColor: Colors.mediumGray },
  actionText: { fontSize: 16, fontWeight: '700' },
  dlActionText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  // Download progress
  dlProgressWrap: { marginTop: 16, alignItems: 'center' },
  dlProgressTrack: { width: '100%', height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden' },
  dlProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  dlProgressText: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Image preview
  imgHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 48, gap: 12, backgroundColor: 'rgba(0,0,0,0.85)' },
  imgBackBtn: { padding: 4 },
  imgTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff' },
  imagePreview: { width: '100%', height: '100%', maxHeight: 600 },
  imgErrorBox: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  imgErrorTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 16 },
  imgErrorSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  imgRetryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
});

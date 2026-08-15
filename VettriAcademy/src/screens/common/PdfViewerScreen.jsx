import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity as RNTouchableOpacity, StatusBar,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import {
  fetchProgress, fetchBookmarks, addBookmark, removeBookmark,
  fetchNotes, trackOpen, trackClose,
} from '../../redux/slices/pdfSlice';
import NoteModal from '../../components/NoteModal';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { downloadAndOpenFile } from '../../utils/fileUtils';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

let WebView;
try { WebView = require('react-native-webview').WebView; } catch (e) { WebView = null; }

const isWeb = Platform.OS === 'web';

export default function PdfViewerScreen({ navigation, route }) {
  const { materialId, title, pdfUrl } = route.params;

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  
  // Memoized selector to fix unnecessary rerender warning
  const rawBookmarks = useSelector((s) => s.pdf.bookmarks[materialId]);
  const bookmarks = rawBookmarks || [];

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // We no longer track exact pages with native viewer
  const currentPage = 1;
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  // Analytics & Data Fetching
  useEffect(() => {
    dispatch(fetchProgress(materialId));
    dispatch(fetchBookmarks(materialId));
    dispatch(fetchNotes(materialId));

    const startTime = Date.now();
    dispatch(trackOpen({ materialId, deviceType: 'mobile' })).then((action) => {
      if (action.payload) setSessionId(action.payload);
    });

    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      if (sessionId) {
        dispatch(trackClose({
          sessionId,
          lastPage: 1,
          totalTimeSpent: timeSpent,
          completedPercentage: 100, // Mark as fully read since we don't track progress
        }));
      }
    };
  }, []);

  const toggleBookmark = () => {
    if (isCurrentPageBookmarked) {
      const bookmark = bookmarks.find((b) => b.pageNumber === currentPage);
      if (bookmark) {
        dispatch(removeBookmark({ bookmarkId: bookmark._id, materialId }));
        Toast.show({ type: 'success', text1: 'Bookmark removed' });
      }
    } else {
      dispatch(addBookmark({ materialId, pageNumber: currentPage, label: 'Document Bookmark' }));
      Toast.show({ type: 'success', text1: 'Document bookmarked' });
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadAndOpenFile(pdfUrl, `${title || 'Document'}.pdf`);
    } catch (e) {
      Alert.alert('Download Failed', e.message || 'Could not download the file.');
    } finally {
      setDownloading(false);
    }
  };

  const bg = isDark ? '#0A1628' : '#F8FAFC';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#666';

  const renderViewer = () => {
    if (isWeb || !WebView) {
      return (
        <View style={{ flex: 1 }}>
          {isLoading && (
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color={Colors.pink} />
               <Text style={[styles.loadingText, { color: mutedColor }]}>Loading PDF...</Text>
             </View>
          )}
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => setIsLoading(false)}
            title={title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </View>
      );
    }

    return (
      <WebView
        source={{ uri: pdfUrl }}
        style={{ flex: 1, backgroundColor: bg }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient 
        colors={isDark ? ['#0A1628', '#152238'] : ['#FFFFFF', '#F8FAFC']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.pink} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {title || 'PDF Document'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleDownload} style={styles.headerBtn} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.pink} />
            ) : (
              <Ionicons name="download-outline" size={22} color={Colors.pink} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Viewer */}
      {!hasError ? renderViewer() : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.pink} />
          <Text style={[styles.errorText, { color: textColor }]}>Failed to load PDF</Text>
          <Text style={[styles.errorSub, { color: mutedColor }]}>
            The inline preview could not be loaded. Please download the file to view it.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setHasError(false); setIsLoading(true); }}>
            <Text style={styles.retryBtnText}>Retry Preview</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay for Native */}
      {isLoading && !isWeb && WebView && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.pink} />
          <Text style={[styles.loadingText, { color: mutedColor }]}>Loading PDF...</Text>
        </View>
      )}

      {/* Bottom Toolbar for Bookmarks and Notes */}
      {!isLoading && !hasError && (
        <View style={[styles.toolbar, {
          backgroundColor: isDark ? 'rgba(30,58,95,0.95)' : 'rgba(255,255,255,0.97)',
          paddingBottom: Math.max(insets.bottom, 12),
        }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={toggleBookmark}>
            <Ionicons
              name={isCurrentPageBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isCurrentPageBookmarked ? Colors.pink : mutedColor}
            />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowNoteModal(true)}>
            <Ionicons name="create-outline" size={24} color={mutedColor} />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Add Note</Text>
          </TouchableOpacity>
        </View>
      )}

      <NoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={(noteData) => {
          setShowNoteModal(false);
          Toast.show({ type: 'success', text1: 'Note saved' });
        }}
        pageNumber={currentPage}
        materialId={materialId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,79,139,0.08)',
  },
  headerTitleWrap: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  errorText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorSub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 24, paddingHorizontal: 32, paddingVertical: 12,
    backgroundColor: '#FF4F8B', borderRadius: 24,
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
  },
  toolBtn: { alignItems: 'center', paddingHorizontal: 8 },
  toolLabel: { fontSize: 11, marginTop: 4, fontWeight: '500' },
});

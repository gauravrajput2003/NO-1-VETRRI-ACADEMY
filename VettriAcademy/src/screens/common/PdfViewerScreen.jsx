import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity as RNTouchableOpacity, StatusBar,
  ActivityIndicator, Animated, Dimensions, Platform, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import {
  fetchProgress, saveProgress, fetchBookmarks, addBookmark, removeBookmark,
  fetchNotes, trackOpen, trackClose,
} from '../../redux/slices/pdfSlice';
import NoteModal from '../../components/NoteModal';
import ContinueReadingModal from '../../components/ContinueReadingModal';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── PDF.js HTML Template ──────────────────────────────────────────────────────
const getPdfHtml = (pdfUrl, isDarkReading) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%; overflow-x: hidden;
      background: ${isDarkReading ? '#1a1a2e' : '#f0f0f0'};
      -webkit-overflow-scrolling: touch;
    }
    #viewer { display: flex; flex-direction: column; align-items: center; padding: 8px 0 100px 0; }
    canvas {
      display: block; margin: 6px auto;
      box-shadow: 0 2px 12px rgba(0,0,0,${isDarkReading ? '0.5' : '0.15'});
      border-radius: 4px;
      max-width: 100%;
    }
    ${isDarkReading ? 'canvas { filter: invert(0.88) hue-rotate(180deg); }' : ''}
    #loading { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      color: ${isDarkReading ? '#aaa' : '#666'}; font-family: sans-serif; font-size: 16px; }
    #search-overlay {
      display: none; position: fixed; top: 0; left: 0; right: 0;
      background: ${isDarkReading ? '#1E3A5F' : '#fff'}; padding: 12px; z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    #search-overlay input {
      width: 70%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; background: ${isDarkReading ? '#0A1628' : '#f8f8f8'};
      color: ${isDarkReading ? '#fff' : '#333'};
    }
    #search-info { font-size: 12px; color: #888; margin-top: 4px; }
    .highlight { background: rgba(255,79,139,0.35); border-radius: 2px; }
  </style>
</head>
<body>
  <div id="loading">Loading PDF...</div>
  <div id="viewer"></div>
  <div id="search-overlay">
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="search-input" type="text" placeholder="Search text..." />
      <button onclick="searchPrev()" style="padding:6px 10px;border:none;border-radius:6px;background:#FF4F8B;color:#fff;">◀</button>
      <button onclick="searchNext()" style="padding:6px 10px;border:none;border-radius:6px;background:#FF4F8B;color:#fff;">▶</button>
      <button onclick="closeSearch()" style="padding:6px 10px;border:none;border-radius:6px;background:#666;color:#fff;">✕</button>
    </div>
    <div id="search-info"></div>
  </div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null, totalPages = 0, currentPage = 1;
    let scale = 1.0, renderedPages = new Set();
    let searchResults = [], searchIdx = -1;
    const viewer = document.getElementById('viewer');
    const loading = document.getElementById('loading');
    const pageCanvases = {};

    // Send message to React Native
    function sendToRN(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
      }
    }

    // Load PDF
    async function loadPdf() {
      try {
        pdfDoc = await pdfjsLib.getDocument('${pdfUrl}').promise;
        totalPages = pdfDoc.numPages;
        loading.style.display = 'none';
        sendToRN('loaded', { totalPages });

        // Render visible pages
        for (let i = 1; i <= totalPages; i++) {
          const canvas = document.createElement('canvas');
          canvas.id = 'page-' + i;
          canvas.dataset.page = i;
          viewer.appendChild(canvas);
          pageCanvases[i] = canvas;
        }

        // Render first 3 pages immediately
        for (let i = 1; i <= Math.min(3, totalPages); i++) {
          await renderPage(i);
        }

        // Lazy-render rest on scroll
        setupScrollObserver();
      } catch (err) {
        loading.textContent = 'Failed to load PDF';
        sendToRN('error', { message: err.message || 'Failed to load PDF' });
      }
    }

    async function renderPage(num) {
      if (renderedPages.has(num)) return;
      renderedPages.add(num);

      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: scale * 2 });
      const canvas = pageCanvases[num];
      if (!canvas) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = (viewport.width / 2) + 'px';
      canvas.style.height = (viewport.height / 2) + 'px';

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    function setupScrollObserver() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.dataset.page);
            renderPage(pageNum);
            // Pre-render adjacent
            if (pageNum + 1 <= totalPages) renderPage(pageNum + 1);
            if (pageNum - 1 >= 1) renderPage(pageNum - 1);
            // Update current page
            currentPage = pageNum;
            sendToRN('pageChanged', { page: pageNum, totalPages });
          }
        });
      }, { threshold: 0.3 });

      Object.values(pageCanvases).forEach(canvas => observer.observe(canvas));
    }

    // Navigate to page
    function goToPage(num) {
      const canvas = pageCanvases[num];
      if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        currentPage = num;
        renderPage(num);
        sendToRN('pageChanged', { page: num, totalPages });
      }
    }

    // Search
    let searchTextCache = {};
    async function extractText(pageNum) {
      if (searchTextCache[pageNum]) return searchTextCache[pageNum];
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      searchTextCache[pageNum] = text;
      return text;
    }

    async function searchText(query) {
      searchResults = [];
      searchIdx = -1;
      if (!query || !pdfDoc) return;

      const lowerQuery = query.toLowerCase();
      for (let i = 1; i <= totalPages; i++) {
        const text = await extractText(i);
        if (text.toLowerCase().includes(lowerQuery)) {
          searchResults.push(i);
        }
      }

      document.getElementById('search-info').textContent =
        searchResults.length > 0 ? searchResults.length + ' page(s) found' : 'No results';
      sendToRN('searchResults', { total: searchResults.length, pages: searchResults });

      if (searchResults.length > 0) {
        searchIdx = 0;
        goToPage(searchResults[0]);
      }
    }

    function searchNext() {
      if (searchResults.length === 0) return;
      searchIdx = (searchIdx + 1) % searchResults.length;
      goToPage(searchResults[searchIdx]);
      document.getElementById('search-info').textContent =
        (searchIdx + 1) + ' of ' + searchResults.length;
    }

    function searchPrev() {
      if (searchResults.length === 0) return;
      searchIdx = (searchIdx - 1 + searchResults.length) % searchResults.length;
      goToPage(searchResults[searchIdx]);
      document.getElementById('search-info').textContent =
        (searchIdx + 1) + ' of ' + searchResults.length;
    }

    function closeSearch() {
      document.getElementById('search-overlay').style.display = 'none';
      searchResults = []; searchIdx = -1;
      sendToRN('searchClosed', {});
    }

    // Listen for commands from React Native
    window.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'goToPage') goToPage(msg.page);
        if (msg.type === 'search') {
          document.getElementById('search-overlay').style.display = 'block';
          document.getElementById('search-input').value = msg.query || '';
          if (msg.query) searchText(msg.query);
        }
        if (msg.type === 'closeSearch') closeSearch();
        if (msg.type === 'toggleDark') {
          document.body.style.background = msg.dark ? '#1a1a2e' : '#f0f0f0';
          document.querySelectorAll('canvas').forEach(c => {
            c.style.filter = msg.dark ? 'invert(0.88) hue-rotate(180deg)' : 'none';
          });
        }
      } catch(e) {}
    });

    // Also handle RN-style messages
    document.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'goToPage') goToPage(msg.page);
        if (msg.type === 'search') {
          document.getElementById('search-overlay').style.display = 'block';
          document.getElementById('search-input').value = msg.query || '';
          if (msg.query) searchText(msg.query);
        }
        if (msg.type === 'closeSearch') closeSearch();
        if (msg.type === 'toggleDark') {
          document.body.style.background = msg.dark ? '#1a1a2e' : '#f0f0f0';
          document.querySelectorAll('canvas').forEach(c => {
            c.style.filter = msg.dark ? 'invert(0.88) hue-rotate(180deg)' : 'none';
          });
        }
      } catch(e) {}
    });

    // Search input handler
    document.getElementById('search-input').addEventListener('keyup', function(e) {
      if (e.key === 'Enter') searchText(this.value);
    });

    loadPdf();
  </script>
</body>
</html>`;

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PdfViewerScreen({ navigation, route }) {
  const { materialId, title, pdfUrl, totalPages: initialTotalPages, initialPage } = route.params;

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const progress = useSelector((s) => s.pdf.progress[materialId]);
  const bookmarks = useSelector((s) => s.pdf.bookmarks[materialId] || []);

  const webViewRef = useRef(null);
  const progressTimerRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [totalPages, setTotalPages] = useState(initialTotalPages || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkReading, setIsDarkReading] = useState(isDark);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const toolbarOpacity = useRef(new Animated.Value(1)).current;
  const toolbarTimeout = useRef(null);

  // Check if current page is bookmarked
  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  // ─── Initialize ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Fetch progress and bookmarks
    dispatch(fetchProgress(materialId));
    dispatch(fetchBookmarks(materialId));
    dispatch(fetchNotes(materialId));

    // Track analytics open
    dispatch(trackOpen({ materialId, deviceType: 'mobile' })).then((action) => {
      if (action.payload) setSessionId(action.payload);
    });

    return () => {
      // Track close on unmount
      const timeSpent = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (sessionId) {
        dispatch(trackClose({
          sessionId,
          lastPage: currentPage,
          totalTimeSpent: timeSpent,
          completedPercentage: totalPages ? Math.round((currentPage / totalPages) * 100) : 0,
        }));
      }

      // Save final progress
      if (totalPages > 0) {
        dispatch(saveProgress({ materialId, lastPage: currentPage, totalPages }));
      }

      // Clear progress timer
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Show continue reading modal when progress loads
  useEffect(() => {
    if (progress && progress.lastPage > 1 && !initialPage) {
      setShowContinueModal(true);
    }
  }, [progress]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (totalPages > 0) {
      progressTimerRef.current = setInterval(() => {
        dispatch(saveProgress({ materialId, lastPage: currentPage, totalPages }));
      }, 30000);
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [totalPages, currentPage]);

  // Auto-hide toolbar
  const resetToolbarTimer = useCallback(() => {
    if (toolbarTimeout.current) clearTimeout(toolbarTimeout.current);
    setShowToolbar(true);
    Animated.timing(toolbarOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toolbarTimeout.current = setTimeout(() => {
      Animated.timing(toolbarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setShowToolbar(false);
      });
    }, 4000);
  }, []);

  useEffect(() => { resetToolbarTimer(); }, []);

  // ─── WebView Message Handler ───────────────────────────────────────────────
  const onMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'loaded':
          setIsLoading(false);
          setTotalPages(msg.totalPages);
          if (initialPage && initialPage > 1) {
            setTimeout(() => {
              webViewRef.current?.postMessage(JSON.stringify({ type: 'goToPage', page: initialPage }));
            }, 500);
          }
          break;
        case 'pageChanged':
          setCurrentPage(msg.page);
          resetToolbarTimer();
          break;
        case 'error':
          setHasError(true);
          setIsLoading(false);
          break;
        case 'searchResults':
          Toast.show({
            type: msg.total > 0 ? 'success' : 'info',
            text1: msg.total > 0 ? `Found on ${msg.total} page(s)` : 'No results found',
          });
          break;
        case 'searchClosed':
          setIsSearching(false);
          break;
      }
    } catch (e) {}
  }, [initialPage, resetToolbarTimer]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const toggleBookmark = () => {
    if (isCurrentPageBookmarked) {
      const bookmark = bookmarks.find((b) => b.pageNumber === currentPage);
      if (bookmark) {
        dispatch(removeBookmark({ bookmarkId: bookmark._id, materialId }));
        Toast.show({ type: 'success', text1: 'Bookmark removed' });
      }
    } else {
      dispatch(addBookmark({ materialId, pageNumber: currentPage, label: `Page ${currentPage}` }));
      Toast.show({ type: 'success', text1: `Page ${currentPage} bookmarked` });
    }
  };

  const toggleSearch = () => {
    if (isSearching) {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'closeSearch' }));
      setIsSearching(false);
    } else {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'search', query: '' }));
      setIsSearching(true);
    }
  };

  const toggleDarkReading = () => {
    const newDark = !isDarkReading;
    setIsDarkReading(newDark);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'toggleDark', dark: newDark }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    resetToolbarTimer();
  };

  const handleContinue = (page) => {
    setShowContinueModal(false);
    if (page > 1) {
      setTimeout(() => {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'goToPage', page }));
      }, 300);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  // ─── Colors ────────────────────────────────────────────────────────────────
  const bg = isDark ? '#0A1628' : '#F8FAFC';
  const cardBg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#666';
  const progressPct = totalPages > 0 ? (currentPage / totalPages) : 0;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar hidden={isFullscreen} />

      {/* Header */}
      {!isFullscreen && (
        <LinearGradient colors={isDark ? ['#0A1628', '#152238'] : ['#FFFFFF', '#F8FAFC']}
          style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.pink} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
              {title || 'PDF Viewer'}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleFullscreen} style={styles.headerBtn}>
            <Ionicons name="expand" size={20} color={mutedColor} />
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* WebView PDF Viewer */}
      {!hasError ? (
        <WebView
          ref={webViewRef}
          source={{ html: getPdfHtml(pdfUrl, isDarkReading) }}
          style={styles.webview}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="compatibility"
          allowFileAccess
          originWhitelist={['*']}
          onError={() => setHasError(true)}
          startInLoadingState={false}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.pink} />
          <Text style={[styles.errorText, { color: textColor }]}>Failed to load PDF</Text>
          <Text style={[styles.errorSub, { color: mutedColor }]}>Please check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.pink} />
          <Text style={[styles.loadingText, { color: mutedColor }]}>Loading PDF...</Text>
        </View>
      )}

      {/* Floating Toolbar */}
      {showToolbar && !isLoading && !hasError && (
        <Animated.View style={[styles.toolbar, {
          opacity: toolbarOpacity,
          backgroundColor: isDark ? 'rgba(30,58,95,0.92)' : 'rgba(255,255,255,0.95)',
          bottom: isFullscreen ? 80 : 80 + (insets.bottom || 0),
        }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={toggleBookmark}>
            <Ionicons
              name={isCurrentPageBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isCurrentPageBookmarked ? Colors.pink : mutedColor}
            />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowNoteModal(true)}>
            <Ionicons name="create-outline" size={22} color={mutedColor} />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Note</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={toggleSearch}>
            <Ionicons name={isSearching ? 'close-circle' : 'search'} size={22}
              color={isSearching ? Colors.pink : mutedColor} />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={toggleDarkReading}>
            <Ionicons name={isDarkReading ? 'sunny' : 'moon'} size={22}
              color={isDarkReading ? Colors.gold : mutedColor} />
            <Text style={[styles.toolLabel, { color: mutedColor }]}>
              {isDarkReading ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>

          {isFullscreen && (
            <TouchableOpacity style={styles.toolBtn} onPress={toggleFullscreen}>
              <Ionicons name="contract" size={22} color={mutedColor} />
              <Text style={[styles.toolLabel, { color: mutedColor }]}>Exit</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Page Counter Bar */}
      {!isLoading && !hasError && (
        <View style={[styles.pageBar, {
          backgroundColor: isDark ? 'rgba(30,58,95,0.95)' : 'rgba(255,255,255,0.97)',
          paddingBottom: isFullscreen ? 12 : Math.max(insets.bottom, 12),
        }]}>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#0A1628' : '#E8E8E8' }]}>
            <LinearGradient
              colors={['#FF4F8B', '#FF2E5E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPct * 100}%` }]}
            />
          </View>
          <View style={styles.pageInfo}>
            <Text style={[styles.pageText, { color: textColor }]}>
              Page {currentPage} of {totalPages}
            </Text>
            <Text style={[styles.pctText, { color: Colors.pink }]}>
              {Math.round(progressPct * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Tap area to show toolbar */}
      {!showToolbar && !isLoading && (
        <TouchableOpacity
          style={styles.tapArea}
          activeOpacity={1}
          onPress={resetToolbarTimer}
        />
      )}

      {/* Continue Reading Modal */}
      <ContinueReadingModal
        visible={showContinueModal}
        onContinue={() => handleContinue(progress?.lastPage || 1)}
        onStartOver={() => handleContinue(1)}
        onClose={() => setShowContinueModal(false)}
        progress={progress}
        materialTitle={title}
      />

      {/* Note Modal */}
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
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  errorText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorSub: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryBtn: {
    marginTop: 24, paddingHorizontal: 32, paddingVertical: 12,
    backgroundColor: '#FF4F8B', borderRadius: 24,
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  toolbar: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 10, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  toolBtn: { alignItems: 'center', paddingHorizontal: 8 },
  toolLabel: { fontSize: 10, marginTop: 2 },
  pageBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 8, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
  },
  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  pageInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 6,
  },
  pageText: { fontSize: 13, fontWeight: '600' },
  pctText: { fontSize: 13, fontWeight: '700' },
  tapArea: {
    position: 'absolute', top: '30%', bottom: '30%', left: '20%', right: '20%',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert, Linking, Platform
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getDownloadResourcesAPI, getNcertResourcesAPI } from '../../services/api';
import { checkBlockedSite, silentDownloadFile, getMimeType, normalizeMaterialFileUrl } from '../../utils/fileUtils';
import { API_BASE_URL } from '../../utils/constants';
import { getToken } from '../../services/storage';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { scheduleDownloadCompleteNotification } from '../../services/pushNotifications';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── Brand palette: teal + pink + gold, dark-glass surfaces (client wants low white) ───
const P = {
  bgTop: '#04262A',
  bgBottom: '#0B3D40',
  surface: '#0E4548',
  surfaceAlt: '#0F5155',
  border: 'rgba(22,214,209,0.22)',
  teal: '#16D6D1',
  tealDeep: '#0A8C89',
  pink: '#FF4F8B',
  pinkDeep: '#C2185B',
  gold: '#F4C752',
  goldDeep: '#D89A2B',
  ink: '#04262A',
  textPrimary: '#F4F7F6',
  textSecondary: '#8FC9C6',
  textMuted: '#5FA5A2',
};

const GRADES = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const subjectIcons = {
  English: 'book', Hindi: 'language', Mathematics: 'calculator', Science: 'flask',
  Physics: 'nuclear', Chemistry: 'beaker', Biology: 'leaf', 'Social Science': 'earth',
  EVS: 'globe', Accountancy: 'cash', 'Business Studies': 'briefcase', Economics: 'trending-up',
};
const subjectColors = {
  English: '#8B7DFF', Hindi: '#FF6B6B', Mathematics: '#2BE0A6', Science: '#4FC3F7',
  Physics: '#FF9166', Chemistry: '#FFD166', Biology: '#26E0D9', 'Social Science': '#C29CFF',
  EVS: '#7CF2C4', Accountancy: '#FFB199', 'Business Studies': '#7FB8FF', Economics: '#E5EAF0',
};
const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image', document: 'document', archive: 'archive' };
const typeColors = { pdf: '#FF6B6B', ppt: '#FFA94D', video: '#4FC3F7', image: '#2BE0A6', document: '#C29CFF', archive: '#90A4AE' };

export default function DownloadCenterScreen({ navigation }) {
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [tab, setTab] = useState('ncert');
  const [ncertBooks, setNcertBooks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('All');
  const [downloading, setDownloading] = useState(null); // item._id being downloaded
  const [dlProgress, setDlProgress] = useState({});      // { [itemId]: 0..1 }

  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const insets = useSafeAreaInsets();

  // Hide the default white stack header — this screen renders its own
  // back / title / AI / notification row on the same dark gradient below,
  // so there's no white strip above the gradient anymore.
  useEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (grade !== 'All') params.classNum = grade;
      const [ncertRes, matRes] = await Promise.all([
        getNcertResourcesAPI(params),
        getDownloadResourcesAPI(grade !== 'All' ? { grade } : {}),
      ]);
      setNcertBooks(ncertRes.data.books || []);
      setMaterials(matRes.data.materials || []);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }, [grade]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  /**
   * Open NCERT book — checks if site blocks WebView embedding.
   * NCERT (ncert.nic.in) blocks iframe/WebView via CSP frame-ancestors.
   * We detect this and show an appropriate UI via NcertViewerScreen
   * which handles the fallback gracefully.
   */
  const openNcert = (book) => {
    const blockCheck = checkBlockedSite(book.url);
    if (blockCheck.blocked) {
      // NcertViewerScreen handles the blocked-site UI
      navigation.navigate('NcertViewer', { url: book.url, title: book.title });
    } else {
      // Non-blocked URLs open in DocumentViewer
      navigation.navigate('DocumentViewer', { url: book.url, title: book.title, fileType: 'pdf' });
    }
  };

  /**
   * Silent download — saves to app-private documentDirectory with no share dialog.
   * Shows a progress bar on the card button, fires a local OS notification on
   * completion, and shows an in-app Toast with an "Open" action.
   */
  const downloadFile = async (item) => {
    let directUrl = normalizeMaterialFileUrl(item.fileUrl, {
      resourceType: item?.resourceType,
      publicId: item?.publicId,
    });
    if (!directUrl) { Alert.alert('Error', 'No download URL available'); return; }
    try {
      setDownloading(item._id);
      setDlProgress((prev) => ({ ...prev, [item._id]: 0 }));

      // Web: open in browser (no file-system access on web)
      if (Platform.OS === 'web') {
        await Linking.openURL(directUrl);
        return;
      }

      const filename = item.originalFilename || `${item.title}.${item.extension || 'pdf'}`;
      let file;

      try {
        file = await silentDownloadFile(directUrl, filename, (pct) => {
          setDlProgress((prev) => ({ ...prev, [item._id]: pct }));
        });
      } catch (downloadErr) {
        // Retry via authenticated backend proxy if Cloudinary returns 401/403/404
        const statusText = String(downloadErr?.message || '');
        const shouldRetryViaBackend =
          statusText.includes('401') || statusText.includes('403') || statusText.includes('404');
        if (!shouldRetryViaBackend || !item?._id) throw downloadErr;
        const token = await getToken();
        if (!token) throw downloadErr;
        const proxyUrl = `${API_BASE_URL}/student/materials/${item._id}/direct-download`;
        file = await silentDownloadFile(proxyUrl, filename, (pct) => {
          setDlProgress((prev) => ({ ...prev, [item._id]: pct }));
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      // 1. Fire local OS notification (heads-up banner in status bar)
      await scheduleDownloadCompleteNotification(filename, file.uri);

      // 2. In-app Toast — tapping it opens the file with the native viewer
      Toast.show({
        type: 'success',
        text1: '✅ Download Complete',
        text2: `${filename} — tap to open`,
        visibilityTime: 5000,
        onPress: async () => {
          try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) await Sharing.shareAsync(file.uri, { mimeType: getMimeType(filename) });
          } catch (e) { console.warn('Could not open file:', e); }
        },
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(null);
      setDlProgress((prev) => { const n = { ...prev }; delete n[item._id]; return n; });
    }
  };

  const filteredNcert = ncertBooks.filter((b) => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredMats = materials.filter((m) => {
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderNcertBook = ({ item }) => {
    const sc = subjectColors[item.subject] || P.teal;
    const si = subjectIcons[item.subject] || 'book-outline';
    return (
      <TouchableOpacity style={styles.bookCard} onPress={() => openNcert(item)} activeOpacity={0.85}>
        <View style={[styles.accentStripe, { backgroundColor: sc }]} />

        {/* Signature element: gold seal-ribbon stamping the class number */}
        <View style={styles.ribbonWrap} pointerEvents="none">
          <LinearGradient colors={[P.gold, P.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ribbon}>
            <Text style={styles.ribbonText}>CLASS {item.class}</Text>
          </LinearGradient>
          <View style={styles.ribbonTailLeft} />
          <View style={styles.ribbonTailRight} />
        </View>

        <LinearGradient colors={[sc + '3D', sc + '14']} style={styles.bookIcon}>
          <Ionicons name={si} size={26} color={sc} />
        </LinearGradient>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.bookMeta}>{item.subject} • NCERT</Text>
        </View>
        <TouchableOpacity style={styles.openBtnWrap} onPress={() => openNcert(item)}>
          <LinearGradient colors={[P.pink, P.pinkDeep]} style={styles.openBtn}>
            <Ionicons name="open-outline" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderMaterial = ({ item }) => {
    const tc = typeColors[item.type] || P.teal;
    const ti = typeIcons[item.type] || 'document';
    const isDownloading = downloading === item._id;

    const handlePreview = async () => {
      // PDFs → open in PdfViewerScreen
      if (item.type === 'pdf' && item._id) {
        const normalizedUrl = normalizeMaterialFileUrl(item.fileUrl, {
          resourceType: item?.resourceType,
          publicId: item?.publicId,
        });

        if (item?.resourceType === 'raw' || normalizedUrl.includes('/raw/upload/')) {
          navigation.navigate('DocumentViewer', {
            url: normalizedUrl,
            title: item.title,
            fileType: 'pdf',
            mimeType: item?.mimeType,
            extension: item?.extension || 'pdf',
            filename: item?.originalFilename,
          });
          return;
        }

        try {
          const { getSignedPdfUrlAPI } = require('../../services/api');
          const res = await getSignedPdfUrlAPI(item._id);
          const pdfUrl = res.data?.success
            ? normalizeMaterialFileUrl(res.data.url, {
              resourceType: item?.resourceType,
              publicId: item?.publicId,
            })
            : normalizeMaterialFileUrl(item.fileUrl, {
              resourceType: item?.resourceType,
              publicId: item?.publicId,
            });
          navigation.navigate('PdfViewer', {
            materialId: item._id,
            title: item.title,
            pdfUrl,
            totalPages: res.data?.material?.totalPages || item.totalPages || 0,
          });
        } catch {
          navigation.navigate('PdfViewer', {
            materialId: item._id,
            title: item.title,
            pdfUrl: normalizeMaterialFileUrl(item.fileUrl, {
              resourceType: item?.resourceType,
              publicId: item?.publicId,
            }),
            totalPages: item.totalPages || 0,
          });
        }
        return;
      }
      // Other files → DocumentViewer
      if (item.fileUrl) {
        navigation.navigate('DocumentViewer', {
          url: normalizeMaterialFileUrl(item.fileUrl, {
            resourceType: item?.resourceType,
            publicId: item?.publicId,
          }),
          title: item.title,
          fileType: item.type,
        });
      }
    };

    return (
      <TouchableOpacity style={styles.matCard} onPress={handlePreview} activeOpacity={0.85}>
        <View style={[styles.accentStripe, { backgroundColor: tc }]} />
        <View style={[styles.matIconBox, { backgroundColor: tc + '22', borderColor: tc + '55' }]}>
          <Ionicons name={ti} size={22} color={tc} />
        </View>
        <View style={styles.matInfo}>
          <Text style={styles.matTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.matMeta} numberOfLines={1}>{item.subject}</Text>
          {item.teacher?.name && <Text style={styles.matTeacher}>By {item.teacher.displayName || item.teacher.name}</Text>}
        </View>
        <TouchableOpacity style={styles.dlBtnWrap} onPress={() => downloadFile(item)} disabled={isDownloading}>
          <LinearGradient colors={[P.teal, P.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dlBtn}>
            {isDownloading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
                <ActivityIndicator size="small" color="#fff" />
                {dlProgress[item._id] > 0 && (
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800', position: 'absolute' }}>
                    {Math.round((dlProgress[item._id] || 0) * 100)}%
                  </Text>
                )}
              </View>
            ) : <Ionicons name="download-outline" size={18} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={[P.bgTop, P.bgBottom]} style={styles.ctr}>
        <ActivityIndicator size="large" color={P.gold} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[P.bgTop, P.bgBottom]} style={styles.container}>
      {/* Top bar — back / title, on the same gradient (no white strip) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={P.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Downloads</Text>
      </View>

      {/* Header — pink → gold gradient */}
      <LinearGradient colors={[P.pink, P.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.hRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>📥 Download Center</Text>
            <Text style={styles.hSub}>NCERT books & study materials</Text>
          </View>
          <View style={styles.hBadge}>
            <Ionicons name="library" size={28} color="rgba(255,255,255,0.95)" />
          </View>
        </View>
        <View style={styles.hStats}>
          <View style={styles.hStat}><Ionicons name="book" size={14} color="#fff" /><Text style={styles.hStatTxt}>{ncertBooks.length} NCERT Books</Text></View>
          <View style={styles.hDot} />
          <View style={styles.hStat}><Ionicons name="document" size={14} color="#fff" /><Text style={styles.hStatTxt}>{materials.length} Materials</Text></View>
        </View>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <RNTouchableOpacity style={styles.tabBtnWrap} onPress={() => setTab('ncert')} activeOpacity={0.85}>
          {tab === 'ncert' ? (
            <LinearGradient colors={[P.teal, P.tealDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabBtn}>
              <Ionicons name="school" size={16} color={P.ink} />
              <Text style={styles.tabActiveTxt}>NCERT Books</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tabBtn}>
              <Ionicons name="school" size={16} color={P.textSecondary} />
              <Text style={styles.tabTxt}>NCERT Books</Text>
            </View>
          )}
        </RNTouchableOpacity>
        <RNTouchableOpacity style={styles.tabBtnWrap} onPress={() => setTab('materials')} activeOpacity={0.85}>
          {tab === 'materials' ? (
            <LinearGradient colors={[P.pink, P.pinkDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabBtn}>
              <Ionicons name="folder-open" size={16} color="#fff" />
              <Text style={styles.tabActiveTxt}>Materials</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tabBtn}>
              <Ionicons name="folder-open" size={16} color={P.textSecondary} />
              <Text style={styles.tabTxt}>Materials</Text>
            </View>
          )}
        </RNTouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={P.gold} />
        <TextInput
          style={styles.searchIn}
          placeholder={tab === 'ncert' ? 'Search NCERT books...' : 'Search materials...'}
          placeholderTextColor={P.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={P.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Grade Filter */}
      <FlatList data={GRADES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(i) => i}
        style={{ maxHeight: 50, minHeight: 45, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        renderItem={({ item: g }) => (
          grade === g ? (
            <RNTouchableOpacity onPress={() => setGrade(g)} activeOpacity={0.85}>
              <LinearGradient colors={[P.gold, P.goldDeep]} style={styles.gChip}>
                <Text style={styles.gActiveTxt}>{g === 'All' ? 'All Classes' : `Class ${g}`}</Text>
              </LinearGradient>
            </RNTouchableOpacity>
          ) : (
            <RNTouchableOpacity style={styles.gChipInactive} onPress={() => setGrade(g)} activeOpacity={0.85}>
              <Text style={styles.gText}>{g === 'All' ? 'All Classes' : `Class ${g}`}</Text>
            </RNTouchableOpacity>
          )
        )} />

      {/* Content */}
      {tab === 'ncert' ? (
        <FlatList data={filteredNcert} keyExtractor={(i, idx) => `${i.title}-${idx}`} renderItem={renderNcertBook}
          onScroll={onTabBarScroll} scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: bottomPadding }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="book-outline" size={56} color={P.textMuted} /><Text style={styles.emptyTitle}>No Books Found</Text><Text style={styles.emptySub}>Try a different class or search</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[P.gold]} tintColor={P.gold} />} />
      ) : (
        <FlatList data={filteredMats} keyExtractor={(i) => i._id} renderItem={renderMaterial}
          onScroll={onTabBarScroll} scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: bottomPadding }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="folder-open-outline" size={56} color={P.textMuted} /><Text style={styles.emptyTitle}>No Materials</Text><Text style={styles.emptySub}>No downloadable materials available</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[P.gold]} tintColor={P.gold} />} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ctr: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  topIconBtn: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: P.border,
  },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: P.textPrimary, marginLeft: 12 },

  header: { marginHorizontal: 12, marginTop: 4, marginBottom: 0, borderRadius: 22, padding: 22 },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  hSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  hBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  hStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hStatTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  hDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },

  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 16, borderRadius: 16, padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: P.border, gap: 4 },
  tabBtnWrap: { flex: 1 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabTxt: { fontSize: 13, fontWeight: '700', color: P.textSecondary },
  tabActiveTxt: { fontSize: 13, fontWeight: '800', color: P.ink },

  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 16, marginBottom: 8, borderRadius: 16, paddingHorizontal: 16, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  searchIn: { flex: 1, fontSize: 14, paddingVertical: 11, marginLeft: 8, color: P.textPrimary },

  gChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8 },
  gChipInactive: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 8, borderWidth: 1, borderColor: P.border },
  gText: { fontSize: 12, fontWeight: '700', color: P.textSecondary },
  gActiveTxt: { fontSize: 12, fontWeight: '800', color: P.ink },

  // NCERT book card
  bookCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, paddingRight: 14, marginBottom: 14,
    backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, overflow: 'visible',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  accentStripe: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderRadius: 3 },
  bookIcon: { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14, marginLeft: 6 },
  bookInfo: { flex: 1, paddingRight: 6 },
  bookTitle: { fontSize: 17, fontWeight: '800', color: P.textPrimary },
  bookMeta: { fontSize: 14, marginTop: 4, color: P.textSecondary, fontWeight: '600' },
  openBtnWrap: {},
  openBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Signature gold "seal ribbon" pinned to top-right of each NCERT card
  ribbonWrap: { position: 'absolute', top: -6, right: 12, alignItems: 'center', zIndex: 5 },
  ribbon: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, transform: [{ rotate: '5deg' }],
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
  },
  ribbonText: { fontSize: 10, fontWeight: '800', color: P.ink, letterSpacing: 0.4 },
  ribbonTailLeft: {
    position: 'absolute', left: -3, top: 14, width: 0, height: 0,
    borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 6,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: P.goldDeep,
    transform: [{ rotate: '5deg' }],
  },
  ribbonTailRight: {
    position: 'absolute', right: -3, top: 14, width: 0, height: 0,
    borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 6,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: P.goldDeep,
    transform: [{ rotate: '5deg' }],
  },

  // Material card
  matCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 14,
    backgroundColor: P.surface, borderWidth: 1, borderColor: P.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  matIconBox: { width: 48, height: 48, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginLeft: 6, borderWidth: 1 },
  matInfo: { flex: 1 },
  matTitle: { fontSize: 17, fontWeight: '800', color: P.textPrimary },
  matMeta: { fontSize: 14, marginTop: 4, color: P.textSecondary, fontWeight: '600' },
  matTeacher: { fontSize: 13, marginTop: 4, fontStyle: 'italic', color: P.gold, fontWeight: '600' },
  dlBtnWrap: {},
  dlBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14, color: P.textPrimary },
  emptySub: { color: P.textSecondary, fontSize: 13, marginTop: 4 },
});

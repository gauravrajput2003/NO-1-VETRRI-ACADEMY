import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert, Linking, Platform
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getDownloadResourcesAPI, getNcertResourcesAPI } from '../../services/api';
import { checkBlockedSite, downloadFileToCache, getMimeType } from '../../utils/fileUtils';
import { API_BASE_URL } from '../../utils/constants';
import { getToken } from '../../services/storage';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const GRADES = ['All', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const subjectIcons = {
  English: 'book', Hindi: 'language', Mathematics: 'calculator', Science: 'flask',
  Physics: 'nuclear', Chemistry: 'beaker', Biology: 'leaf', 'Social Science': 'earth',
  EVS: 'globe', Accountancy: 'cash', 'Business Studies': 'briefcase', Economics: 'trending-up',
};
const subjectColors = {
  English: '#6C63FF', Hindi: '#FF6B6B', Mathematics: '#00B894', Science: '#0984E3',
  Physics: '#E17055', Chemistry: '#FDCB6E', Biology: '#00CEC9', 'Social Science': '#A29BFE',
  EVS: '#55EFC4', Accountancy: '#FAB1A0', 'Business Studies': '#74B9FF', Economics: '#DFE6E9',
};
const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image', document: 'document', archive: 'archive' };
const typeColors = { pdf: '#F44336', ppt: '#FF9800', video: '#2196F3', image: '#4CAF50', document: '#9C27B0', archive: '#607D8B' };

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
  const [downloading, setDownloading] = useState(null);
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bg = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const txt = isDark ? Colors.text.dark : Colors.text.light;
  const txtSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

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
   * Download a study material file.
   * Uses expo-file-system for streaming download to cache (avoids RAM issues),
   * then opens share sheet via expo-sharing for saving/opening.
   */
  const downloadFile = async (item) => {
    if (!item.fileUrl) { Alert.alert('Error', 'No download URL available'); return; }
    try {
      setDownloading(item._id);
      
      // On Web, use the proxy endpoint to force a proper attachment download
      if (Platform.OS === 'web') {
        const token = await getToken();
        // If it has an _id, it's a study material in our DB. Use the proxy to force correct filename.
        if (item._id && !item.url?.includes('ncert.nic.in')) {
          const downloadUrl = `${API_BASE_URL}/student/materials/${item._id}/direct-download?token=${token}`;
          await Linking.openURL(downloadUrl);
        } else {
          // Fallback for external links (NCERT)
          await Linking.openURL(item.fileUrl || item.url);
        }
      } else {
        // On Native, download to cache and share
        const filename = item.originalFilename || `${item.title}.${item.extension || 'pdf'}`;
        const file = await downloadFileToCache(item.fileUrl, filename);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: getMimeType(filename),
            dialogTitle: `Save ${filename}`,
          });
        } else {
          Alert.alert('Downloaded', `File saved: ${filename}`);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(null);
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
    const sc = subjectColors[item.subject] || Colors.primary;
    const si = subjectIcons[item.subject] || 'book-outline';
    return (
      <TouchableOpacity style={[styles.bookCard, { backgroundColor: cardBg }]} onPress={() => openNcert(item)} activeOpacity={0.8}>
        <LinearGradient colors={[sc + '20', sc + '08']} style={styles.bookIcon}>
          <Ionicons name={si} size={28} color={sc} />
        </LinearGradient>
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: txt }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.bookMeta, { color: txtSec }]}>Class {item.class} • {item.subject}</Text>
        </View>
        <View style={styles.bookActions}>
          <TouchableOpacity style={[styles.openBtn, { backgroundColor: sc }]} onPress={() => openNcert(item)}>
            <Ionicons name="open-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMaterial = ({ item }) => {
    const tc = typeColors[item.type] || Colors.primary;
    const ti = typeIcons[item.type] || 'document';
    const isDownloading = downloading === item._id;

    const handlePreview = async () => {
      // PDFs → open in PdfViewerScreen
      if (item.type === 'pdf' && item._id) {
        try {
          const { getSignedPdfUrlAPI } = require('../../services/api');
          const res = await getSignedPdfUrlAPI(item._id);
          const pdfUrl = res.data?.success ? res.data.url : item.fileUrl;
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
            pdfUrl: item.fileUrl,
            totalPages: item.totalPages || 0,
          });
        }
        return;
      }
      // Other files → DocumentViewer
      if (item.fileUrl) {
        navigation.navigate('DocumentViewer', {
          url: item.fileUrl,
          title: item.title,
          fileType: item.type,
        });
      }
    };

    return (
      <TouchableOpacity style={[styles.matCard, { backgroundColor: cardBg }]} onPress={handlePreview} activeOpacity={0.8}>
        <View style={[styles.matIconBox, { backgroundColor: tc + '18' }]}>
          <Ionicons name={ti} size={24} color={tc} />
        </View>
        <View style={styles.matInfo}>
          <Text style={[styles.matTitle, { color: txt }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.matMeta, { color: txtSec }]}>{item.subject} • {item.type?.toUpperCase()}{item.fileSize ? ` • ${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}</Text>
          {item.teacher?.name && <Text style={[styles.matTeacher, { color: txtSec }]}>By {item.teacher.displayName || item.teacher.name}</Text>}
        </View>
        <TouchableOpacity style={[styles.dlBtn, { backgroundColor: tc }]} onPress={() => downloadFile(item)} disabled={isDownloading}>
          {isDownloading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[styles.ctr, { backgroundColor: bg }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header — pink gradient */}
      <LinearGradient colors={['#FF4FA3', '#C2185B']} style={styles.header}>
        <View style={styles.hRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>📥 Download Center</Text>
            <Text style={styles.hSub}>NCERT books & study materials</Text>
          </View>
          <View style={styles.hBadge}>
            <Ionicons name="library" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
        <View style={styles.hStats}>
          <View style={styles.hStat}><Ionicons name="book" size={14} color="rgba(255,255,255,0.8)" /><Text style={styles.hStatTxt}>{ncertBooks.length} NCERT Books</Text></View>
          <View style={styles.hStat}><Ionicons name="document" size={14} color="rgba(255,255,255,0.8)" /><Text style={styles.hStatTxt}>{materials.length} Materials</Text></View>
        </View>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'ncert' && styles.tabActive]} onPress={() => setTab('ncert')}>
          <Ionicons name="school" size={16} color={tab === 'ncert' ? '#fff' : '#FF4FA3'} />
          <Text style={[styles.tabTxt, tab === 'ncert' && styles.tabActiveTxt]}>NCERT Books</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'materials' && styles.tabActive]} onPress={() => setTab('materials')}>
          <Ionicons name="folder-open" size={16} color={tab === 'materials' ? '#fff' : '#FF4FA3'} />
          <Text style={[styles.tabTxt, tab === 'materials' && styles.tabActiveTxt]}>Materials</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
        <Ionicons name="search-outline" size={18} color={Colors.mediumGray} />
        <TextInput style={[styles.searchIn, { color: txt }]} placeholder={tab === 'ncert' ? 'Search NCERT books...' : 'Search materials...'} placeholderTextColor={Colors.mediumGray} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={Colors.mediumGray} /></TouchableOpacity> : null}
      </View>

      {/* Grade Filter */}
      <FlatList data={GRADES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(i) => i}
        style={{ maxHeight: 50, minHeight: 45, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        renderItem={({ item: g }) => (
          <TouchableOpacity style={[styles.gChip, grade === g && styles.gActive]} onPress={() => setGrade(g)}>
            <Text style={[styles.gText, grade === g && styles.gActiveTxt]}>{g === 'All' ? 'All Classes' : `Class ${g}`}</Text>
          </TouchableOpacity>
        )} />

      {/* Content */}
      {tab === 'ncert' ? (
        <FlatList data={filteredNcert} keyExtractor={(i, idx) => `${i.title}-${idx}`} renderItem={renderNcertBook}
          onScroll={onTabBarScroll} scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: bottomPadding }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="book-outline" size={56} color={Colors.mediumGray} /><Text style={[styles.emptyTitle, { color: txt }]}>No Books Found</Text><Text style={{ color: txtSec, fontSize: 13, marginTop: 4 }}>Try a different class or search</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />} />
      ) : (
        <FlatList data={filteredMats} keyExtractor={(i) => i._id} renderItem={renderMaterial}
          onScroll={onTabBarScroll} scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: bottomPadding }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="folder-open-outline" size={56} color={Colors.mediumGray} /><Text style={[styles.emptyTitle, { color: txt }]}>No Materials</Text><Text style={{ color: txtSec, fontSize: 13, marginTop: 4 }}>No downloadable materials available</Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[Colors.primary]} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, ctr: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginHorizontal: 12, marginTop: 14, marginBottom: 0, borderRadius: 20, padding: 22 },
  hRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  hSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  hBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hStats: { flexDirection: 'row', gap: 16, marginTop: 14 },
  hStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hStatTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 16, borderRadius: 16, padding: 4, backgroundColor: '#FFE4F0' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11, gap: 6 },
  tabActive: { backgroundColor: '#FF4FA3' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: '#FF4FA3' },
  tabActiveTxt: { color: '#fff' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 16, marginBottom: 8, borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  searchIn: { flex: 1, fontSize: 14, paddingVertical: 11, marginLeft: 8 },
  gChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFE4F0', marginRight: 8, borderWidth: 1, borderColor: '#FFB3D0' },
  gActive: { backgroundColor: '#FF4FA3', borderColor: '#FF4FA3' },
  gText: { fontSize: 12, fontWeight: '700', color: '#FF4FA3' },
  gActiveTxt: { color: '#fff' },
  bookCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14, backgroundColor: '#FFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 },
  bookIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '700' },
  bookMeta: { fontSize: 12, marginTop: 3 },
  bookActions: { flexDirection: 'row', gap: 8 },
  openBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  matCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 14, backgroundColor: '#FFF', shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5 },
  matIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  matInfo: { flex: 1 },
  matTitle: { fontSize: 15, fontWeight: '600' },
  matMeta: { fontSize: 11, marginTop: 2 },
  matTeacher: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  dlBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
});

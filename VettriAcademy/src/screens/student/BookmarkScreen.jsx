import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { fetchAllBookmarks, removeBookmark } from '../../redux/slices/pdfSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';

export default function BookmarkScreen({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const tabPadding = useBottomTabBarPadding();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const { allBookmarks, loading } = useSelector((s) => s.pdf);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchAllBookmarks());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchAllBookmarks());
    setRefreshing(false);
  }, []);

  const handleDelete = (bookmark) => {
    Alert.alert('Remove Bookmark', `Remove bookmark for Page ${bookmark.pageNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          dispatch(removeBookmark({
            bookmarkId: bookmark._id,
            materialId: bookmark.materialId?._id || bookmark.materialId,
          }));
          Toast.show({ type: 'success', text1: 'Bookmark removed' });
        },
      },
    ]);
  };

  const handleOpen = (bookmark) => {
    const material = bookmark.materialId;
    if (!material) return;
    navigation.navigate('PdfViewer', {
      materialId: material._id,
      title: material.title,
      pdfUrl: '', // Will be fetched by PdfViewerScreen
      initialPage: bookmark.pageNumber,
    });
  };

  // Filter and group bookmarks
  const filtered = allBookmarks.filter((b) => {
    if (!search) return true;
    const title = b.materialId?.title || '';
    const label = b.label || '';
    return title.toLowerCase().includes(search.toLowerCase()) ||
      label.toLowerCase().includes(search.toLowerCase());
  });

  // Group by material
  const grouped = {};
  filtered.forEach((b) => {
    const key = b.materialId?._id || 'unknown';
    if (!grouped[key]) {
      grouped[key] = {
        material: b.materialId || { title: 'Unknown Material' },
        bookmarks: [],
      };
    }
    grouped[key].bookmarks.push(b);
  });
  const sections = Object.values(grouped);

  const bg = isDark ? '#0A1628' : '#F8FAFC';
  const cardBg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';
  const borderColor = isDark ? '#30475E' : '#F0F0F0';

  const renderBookmark = (bookmark) => (
    <TouchableOpacity
      key={bookmark._id}
      style={[styles.bookmarkItem, { borderBottomColor: borderColor }]}
      onPress={() => handleOpen(bookmark)}
      onLongPress={() => handleDelete(bookmark)}
    >
      <View style={styles.pageIcon}>
        <Ionicons name="bookmark" size={16} color={Colors.pink} />
      </View>
      <View style={styles.bookmarkContent}>
        <Text style={[styles.bookmarkLabel, { color: textColor }]}>
          {bookmark.label || `Page ${bookmark.pageNumber}`}
        </Text>
        <Text style={[styles.bookmarkMeta, { color: mutedColor }]}>
          Page {bookmark.pageNumber} · {new Date(bookmark.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short',
          })}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(bookmark)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#E74C3C" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSection = ({ item }) => (
    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text" size={18} color={Colors.teal} />
        <Text style={[styles.sectionTitle, { color: textColor }]} numberOfLines={1}>
          {item.material.title}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{item.bookmarks.length}</Text>
        </View>
      </View>
      {item.bookmarks.map(renderBookmark)}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: cardBg, borderColor }]}>
        <Ionicons name="search" size={18} color={mutedColor} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search bookmarks..."
          placeholderTextColor={mutedColor}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={mutedColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {sections.length === 0 && !loading.bookmarks ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={64} color={mutedColor} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Bookmarks Yet</Text>
          <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
            Open a PDF and tap the bookmark icon to save pages
          </Text>
        </View>
      ) : (
        <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}
          data={sections}
          keyExtractor={(item) => item.material._id || Math.random().toString()}
          renderItem={renderSection}
          contentContainerStyle={{ paddingBottom: tabPadding + 20, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pink} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sectionCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  countBadge: {
    backgroundColor: Colors.pink, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, minWidth: 24, alignItems: 'center',
  },
  countText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bookmarkItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, gap: 10,
  },
  pageIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,79,139,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  bookmarkContent: { flex: 1 },
  bookmarkLabel: { fontSize: 14, fontWeight: '600' },
  bookmarkMeta: { fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});

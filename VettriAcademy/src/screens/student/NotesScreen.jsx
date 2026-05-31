import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity as RNTouchableOpacity, RefreshControl,
  Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { fetchAllBookmarks, deleteNote } from '../../redux/slices/pdfSlice';
import { getAllBookmarksAPI, getMaterialNotesAPI } from '../../services/api';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import NoteModal from '../../components/NoteModal';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest} />
    </ParticleWrapper>
  );
};


const NOTE_COLOR_MAP = {
  yellow: '#FFF9C4', green: '#C8E6C9', blue: '#BBDEFB', pink: '#F8BBD0', purple: '#E1BEE7',
};

export default function NotesScreen({ navigation }) {
  const dispatch = useDispatch();
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const tabPadding = useBottomTabBarPadding();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editNote, setEditNote] = useState(null);
  const [editMaterialId, setEditMaterialId] = useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      // Fetch all bookmarks to get material list, then fetch notes per material
      const bookmarkRes = await getAllBookmarksAPI();
      const materialIds = new Set();
      (bookmarkRes.data.bookmarks || []).forEach((b) => {
        if (b.materialId?._id) materialIds.add(b.materialId._id);
      });

      // Also try fetching notes directly (we'll use a broader approach)
      // For simplicity, fetch from the Redux store materials
      const allNotes = [];
      for (const mid of materialIds) {
        try {
          const notesRes = await getMaterialNotesAPI(mid);
          if (notesRes.data.notes) {
            notesRes.data.notes.forEach((n) => allNotes.push({ ...n, materialTitle: '' }));
          }
        } catch (e) {}
      }
      setNotes(allNotes);
    } catch (err) {
      console.warn('Failed to fetch notes:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, []);

  const handleDelete = (note) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          dispatch(deleteNote({ noteId: note._id, materialId: note.materialId }));
          setNotes((prev) => prev.filter((n) => n._id !== note._id));
          Toast.show({ type: 'success', text1: 'Note deleted' });
        },
      },
    ]);
  };

  const handleEdit = (note) => {
    setEditNote(note);
    setEditMaterialId(note.materialId);
  };

  const filtered = notes.filter((n) => {
    if (!search) return true;
    return n.noteText.toLowerCase().includes(search.toLowerCase());
  });

  const bg = isDark ? '#0A1628' : '#F8FAFC';
  const cardBg = isDark ? '#1E3A5F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const mutedColor = isDark ? '#8899AA' : '#888';
  const borderColor = isDark ? '#30475E' : '#F0F0F0';

  const renderNote = ({ item }) => {
    const noteColor = NOTE_COLOR_MAP[item.color] || NOTE_COLOR_MAP.yellow;
    return (
      <TouchableOpacity
        style={[styles.noteCard, { backgroundColor: cardBg, borderColor, borderLeftColor: noteColor, borderLeftWidth: 4 }]}
        onPress={() => handleEdit(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.noteHeader}>
          <View style={[styles.pageBadge, { backgroundColor: noteColor }]}>
            <Text style={styles.pageBadgeText}>Page {item.pageNumber}</Text>
          </View>
          <Text style={[styles.noteDate, { color: mutedColor }]}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short',
            })}
          </Text>
        </View>
        <Text style={[styles.noteText, { color: textColor }]} numberOfLines={4}>
          {item.noteText}
        </Text>
        <View style={styles.noteActions}>
          <TouchableOpacity style={styles.noteAction} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={16} color={Colors.teal} />
            <Text style={[styles.noteActionText, { color: Colors.teal }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.noteAction} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color="#E74C3C" />
            <Text style={[styles.noteActionText, { color: '#E74C3C' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: cardBg, borderColor }]}>
        <Ionicons name="search" size={18} color={mutedColor} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search notes..."
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

      {filtered.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={mutedColor} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Notes Yet</Text>
          <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
            Open a PDF and tap the note icon to add notes to pages
          </Text>
        </View>
      ) : (
        <FlatList onScroll={onTabBarScroll} scrollEventThrottle={16}
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderNote}
          contentContainerStyle={{ paddingBottom: tabPadding + 20, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.pink} />
          }
        />
      )}

      {/* Edit Note Modal */}
      <NoteModal
        visible={!!editNote}
        onClose={() => setEditNote(null)}
        onSave={() => {
          setEditNote(null);
          fetchNotes();
          Toast.show({ type: 'success', text1: 'Note updated' });
        }}
        existingNote={editNote}
        pageNumber={editNote?.pageNumber}
        materialId={editMaterialId}
      />
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
  noteCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1,
    padding: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  pageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pageBadgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  noteDate: { fontSize: 11 },
  noteText: { fontSize: 14, lineHeight: 20 },
  noteActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  noteAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteActionText: { fontSize: 12, fontWeight: '600' },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});

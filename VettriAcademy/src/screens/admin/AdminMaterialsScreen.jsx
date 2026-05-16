import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fetchAdminMaterials, deleteAdminMaterial, toggleAdminMaterialLock } from '../../redux/slices/adminSlice';

const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image' };
const typeColors = { pdf: '#F44336', ppt: '#FF9800', video: '#2196F3', image: '#4CAF50' };

export default function AdminMaterialsScreen() {
  const dispatch = useDispatch();
  const { materials, loading } = useSelector((s) => s.admin);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const borderCol = isDark ? Colors.border.dark : Colors.border.light;

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchAdminMaterials());
  }, [dispatch]);

  const handleToggleLock = (material) => {
    const action = material.lockedForAll ? 'Unlock for all' : 'Lock for all';
    Alert.alert(`${action}?`, `${material.title}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          const result = await dispatch(toggleAdminMaterialLock({ id: material._id, lockedForAll: !material.lockedForAll }));
          if (toggleAdminMaterialLock.fulfilled.match(result)) {
            Toast.show({ type: 'success', text1: !material.lockedForAll ? 'Locked! 🔒' : 'Unlocked! 🔓' });
          }
        },
      },
    ]);
  };

  const handleDelete = (material) => {
    Alert.alert('Delete Material?', `Are you sure you want to delete "${material.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const result = await dispatch(deleteAdminMaterial(material._id));
        if (deleteAdminMaterial.fulfilled.match(result)) {
          Toast.show({ type: 'success', text1: 'Material deleted' });
        } else {
          Toast.show({ type: 'error', text1: 'Delete failed', text2: result.payload });
        }
      }},
    ]);
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.teacher?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMaterial = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={[styles.iconBox, { backgroundColor: (typeColors[item.type] || Colors.primary) + '18' }]}>
        <Ionicons name={typeIcons[item.type] || 'document'} size={24} color={typeColors[item.type] || Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.sub, { color: textSec }]}>{item.subject} • {item.grade} • {formatFileSize(item.fileSize)}</Text>
        <Text style={[styles.teacher, { color: Colors.primary }]}>By: {item.teacher?.name || 'Unknown'}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
          {item.lockedForAll ? (
             <Text style={[styles.statusText, { color: Colors.error }]}>🔒 Locked</Text>
          ) : (
             <Text style={[styles.statusText, { color: Colors.success }]}>🔓 Unlocked</Text>
          )}
        </View>
      </View>
      <View style={styles.actionCol}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: item.lockedForAll ? Colors.error + '14' : Colors.success + '14' }]} onPress={() => handleToggleLock(item)}>
          <Ionicons name={item.lockedForAll ? 'lock-closed' : 'lock-open'} size={18} color={item.lockedForAll ? Colors.error : Colors.success} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error + '14', marginTop: 8 }]} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.filterSection}>
        <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={20} color={textSec} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search by title, subject or teacher..."
            placeholderTextColor={textSec}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={64} color={Colors.mediumGray} />
              <Text style={[styles.emptyText, { color: textSec }]}>No materials found</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => dispatch(fetchAdminMaterials())}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 12, ...Shadows.light },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 2 },
  teacher: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionCol: { marginLeft: 10, alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, marginTop: 12, fontWeight: '600' },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { fetchMaterials } from '../../redux/slices/materialsSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


const typeIcons = { pdf: 'document-text', ppt: 'easel', video: 'videocam', image: 'image' };
const typeColors = { pdf: '#F44336', ppt: '#FF9800', video: '#2196F3', image: '#4CAF50' };

export default function MaterialsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.materials);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchMaterials()); }, []);

  const filteredMaterials = list.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search && !m.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderMaterial = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg }]}
      onPress={() => navigation.navigate('MaterialDetail', { material: item })}
    >
      <View style={[styles.iconBox, { backgroundColor: (typeColors[item.type] || Colors.primary) + '18' }]}>
        <Ionicons name={typeIcons[item.type] || 'document'} size={24} color={typeColors[item.type] || Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.cardSub, { color: textSec }]}>{item.subject} • {formatFileSize(item.fileSize)}</Text>
        <Text style={[styles.cardDate, { color: textSec }]}>{formatDate(item.createdAt)}</Text>
      </View>
      {item.isLocked ? (
        <Ionicons name="lock-closed" size={20} color={Colors.mediumGray} />
      ) : (
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
      )}
    </TouchableOpacity>
  );

  const types = ['all', 'pdf', 'ppt', 'video', 'image'];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
        <Ionicons name="search-outline" size={20} color={Colors.mediumGray} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search materials..."
          placeholderTextColor={Colors.mediumGray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filter */}
      <View style={styles.filterRow}>
        {types.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, typeFilter === t && styles.filterActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.filterText, typeFilter === t && styles.filterActiveText]}>
              {t === 'all' ? 'All' : t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredMaterials}
          keyExtractor={(item) => item._id}
          renderItem={renderMaterial}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={48} color={Colors.mediumGray} />
              <Text style={[styles.emptyText, { color: textSec }]}>No materials found</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => dispatch(fetchMaterials())} colors={[Colors.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12, paddingHorizontal: 14, gap: 8, ...Shadows.light },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,20,147,0.08)' },
  filterActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  filterActiveText: { color: Colors.white },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.light },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  cardDate: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { getInitials } from '../../utils/formatters';
import { fetchTeacherStudents } from '../../redux/slices/teacherSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';

export default function StudentsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { students, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  useEffect(() => { dispatch(fetchTeacherStudents()); }, []);

  const filtered = students.filter((s) =>
    (s.name || s.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderStudent = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.displayName || item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: textColor }]}>{item.displayName || item.name}</Text>
        <Text style={[styles.detail, { color: textSec }]}>Grade {item.grade || 'N/A'} • {item.board || 'N/A'}</Text>
        {item.mobile && <Text style={[styles.detail, { color: textSec }]}>📞 {item.mobile}</Text>}
      </View>
      <View style={styles.statusDot}>
        <View style={[styles.dot, { backgroundColor: item.isOnline ? Colors.success : Colors.mediumGray }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
        <Ionicons name="search-outline" size={20} color={Colors.mediumGray} />
        <TextInput style={[styles.searchInput, { color: textColor }]} placeholder="Search students..." placeholderTextColor={Colors.mediumGray} value={search} onChangeText={setSearch} />
      </View>

      <Text style={[styles.count, { color: textSec }]}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderStudent}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No students assigned</Text></View>}
          refreshing={loading}
          onRefresh={() => dispatch(fetchTeacherStudents())}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12, paddingHorizontal: 14, gap: 8, ...Shadows.light },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  count: { paddingHorizontal: 20, fontSize: 13, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, ...Shadows.light },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 13, marginTop: 2 },
  statusDot: { padding: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
});

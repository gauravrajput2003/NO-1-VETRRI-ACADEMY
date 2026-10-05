import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSchedulesAPI } from '../../services/api';
import { getScheduleDateRange, shiftScheduleDate } from '../../utils/scheduleDateRange';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'date', label: 'Specific date' },
];
const STATUS_COLORS = { scheduled: '#0284C7', live: '#059669', completed: '#64748B', cancelled: '#DC2626' };
const PAGE_SIZE = 50;
const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminClassOverviewScreen({ navigation }) {
  const isDark = useSelector((s) => s.ui.theme === 'dark');
  const bottomPadding = useBottomTabBarPadding();
  const [period, setPeriod] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateDraft, setDateDraft] = useState('');
  const [dateError, setDateError] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const loadedCount = useRef(0);
  const range = useMemo(() => getScheduleDateRange(period, selectedDate), [period, selectedDate]);
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    secondary: isDark ? '#CBD5E1' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
  };

  const loadPage = useCallback(async (reset = false) => {
    if (!reset && loadingRef.current) return;
    const id = reset ? ++requestId.current : requestId.current;
    const page = reset ? 1 : pageRef.current + 1;
    loadingRef.current = true;
    setError('');
    if (reset) {
      setLoading(true);
      setLoadingMore(false);
      setSchedules([]);
      setTotal(null);
      setHasMore(false);
      loadedCount.current = 0;
    } else {
      setLoadingMore(true);
    }
    try {
      const { data } = await getSchedulesAPI({ from: range.from, to: range.to, page, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      const items = data.schedules || [];
      const count = Number(data.total || 0);
      pageRef.current = page;
      loadedCount.current = reset ? items.length : loadedCount.current + items.length;
      setSchedules((previous) => reset ? items : [...new Map([...previous, ...items].map((item) => [item._id, item])).values()]);
      setTotal(count);
      setHasMore(items.length > 0 && loadedCount.current < count);
    } catch (err) {
      if (id === requestId.current) setError(err.response?.data?.message || 'Unable to load classes. Please try again.');
    } finally {
      if (id === requestId.current) {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [range.from, range.to]);

  useFocusEffect(useCallback(() => {
    loadPage(true);
    return () => { requestId.current += 1; loadingRef.current = false; };
  }, [loadPage]));

  const openDatePicker = () => {
    setDateDraft(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`);
    setDateError('');
    setShowDatePicker(true);
  };

  const applyWebDate = () => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateDraft.trim());
    if (!match) { setDateError('Enter a date as YYYY-MM-DD.'); return; }
    const [, year, month, day] = match.map(Number);
    const next = new Date(year, month - 1, day);
    if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) {
      setDateError('Please enter a valid calendar date.');
      return;
    }
    setSelectedDate(next);
    setShowDatePicker(false);
  };

  const rangeLabel = period === 'monthly'
    ? selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : period === 'weekly'
      ? `${formatDate(range.start)} – ${formatDate(range.end)}`
      : formatDate(selectedDate);

  const renderClass = ({ item }) => (
    <View style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.classTop}>
        <Text style={[styles.classTitle, { color: colors.text }]}>{item.title || item.subject || 'Class'}</Text>
        <Text
          accessibilityLabel={`${item.status || 'scheduled'}, ${item.studentsJoined ?? 'unknown number of'} students joined`}
          style={[styles.status, { color: STATUS_COLORS[item.status] || colors.secondary }]}
        >{item.status || 'scheduled'}({item.studentsJoined ?? '—'})</Text>
      </View>
      <View style={styles.teacherRow}>
        <Ionicons name="person-outline" size={16} color="#0D9488" />
        <Text style={[styles.teacherName, { color: colors.text }]}>{item.teacherId?.displayName || item.teacherId?.name || 'Teacher unavailable'}</Text>
      </View>
      <Text style={[styles.details, { color: colors.secondary }]}>{[item.subject, item.grade && `Grade ${item.grade}`, item.course].filter(Boolean).join(' · ')}</Text>
      <View style={styles.timeRow}>
        <Ionicons name="calendar-outline" size={15} color={colors.secondary} />
        <Text style={[styles.details, { color: colors.secondary }]}>{formatDate(item.scheduledDate)} · {item.scheduledTime} · {item.durationMinutes || 60} min</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['#115E59', '#0D9488']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={styles.backButton}>
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Class Schedule Overview</Text>
          <Text style={styles.subtitle}>All teachers · All scheduled classes</Text>
        </View>
      </LinearGradient>

      <View style={styles.filters}>
        <View style={styles.periods}>
          {PERIODS.map((option) => (
            <TouchableOpacity key={option.value} accessibilityRole="button" accessibilityState={{ selected: period === option.value }} onPress={() => {
              setPeriod(option.value);
              if (option.value === 'date') openDatePicker();
            }} style={[styles.periodButton, { backgroundColor: period === option.value ? '#0D9488' : colors.card, borderColor: colors.border }]}>
              <Text style={[styles.periodText, { color: period === option.value ? '#FFFFFF' : colors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.dateSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity accessibilityLabel="Previous period" onPress={() => setSelectedDate(shiftScheduleDate(period, selectedDate, -1))} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openDatePicker} accessibilityLabel="Choose date" style={styles.dateLabelButton}>
            <Text style={[styles.dateLabel, { color: colors.text }]}>{rangeLabel}</Text>
            <Text style={[styles.dateHint, { color: colors.secondary }]}>Tap to choose a date{period === 'weekly' ? ' · Mon–Sun' : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Next period" onPress={() => setSelectedDate(shiftScheduleDate(period, selectedDate, 1))} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: colors.text }]}>{total === null ? '—' : total} {total === 1 ? 'class' : 'classes'}</Text>
          <TouchableOpacity onPress={() => setSelectedDate(new Date())} accessibilityRole="button">
            <Text style={styles.todayLink}>Today</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.countNote, { color: colors.secondary }]}>Total for this period, including completed and cancelled classes.</Text>
      </View>

      {loading && !refreshing ? <View style={styles.loading}><ActivityIndicator size="large" color="#0D9488" /></View> : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item._id}
          renderItem={renderClass}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPage(true); }} colors={['#0D9488']} />}
          onEndReached={() => { if (hasMore && !error) loadPage(); }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={error ? <View style={[styles.errorCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.details, { color: colors.text }]}>{error}</Text>
            <TouchableOpacity onPress={() => loadPage(schedules.length === 0)}><Text style={styles.todayLink}>Retry</Text></TouchableOpacity>
          </View> : null}
          ListEmptyComponent={!error ? <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={44} color="#0D9488" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No classes in this period</Text>
            <Text style={[styles.emptyText, { color: colors.secondary }]}>Choose another date or pull down to refresh.</Text>
          </View> : null}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color="#0D9488" /> : hasMore && !error ? <TouchableOpacity onPress={() => loadPage()} style={styles.footer}><Text style={styles.todayLink}>Load more classes</Text></TouchableOpacity> : null}
        />
      )}

      {showDatePicker && Platform.OS === 'android' && <DateTimePicker value={selectedDate} mode="date" onChange={(event, date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && date) setSelectedDate(date);
      }} />}
      <Modal visible={showDatePicker && Platform.OS !== 'android'} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dateModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Choose date</Text>
            {Platform.OS === 'ios' ? <DateTimePicker value={selectedDate} mode="date" display="inline" themeVariant={isDark ? 'dark' : 'light'} onChange={(_, date) => { if (date) setSelectedDate(date); }} /> : <>
              <TextInput accessibilityLabel="Date in YYYY-MM-DD format" placeholder="YYYY-MM-DD" placeholderTextColor={colors.secondary} value={dateDraft} onChangeText={setDateDraft} style={[styles.webDateInput, { color: colors.text, borderColor: colors.border }]} />
              {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}
            </>}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={[styles.periodText, { color: colors.secondary }]}>Close</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Platform.OS === 'web' ? applyWebDate() : setShowDatePicker(false)}><Text style={styles.todayLink}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backButton: { padding: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 21, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#CCFBF1', marginTop: 4 },
  filters: { padding: 16, gap: 12 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  periodText: { fontSize: 13, fontWeight: '700' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingVertical: 10 },
  dateArrow: { padding: 10 },
  dateLabelButton: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  dateHint: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 26, fontWeight: '900' },
  countNote: { fontSize: 11 },
  todayLink: { color: '#0D9488', fontWeight: '800', fontSize: 14, paddingVertical: 8 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  classCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12, gap: 8 },
  classTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  classTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize', paddingTop: 3 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teacherName: { flex: 1, fontSize: 14, fontWeight: '700' },
  details: { fontSize: 12, lineHeight: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  errorCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  footer: { padding: 16, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  dateModal: { borderRadius: 20, padding: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  webDateInput: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  dateError: { color: '#DC2626', marginTop: 8 },
});

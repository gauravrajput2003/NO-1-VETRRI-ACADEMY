import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, Modal, ActivityIndicator, Platform, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { formatDate } from '../../utils/formatters';
import { applyLeave, fetchLeaves } from '../../redux/slices/teacherSlice';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import ParticleWrapper from '../../components/effects/ParticleWrapper';
import { LinearGradient } from 'expo-linear-gradient';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

const THEME = {
  primaryPink: '#FF4D8D',
  lightPink: '#FF7EB3',
  primaryTeal: '#14C8C4',
  lightTeal: '#6EE7E5',
  orange: '#FFA726',
  white: '#FFFFFF',
  background: '#F8F7FC',
};

export default function LeaveScreen() {
  const dispatch = useDispatch();
  const { leaves, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showFromPickerWeb, setShowFromPickerWeb] = useState(false);
  const [showToPickerWeb, setShowToPickerWeb] = useState(false);

  const bgColor = isDark ? Colors.background.dark : THEME.background;
  const cardBg = isDark ? Colors.card.dark : THEME.white;
  const textColor = isDark ? Colors.text.dark : '#333333';
  const textSec = isDark ? Colors.textSecondary.dark : '#888888';
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  useEffect(() => { dispatch(fetchLeaves()); }, []);

  const statusColors = { pending: THEME.orange, approved: '#4CAF50', rejected: '#F44336' };
  const statusGradients = {
    pending: ['#FFA726', '#FF9800'],
    approved: ['#66BB6A', '#4CAF50'],
    rejected: ['#EF5350', '#F44336']
  };
  const leaveTypeIcons = {
    sick: 'medical',
    personal: 'person',
    emergency: 'warning',
    other: 'calendar'
  };
  const leaveTypes = ['sick', 'personal', 'emergency', 'other'];

  const toYMD = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = `${dateObj.getMonth() + 1}`.padStart(2, '0');
    const dd = `${dateObj.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dateOptions = Array.from({ length: 90 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: toYMD(d),
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    };
  });

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }
    const result = await dispatch(applyLeave(form));
    if (applyLeave.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Leave Applied ✅' });
      setShowForm(false);
      setForm({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });
    } else {
      Toast.show({ type: 'error', text1: 'Failed', text2: result.payload });
    }
  };

  const getStats = () => {
    return {
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      total: leaves.length,
    };
  };

  const stats = getStats();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        onScroll={onTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* HERO SECTION */}
        <LinearGradient
          colors={[THEME.primaryPink, THEME.lightPink]}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>Leave Management</Text>
              <Text style={styles.heroSubtitle}>Track and manage your leave requests</Text>
            </View>
            <View style={styles.heroIconContainer}>
              <Ionicons name="calendar" size={40} color={THEME.white} style={{ opacity: 0.9 }} />
            </View>
          </View>
          {/* Decorative Circles */}
          <View style={[styles.heroCircle, { top: -20, right: -20, width: 100, height: 100, borderRadius: 50, opacity: 0.1 }]} />
          <View style={[styles.heroCircle, { bottom: -30, left: 20, width: 60, height: 60, borderRadius: 30, opacity: 0.15 }]} />
          <Ionicons name="sparkles" size={16} color={THEME.white} style={[styles.heroSparkle, { top: 40, right: 100 }]} />
          <Ionicons name="sparkles" size={24} color={THEME.white} style={[styles.heroSparkle, { bottom: 30, left: '40%' }]} />
        </LinearGradient>

        {/* SUMMARY CARDS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: THEME.orange }]}>{stats.pending}</Text>
            <View style={styles.statLabelRow}>
              <View style={[styles.statDot, { backgroundColor: THEME.orange }]} />
              <Text style={[styles.statLabel, { color: textSec }]}>Pending</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.approved}</Text>
            <View style={styles.statLabelRow}>
              <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.statLabel, { color: textSec }]}>Approved</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.rejected}</Text>
            <View style={styles.statLabelRow}>
              <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
              <Text style={[styles.statLabel, { color: textSec }]}>Rejected</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.statNumber, { color: THEME.primaryTeal }]}>{stats.total}</Text>
            <View style={styles.statLabelRow}>
              <View style={[styles.statDot, { backgroundColor: THEME.primaryTeal }]} />
              <Text style={[styles.statLabel, { color: textSec }]}>Total Leaves</Text>
            </View>
          </View>
        </ScrollView>

        {/* APPLY LEAVE BUTTON */}
        <View style={styles.applyBtnContainer}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowForm(true)}>
            <LinearGradient
              colors={[THEME.primaryPink, THEME.lightPink]}
              style={styles.applyBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="paper-plane" size={24} color={THEME.white} />
              <Text style={styles.applyBtnText}>Apply New Leave</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* LEAVE LIST */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={THEME.primaryPink} style={{ marginTop: 40 }} />
          ) : leaves.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="document-text-outline" size={64} color={THEME.lightPink} />
              </View>
              <Text style={[styles.emptyTitle, { color: textColor }]}>No Leave Requests Yet</Text>
              <Text style={[styles.emptySubtitle, { color: textSec }]}>Tap Apply Leave to create your first request.</Text>
            </View>
          ) : (
            leaves.map((l) => (
              <RNTouchableOpacity key={l._id} activeOpacity={0.9} style={[styles.leaveCard, { backgroundColor: cardBg }]}>
                <View style={[styles.cardLeftAccent, { backgroundColor: statusColors[l.status] || THEME.orange }]} />
                
                {/* Top Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.leaveTypeRow}>
                    <View style={[styles.leaveIconBox, { backgroundColor: THEME.background }]}>
                      <Ionicons name={leaveTypeIcons[l.leaveType] || 'calendar'} size={18} color={THEME.primaryTeal} />
                    </View>
                    <Text style={[styles.cardLeaveType, { color: textColor }]}>
                      {l.leaveType?.charAt(0).toUpperCase() + l.leaveType?.slice(1)} Leave
                    </Text>
                  </View>
                  <LinearGradient
                    colors={statusGradients[l.status] || statusGradients.pending}
                    style={styles.statusBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.statusBadgeText}>{l.status?.toUpperCase()}</Text>
                  </LinearGradient>
                </View>

                {/* Middle Row */}
                <View style={styles.cardMiddle}>
                  <Text style={[styles.cardReason, { color: textColor }]} numberOfLines={2}>{l.reason}</Text>
                </View>

                {/* Bottom Timeline */}
                <View style={[styles.cardFooter, { borderTopColor: isDark ? '#333' : '#F0F0F0' }]}>
                  <View style={styles.timelineItem}>
                    <Text style={[styles.timelineLabel, { color: textSec }]}>Start Date</Text>
                    <View style={styles.timelineValueRow}>
                      <Ionicons name="calendar-outline" size={14} color={THEME.primaryTeal} />
                      <Text style={[styles.timelineValue, { color: textColor }]}>{formatDate(l.fromDate)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.timelineDivider}>
                    <Ionicons name="arrow-forward" size={16} color={textSec} />
                  </View>

                  <View style={styles.timelineItem}>
                    <Text style={[styles.timelineLabel, { color: textSec }]}>End Date</Text>
                    <View style={styles.timelineValueRow}>
                      <Ionicons name="calendar-outline" size={14} color={THEME.primaryTeal} />
                      <Text style={[styles.timelineValue, { color: textColor }]}>{formatDate(l.toDate)}</Text>
                    </View>
                  </View>

                  <View style={[styles.timelineItem, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.timelineLabel, { color: textSec }]}>Duration</Text>
                    <View style={styles.timelineValueRow}>
                      <Ionicons name="time-outline" size={14} color={THEME.primaryPink} />
                      <Text style={[styles.timelineValue, { color: THEME.primaryPink, fontWeight: '700' }]}>{l.totalDays || 1} Days</Text>
                    </View>
                  </View>
                </View>

                {l.adminRemarks && (
                  <View style={[styles.adminRemarks, { backgroundColor: isDark ? '#333' : '#F9F9F9' }]}>
                    <Ionicons name="chatbubble-ellipses" size={14} color={textSec} />
                    <Text style={[styles.remarksText, { color: textSec }]}>📝 {l.adminRemarks}</Text>
                  </View>
                )}
              </RNTouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : THEME.white, maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: textColor }]}>Apply Leave</Text>

              <Text style={[styles.label, { color: textColor }]}>Leave Type</Text>
              <View style={styles.typeRow}>
                {leaveTypes.map((t) => (
                  <TouchableOpacity key={t} style={[styles.typeChip, form.leaveType === t && { backgroundColor: THEME.primaryPink }]} onPress={() => setForm({ ...form, leaveType: t })}>
                    <Text style={[styles.typeText, form.leaveType === t && { color: THEME.white }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: textColor }]}>From Date *</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateInput, { borderColor: isDark ? Colors.navyLight : '#E0E0E0' }]}
                onPress={() => (Platform.OS === 'web' ? setShowFromPickerWeb(true) : setShowFromPicker(true))}
              >
                <Text style={{ color: form.fromDate ? textColor : '#999' }}>{form.fromDate || 'Select from date'}</Text>
                <Ionicons name="calendar-outline" size={18} color="#999" />
              </TouchableOpacity>

              <Text style={[styles.label, { color: textColor }]}>To Date *</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateInput, { borderColor: isDark ? Colors.navyLight : '#E0E0E0' }]}
                onPress={() => (Platform.OS === 'web' ? setShowToPickerWeb(true) : setShowToPicker(true))}
              >
                <Text style={{ color: form.toDate ? textColor : '#999' }}>{form.toDate || 'Select to date'}</Text>
                <Ionicons name="calendar-outline" size={18} color="#999" />
              </TouchableOpacity>

              {showFromPicker && (
                <DateTimePicker
                  value={form.fromDate ? new Date(form.fromDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) {
                      const value = toYMD(selectedDate);
                      setForm((prev) => ({ ...prev, fromDate: value, toDate: prev.toDate && prev.toDate < value ? value : prev.toDate }));
                    }
                  }}
                />
              )}

              {showToPicker && (
                <DateTimePicker
                  value={form.toDate ? new Date(form.toDate) : (form.fromDate ? new Date(form.fromDate) : new Date())}
                  mode="date"
                  display="default"
                  minimumDate={form.fromDate ? new Date(form.fromDate) : undefined}
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) {
                      setForm((prev) => ({ ...prev, toDate: toYMD(selectedDate) }));
                    }
                  }}
                />
              )}

              {Platform.OS === 'web' && (
                <>
                  <Modal visible={showFromPickerWeb} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                      <View style={[styles.pickerModalContent, { backgroundColor: isDark ? Colors.card.dark : THEME.white }]}> 
                        <Text style={[styles.modalTitle, { color: textColor }]}>Select From Date</Text>
                        <FlatList
                          data={dateOptions}
                          keyExtractor={(i) => i.value}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.dateOption}
                              onPress={() => {
                                setForm((prev) => ({ ...prev, fromDate: item.value, toDate: prev.toDate && prev.toDate < item.value ? item.value : prev.toDate }));
                                setShowFromPickerWeb(false);
                              }}
                            >
                              <Text style={[styles.dateOptionLabel, { color: textColor }]}>{item.label}</Text>
                              <Text style={[styles.dateOptionValue, { color: textSec }]}>{item.value}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    </View>
                  </Modal>

                  <Modal visible={showToPickerWeb} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                      <View style={[styles.pickerModalContent, { backgroundColor: isDark ? Colors.card.dark : THEME.white }]}> 
                        <Text style={[styles.modalTitle, { color: textColor }]}>Select To Date</Text>
                        <FlatList
                          data={dateOptions.filter((d) => !form.fromDate || d.value >= form.fromDate)}
                          keyExtractor={(i) => i.value}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.dateOption}
                              onPress={() => {
                                setForm((prev) => ({ ...prev, toDate: item.value }));
                                setShowToPickerWeb(false);
                              }}
                            >
                              <Text style={[styles.dateOptionLabel, { color: textColor }]}>{item.label}</Text>
                              <Text style={[styles.dateOptionValue, { color: textSec }]}>{item.value}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    </View>
                  </Modal>
                </>
              )}

              <Text style={[styles.label, { color: textColor }]}>Reason *</Text>
              <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : '#E0E0E0' }]} placeholder="Reason for leave..." placeholderTextColor="#999" multiline value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}>
                  <LinearGradient colors={[THEME.primaryPink, THEME.lightPink]} style={styles.confirmBtnGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Text style={styles.confirmText}>Submit Request</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Hero
  heroSection: {
    height: 180,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: THEME.primaryPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  heroTitle: {
    color: THEME.white,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  heroIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 20,
  },
  heroCircle: {
    position: 'absolute',
    backgroundColor: THEME.white,
  },
  heroSparkle: {
    position: 'absolute',
    opacity: 0.7,
  },
  // Stats
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  statCard: {
    width: 120,
    height: 95,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Apply Button
  applyBtnContainer: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  applyBtn: {
    height: 58,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 6,
    shadowColor: THEME.primaryPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  applyBtnText: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 77, 141, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Cards
  leaveCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaveIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLeaveType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardMiddle: {
    marginBottom: 16,
  },
  cardReason: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  timelineValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineDivider: {
    paddingHorizontal: 8,
  },
  adminRemarks: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  remarksText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  pickerModalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateOption: { paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  dateOptionLabel: { fontSize: 15, fontWeight: '600' },
  dateOptionValue: { fontSize: 13, marginTop: 4 },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(20, 200, 196, 0.1)' },
  typeText: { fontSize: 14, fontWeight: '600', color: THEME.primaryTeal },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 30 },
  cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F0F0F0' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  confirmBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  confirmBtnGradient: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 16, fontWeight: 'bold', color: THEME.white },
});

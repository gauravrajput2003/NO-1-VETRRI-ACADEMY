import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity as RNTouchableOpacity, StyleSheet, Modal, ActivityIndicator, Platform, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Colors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate } from '../../utils/formatters';
import { applyStudentLeaveAPI, getStudentLeavesAPI } from '../../services/api';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};


export default function StudentLeaveScreen() {
  const bottomPadding = useBottomTabBarPadding();
  const { onScroll: onTabBarScroll } = useTabBarScroll();
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showFromPickerWeb, setShowFromPickerWeb] = useState(false);
  const [showToPickerWeb, setShowToPickerWeb] = useState(false);
  const [form, setForm] = useState({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;

  const statusColors = { pending: Colors.warning, approved: Colors.success, rejected: Colors.error };
  const statusIcons = { pending: 'time', approved: 'checkmark-circle', rejected: 'close-circle' };
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

  const loadLeaves = async () => {
    try {
      const { data } = await getStudentLeavesAPI();
      setLeaves(data.leaves || []);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to load leaves' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) {
      Toast.show({ type: 'error', text1: 'Missing Fields' });
      return;
    }

    try {
      await applyStudentLeaveAPI(form);
      Toast.show({ type: 'success', text1: 'Leave Applied ✅' });
      setShowForm(false);
      setForm({ leaveType: 'personal', fromDate: '', toDate: '', reason: '' });
      loadLeaves();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err.response?.data?.message || 'Could not apply leave' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}> 
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addText}>Apply Leave</Text>
      </TouchableOpacity>

      <ScrollView onScroll={onTabBarScroll} scrollEventThrottle={16} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : leaves.length === 0 ? (
          <View style={styles.empty}><Ionicons name="airplane-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No leave applications</Text></View>
        ) : leaves.map((l) => (
          <View key={l._id} style={[styles.card, { backgroundColor: cardBg }]}> 
            <View style={[styles.statusBadge, { backgroundColor: (statusColors[l.status] || Colors.mediumGray) + '18' }]}> 
              <Ionicons name={statusIcons[l.status] || 'help'} size={16} color={statusColors[l.status]} />
              <Text style={[styles.statusText, { color: statusColors[l.status] }]}>{l.status?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.leaveType, { color: textColor }]}>{l.leaveType?.charAt(0).toUpperCase() + l.leaveType?.slice(1)} Leave</Text>
            <Text style={[styles.leaveDates, { color: textSec }]}>{formatDate(l.fromDate)} -> {formatDate(l.toDate)} ({l.totalDays || 1} days)</Text>
            <Text style={[styles.leaveReason, { color: textSec }]}>{l.reason}</Text>
            {l.adminRemarks && <Text style={[styles.leaveRemarks, { color: Colors.info }]}>Note: {l.adminRemarks}</Text>}
          </View>
        ))}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white, paddingBottom: Math.max(40, bottomPadding) }]}> 
            <Text style={[styles.modalTitle, { color: textColor }]}>Apply Leave</Text>

            <Text style={[styles.label, { color: textColor }]}>Leave Type</Text>
            <View style={styles.typeRow}>
              {leaveTypes.map((t) => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.leaveType === t && styles.typeActive]} onPress={() => setForm({ ...form, leaveType: t })}>
                  <Text style={[styles.typeText, form.leaveType === t && { color: Colors.white }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: textColor }]}>From Date *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, { borderColor: isDark ? Colors.navyLight : Colors.gray }]}
              onPress={() => (Platform.OS === 'web' ? setShowFromPickerWeb(true) : setShowFromPicker(true))}
            >
              <Text style={{ color: form.fromDate ? textColor : Colors.mediumGray }}>{form.fromDate || 'Select from date'}</Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.mediumGray} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: textColor }]}>To Date *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, { borderColor: isDark ? Colors.navyLight : Colors.gray }]}
              onPress={() => (Platform.OS === 'web' ? setShowToPickerWeb(true) : setShowToPicker(true))}
            >
              <Text style={{ color: form.toDate ? textColor : Colors.mediumGray }}>{form.toDate || 'Select to date'}</Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.mediumGray} />
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
                    <View style={[styles.pickerModalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]}> 
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
                    <View style={[styles.pickerModalContent, { backgroundColor: isDark ? Colors.card.dark : Colors.white }]}> 
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
            <TextInput style={[styles.input, styles.textArea, { color: textColor, borderColor: isDark ? Colors.navyLight : Colors.gray }]} placeholder="Reason for leave..." placeholderTextColor={Colors.mediumGray} multiline value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}><Text style={styles.confirmText}>Submit</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.pink, margin: 16, borderRadius: 12, paddingVertical: 14 },
  addText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12, ...Shadows.light },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  leaveType: { fontSize: 16, fontWeight: '600' },
  leaveDates: { fontSize: 13, marginTop: 4 },
  leaveReason: { fontSize: 13, marginTop: 6 },
  leaveRemarks: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  pickerModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  dateInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateOption: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)' },
  dateOptionLabel: { fontSize: 14, fontWeight: '600' },
  dateOptionValue: { fontSize: 12, marginTop: 2 },
  textArea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '12' },
  typeActive: { backgroundColor: Colors.primary },
  typeText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.gray },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.darkGray },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.pink },
  confirmText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function AcademicButton({ title, onPress, disabled, loading, secondary = false }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={[styles.button, secondary && styles.secondary, (disabled || loading) && { opacity: 0.45 }]}>{loading ? <ActivityIndicator color={secondary ? '#0F766E' : '#FFF'} /> : <Text style={[styles.buttonText, secondary && { color: '#0F766E' }]}>{title}</Text>}</TouchableOpacity>;
}
export function MonthControl({ month, year, onChange }) {
  const step = (delta) => { const date = new Date(year, month - 1 + delta, 1); onChange({ month: date.getMonth() + 1, year: date.getFullYear() }); };
  return <View style={styles.month}><AcademicButton title="‹" secondary onPress={() => step(-1)} /><Text style={styles.monthText}>{new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text><AcademicButton title="›" secondary onPress={() => step(1)} /></View>;
}
export function AcademicDateField({ label, value, onChange }) {
  const [mode, setMode] = useState(null);
  const date = new Date(value);
  return <View style={{ marginTop: 14 }}><Text style={styles.label}>{label}</Text><View style={styles.row}><AcademicButton secondary title={date.toLocaleDateString('en-IN')} onPress={() => setMode('date')} /><AcademicButton secondary title={date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} onPress={() => setMode('time')} /></View>{mode && <><DateTimePicker value={date} mode={mode} is24Hour display="default" onChange={(event, picked) => {
    if (Platform.OS === 'android') setMode(null);
    if (!picked || event.type === 'dismissed') return;
    const next = new Date(date);
    if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(next.toISOString());
  }} />{Platform.OS === 'ios' && <AcademicButton secondary title="Done" onPress={() => setMode(null)} />}</>}</View>;
}
export const academicStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F6FA' }, body: { padding: 18, paddingBottom: 110, gap: 14 },
  header: { backgroundColor: '#102A43', padding: 20, gap: 8 }, title: { color: '#FFF', fontSize: 24, fontWeight: '800' }, subtitle: { color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: '#102A43' }, text: { color: '#475569', fontSize: 14, lineHeight: 21 },
  label: { color: '#334155', fontWeight: '700', marginBottom: 6 }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, color: '#102A43', backgroundColor: '#FFF', minHeight: 46 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFF' }, chipSelected: { borderColor: '#0F766E', backgroundColor: '#CCFBF1' },
  error: { color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, lineHeight: 20 },
});
const styles = StyleSheet.create({ ...academicStyles,
  button: { flexGrow: 1, flexBasis: 0, minHeight: 46, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E' },
  secondary: { backgroundColor: '#E6F5F2', borderWidth: 1, borderColor: '#B7DED6' }, buttonText: { color: '#FFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  month: { flexDirection: 'row', alignItems: 'center', gap: 12 }, monthText: { color: '#102A43', fontSize: 16, fontWeight: '700', flex: 4, textAlign: 'center' },
});

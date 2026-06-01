import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity as RNTouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, gradeColors } from '../../utils/colors';
import { Shadows } from '../../utils/theme';
import { formatDate, calculateGrade } from '../../utils/formatters';
import { fetchTeacherStudents, submitScore, fetchRecentScores } from '../../redux/slices/teacherSlice';
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


export default function GradesScreen() {
  const dispatch = useDispatch();
  const { students, recentScores, loading } = useSelector((s) => s.teacher);
  const theme = useSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';
  const [tab, setTab] = useState('enter'); // enter | history
  const [form, setForm] = useState({ student: '', subject: '', examTitle: '', maxMarks: '100', marksObtained: '', examDate: new Date().toISOString().split('T')[0], examType: 'weekly', remarks: '' });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { onScroll: onTabBarScroll } = useTabBarScroll();

  const bgColor = isDark ? Colors.background.dark : Colors.surface.light;
  const cardBg = isDark ? Colors.card.dark : Colors.card.light;
  const textColor = isDark ? Colors.text.dark : Colors.text.light;
  const textSec = isDark ? Colors.textSecondary.dark : Colors.textSecondary.light;
  const bottomPadding = useBottomTabBarPadding();

  useEffect(() => { dispatch(fetchTeacherStudents()); dispatch(fetchRecentScores()); }, []);

  const filteredStudents = students.filter((s) => {
    const name = (s.displayName || s.name || '').toLowerCase();
    return name.includes(studentQuery.toLowerCase());
  });

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentQuery(student.displayName || student.name || '');
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !form.subject || !form.examTitle || !form.marksObtained) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Fill all required fields' });
      return;
    }
    const result = await dispatch(submitScore({
      student: selectedStudent._id,
      subject: form.subject,
      examTitle: form.examTitle,
      examType: form.examType,
      maxMarks: parseInt(form.maxMarks),
      marksObtained: parseInt(form.marksObtained),
      examDate: form.examDate,
      remarks: form.remarks,
    }));
    if (submitScore.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: 'Score Submitted! ✅', text2: `${selectedStudent.name}: ${form.marksObtained}/${form.maxMarks}` });
      setForm({ ...form, student: '', marksObtained: '', remarks: '' });
      setSelectedStudent(null);
      dispatch(fetchRecentScores());
    } else {
      Toast.show({ type: 'error', text1: 'Failed', text2: result.payload });
    }
  };

  const examTypes = ['weekly', 'monthly', 'unit', 'revision'];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'enter' && styles.tabActive]} onPress={() => setTab('enter')}>
          <Text style={[styles.tabText, tab === 'enter' && styles.tabTextActive]}>Enter Grades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {tab === 'enter' ? (
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }} 
          keyboardShouldPersistTaps="handled"
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
        >
          {/* Student Selector */}
          <Text style={[styles.label, { color: textColor }]}>Student *</Text>
          <View style={styles.autoCompleteWrap}>
            <View style={[styles.selectorBtn, { backgroundColor: cardBg }]}>
              <Ionicons name="person-outline" size={20} color={Colors.primary} />
              <TextInput
                style={[styles.selectorText, { color: textColor }]}
                placeholder="Type student name..."
                placeholderTextColor={Colors.mediumGray}
                value={studentQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onChangeText={(v) => {
                  setStudentQuery(v);
                  setShowSuggestions(true);
                  if (selectedStudent && v !== (selectedStudent.displayName || selectedStudent.name)) {
                    setSelectedStudent(null);
                  }
                }}
              />
              <Ionicons name="search" size={18} color={Colors.mediumGray} />
            </View>

            {showSuggestions && (
              <View style={[styles.suggestionsBox, { backgroundColor: cardBg }]}> 
                {filteredStudents.length ? (
                  <FlatList
                    data={filteredStudents.slice(0, 20)}
                    keyExtractor={(item) => item._id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.studentItem} onPress={() => handleStudentSelect(item)}>
                        <View style={styles.studentAvatar}><Text style={styles.studentAvatarText}>{(item.displayName || item.name)?.[0]?.toUpperCase()}</Text></View>
                        <View>
                          <Text style={[styles.studentName, { color: textColor }]}>{item.displayName || item.name}</Text>
                          <Text style={[styles.studentGrade, { color: textSec }]}>Grade {item.grade || 'N/A'}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 220 }}
                  />
                ) : (
                  <View style={styles.emptySuggestion}>
                    <Text style={[styles.emptyText, { color: textSec }]}>No student found</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.label, { color: textColor }]}>Subject *</Text>
          <TextInput style={[styles.input, { backgroundColor: cardBg, color: textColor }]} placeholder="e.g., Mathematics" placeholderTextColor={Colors.mediumGray} value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })} />

          <Text style={[styles.label, { color: textColor }]}>Exam Title *</Text>
          <TextInput style={[styles.input, { backgroundColor: cardBg, color: textColor }]} placeholder="e.g., Week 1 Test" placeholderTextColor={Colors.mediumGray} value={form.examTitle} onChangeText={(v) => setForm({ ...form, examTitle: v })} />

          <Text style={[styles.label, { color: textColor }]}>Exam Type</Text>
          <View style={styles.typeRow}>
            {examTypes.map((t) => (
              <TouchableOpacity key={t} style={[styles.typeChip, form.examType === t && styles.typeActive]} onPress={() => setForm({ ...form, examType: t })}>
                <Text style={[styles.typeText, form.examType === t && { color: Colors.white }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.marksRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>Marks *</Text>
              <TextInput style={[styles.input, { backgroundColor: cardBg, color: textColor }]} placeholder="Obtained" placeholderTextColor={Colors.mediumGray} keyboardType="numeric" value={form.marksObtained} onChangeText={(v) => setForm({ ...form, marksObtained: v })} />
            </View>
            <Text style={[styles.slash, { color: textSec }]}>/</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor }]}>Max</Text>
              <TextInput style={[styles.input, { backgroundColor: cardBg, color: textColor }]} keyboardType="numeric" value={form.maxMarks} onChangeText={(v) => setForm({ ...form, maxMarks: v })} />
            </View>
          </View>

          <Text style={[styles.label, { color: textColor }]}>Remarks</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: cardBg, color: textColor }]} placeholder="Optional comments" placeholderTextColor={Colors.mediumGray} value={form.remarks} onChangeText={(v) => setForm({ ...form, remarks: v })} multiline />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit Score</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={recentScores}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
          renderItem={({ item }) => {
            const pct = ((item.marksObtained / item.maxMarks) * 100);
            const grade = item.grade || calculateGrade(pct);
            return (
              <View style={[styles.historyCard, { backgroundColor: cardBg }]}>
                <View style={[styles.gradeDot, { backgroundColor: gradeColors[grade] || Colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyName, { color: textColor }]}>{item.student?.name || item.student?.displayName || 'Student'}</Text>
                  <Text style={[styles.historyDetail, { color: textSec }]}>{item.examTitle} • {item.subject}</Text>
                  <Text style={[styles.historyDetail, { color: textSec }]}>{formatDate(item.examDate)}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyScore, { color: textColor }]}>{item.marksObtained}/{item.maxMarks}</Text>
                  <Text style={[styles.historyGrade, { color: gradeColors[grade] }]}>{grade}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="document-outline" size={48} color={Colors.mediumGray} /><Text style={[styles.emptyText, { color: textSec }]}>No scores entered yet</Text></View>}
          refreshing={loading}
          onRefresh={() => dispatch(fetchRecentScores())}
          onScroll={onTabBarScroll}
          scrollEventThrottle={16}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: 'rgba(255,20,147,0.08)' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  tabTextActive: { color: Colors.white },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, ...Shadows.light },
  textArea: { height: 80, textAlignVertical: 'top' },
  autoCompleteWrap: { zIndex: 10 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, ...Shadows.light },
  selectorText: { flex: 1, fontSize: 15 },
  suggestionsBox: { borderRadius: 12, marginTop: 8, ...Shadows.light },
  emptySuggestion: { padding: 14, alignItems: 'center' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.primary + '12' },
  typeActive: { backgroundColor: Colors.primary },
  typeText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  marksRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  slash: { fontSize: 24, fontWeight: 'bold', paddingBottom: 14 },
  submitBtn: { backgroundColor: Colors.pink, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  // History
  historyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, ...Shadows.light },
  gradeDot: { width: 8, height: 40, borderRadius: 4 },
  historyName: { fontSize: 15, fontWeight: '600' },
  historyDetail: { fontSize: 12, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyScore: { fontSize: 16, fontWeight: 'bold' },
  historyGrade: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12 },
  studentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  studentName: { fontSize: 15, fontWeight: '500' },
  studentGrade: { fontSize: 12 },
});

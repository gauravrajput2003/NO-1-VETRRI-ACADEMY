import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { uploadDirectFile } from '../../services/directCloudinaryUpload';
import { AcademicButton as Button, AcademicDateField, MonthControl, academicStyles as s } from '../../components/AcademicControls';

const stamp = (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const defaults = () => { const base = Date.now(); return { title: '', subject: '', grade: '', board: '', teacher: '', kind: 'exam', examType: 'weekly', maxMarks: '100', paperDueAt: new Date(base + 86400000).toISOString(), startsAt: new Date(base + 90000000).toISOString(), submissionsDueAt: new Date(base + 172800000).toISOString(), gradingDueAt: new Date(base + 345600000).toISOString() }; };
export default function ExamManagementScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user), staff = user.role !== 'student', admin = user.role === 'admin';
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [list, setList] = useState({ exams: [], pages: 0 }), [page, setPage] = useState(1), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [detail, setDetail] = useState(null), [files, setFiles] = useState([]), [note, setNote] = useState('');
  const [createOpen, setCreateOpen] = useState(false), [form, setForm] = useState(defaults), [options, setOptions] = useState({ students: [], teachers: [] });
  const [specific, setSpecific] = useState(false), [selectedStudents, setSelectedStudents] = useState([]);
  const [grading, setGrading] = useState(null), [marks, setMarks] = useState(''), [feedback, setFeedback] = useState('');
  const reportError = (e) => setError(e.response?.data?.message || e.message || 'Unable to load exams.');
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/exams', { params: { ...period, page } }); setList(data); } catch (e) { reportError(e); } finally { setLoading(false); } }, [period, page]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const open = async (examId) => { setError(''); setFiles([]); try { setDetail((await api.get(`/exams/${examId}`)).data); } catch (e) { reportError(e); } };
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true, multiple: !staff });
      if (result.canceled) return;
      if (result.assets.length > (staff ? 1 : 5) || result.assets.some((file) => file.size > 20 * 1024 * 1024)) throw new Error('Choose up to 5 answer files (one question paper), each no larger than 20 MB.');
      setFiles(result.assets);
    } catch (e) { reportError(e); }
  };
  const saveFiles = async () => {
    if (!files.length) return setError('Select your PDF or image file first.');
    setBusy(true); setError(''); const uploaded = [];
    try {
      for (let i = 0; i < files.length; i++) uploaded.push(await uploadDirectFile(files[i], { ownerId: user._id, purpose: 'exam', onProgress: ({ phase, percent }) => setProgress(`File ${i + 1}/${files.length} · ${phase} ${percent}%`) }));
      await api.post(`/exams/${detail.exam._id}/${staff ? 'publish' : 'submit'}`, staff ? { paperToken: uploaded[0].uploadToken } : { answerTokens: uploaded.map((u) => u.uploadToken), note });
      for (const u of uploaded) await AsyncStorage.removeItem(u.checkpointKey).catch(() => {});
      setProgress('Saved successfully'); await open(detail.exam._id); await load();
    } catch (e) { reportError(e); } finally { setBusy(false); }
  };
  const beginCreate = async () => { setError(''); try { setOptions((await api.get('/exams/options')).data); setForm(defaults()); setSpecific(false); setSelectedStudents([]); setCreateOpen(true); } catch (e) { reportError(e); } };
  const create = async () => {
    if (specific && !selectedStudents.length) return setError('Select at least one student.');
    setBusy(true); setError('');
    try { const { data } = await api.post('/exams', { ...form, ...(specific ? { studentIds: selectedStudents } : {}) }); setCreateOpen(false); await load(); await open(data.exam._id); }
    catch (e) { reportError(e); } finally { setBusy(false); }
  };
  const saveGrade = async () => {
    setBusy(true); setError(''); try { await api.put(`/exams/${detail.exam._id}/submissions/${grading._id}/grade`, { marks, feedback }); setGrading(null); await open(detail.exam._id); } catch (e) { reportError(e); } finally { setBusy(false); }
  };
  const field = (name, label, numeric = false) => <View key={name} style={{ marginTop: 12 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={s.input} keyboardType={numeric ? 'numeric' : 'default'} value={form[name]} onChangeText={(value) => setForm((v) => ({ ...v, [name]: value }))} /></View>;
  const chips = (values, selected, onChange) => <View style={s.wrap}>{values.map((value) => <TouchableOpacity key={value} style={[s.chip, selected === value && s.chipSelected]} onPress={() => onChange(value)}><Text style={s.text}>{value || 'All boards'}</Text></TouchableOpacity>)}</View>;
  const roster = options.students.filter((student) => student.grade === form.grade && (!form.board || student.board === form.board));
  return <View style={s.root}>
    <View style={[s.header, { paddingTop: insets.top + 10 }]}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.subtitle}>‹ Back</Text></TouchableOpacity><Text style={s.title}>Exam Management</Text><Text style={s.subtitle}>Question papers · Answer sheets · Marks and feedback</Text></View>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <MonthControl {...period} onChange={(value) => { setPeriod(value); setPage(1); }} />
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      {staff && <Button title={admin ? 'Assign exam / homework' : 'Schedule exam / homework'} onPress={beginCreate} />}
      {loading ? <ActivityIndicator /> : !list.exams.length ? <Text style={s.text}>No exams scheduled for this month.</Text> : list.exams.map((exam) => <TouchableOpacity key={exam._id} style={s.card} onPress={() => open(exam._id)}><Text style={s.heading}>{exam.title}</Text><Text style={s.text}>{exam.subject} · Class {exam.grade} {exam.board} · {exam.kind}</Text><Text style={s.text}>{exam.teacher?.name} · {exam.status.toUpperCase()}</Text><Text style={s.text}>Starts {stamp(exam.startsAt)}</Text><Text style={s.text}>Answers due {stamp(exam.submissionsDueAt)}</Text><Text style={{ color: '#0F766E', fontWeight: '700' }}>Open details →</Text></TouchableOpacity>)}
      <View style={s.row}><Button secondary title="Previous" disabled={page <= 1} onPress={() => setPage(page - 1)} /><Text>{page} / {Math.max(1, list.pages)}</Text><Button secondary title="Next" disabled={page >= list.pages} onPress={() => setPage(page + 1)} /></View>
    </ScrollView>
    <Modal visible={Boolean(detail)} animationType="slide" onRequestClose={() => { if (!busy) setDetail(null); }}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
        <Button secondary title="Close details" disabled={busy} onPress={() => setDetail(null)} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        {detail && <><View style={s.card}><Text style={s.heading}>{detail.exam.title}</Text><Text style={s.text}>Class {detail.exam.grade} {detail.exam.board} · {detail.exam.subject} · {detail.exam.maxMarks} marks</Text><Text style={s.text}>Teacher: {detail.exam.teacher?.name}</Text><Text style={s.text}>Paper deadline: {stamp(detail.exam.paperDueAt)}</Text><Text style={s.text}>Starts: {stamp(detail.exam.startsAt)}</Text><Text style={s.text}>Answers due: {stamp(detail.exam.submissionsDueAt)}</Text><Text style={s.text}>Grading due: {stamp(detail.exam.gradingDueAt)}</Text><Text style={s.text}>Status: {detail.exam.status}</Text>{detail.exam.paper && <Button title="Open question paper" onPress={() => Linking.openURL(detail.exam.paper.url)} />}{!staff && !detail.exam.paper && <Text style={s.text}>The paper becomes available at the exam start time. Reopen details when it starts.</Text>}</View>
        {(staff ? detail.exam.status === 'draft' : !detail.submissions.length && Date.now() >= +new Date(detail.exam.startsAt) && Date.now() <= +new Date(detail.exam.submissionsDueAt)) && <View style={s.card}><Text style={s.heading}>{staff ? 'Publish question paper' : 'Submit answer sheets'}</Text><Text style={s.text}>{staff ? 'One PDF/image, up to 20 MB. Deadlines are fixed when the exam is created.' : 'Up to 5 PDFs/images, 20 MB each. Check every page before submitting; the submitted answer set is locked.'}</Text><Button secondary disabled={busy} title={staff ? 'Choose question paper' : 'Choose answer sheets'} onPress={pick} />{files.map((f) => <Text key={f.uri} style={s.text}>{f.name}</Text>)}{!staff && <TextInput style={s.input} placeholder="Optional note to teacher" value={note} onChangeText={setNote} maxLength={3000} multiline />}<Text accessibilityLiveRegion="polite" style={s.text}>{progress}</Text><Button loading={busy} title={staff ? 'Publish to assigned students' : 'Submit answers'} onPress={saveFiles} /></View>}
        <Text style={s.heading}>{staff ? `Answer sheets (${detail.submissions.length}/${detail.exam.studentIds?.length || 0})` : 'Your submission and result'}</Text>
        {detail.submissions.map((sub) => <View key={sub._id} style={s.card}><Text style={s.heading}>{staff ? sub.student?.name : 'Your answer sheets'}</Text><Text style={s.text}>Submitted {stamp(sub.submittedAt)} · {sub.status}</Text>{sub.attachments.map((a, index) => <Button key={a.publicId} secondary title={`Open answer ${index + 1}: ${a.filename}`} onPress={() => Linking.openURL(a.url)} />)}{sub.note ? <Text style={s.text}>{sub.note}</Text> : null}{sub.status === 'graded' && <><Text style={s.heading}>{sub.marksObtained}/{detail.exam.maxMarks}</Text><Text style={s.text}>{sub.feedback || 'No additional feedback.'}</Text></>}{staff && <Button title={sub.status === 'graded' ? 'Update marks / feedback' : 'Evaluate answer sheet'} onPress={() => { setMarks(sub.marksObtained === undefined ? '' : String(sub.marksObtained)); setFeedback(sub.feedback || ''); setGrading(sub); }} />}</View>)}
        {!detail.submissions.length && <Text style={s.text}>No answer sheets submitted yet.</Text>}</>}
      </ScrollView></KeyboardAvoidingView>
    </Modal>
    <Modal visible={createOpen} animationType="slide" onRequestClose={() => { if (!busy) setCreateOpen(false); }}><KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled"><Text style={s.heading}>{admin ? 'Assign exam / homework' : 'Schedule exam / homework'}</Text>{error ? <Text style={s.error}>{error}</Text> : null}
      {admin && <><Text style={s.label}>Responsible teacher</Text><View style={s.wrap}>{options.teachers.map((t) => <TouchableOpacity key={t._id} style={[s.chip, form.teacher === t._id && s.chipSelected]} onPress={() => setForm({ ...form, teacher: t._id })}><Text style={s.text}>{t.name}</Text></TouchableOpacity>)}</View></>}
      {field('title', 'Title')}{field('subject', 'Subject')}<Text style={s.label}>Class</Text>{chips([...new Set(options.students.map((u) => u.grade).filter(Boolean))], form.grade, (grade) => { setForm({ ...form, grade, board: '' }); setSelectedStudents([]); })}<Text style={s.label}>Board / section</Text>{chips(['', ...new Set(options.students.filter((u) => u.grade === form.grade).map((u) => u.board).filter(Boolean))], form.board, (board) => { setForm({ ...form, board }); setSelectedStudents([]); })}
      <Text style={s.label}>Recipients</Text>{chips(['All matching students', 'Select students'], specific ? 'Select students' : 'All matching students', (v) => setSpecific(v === 'Select students'))}{specific && <View style={s.wrap}>{roster.map((student) => <TouchableOpacity key={student._id} style={[s.chip, selectedStudents.includes(student._id) && s.chipSelected]} onPress={() => setSelectedStudents((ids) => ids.includes(student._id) ? ids.filter((v) => v !== student._id) : [...ids, student._id])}><Text style={s.text}>{student.name}</Text></TouchableOpacity>)}</View>}
      <Text style={s.label}>Work type</Text>{chips(['exam', 'homework'], form.kind, (kind) => setForm({ ...form, kind }))}<Text style={s.label}>Exam frequency</Text>{chips(['weekly', 'monthly', 'unit', 'revision'], form.examType, (examType) => setForm({ ...form, examType }))}{field('maxMarks', 'Maximum marks', true)}
      {[['paperDueAt', 'Question paper deadline'], ['startsAt', 'Student paper opens'], ['submissionsDueAt', 'Answer submission deadline'], ['gradingDueAt', 'Teacher grading deadline']].map(([key, label]) => <AcademicDateField key={key} label={label} value={form[key]} onChange={(value) => setForm((v) => ({ ...v, [key]: value }))} />)}<Text style={s.text}>Times use your device timezone. Only institute-assigned paper deadlines contribute to teacher timeliness ratings.</Text><View style={s.row}><Button secondary disabled={busy} title="Cancel" onPress={() => setCreateOpen(false)} /><Button loading={busy} title="Save schedule" onPress={create} /></View>
    </ScrollView></KeyboardAvoidingView></Modal>
    <Modal visible={Boolean(grading)} transparent animationType="slide" onRequestClose={() => { if (!busy) setGrading(null); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0009', padding: 22 }}><ScrollView contentContainerStyle={s.card} keyboardShouldPersistTaps="handled"><Text style={s.heading}>Evaluate {grading?.student?.name}</Text>{error ? <Text style={s.error}>{error}</Text> : null}<Text style={s.label}>Marks out of {detail?.exam.maxMarks}</Text><TextInput style={s.input} keyboardType="decimal-pad" value={marks} onChangeText={setMarks} /><Text style={s.label}>Feedback to student</Text><TextInput style={[s.input, { minHeight: 100 }]} multiline value={feedback} onChangeText={setFeedback} maxLength={3000} /><View style={s.row}><Button secondary title="Cancel" disabled={busy} onPress={() => setGrading(null)} /><Button title="Publish marks" loading={busy} onPress={saveGrade} /></View></ScrollView></KeyboardAvoidingView></Modal>
  </View>;
}

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { exportAcademicReport, shareAcademicWhatsApp } from '../../services/academicReports';
import { AcademicButton as Button, MonthControl, academicStyles as s } from '../../components/AcademicControls';

const score = (value) => value === null || value === undefined ? 'N/A' : Number(value).toFixed(1);
export default function AcademicReportsScreen({ navigation, route, reportMode, initialTab }) {
  const mode = reportMode || route?.params?.mode || 'performance', isMarks = mode === 'marks';
  const user = useSelector((state) => state.auth.user), insets = useSafeAreaInsets();
  const [period, setPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [grade, setGrade] = useState(''), [tab, setTab] = useState(initialTab || 'marks'), [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [displayPage, setDisplayPage] = useState(1);
  const endpoint = isMarks ? 'class-marks' : 'teacher-performance';
  const load = useCallback(async () => {
    setLoading(true); setDisplayPage(1); setError('');
    try { setData((await api.get(`/academic-reports/${endpoint}`, { params: { ...period, ...(grade ? { grade } : {}) }, timeout: 120000 })).data); }
    catch (e) { setError(e.response?.data?.message || 'Report unavailable. Please retry.'); }
    finally { setLoading(false); }
  }, [endpoint, period, grade]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const action = async (fn) => { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.response?.data?.message || e.message); } finally { setBusy(false); } };
  const share = () => {
    let text = `NO.1 VETTRI ACADEMY\n${isMarks ? 'CLASS LEADERS' : 'TEACHER PERFORMANCE'} · ${period.month}/${period.year}\n`;
    if (isMarks) text += data.leaders.map((r) => `Class ${r.className} · #${r.rank} ${r.student.name} — ${score(r.percentage)}% (${r.count} graded exams)`).join('\n') + '\nBased on published results; graded exam counts can differ.';
    else text += `${data.period.provisional ? 'Provisional — month in progress' : 'Month ended'}\n` + data.reports.map((r) => `${r.rank ? '#' + r.rank + ' ' : ''}${r.teacher.name}${r.isBestTeacher ? ' ★ Best teacher' : ''}\nScore ${score(r.totalScore)}/100 · Coverage ${r.coverage}%\n${r.components.map((c) => `${c.label}: ${score(c.score)}`).join(' | ')}`).join('\n\n') + '\nN/A means insufficient recorded evidence; feedback, conduct and paper quality are excluded.';
    return shareAcademicWhatsApp(text);
  };
  const best = data?.reports?.filter((r) => r.isBestTeacher) || [];
  return <View style={s.root}>
    <View style={[s.header, { paddingTop: insets.top + 10 }]}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.subtitle}>‹ Back</Text></TouchableOpacity><Text style={s.title}>{isMarks ? 'Class Marks & Toppers' : user.role === 'admin' ? 'Teacher Performance' : 'My Monthly Performance'}</Text><Text style={s.subtitle}>{isMarks ? 'Published exam results, organised by class' : 'Automatic ratings from recorded teaching activity'}</Text></View>
    <ScrollView contentContainerStyle={s.body}>
      <MonthControl {...period} onChange={setPeriod} />
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <View style={s.row}><Button secondary loading={busy} disabled={!data || loading} title="Export Excel" onPress={() => action(() => exportAcademicReport(endpoint, { ...period, grade }, `${endpoint}-${period.year}-${period.month}`))} /><Button title="Share WhatsApp" disabled={!data || loading || busy} onPress={() => action(share)} /></View>
      <Button secondary title="Refresh report" disabled={loading || busy} onPress={load} />
      {loading ? <ActivityIndicator /> : data && (isMarks ? <>
        <View style={s.wrap}>{['', ...(data.grades || [])].map((g) => <TouchableOpacity key={g} style={[s.chip, grade === g && s.chipSelected]} onPress={() => setGrade(g)}><Text style={s.text}>{g ? `Class ${g}` : 'All classes'}</Text></TouchableOpacity>)}</View>
        <View style={s.row}><Button secondary={tab !== 'marks'} title="All marks" onPress={() => { setTab('marks'); setDisplayPage(1); }} /><Button secondary={tab !== 'leaders'} title="Class toppers" onPress={() => { setTab('leaders'); setDisplayPage(1); }} /></View>
        <Text style={s.text}>Class leaders use average percentage of published exam results. Graded-exam counts can differ; homework is excluded from rankings.</Text>
        {(tab === 'leaders' ? data.leaders : data.records).slice((displayPage - 1) * 30, displayPage * 30).map((r, index) => <View key={r._id || `${r.student._id}-${index}`} style={s.card}><Text style={s.heading}>{tab === 'leaders' ? `#${r.rank} · ` : ''}{r.student.displayName || r.student.name}</Text><Text style={s.text}>Class {r.className} · {score(r.percentage)}%</Text>{tab === 'leaders' ? <Text style={s.text}>{r.count} published exams</Text> : <><Text style={s.text}>{r.examTitle} · {r.subject} · {r.kind || 'exam'}</Text><Text style={s.heading}>{r.marksObtained}/{r.maxMarks}</Text><Text style={s.text}>{r.teacher?.name} · {new Date(r.examDate).toLocaleDateString('en-IN')}</Text></>}</View>)}
        <View style={s.row}><Button secondary title="Previous page" disabled={displayPage <= 1} onPress={() => setDisplayPage(displayPage - 1)} /><Button secondary title="Next page" disabled={displayPage * 30 >= (tab === 'leaders' ? data.leaders : data.records).length} onPress={() => setDisplayPage(displayPage + 1)} /></View>
        {!data.records.length && <Text style={s.text}>No published marks match this class and month.</Text>}
      </> : <>
        <View style={s.card}><Text style={s.heading}>{data.period.provisional ? 'Month in progress · Provisional' : 'Monthly report'}</Text><Text style={s.text}>{user.role === 'admin' ? best.length ? `${best.length > 1 ? 'Joint best teachers' : 'Best teacher'}: ${best.map((r) => r.teacher.name).join(', ')}` : 'Not enough comparable evidence to name a best teacher yet.' : 'Your own rating and overall rank are shown below.'}</Text><Text style={s.text}>{data.formula}</Text></View>
        {!data.reports.length && <Text style={s.text}>No teacher report is available.</Text>}
        {data.reports.map((r) => <View key={r.teacher._id} style={[s.card, r.isBestTeacher && { borderColor: '#D4AF37', borderWidth: 2 }]}><Text style={s.heading}>{r.isBestTeacher ? '★ ' : ''}{r.teacher.name}</Text><View style={s.row}><View style={{ flex: 1 }}><Text style={s.label}>Monthly score</Text><Text style={{ fontSize: 28, fontWeight: '800', color: '#0F766E' }}>{score(r.totalScore)}<Text style={s.text}> /100</Text></Text></View><View style={{ flex: 1 }}><Text style={s.label}>Evidence coverage</Text><Text style={s.heading}>{r.coverage}% · {r.rank ? `Rank ${r.rank}` : 'Unranked'}</Text></View></View>
          {r.components.map((c) => <View key={c.key}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={[s.text, { flex: 1 }]}>{c.label}</Text><Text style={{ color: '#102A43', fontWeight: '700' }}>{score(c.score)}{c.score !== null ? ` · ${c.effectiveWeight}%` : ''}</Text></View><View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginTop: 5 }}><View style={{ width: `${c.score || 0}%`, backgroundColor: '#0F766E', height: 6, borderRadius: 3 }} /></View></View>)}
          <Text style={s.text}>Classes: {r.evidence.classes.started}/{r.evidence.classes.due} started · {r.evidence.classes.onTime} on time</Text><Text style={s.text}>Assigned papers: {r.evidence.papers.submitted}/{r.evidence.papers.assigned} submitted · {r.evidence.papers.onTime} on time</Text><Text style={s.text}>Evaluation: {r.evidence.evaluation.completed}/{r.evidence.evaluation.due} completed · {r.evidence.evaluation.averageHours}h average turnaround</Text><Text style={s.text}>Doubts: {r.evidence.doubts.answered}/{r.evidence.doubts.assigned} answered · {r.evidence.doubts.resolved} resolved · {score(r.evidence.doubts.averageResponseHours)}h average first response</Text><Text style={s.text}>Student results: {r.evidence.results.publishedMarks} marks · {score(r.evidence.results.averagePercent)}% average</Text>
          {!r.eligible && <Text style={s.text}>Not eligible for Best Teacher yet: minimum 50% coverage, 3 observations and 2 categories.</Text>}
        </View>)}
        <View style={s.card}><Text style={s.label}>Not scored in this version</Text><Text style={s.text}>{data.excluded.join(' · ')}</Text><Text style={s.text}>Only the teacher's own Start/Join action records class presence. A student's join never counts. Cancelled classes are excluded. Grace period: 5 minutes; first doubt response target: 24 hours.</Text></View>
      </>)}
    </ScrollView>
  </View>;
}

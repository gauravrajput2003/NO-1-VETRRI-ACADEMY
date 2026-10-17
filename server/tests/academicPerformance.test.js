const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { calculatePerformance, rankReports } = require('../services/performanceCalculator');
const { monthPeriod, classStart } = require('../utils/academicDates');
const { canManageExam, canViewExam, studentExamView } = require('../utils/examAccess');
const period = monthPeriod(10, 2026, new Date('2026-11-03T00:00:00Z'));
const teacher = { _id: 't1', name: 'Teacher A', isActive: true, isApproved: true };
const base = (extra = {}) => ({ teachers: [teacher], classes: [], exams: [], submissions: [], scores: [], doubts: [], replies: [], period, ...extra });
const cls = (extra = {}) => ({ _id: 'c1', teacherId: 't1', scheduledDate: '2026-10-05T00:00:00+05:30', scheduledTime: '10:00', durationMinutes: 60, status: 'completed', performanceTrackingVersion: 1, teacherStartedAt: '2026-10-05T10:04:00+05:30', ...extra });
const exam = (extra = {}) => ({ _id: 'e1', teacher: 't1', assignedByAdmin: true, status: 'published', paperDueAt: '2026-10-05T00:00:00Z', paperSubmittedAt: '2026-10-04T00:00:00Z', paperSubmittedBy: 't1', gradingDueAt: '2026-10-08T00:00:00Z', ...extra });
const submission = (extra = {}) => ({ _id: 's1', exam: 'e1', teacher: 't1', submittedAt: '2026-10-06T00:00:00Z', gradingHistory: [{ at: '2026-10-07T00:00:00Z', by: 't1', marks: 50 }], ...extra });
const score = (extra = {}) => ({ _id: 'score', teacher: 't1', student: 'student', subject: 'Maths', marksObtained: 50, maxMarks: 100, isPublished: true, kind: 'exam', examDate: '2026-10-05T00:00:00Z', createdAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z', ...extra });

test('empty evidence is N/A, never a perfect score or a best-teacher award', () => {
  const [report] = rankReports(calculatePerformance(base()));
  assert.equal(report.totalScore, null); assert.equal(report.coverage, 0); assert.equal(report.eligible, false); assert.equal(report.isBestTeacher, false);
  assert.ok(report.components.every((c) => c.score === null));
});

test('available categories use the documented weights and evidence counts', () => {
  const data = base({ classes: [cls(), cls({ _id: 'c2', teacherStartedAt: undefined })],
    exams: [exam(), exam({ _id: 'e2', paperSubmittedAt: '2026-10-06T00:00:00Z' })],
    submissions: [submission(), submission({ _id: 's2', gradingHistory: [] })], scores: [score()],
    doubts: [{ _id: 'd1', assignedTeachers: ['t1'], createdAt: '2026-10-10T00:00:00Z', resolvedAt: '2026-10-11T00:00:00Z' }, { _id: 'd2', assignedTeachers: ['t1'], createdAt: '2026-10-11T00:00:00Z' }],
    replies: [{ doubtId: 'd1', senderId: 't1', senderRole: 'teacher', createdAt: '2026-10-10T02:00:00Z' }],
  });
  const [r] = calculatePerformance(data);
  assert.equal(r.totalScore, 54.69); assert.equal(r.coverage, 100); assert.equal(r.eligible, true);
  assert.deepEqual(r.components.map((c) => c.score), [50, 75, 50, 50, 50]);
  assert.equal(r.evidence.evaluation.averageHours, 24); assert.equal(r.evidence.doubts.averageResponseHours, 2);
});

test('missing categories are reweighted without inventing data; low coverage cannot win', () => {
  const [r] = calculatePerformance(base({ scores: [score({ marksObtained: 80 })] }));
  assert.equal(r.totalScore, 80); assert.equal(r.coverage, 31.25); assert.equal(r.eligible, false);
  assert.equal(r.components.find((c) => c.key === 'results').effectiveWeight, 100);
});

test('student-started sessions and unknown legacy classes are never teacher attendance evidence', () => {
  const [r] = calculatePerformance(base({ classes: [cls({ teacherStartedAt: undefined, status: 'live' }), cls({ _id: 'legacy', performanceTrackingVersion: undefined, teacherStartedAt: undefined })] }));
  assert.equal(r.evidence.classes.due, 1); assert.equal(r.evidence.classes.started, 0); assert.equal(r.evidence.classes.excludedLegacy, 1);
  assert.equal(r.components[0].score, 0);
});

test('future deadlines and cancelled work do not create overdue penalties', () => {
  const current = monthPeriod(10, 2026, new Date('2026-10-04T00:00:00Z'));
  const [r] = calculatePerformance(base({ period: current, classes: [cls()], exams: [exam({ paperSubmittedAt: undefined })] }));
  assert.equal(r.totalScore, null);
  const [cancelled] = calculatePerformance(base({ exams: [exam({ status: 'cancelled', cancelledAt: '2026-10-02T00:00:00Z' })] }));
  assert.equal(cancelled.evidence.papers.assigned, 0);
  const [lateCancellation] = calculatePerformance(base({ exams: [exam({ status: 'cancelled', cancelledAt: '2026-11-02T00:00:00Z', paperSubmittedAt: undefined })] }));
  assert.equal(lateCancellation.evidence.papers.assigned, 1);
});

test('admin paper uploads / grading are not credited as teacher work', () => {
  const [r] = calculatePerformance(base({ exams: [exam({ paperSubmittedBy: 'admin' })], submissions: [submission({ gradingHistory: [{ at: '2026-10-07T00:00:00Z', by: 'admin', marks: 50 }] })] }));
  assert.equal(r.evidence.papers.submitted, 0); assert.equal(r.evidence.evaluation.completed, 0);
});

test('later mark corrections cannot change the earlier-month historical score', () => {
  const [r] = calculatePerformance(base({ submissions: [submission({ gradingHistory: [{ at: '2026-10-07T00:00:00Z', by: 't1', marks: 40 }, { at: '2026-11-02T00:00:00Z', by: 't1', marks: 90 }] })], scores: [score({ submission: 's1', marksObtained: 90, updatedAt: '2026-11-02T00:00:00Z' })] }));
  assert.equal(r.evidence.results.averagePercent, 40);
});

test('student improvement compares the same teacher/student/subject and normalizes differing maximum marks', () => {
  const [r] = calculatePerformance(base({ scores: [score({ marksObtained: 40, maxMarks: 50 }), score({ _id: 'prior', createdAt: '2026-09-10T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', marksObtained: 60 }), score({ _id: 'other', teacher: 't2', marksObtained: 100 })] }));
  assert.equal(r.evidence.results.averagePercent, 80); assert.equal(r.evidence.results.improvementScore, 90); assert.equal(r.components.find((c) => c.key === 'results').score, 83);
});

test('co-assigned doubts answered by another teacher are not misattributed', () => {
  const [r] = calculatePerformance(base({ doubts: [{ _id: 'd', assignedTeachers: ['t1', 't2'], createdAt: '2026-10-05T00:00:00Z', resolvedAt: '2026-10-06T00:00:00Z' }], replies: [{ doubtId: 'd', senderId: 't2', senderRole: 'teacher', createdAt: '2026-10-05T01:00:00Z' }] }));
  assert.equal(r.evidence.doubts.assigned, 0); assert.equal(r.evidence.doubts.resolved, 0);
});

test('ties share first place and insufficient evidence is never ranked', () => {
  const reports = rankReports([{ teacher: { name: 'B' }, totalScore: 90, eligible: true }, { teacher: { name: 'A' }, totalScore: 90, eligible: true }, { teacher: { name: 'C' }, totalScore: 100, eligible: false, rank: null, isBestTeacher: false }]);
  assert.equal(reports.filter((r) => r.isBestTeacher).length, 2); assert.equal(reports.find((r) => r.teacher.name === 'C').rank, null);
});

test('Indian month boundaries, leap years and class times are timezone independent', () => {
  assert.equal(monthPeriod(1, 2026).start.toISOString(), '2025-12-31T18:30:00.000Z');
  assert.equal(monthPeriod(2, 2024).end.toISOString(), '2024-02-29T18:30:00.000Z');
  assert.equal(classStart(cls()).toISOString(), '2026-10-05T04:30:00.000Z');
  assert.throws(() => monthPeriod(0, 2026), /valid month/);
});

test('exam access is scoped to assigned students / responsible teacher and hides early papers', () => {
  const record = { teacher: 't1', studentIds: ['s1'], status: 'published', paper: { url: 'secret' }, startsAt: '2026-10-10T00:00:00Z' };
  assert.equal(canViewExam({ _id: 's2', role: 'student' }, record), false);
  assert.equal(canManageExam({ _id: 't2', role: 'teacher' }, record), false);
  assert.equal(canViewExam({ _id: 's1', role: 'student' }, record), true);
  const early = studentExamView(record, new Date('2026-10-09T00:00:00Z'));
  assert.equal(early.paper, undefined); assert.equal(early.studentIds, undefined);
  assert.equal(studentExamView(record, new Date('2026-10-11T00:00:00Z')).paper.url, 'secret');
});

test('only the owner teacher can create a first class-start timestamp within the class window', async () => {
  const calls = [], module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/teacherClassActivity.js'), 'utf8'), { module, Date, require: (key) => key.includes('ClassSchedule') ? { updateOne: async (...args) => { calls.push(args); return { modifiedCount: 1 }; } } : require(path.join(__dirname, '..', key.replace('../', ''))) });
  const record = cls(), now = new Date('2026-10-05T10:03:00+05:30');
  for (const user of [{ _id: 's1', role: 'student' }, { _id: 'admin', role: 'admin' }, { _id: 't2', role: 'teacher' }]) assert.equal(await module.exports.recordTeacherStart(record, user, now), false);
  assert.equal(calls.length, 0);
  assert.equal(await module.exports.recordTeacherStart(record, { _id: 't1', role: 'teacher' }, now), true);
  assert.equal(calls[0][0].teacherStartedAt.$exists, false);
  assert.equal(await module.exports.recordTeacherStart(record, { _id: 't1', role: 'teacher' }, new Date('2026-10-05T06:00:00+05:30')), false);
});

const { classStart } = require('../utils/academicDates');
const { id } = require('../utils/examAccess');
const HOUR = 3600000;
const WEIGHTS = { classes: 20, papers: 15, completion: 15, results: 25, responsiveness: 5 };
const LABELS = { classes: 'Class starts and punctuality', papers: 'Assigned question papers', completion: 'Evaluation work completion', results: 'Student results and improvement', responsiveness: 'Doubt responses and grading speed' };
const round = (n) => Math.round(n * 100) / 100;
const avg = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const ratio = (n, d) => d ? n / d * 100 : null;
const time = (value) => value ? +new Date(value) : NaN;
const inMonth = (value, p) => time(value) >= +p.start && time(value) < +p.end;
const before = (value, p) => time(value) <= +p.asOf;
const activeAtCutoff = (record, p) => record.status !== 'cancelled' || (record.cancelledAt && !before(record.cancelledAt, p));

function calculatePerformance({ teachers, classes, exams, submissions, scores, doubts, replies, period }) {
  const examMap = new Map(exams.map((exam) => [id(exam), exam]));
  const submissionMap = new Map(submissions.map((s) => [id(s), s]));
  return teachers.map((teacher) => {
    const teacherId = id(teacher), evidence = {};
    const dueClasses = classes.filter((cls) => {
      const start = classStart(cls);
      return id(cls.teacherId) === teacherId && activeAtCutoff(cls, period) && start && inMonth(start, period)
        && +start + (cls.durationMinutes || 60) * 60000 <= +period.asOf && (cls.performanceTrackingVersion === 1 || cls.teacherStartedAt);
    });
    const held = dueClasses.filter((cls) => {
      const start = +classStart(cls), actual = time(cls.teacherStartedAt);
      return actual >= start - 30 * 60000 && actual <= start + (cls.durationMinutes || 60) * 60000 && before(cls.teacherStartedAt, period);
    });
    const onTime = held.filter((cls) => time(cls.teacherStartedAt) <= +classStart(cls) + 5 * 60000);
    evidence.classes = { due: dueClasses.length, started: held.length, onTime: onTime.length,
      excludedLegacy: classes.filter((cls) => id(cls.teacherId) === teacherId && !cls.performanceTrackingVersion && !cls.teacherStartedAt && classStart(cls) && inMonth(classStart(cls), period)).length };
    const classScore = dueClasses.length ? (ratio(held.length, dueClasses.length) + ratio(onTime.length, dueClasses.length)) / 2 : null;

    const papers = exams.filter((exam) => id(exam.teacher) === teacherId && exam.assignedByAdmin && activeAtCutoff(exam, period) && inMonth(exam.paperDueAt, period) && (before(exam.paperDueAt, period) || before(exam.paperSubmittedAt, period)));
    const submitted = papers.filter((exam) => id(exam.paperSubmittedBy) === teacherId && before(exam.paperSubmittedAt, period));
    const timelyPapers = submitted.filter((exam) => time(exam.paperSubmittedAt) <= time(exam.paperDueAt));
    evidence.papers = { assigned: papers.length, submitted: submitted.length, onTime: timelyPapers.length };
    const paperScore = papers.length ? (ratio(submitted.length, papers.length) + ratio(timelyPapers.length, papers.length)) / 2 : null;

    const work = submissions.filter((s) => {
      const exam = examMap.get(id(s.exam));
      return id(s.teacher) === teacherId && exam && exam.status !== 'cancelled' && inMonth(exam.gradingDueAt, period) && before(s.submittedAt, period)
        && (before(exam.gradingDueAt, period) || (s.gradingHistory || []).some((h) => id(h.by) === teacherId && before(h.at, period)));
    });
    const graded = work.map((s) => {
      const ownGrade = (s.gradingHistory || []).filter((h) => id(h.by) === teacherId && before(h.at, period)).sort((a, b) => time(a.at) - time(b.at))[0];
      return ownGrade ? { submission: s, at: ownGrade.at } : null;
    }).filter(Boolean);
    const timelyGrading = graded.filter(({ submission, at }) => time(at) <= time(examMap.get(id(submission.exam)).gradingDueAt));
    evidence.evaluation = { due: work.length, completed: graded.length, onTime: timelyGrading.length, averageHours: round(avg(graded.map(({ submission, at }) => Math.max(0, time(at) - time(submission.submittedAt)) / HOUR)) || 0) };
    const completionScore = ratio(graded.length, work.length);

    // Score revisions use the last historical grade at the report cutoff, not today's corrected mark.
    const usableScores = scores.filter((s) => id(s.teacher) === teacherId && s.isPublished !== false && (s.kind || 'exam') === 'exam' && s.maxMarks > 0).map((s) => {
      const submission = submissionMap.get(id(s.submission));
      if (s.submission && !submission) return null;
      const history = (submission?.gradingHistory || []).filter((h) => before(h.at, period)).sort((a, b) => time(a.at) - time(b.at));
      if (s.submission && !history.length) return null;
      if (!s.submission && !before(s.updatedAt || s.createdAt || s.examDate, period)) return null;
      const publishedAt = history[0]?.at || s.createdAt || s.examDate;
      const marks = history.at(-1)?.marks ?? s.marksObtained;
      if (!before(publishedAt, period) || marks < 0 || marks > s.maxMarks) return null;
      return { key: `${id(s.student)}:${String(s.subject).trim().toLowerCase()}`, pct: marks / s.maxMarks * 100, at: publishedAt };
    }).filter(Boolean);
    const current = usableScores.filter((s) => inMonth(s.at, period));
    const currentGroups = new Map();
    current.forEach((s) => currentGroups.set(s.key, [...(currentGroups.get(s.key) || []), s.pct]));
    const baseline = new Map();
    usableScores.filter((s) => time(s.at) < +period.start).sort((a, b) => time(a.at) - time(b.at)).forEach((s) => baseline.set(s.key, s.pct));
    const achievement = avg([...currentGroups.values()].map(avg));
    const improvement = avg([...currentGroups].filter(([key]) => baseline.has(key)).map(([key, values]) => Math.max(0, Math.min(100, 50 + 2 * (avg(values) - baseline.get(key))))));
    const resultsScore = achievement === null ? null : improvement === null ? achievement : achievement * 0.7 + improvement * 0.3;
    evidence.results = { publishedMarks: current.length, studentSubjects: currentGroups.size, averagePercent: achievement === null ? null : round(achievement), improvementScore: improvement === null ? null : round(improvement) };

    const mine = doubts.filter((d) => !d.isDeleted && inMonth(d.createdAt, period) && (d.assignedTeachers || []).some((t) => id(t) === teacherId));
    const doubtRows = mine.map((d) => {
      const answers = replies.filter((r) => id(r.doubtId) === id(d) && r.senderRole === 'teacher' && !r.isDeleted && before(r.createdAt, period)).sort((a, b) => time(a.createdAt) - time(b.createdAt));
      const own = answers.find((r) => id(r.senderId) === teacherId);
      // Co-assigned questions handled by another teacher are not credited or charged to this teacher.
      if (!own && answers.length && d.assignedTeachers.length > 1) return null;
      if (!own && time(d.createdAt) + 24 * HOUR > +period.asOf) return null;
      return { answered: Boolean(own), hours: own ? Math.max(0, time(own.createdAt) - time(d.createdAt)) / HOUR : null, resolved: Boolean(own && before(d.resolvedAt, period)) };
    }).filter(Boolean);
    const answered = doubtRows.filter((r) => r.answered), resolved = doubtRows.filter((r) => r.resolved);
    const doubtScore = doubtRows.length ? ratio(answered.length, doubtRows.length) * 0.5 + ratio(answered.filter((r) => r.hours <= 24).length, doubtRows.length) * 0.25 + ratio(resolved.length, doubtRows.length) * 0.25 : null;
    evidence.doubts = { assigned: doubtRows.length, answered: answered.length, resolved: resolved.length, resolutionRate: ratio(resolved.length, doubtRows.length), averageResponseHours: answered.length ? round(avg(answered.map((r) => r.hours))) : null };
    const responseScore = avg([doubtScore, ratio(timelyGrading.length, work.length)].filter((n) => n !== null));
    const values = { classes: classScore, papers: paperScore, completion: completionScore, results: resultsScore, responsiveness: responseScore };
    const activeWeight = Object.keys(values).reduce((sum, key) => sum + (values[key] === null ? 0 : WEIGHTS[key]), 0);
    const totalScore = activeWeight ? round(Object.keys(values).reduce((sum, key) => sum + (values[key] ?? 0) * WEIGHTS[key], 0) / activeWeight) : null;
    const coverage = round(activeWeight / 80 * 100);
    const observations = dueClasses.length + papers.length + work.length + current.length + doubtRows.length;
    const components = Object.keys(values).map((key) => ({ key, label: LABELS[key], baseWeight: WEIGHTS[key], effectiveWeight: values[key] === null || !activeWeight ? 0 : round(WEIGHTS[key] / activeWeight * 100), score: values[key] === null ? null : round(values[key]) }));
    return { teacher: { _id: teacherId, name: teacher.name, isActive: teacher.isActive }, month: period.month, year: period.year, asOf: period.asOf, formulaVersion: 'recorded-evidence-v1', provisional: period.provisional, totalScore, coverage, evidence, components, eligible: teacher.isApproved !== false && (!period.provisional || teacher.isActive !== false) && coverage >= 50 && observations >= 3 && components.filter((c) => c.score !== null).length >= 2, isBestTeacher: false, rank: null };
  });
}
function rankReports(reports) {
  const sorted = [...reports].sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1) || a.teacher.name.localeCompare(b.teacher.name));
  const eligible = sorted.filter((r) => r.eligible);
  let priorScore, rank = 0;
  eligible.forEach((r, index) => { if (r.totalScore !== priorScore) rank = index + 1; r.rank = rank; priorScore = r.totalScore; r.isBestTeacher = rank === 1; });
  return sorted;
}
module.exports = { calculatePerformance, rankReports, WEIGHTS };

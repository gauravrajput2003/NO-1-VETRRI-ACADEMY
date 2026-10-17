const Score = require('../models/ExamScore');
const { monthPeriod } = require('../utils/academicDates');
const { generateMonth } = require('../services/teacherPerformanceService');
const { createWorkbook } = require('../utils/excelWorkbook');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const wrap = (fn) => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to load the report. Please retry.' }); } };
function sendExcel(res, name, sheets) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.xlsx"`);
  res.send(createWorkbook(sheets));
}
const performance = wrap(async (req, res) => {
  if (!['admin', 'teacher'].includes(req.user.role)) throw fail('Teacher/admin access required.', 403);
  const data = await generateMonth(req.query.month, req.query.year);
  const reports = req.user.role === 'teacher' ? data.reports.filter((r) => r.teacher._id === String(req.user._id)) : data.reports;
  if (req.query.format === 'xlsx') return sendExcel(res, `teacher-performance-${data.period.year}-${data.period.month}`, [
    { name: 'Monthly ratings', headers: ['Teacher', 'Score / 100', 'Coverage %', 'Rank', 'Best teacher', 'Month status', ...['Classes', 'Papers', 'Evaluation completion', 'Student results', 'Responsiveness']], rows: reports.map((r) => [r.teacher.name, r.totalScore ?? 'Not enough data', r.coverage, r.rank ?? 'Not eligible', r.isBestTeacher ? 'Yes' : '', r.provisional ? 'Provisional' : 'Month ended', ...r.components.map((c) => c.score ?? 'N/A')]) },
    { name: 'Scoring rules', headers: ['Rule', 'Details'], rows: [['Formula', data.formula], ['Excluded', data.excluded.join('; ')], ['Class starts', '50% recorded start rate + 50% within 5 minutes; only reliable tracked classes'], ['Papers', '50% submission + 50% on-time rate; admin-assigned deadlines only; paper quality excluded'], ['Results', '70% average student/subject attainment + 30% improvement when baseline exists; no baseline uses attainment only'], ['Responsiveness', 'Mean of available doubt response/resolution score and on-time grading rate; 24h first response target'], ['Source cutoff', data.period.asOf.toISOString()]] },
    { name: 'Evidence', headers: ['Teacher', 'Due classes', 'Started', 'On time', 'Assigned papers', 'Papers submitted', 'Papers on time', 'Evaluations due', 'Evaluations done', 'Mean grading hours', 'Doubts assigned', 'Doubts answered', 'Doubts resolved', 'Mean response hours'], rows: reports.map((r) => { const e = r.evidence; return [r.teacher.name, e.classes.due, e.classes.started, e.classes.onTime, e.papers.assigned, e.papers.submitted, e.papers.onTime, e.evaluation.due, e.evaluation.completed, e.evaluation.averageHours, e.doubts.assigned, e.doubts.answered, e.doubts.resolved, e.doubts.averageResponseHours ?? 'N/A']; }) },
  ]);
  res.json({ success: true, ...data, reports });
});
const marks = wrap(async (req, res) => {
  if (req.user.role !== 'admin') throw fail('Admin access required.', 403);
  const period = monthPeriod(req.query.month, req.query.year);
  const scores = await Score.find({ isPublished: true, examDate: { $gte: period.start, $lt: period.end } }).populate('student', 'name displayName grade board').populate('teacher', 'name').sort({ examDate: -1 }).lean();
  const allRecords = scores.filter((s) => s.student && s.maxMarks > 0 && s.marksObtained >= 0 && s.marksObtained <= s.maxMarks)
    .map((s) => ({ ...s, className: (s.classGrade || s.student.grade || 'Unspecified') + ((s.classBoard || s.student.board) ? ' · ' + (s.classBoard || s.student.board) : ''), percentage: Math.round(s.marksObtained / s.maxMarks * 10000) / 100 }));
  const records = allRecords.filter((s) => !req.query.grade || s.className === req.query.grade);
  const students = new Map();
  records.filter((s) => (s.kind || 'exam') === 'exam').forEach((s) => {
    const key = `${s.className}:${s.student._id}`, row = students.get(key) || { student: s.student, className: s.className, percentages: [], count: 0 };
    row.percentages.push(s.percentage); row.count++; students.set(key, row);
  });
  const leaders = [...students.values()].map(({ percentages, ...r }) => ({ ...r, percentage: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 100) / 100 }))
    .sort((a, b) => a.className.localeCompare(b.className) || b.percentage - a.percentage || a.student.name.localeCompare(b.student.name));
  let className, previous, rank = 0, position = 0;
  leaders.forEach((r) => { if (className !== r.className) { className = r.className; previous = undefined; position = 0; } position++; if (previous !== r.percentage) rank = position; r.rank = rank; previous = r.percentage; });
  if (req.query.format === 'xlsx') return sendExcel(res, `class-marks-${period.year}-${period.month}`, [
    { name: 'Published marks', headers: ['Class', 'Student', 'Teacher', 'Subject', 'Exam', 'Kind', 'Marks', 'Maximum', 'Percentage', 'Exam date'], rows: records.map((s) => [s.className, s.student.name, s.teacher?.name || '', s.subject, s.examTitle, s.kind || 'exam', s.marksObtained, s.maxMarks, s.percentage, new Date(s.examDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })]) },
    { name: 'Class leaders', headers: ['Class', 'Rank', 'Student', 'Average percentage', 'Graded exams'], rows: leaders.map((r) => [r.className, r.rank, r.student.name, r.percentage, r.count]) },
    { name: 'Method', headers: ['Report basis'], rows: [['Ranks use average percentage of published exam results only; homework is excluded.'], ['Students may have different graded-exam counts. These are published-result leaders, not a common-exam competition.'], ['Class at exam is used where recorded; older marks use the student current class.']] },
  ]);
  res.json({ success: true, period, records, leaders, grades: [...new Set(allRecords.map((s) => s.className))].sort() });
});
module.exports = { performance, marks };

const User = require('../models/User');
const Exam = require('../models/Exam');
const Submission = require('../models/ExamSubmission');
const Score = require('../models/ExamScore');
const ClassSchedule = require('../models/ClassSchedule');
const Doubt = require('../models/Doubt');
const Reply = require('../models/DoubtReply');
const Report = require('../models/TeacherPerformanceReport');
const { monthPeriod } = require('../utils/academicDates');
const { calculatePerformance, rankReports } = require('./performanceCalculator');
const pending = new Map();
async function generateMonth(month, year, now = new Date()) {
  const period = monthPeriod(month, year, now), key = `${period.year}-${period.month}`;
  if (pending.has(key)) return pending.get(key);
  const promise = (async () => {
    const [teachers, classes, exams, scores, doubts] = await Promise.all([
      User.find({ role: 'teacher' }).select('name isActive isApproved').lean(),
      ClassSchedule.find({ scheduledDate: { $gte: new Date(+period.start - 86400000), $lt: new Date(+period.end + 86400000) } }).select('teacherId scheduledDate scheduledTime durationMinutes status cancelledAt performanceTrackingVersion teacherStartedAt').lean(),
      Exam.find({ $or: [{ paperDueAt: { $gte: period.start, $lt: period.end } }, { gradingDueAt: { $gte: period.start, $lt: period.end } }] }).select('teacher assignedByAdmin paperDueAt gradingDueAt status cancelledAt paperSubmittedAt paperSubmittedBy').lean(),
      Score.find({ isPublished: { $ne: false }, createdAt: { $lte: period.asOf, $gte: new Date(+period.start - 366 * 86400000) } }).select('student teacher subject maxMarks marksObtained examDate kind createdAt updatedAt submission isPublished').lean(),
      Doubt.find({ createdAt: { $gte: period.start, $lte: period.asOf }, isDeleted: false }).select('assignedTeachers createdAt resolvedAt isDeleted').lean(),
    ]);
    const [submissions, replies] = await Promise.all([
      Submission.find({ $or: [{ exam: { $in: exams.map((e) => e._id) } }, { _id: { $in: scores.map((s) => s.submission).filter(Boolean) } }] }).select('exam student teacher submittedAt gradingHistory.marks gradingHistory.at gradingHistory.by').lean(),
      Reply.find({ doubtId: { $in: doubts.map((d) => d._id) }, senderRole: 'teacher', isDeleted: false, createdAt: { $lte: period.asOf } }).select('doubtId senderId senderRole createdAt isDeleted').lean(),
    ]);
    const reports = rankReports(calculatePerformance({ teachers, classes, exams, submissions, scores, doubts, replies, period }));
    if (reports.length) await Report.bulkWrite(reports.map((r) => ({ updateOne: { filter: { teacher: r.teacher._id, month: r.month, year: r.year }, update: { $set: { ...r, teacher: r.teacher._id } }, upsert: true } })));
    return { period, reports, excluded: ['Student/parent feedback', 'Conduct/extra contribution', 'Question-paper quality', 'Unrecorded legacy class attendance'], formula: 'Each available score (0–100) × its weight; divide by the sum of available weights. Coverage is measured against the 80 tracked weight points. Best teacher needs ≥50% coverage, ≥3 observations and ≥2 scored categories. Current-month rankings are provisional.', targets: { classGraceMinutes: 5, doubtResponseHours: 24 } };
  })();
  pending.set(key, promise);
  try { return await promise; } finally { pending.delete(key); }
}
module.exports = { generateMonth };

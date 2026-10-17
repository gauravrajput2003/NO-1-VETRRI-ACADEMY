const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Submission = require('../models/ExamSubmission');
const ExamScore = require('../models/ExamScore');
const User = require('../models/User');
const { verifyExamAsset } = require('../services/examAssetService');
const notification = require('../services/notificationService');
const { monthPeriod } = require('../utils/academicDates');
const { id, canManageExam, canViewExam, studentExamView } = require('../utils/examAccess');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const wrap = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (error) { res.status(error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 500)).json({ success: false, message: error.status || error.name === 'ValidationError' ? error.message : 'Unable to complete this request. Please retry.' }); }
};
const staff = (user) => { if (!['teacher', 'admin'].includes(user.role) || (user.role === 'teacher' && user.isApproved === false)) throw fail('Teacher or admin access required.', 403); };
async function examFor(req, manage = false) {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail('Invalid exam.', 400);
  const exam = await Exam.findById(req.params.id);
  if (!exam || !(manage ? canManageExam(req.user, exam) : canViewExam(req.user, exam))) throw fail('Exam not found or access denied.', 404);
  if (manage) staff(req.user);
  return exam;
}
async function notify(req, recipientIds, title, message, role = 'student') {
  try { await notification.sendBulkNotifications({ recipientIds: recipientIds.map(id), senderId: req.user._id, type: 'academic_exam', title, message, link: `/${role}/exams`, data: { screen: 'ExamManagement' }, io: req.app.get('io') }); }
  catch (error) { console.warn('[Exams] Notification failed:', error.message); }
}
const options = wrap(async (req, res) => {
  staff(req.user);
  const filter = { role: 'student', isActive: true };
  if (req.user.role === 'teacher') filter.assignedTeachers = req.user._id;
  const [students, teachers] = await Promise.all([
    User.find(filter).select('name displayName grade board').sort({ name: 1 }).lean(),
    req.user.role === 'admin' ? User.find({ role: 'teacher', isActive: true, isApproved: { $ne: false } }).select('name').sort({ name: 1 }).lean() : [],
  ]);
  res.json({ success: true, students, teachers });
});
const create = wrap(async (req, res) => {
  staff(req.user);
  const b = req.body;
  const teacherId = req.user.role === 'admin' ? b.teacher : req.user._id;
  if (!mongoose.isValidObjectId(teacherId)) throw fail('Select a teacher.');
  const teacher = await User.findOne({ _id: teacherId, role: 'teacher', isActive: true, isApproved: { $ne: false } });
  if (!teacher) throw fail('Select an active, approved teacher.');
  const dates = ['paperDueAt', 'startsAt', 'submissionsDueAt', 'gradingDueAt'].map((field) => new Date(b[field]));
  const now = new Date();
  if (dates.some((date) => !Number.isFinite(+date)) || dates[0] < now || dates[0] > dates[1] || dates[1] >= dates[2] || dates[2] > dates[3]) throw fail('Use future dates in order: paper deadline, exam start, answer deadline, grading deadline.');
  const maxMarks = Number(b.maxMarks);
  if (!Number.isFinite(maxMarks) || maxMarks < 1 || maxMarks > 10000) throw fail('Maximum marks must be between 1 and 10000.');
  if (['title', 'subject', 'grade'].some((key) => typeof b[key] !== 'string' || !b[key].trim()) || (b.board !== undefined && typeof b.board !== 'string')) throw fail('Title, subject and class are required.');
  const studentFilter = { role: 'student', isActive: true, grade: b.grade.trim(), ...(b.board ? { board: b.board.trim() } : {}) };
  if (req.user.role === 'teacher') studentFilter.assignedTeachers = req.user._id;
  // Snapshot the assigned class. Newly enrolled students are not silently added to an exam.
  if (b.studentIds !== undefined && !Array.isArray(b.studentIds)) throw fail('Invalid student selection.');
  if (b.studentIds?.length) {
    if (!Array.isArray(b.studentIds) || b.studentIds.some((v) => !mongoose.isValidObjectId(v))) throw fail('Invalid student selection.');
    studentFilter._id = { $in: b.studentIds };
  }
  const students = await User.find(studentFilter).select('_id').lean();
  if (!students.length) throw fail('No active students match this class and assignment.');
  if (b.studentIds?.length && students.length !== new Set(b.studentIds.map(String)).size) throw fail('Some selected students are outside your assigned class.', 403);
  const exam = await Exam.create({ teacher: teacherId, createdBy: req.user._id, assignedByAdmin: req.user.role === 'admin', title: b.title, subject: b.subject, grade: b.grade, board: b.board, kind: b.kind || 'exam', examType: b.examType || 'weekly', maxMarks, paperDueAt: dates[0], startsAt: dates[1], submissionsDueAt: dates[2], gradingDueAt: dates[3], studentIds: students.map((s) => s._id) });
  if (req.user.role === 'admin') await notify(req, [teacherId], 'Question paper assigned', `${exam.title}: upload and publish your paper before ${dates[0].toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`, 'teacher');
  res.status(201).json({ success: true, exam });
});
const list = wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : req.user.role === 'teacher' ? { teacher: req.user._id } : { studentIds: req.user._id, status: 'published' };
  if (req.query.grade) filter.grade = String(req.query.grade);
  if (req.query.month) { const p = monthPeriod(req.query.month, req.query.year); const range = { $gte: p.start, $lt: p.end }; filter.$or = [{ startsAt: range }, { paperDueAt: range }, { gradingDueAt: range }]; }
  const page = Math.max(1, Number(req.query.page) || 1), limit = 25;
  const [records, total] = await Promise.all([Exam.find(filter).populate('teacher', 'name displayName').sort({ startsAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Exam.countDocuments(filter)]);
  res.json({ success: true, exams: req.user.role === 'student' ? records.map((exam) => studentExamView(exam)) : records, page, pages: Math.ceil(total / limit), total });
});
const detail = wrap(async (req, res) => {
  const exam = await examFor(req);
  await exam.populate('teacher', 'name displayName');
  const filter = { exam: exam._id, ...(req.user.role === 'student' ? { student: req.user._id } : {}) };
  const submissions = await Submission.find(filter).populate('student', 'name displayName grade').sort({ submittedAt: -1 }).lean();
  res.json({ success: true, exam: req.user.role === 'student' ? studentExamView(exam) : exam, submissions });
});
const publish = wrap(async (req, res) => {
  const exam = await examFor(req, true);
  if (exam.status === 'published') return res.json({ success: true, exam });
  if (exam.status === 'cancelled' || new Date() >= exam.submissionsDueAt) throw fail('This exam is cancelled or closed.');
  const paper = await verifyExamAsset(req.body.paperToken, req.user);
  const now = new Date();
  const updated = await Exam.findOneAndUpdate({ _id: exam._id, status: 'draft' }, { $set: { paper, paperSubmittedAt: now, paperSubmittedBy: req.user._id, publishedAt: now, status: 'published' } }, { new: true, runValidators: true });
  if (updated) await notify(req, exam.studentIds, `New ${exam.kind}: ${exam.title}`, `${exam.subject} · Class ${exam.grade}. Paper opens at ${exam.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`);
  res.json({ success: true, exam: updated || await Exam.findById(exam._id) });
});
const submit = wrap(async (req, res) => {
  if (req.user.role !== 'student') throw fail('Only enrolled students can submit answers.', 403);
  const exam = await examFor(req);
  const now = new Date();
  if (now < exam.startsAt || now > exam.submissionsDueAt) throw fail('Answer submission is not open. Check the start time and deadline.');
  const existing = await Submission.findOne({ exam: exam._id, student: req.user._id });
  if (existing) return res.json({ success: true, submission: existing, message: 'Answers already submitted. Contact your teacher if a correction is needed.' });
  const tokens = req.body.answerTokens;
  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 5 || new Set(tokens).size !== tokens.length) throw fail('Upload 1–5 distinct PDF/image answer files.');
  const attachments = [];
  for (const token of tokens) attachments.push(await verifyExamAsset(token, req.user));
  // A single immutable submitted answer set prevents overwrite/grade races and duplicate notifications.
  let submission;
  try {
    await mongoose.connection.transaction(async (session) => {
      const gate = await Exam.updateOne({ _id: exam._id, status: 'published', startsAt: { $lte: now }, submissionsDueAt: { $gte: now } }, { $inc: { answerCount: 1 } }, { session });
      if (gate.modifiedCount !== 1) throw fail('The exam was cancelled or its submission window closed.');
      [submission] = await Submission.create([{ exam: exam._id, student: req.user._id, teacher: exam.teacher, classBoard: req.user.board || exam.board || '', attachments, note: String(req.body.note || ''), submittedAt: now }], { session });
    });
  }
  catch (error) { if (error.code !== 11000) throw error; return res.json({ success: true, submission: await Submission.findOne({ exam: exam._id, student: req.user._id }) }); }
  await notify(req, [exam.teacher], 'Answer sheet received', `${req.user.name} submitted answers for ${exam.title}.`, 'teacher');
  res.status(201).json({ success: true, submission });
});
const grade = wrap(async (req, res) => {
  const exam = await examFor(req, true);
  if (exam.status !== 'published') throw fail('Only published exams can be graded.');
  const marks = Number(req.body.marks);
  if (!['string', 'number'].includes(typeof req.body.marks) || req.body.marks === '' || req.body.marks === null || !Number.isFinite(marks) || marks < 0 || marks > exam.maxMarks) throw fail(`Marks must be between 0 and ${exam.maxMarks}.`);
  const now = new Date();
  const feedback = String(req.body.feedback || '').trim();
  if (feedback.length > 3000) throw fail('Feedback must be no longer than 3000 characters.');
  let submission, changed;
  await mongoose.connection.transaction(async (session) => {
    submission = await Submission.findOne({ _id: req.params.submissionId, exam: exam._id }).session(session);
    if (!submission) throw fail('Submission not found.', 404);
    changed = submission.status !== 'graded' || submission.marksObtained !== marks || submission.feedback !== feedback;
    const pct = marks / exam.maxMarks * 100;
    await ExamScore.findOneAndUpdate({ submission: submission._id }, { $set: { student: submission.student, teacher: exam.teacher, exam: exam._id, submission: submission._id, subject: exam.subject, examTitle: exam.title, classGrade: exam.grade, classBoard: exam.board || submission.classBoard || '', kind: exam.kind, examType: exam.examType, marksObtained: marks, maxMarks: exam.maxMarks, examDate: exam.startsAt, grade: pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D', remarks: feedback, isPublished: true } }, { session, upsert: true, new: true, runValidators: true });
    if (changed) {
      submission.status = 'graded'; submission.marksObtained = marks; submission.feedback = feedback; submission.gradedAt = now;
      if (!submission.firstGradedAt) submission.firstGradedAt = now;
      submission.gradingHistory.push({ marks, feedback, at: now, by: req.user._id });
      await submission.save({ session });
    }
  });
  if (changed) await notify(req, [submission.student], 'Marks published: ' + exam.title, 'You scored ' + marks + '/' + exam.maxMarks + '. Open Exam Management to read your teacher feedback.');
  res.json({ success: true, submission });
});
const cancel = wrap(async (req, res) => {
  if (req.user.role !== 'admin') throw fail('Only admins can cancel assigned exams.', 403);
  const exam = await examFor(req, true);
  if (typeof req.body.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length > 1000) throw fail('Provide a cancellation reason (up to 1000 characters).');
  if (exam.status === 'cancelled') return res.json({ success: true, exam });
  const cancelled = await Exam.findOneAndUpdate({ _id: exam._id, answerCount: 0 }, { $set: { status: 'cancelled', cancelReason: req.body.reason.trim(), cancelledAt: new Date() } }, { new: true });
  if (!cancelled) throw fail('This exam has student submissions and cannot be cancelled.');
  res.json({ success: true, exam: cancelled });
});
module.exports = { options, create, list, detail, publish, submit, grade, cancel };

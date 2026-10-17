const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const access = require('../utils/examAccess');
const { monthPeriod } = require('../utils/academicDates');
const NOW = Date.parse('2026-10-17T10:00:00Z');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const query = (value) => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value, session: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
function fixture() {
  let clock = NOW, exam, submission, score, failScore = false;
  const calls = [], notifications = [], session = { transaction: 'test' };
  const students = [{ _id: 's1', name: 'Student 1', grade: '10th', assignedTeachers: ['t1'] }, { _id: 's2', name: 'Student 2', grade: '10th', assignedTeachers: ['t2'] }];
  const makeExam = (value) => ({ _id: 'e1', ...value, populate: async () => {}, toObject() { return { ...this }; } });
  const deps = {
    mongoose: { isValidObjectId: (id) => typeof id === 'string' && id.length > 0, connection: { transaction: async (fn) => { calls.push('begin'); try { await fn(session); calls.push('commit'); } catch (e) { calls.push('abort'); throw e; } } } },
    '../models/Exam': {
      findById: async () => exam,
      create: async (value) => (exam = makeExam({ ...value, status: 'draft', answerCount: 0 })),
      updateOne: async (filter, update, opts) => { assert.equal(opts.session, session); calls.push('exam-gate'); if (exam.status !== 'published') return { modifiedCount: 0 }; exam.answerCount++; return { modifiedCount: 1 }; },
      findOneAndUpdate: async (filter, update) => {
        if (filter.status === 'draft' && exam.status !== 'draft') return null;
        if (filter.answerCount === 0 && exam.answerCount !== 0) return null;
        Object.assign(exam, update.$set); return exam;
      },
    },
    '../models/ExamSubmission': {
      findOne: () => query(submission),
      create: async (values, opts) => { assert.equal(opts.session, session); calls.push('answer-save'); submission = { _id: 'sub1', ...values[0], status: 'submitted', gradingHistory: [], save: async (options) => { assert.equal(options.session, session); calls.push('grade-save'); } }; return [submission]; },
      find: (filter) => query(submission && (!filter.student || filter.student === submission.student) ? [submission] : []),
    },
    '../models/ExamScore': { findOneAndUpdate: async (filter, update, opts) => { assert.equal(opts.session, session); calls.push('score-save'); if (failScore) throw Error('DB unavailable'); score = { ...update.$set }; } },
    '../models/User': {
      findOne: async (filter) => filter._id === 't1' ? { _id: 't1', role: 'teacher' } : null,
      find: (filter) => query(students.filter((s) => (!filter.grade || s.grade === filter.grade) && (!filter._id || filter._id.$in.includes(s._id)) && (!filter.assignedTeachers || s.assignedTeachers.includes(filter.assignedTeachers)))),
    },
    '../services/examAssetService': { verifyExamAsset: async (token) => { if (token !== 'mine') throw Object.assign(Error('Foreign upload'), { status: 403 }); return { publicId: 'owned-file', url: 'https://cloud.test/file.pdf', mimeType: 'application/pdf' }; } },
    '../services/notificationService': { sendBulkNotifications: async (notification) => { calls.push('notify'); notifications.push(notification); } },
    '../utils/academicDates': { monthPeriod }, '../utils/examAccess': { ...access, studentExamView: (record) => access.studentExamView(record, new Date(clock)) },
  };
  const module = { exports: {} };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/examController.js'), 'utf8'), { module, require: (key) => deps[key], Date: Clock, console });
  const run = async (handler, role, body = {}, userId = role === 'admin' ? 'admin' : role === 'teacher' ? 't1' : 's1') => { const res = response(); await module.exports[handler]({ user: { _id: userId, role, isApproved: true, name: userId }, params: { id: 'e1', submissionId: 'sub1' }, body, query: {}, app: { get() {} } }, res); return res; };
  const plan = { teacher: 't1', title: 'Weekly science', subject: 'Science', grade: '10th', maxMarks: 100, studentIds: ['s1'], paperDueAt: new Date(NOW + 3600000).toISOString(), startsAt: new Date(NOW + 7200000).toISOString(), submissionsDueAt: new Date(NOW + 10800000).toISOString(), gradingDueAt: new Date(NOW + 14400000).toISOString() };
  return { run, plan, calls, notifications, now: (value) => { clock = value; }, exam: () => exam, submission: () => submission, score: () => score, failScore: () => { failScore = true; } };
}

test('full exam lifecycle: assignment → paper → enrolled answer → atomic marks and student feedback', async () => {
  const f = fixture();
  assert.equal((await f.run('create', 'admin', f.plan)).code, 201);
  assert.deepEqual(Array.from(f.exam().studentIds), ['s1']);
  assert.equal((await f.run('publish', 'teacher', { paperToken: 'mine' })).code, 200);
  assert.equal((await f.run('detail', 'student')).body.exam.paper, undefined);
  assert.equal((await f.run('detail', 'student', {}, 's2')).code, 404);
  assert.equal((await f.run('submit', 'student', { answerTokens: ['mine'] })).code, 400);
  f.now(NOW + 7200001);
  assert.equal((await f.run('submit', 'student', { answerTokens: ['mine'], note: 'All pages included' })).code, 201);
  assert.equal((await f.run('grade', 'teacher', { marks: 75, feedback: 'Show your working next time' })).code, 200);
  assert.equal(f.score().marksObtained, 75); assert.equal(f.score().classGrade, '10th'); assert.equal(f.score().isPublished, true);
  assert.equal(f.submission().gradingHistory.length, 1);
  const student = await f.run('detail', 'student');
  assert.equal(student.body.submissions[0].feedback, 'Show your working next time');
  assert.equal(student.body.exam.studentIds, undefined);
  assert.ok(f.calls.lastIndexOf('commit') < f.calls.lastIndexOf('notify'));
});

test('repeated submissions/grades do not duplicate records or notifications; corrections keep history', async () => {
  const f = fixture(); await f.run('create', 'admin', f.plan); await f.run('publish', 'teacher', { paperToken: 'mine' }); f.now(NOW + 7200001);
  await f.run('submit', 'student', { answerTokens: ['mine'] }); await f.run('grade', 'teacher', { marks: 0, feedback: '' });
  const notifications = f.notifications.length, firstGraded = +f.submission().firstGradedAt;
  assert.equal((await f.run('submit', 'student', { answerTokens: ['expired-token'] })).code, 200);
  assert.equal((await f.run('grade', 'teacher', { marks: 0, feedback: '' })).code, 200);
  assert.equal(f.notifications.length, notifications); assert.equal(f.submission().gradingHistory.length, 1);
  f.now(NOW + 7201000); await f.run('grade', 'teacher', { marks: 10, feedback: 'Correction' });
  assert.equal(f.submission().gradingHistory.length, 2); assert.equal(+f.submission().firstGradedAt, firstGraded); assert.equal(f.score().marksObtained, 10);
});

test('wrong teacher, unassigned student, forged upload tokens and invalid marks are rejected', async () => {
  const f = fixture(); await f.run('create', 'admin', f.plan);
  assert.equal((await f.run('publish', 'teacher', { paperToken: 'mine' }, 't2')).code, 404);
  assert.equal((await f.run('publish', 'teacher', { paperToken: 'foreign' })).code, 403);
  await f.run('publish', 'teacher', { paperToken: 'mine' }); f.now(NOW + 7200001); await f.run('submit', 'student', { answerTokens: ['mine'] });
  for (const marks of [-1, 101, '', null, [], false, 'not a mark']) assert.equal((await f.run('grade', 'teacher', { marks })).code, 400);
  assert.equal((await f.run('grade', 'student', { marks: 50 })).code, 404);
  assert.equal((await f.run('create', 'student', f.plan)).code, 403);
});

test('failed score writes abort grading and never publish a grade notification', async () => {
  const f = fixture(); await f.run('create', 'admin', f.plan); await f.run('publish', 'teacher', { paperToken: 'mine' }); f.now(NOW + 7200001); await f.run('submit', 'student', { answerTokens: ['mine'] });
  const count = f.notifications.length; f.failScore();
  assert.equal((await f.run('grade', 'teacher', { marks: 80 })).code, 500);
  assert.equal(f.submission().status, 'submitted'); assert.equal(f.notifications.length, count); assert.equal(f.calls.at(-1), 'abort');
});

test('cancellation is admin-only and cannot remove an exam with student answers', async () => {
  const f = fixture(); await f.run('create', 'admin', f.plan);
  assert.equal((await f.run('cancel', 'teacher', { reason: 'Mistake' })).code, 403);
  await f.run('publish', 'teacher', { paperToken: 'mine' }); f.now(NOW + 7200001); await f.run('submit', 'student', { answerTokens: ['mine'] });
  assert.equal((await f.run('cancel', 'admin', { reason: 'Mistake' })).code, 400); assert.equal(f.exam().status, 'published');
  const other = fixture(); await other.run('create', 'admin', other.plan); assert.equal((await other.run('cancel', 'admin', { reason: 'Wrong schedule' })).code, 200);
  assert.equal((await other.run('detail', 'student')).code, 404);
});

test('teacher cannot assign other teachers or students outside their class; deadline order is validated', async () => {
  const f = fixture();
  assert.equal((await f.run('create', 'teacher', { ...f.plan, teacher: 't2' })).body.exam.teacher, 't1');
  assert.equal((await f.run('create', 'teacher', { ...f.plan, studentIds: ['s2'] })).code, 400);
  assert.equal((await f.run('create', 'admin', { ...f.plan, startsAt: new Date(NOW).toISOString() })).code, 400);
});

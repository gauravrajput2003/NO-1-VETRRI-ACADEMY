const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { monthPeriod } = require('../utils/academicDates');
const { createWorkbook } = require('../utils/excelWorkbook');
const XLSX = require('../../client/node_modules/xlsx');
const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; }, send(body) { this.body = body; } });
function load(filename, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'), { module, require: (key) => dependencies[key], process: { env: { JWT_SECRET: 'exam-test-secret' } }, Date, console });
  return module.exports;
}
function report(id, name) {
  return { teacher: { _id: id, name }, totalScore: 80, coverage: 100, rank: 1, eligible: true, isBestTeacher: true, components: [], evidence: { classes: { due: 1, started: 1, onTime: 1 }, papers: { assigned: 1, submitted: 1, onTime: 1 }, evaluation: { due: 1, completed: 1, averageHours: 4 }, doubts: { assigned: 1, answered: 1, resolved: 1, averageResponseHours: 2 } } };
}
test('teachers can read/export only their own rating even if they supply another teacher ID', async () => {
  const controller = load('controllers/academicReportController.js', {
    '../utils/academicDates': { monthPeriod }, '../utils/excelWorkbook': { createWorkbook },
    '../models/ExamScore': {}, '../services/teacherPerformanceService': { generateMonth: async () => ({ period: monthPeriod(10, 2026), reports: [report('t1', 'Own Teacher'), report('t2', 'PRIVATE OTHER TEACHER')], excluded: [], formula: 'Test policy' }) },
  });
  for (const format of [undefined, 'xlsx']) {
    const res = response(); await controller.performance({ user: { _id: 't1', role: 'teacher' }, query: { teacherId: 't2', format } }, res);
    assert.equal(res.code, 200);
    if (format) {
      const workbook = XLSX.read(res.body, { type: 'buffer' });
      const text = workbook.SheetNames.map((name) => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join('\n');
      assert.match(text, /Own Teacher/); assert.doesNotMatch(text, /PRIVATE OTHER/);
    } else { assert.equal(res.body.reports.length, 1); assert.equal(res.body.reports[0].teacher._id, 't1'); }
  }
  const student = response(); await controller.performance({ user: { _id: 's1', role: 'student' }, query: {} }, student); assert.equal(student.code, 403);
});

test('class marks and leaders keep boards separate and do not expose other classes through a filter', async () => {
  const records = [
    { _id: 'a', student: { _id: 's1', name: 'A', grade: '10th', board: 'CBSE' }, teacher: { name: 'T' }, marksObtained: 40, maxMarks: 50, subject: 'Maths', examDate: new Date(), kind: 'exam' },
    { _id: 'b', student: { _id: 's2', name: 'B', grade: '10th', board: 'State Board' }, teacher: { name: 'T' }, marksObtained: 90, maxMarks: 100, subject: 'Maths', examDate: new Date(), kind: 'exam' },
    { _id: 'c', student: { _id: 's1', name: 'A', grade: '10th', board: 'CBSE' }, teacher: { name: 'T' }, marksObtained: 0, maxMarks: 100, kind: 'homework', examDate: new Date() },
  ];
  const query = { populate() { return this; }, sort() { return this; }, lean: async () => records };
  const controller = load('controllers/academicReportController.js', { '../models/ExamScore': { find: () => query }, '../utils/academicDates': { monthPeriod }, '../utils/excelWorkbook': { createWorkbook }, '../services/teacherPerformanceService': {} });
  const res = response(); await controller.marks({ user: { role: 'admin' }, query: { month: 10, year: 2026 } }, res);
  assert.equal(res.body.leaders.length, 2); assert.ok(res.body.leaders.every((r) => r.rank === 1)); assert.equal(res.body.leaders.find((r) => r.student._id === 's1').percentage, 80);
  const filtered = response(); await controller.marks({ user: { role: 'admin' }, query: { grade: '10th · CBSE' } }, filtered);
  assert.equal(filtered.body.records.length, 2); assert.ok(filtered.body.records.every((r) => r.student._id === 's1'));
  const denied = response(); await controller.marks({ user: { role: 'teacher' }, query: {} }, denied); assert.equal(denied.code, 403);
});

test('exam file verification checks the signed owner, purpose, resource and finished byte count', async () => {
  let checks = 0;
  const service = load('services/examAssetService.js', { jsonwebtoken: jwt, '../config/cloudinary': { api: { resource: async (publicId) => { checks++; return { public_id: publicId, resource_type: 'image', secure_url: 'https://cloud.test/file.pdf', bytes: 100 }; } } } });
  const claims = { kind: 'direct-upload', purpose: 'exam', owner: 's1', publicId: 'owned/file', resourceType: 'image', mimetype: 'application/pdf', size: 100, filename: 'answers.pdf' };
  const sign = (overrides = {}) => jwt.sign({ ...claims, ...overrides }, 'exam-test-secret', { expiresIn: '1h' });
  const asset = await service.verifyExamAsset(sign(), { _id: 's1' }); assert.equal(asset.url, 'https://cloud.test/file.pdf');
  await assert.rejects(service.verifyExamAsset(sign(), { _id: 's2' }), /does not belong/);
  await assert.rejects(service.verifyExamAsset(sign({ purpose: 'material' }), { _id: 's1' }), /does not belong/);
  assert.equal(checks, 1);
  await assert.rejects(service.verifyExamAsset(sign({ size: 101 }), { _id: 's1' }), /not finished/);
});

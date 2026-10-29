const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, exports: module.exports, require: (key) => dependencies[key] || {},
    console: { error() {}, warn() {} }, Date, process: { env: {} },
  });
  return module.exports;
}
const request = (body = {}) => ({ body, params: { id: 'record' }, user: { _id: 'admin', role: 'admin' }, app: { get: () => null } });
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('fee messages address the student and use compatible app routes for every status', async () => {
  const notifications = [];
  const service = load('services/financialNotificationService.js', { './notificationService': { sendNotification: async (value) => notifications.push(value) } });
  for (const status of ['paid', 'partial', 'overdue', 'pending']) {
    await service.notifyFeeRecord({ fee: { _id: 'fee', student: { _id: 'student' }, month: 'October', year: 2026, amount: 500, status }, req: request() });
  }
  assert.deepEqual(notifications.map((n) => n.type), ['fee_paid', 'fee_partial', 'fee_overdue', 'fee_reminder']);
  assert.ok(notifications.every((n) => n.recipientId === 'student' && n.referenceId === 'fee' && n.link === '/student/fees'));
  assert.match(notifications[0].message, /October 2026.*500.*paid/);
});

test('notification outages do not throw after a financial record has been saved', async () => {
  const service = load('services/financialNotificationService.js', { './notificationService': { sendNotification: async () => { throw new Error('push down'); } } });
  await service.notifyFeeRecord({ fee: { _id: 'fee', student: 'student' }, req: request() });
  await service.notifySalaryRecord({ transaction: { _id: 'salary', teacherId: 'teacher' }, req: request(), action: 'removed' });
});

test('salary messages distinguish processing, corrections and record removal', async () => {
  const messages = [];
  const service = load('services/financialNotificationService.js', { './notificationService': { sendNotification: async (value) => messages.push(value) } });
  for (const action of ['processed', 'updated', 'removed']) await service.notifySalaryRecord({ transaction: { _id: 'salary', teacherId: 'teacher', monthYear: 'October 2026', paidAmount: 700, netSalary: 1000 }, req: request(), action });
  assert.deepEqual(messages.map((n) => n.title), ['Salary Processed', 'Salary Payment Updated', 'Salary Payment Record Removed']);
  assert.ok(messages.every((n) => n.type === 'salary_paid' && n.recipientId === 'teacher' && n.message.includes('700 of ₹1000')));
});

test('both fee controller write paths notify after saving; a failed save sends nothing', async () => {
  const calls = [];
  const fee = { _id: 'fee', student: 'student', status: 'paid' };
  const controller = load('controllers/adminController.js', {
    '../models/FeesRecord': {
      create: async () => { calls.push('save'); return fee; },
      findByIdAndUpdate: () => ({ populate: async () => { calls.push('update'); return fee; } }),
    },
    '../services/financialNotificationService': { notifyFeeRecord: async ({ fee: value }) => { assert.equal(value, fee); calls.push('notify'); } },
  });
  await controller.recordFeePayment(request({ studentId: 'student' }), response());
  await controller.updateFeeStatus(request({ status: 'paid' }), response());
  assert.deepEqual(calls, ['save', 'notify', 'update', 'notify']);
  const failed = load('controllers/adminController.js', {
    '../models/FeesRecord': { create: async () => { throw new Error('save failed'); } },
    '../services/financialNotificationService': { notifyFeeRecord: async () => calls.push('unexpected') },
  });
  const res = response();
  await failed.recordFeePayment(request(), res);
  assert.equal(res.code, 500);
  assert.equal(calls.includes('unexpected'), false);
});

test('the alternate admin fee creation route also notifies after save', async () => {
  const handlers = {}, calls = [];
  const router = { use() {}, get() {}, put() {}, patch() {}, delete() {}, post(route, ...callbacks) { handlers[route] = callbacks.at(-1); } };
  load('routes/adminRoutes.js', {
    express: { Router: () => router },
    '../middleware/upload': { uploadStudyMaterial: { single() {} }, uploadImage: { single() {} } },
    '../models/FeesRecord': { create: async () => { calls.push('save'); return { _id: 'fee' }; } },
    '../services/financialNotificationService': { notifyFeeRecord: async () => calls.push('notify') },
  });
  await handlers['/fees'](request(), response());
  assert.deepEqual(calls, ['save', 'notify']);
});

test('teacher approval uses the persisted approval value, including rejection', async () => {
  for (const approved of [true, false]) {
    const messages = [];
    const controller = load('controllers/adminController.js', {
      '../models/User': { findByIdAndUpdate: () => ({ select: async () => ({ _id: 'teacher', isApproved: approved }) }) },
      '../services/notificationService': { sendNotification: async (value) => messages.push(value) },
    });
    const res = response();
    await controller.approveTeacher(request({ isApproved: String(approved) }), res);
    assert.equal(res.code, 200);
    assert.equal(messages[0].recipientId, 'teacher');
    assert.equal(messages[0].data.isApproved, approved);
    assert.equal(messages[0].title, approved ? 'Teacher Account Approved' : 'Teacher Approval Not Granted');
  }
});

test('admin material unlock notifies after save, targets the student, and repeated unlocks are quiet', async () => {
  const calls = [];
  const material = { _id: 'material', lockedForAll: true, lockedFor: [], unlockedFor: [], save: async () => calls.push('save') };
  const controller = load('controllers/adminController.js', {
    '../models/StudyMaterial': { findById: async () => material },
    '../services/materialNotificationService': { notifyMaterialAvailable: async (value) => calls.push(value.recipientIds ? value.recipientIds[0] : 'all') },
  });
  await controller.adminToggleMaterialLock(request({ studentId: 'student', unlock: true }), response());
  assert.deepEqual(calls, ['save', 'student']);
  calls.length = 0;
  await controller.adminToggleMaterialLock(request({ studentId: 'student', unlock: true }), response());
  assert.deepEqual(calls, ['save']);
  calls.length = 0;
  await controller.adminToggleMaterialLock(request({ lockedForAll: false }), response());
  assert.deepEqual(calls, ['save', 'all']);
  calls.length = 0;
  await controller.adminToggleMaterialLock(request({ lockedForAll: true }), response());
  assert.deepEqual(calls, ['save']);
});

test('targeted material notifications retain grade/assignment/lock filters and skip unapproved materials', async () => {
  const filters = [];
  const service = load('services/materialNotificationService.js', {
    '../models/User': { find: (filter) => { filters.push(filter); return { select() { return this; }, lean: async () => [] }; } },
    './notificationService': { sendBulkNotifications: async () => {} },
  });
  const material = { _id: 'material', teacher: 'teacher', grade: '10', approvalStatus: 'approved', lockedForAll: true, unlockedFor: ['student'], lockedFor: ['blocked'] };
  await service.notifyMaterialAvailable({ material, recipientIds: ['student'] });
  assert.equal(filters[0].grade, '10');
  assert.equal(filters[0].$or[0].assignedTeachers, 'teacher');
  assert.equal(filters[0]._id.$nin[0], 'blocked');
  assert.equal(filters[0]._id.$in[0], 'student');
  assert.equal(filters[0].$and[0]._id.$in[0], 'student');
  await service.notifyMaterialAvailable({ material: { ...material, approvalStatus: 'pending_new' }, recipientIds: ['student'] });
  assert.equal(filters.length, 1);
});

test('legacy admin uploads notify students after creation and do not send a pending-review alert', async () => {
  const calls = [];
  const controller = load('controllers/teacherController.js', {
    '../models/StudyMaterial': { create: async (value) => { calls.push('save'); return { _id: 'material', ...value }; } },
    '../services/storageService': { uploadFileFromBuffer: async () => ({ originalFilename: 'notes.txt' }) },
    '../services/materialNotificationService': { notifyMaterialAvailable: async ({ material }) => { assert.equal(material.approvalStatus, 'approved'); calls.push('notify'); } },
    '../utils/logger': { logDev() {}, warnDev() {}, errorCrit() {} },
    '../utils/cache': { del() {}, delPrefix() {} },
    '../utils/adminCache': { getAdminUserIds: async () => { throw new Error('Admin uploads must not request review'); } },
  });
  const req = request({ title: 'Notes', subject: 'Maths', lockedForAll: 'false' });
  req.file = { buffer: true, mimetype: 'text/plain', originalname: 'notes.txt' };
  const res = response();
  await controller.uploadMaterial(req, res);
  assert.equal(res.code, 201);
  assert.deepEqual(calls, ['save', 'notify']);
});

test('bulk salary processing notifies only newly processed teachers after transaction and history saves', async () => {
  const calls = [];
  const teachers = ['paid', 'unpaid'].map((_id) => ({ _id, salary: { baseSalary: 1000 }, save: async () => calls.push('history') }));
  class Transaction {
    constructor(value) { Object.assign(this, { _id: 'salary' }, value); }
    static async findOne({ teacherId }) { return teacherId === 'paid' ? { paymentStatus: 'paid', paidAmount: 1000 } : null; }
    async save() { calls.push('save'); }
    toObject() { return { ...this }; }
  }
  const controller = load('controllers/salaryController.js', {
    '../models/User': { find: async () => teachers, findOne: async ({ _id }) => teachers.find((teacher) => teacher._id === _id) }, '../models/SalaryTransaction': Transaction,
    '../services/financialNotificationService': { notifySalaryRecord: async ({ transaction, action }) => calls.push(`${transaction.teacherId}:${action}`) },
  });
  const res = response();
  await controller.processAllSalaries(request({ month: 'October', year: 2026 }), res);
  assert.equal(res.body.processed, 1);
  assert.equal(res.body.failed, 0);
  assert.deepEqual(calls, ['save', 'history', 'unpaid:processed']);
});

test('salary payment edits and removals notify after save and history updates', async () => {
  for (const action of ['updated', 'removed']) {
    const calls = [];
    const payments = [{ amount: 250 }];
    payments.id = () => payments[0];
    payments.pull = () => payments.splice(0, 1);
    const transaction = { _id: 'salary', teacherId: 'teacher', netSalary: 1000, payments, save: async () => calls.push('save'), toObject() { return { ...this }; } };
    const controller = load('controllers/salaryController.js', {
      '../models/SalaryTransaction': { findById: async () => transaction },
      '../models/User': { findById: async () => ({ save: async () => calls.push('history') }) },
      '../services/financialNotificationService': { notifySalaryRecord: async (value) => { assert.equal(value.action, action); calls.push('notify'); } },
    });
    const req = request({ amount: 500 });
    req.params = { transactionId: 'salary', paymentId: 'payment' };
    const res = response();
    await controller[action === 'updated' ? 'editSalaryPayment' : 'deleteSalaryPayment'](req, res);
    assert.equal(res.code, 200);
    assert.deepEqual(calls, ['save', 'history', 'notify']);
    assert.equal(transaction.paidAmount, action === 'updated' ? 500 : 0);
  }
});

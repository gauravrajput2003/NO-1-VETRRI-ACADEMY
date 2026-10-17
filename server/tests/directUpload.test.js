const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const secret = 'synthetic-upload-test-secret';
const user = { _id: 'test-admin', role: 'admin' };
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = (body, account = user) => ({ body, user: account, params: {} });
const details = { uploadId: 'synthetic_upload_123456', filename: 'lesson.pdf', mimetype: 'application/pdf', size: 123, purpose: 'material' };
function fixture(overrides = {}) {
  const calls = [];
  const dependencies = {
    'node:crypto': require('node:crypto'), 'node:path': path, jsonwebtoken: jwt,
    '../config/cloudinary': { utils: { api_sign_request: () => 'signature' }, api: { resource: async (id, options) => {
      calls.push('cloud'); return { public_id: id, resource_type: options.resource_type, secure_url: 'https://cloud/verified.pdf', bytes: 123 };
    } } },
    '../models/LibraryAccess': { findOne: () => ({ lean: async () => ({ approved: true }) }) },
    '../models/StudyMaterial': { findOne: async () => null },
    '../models/TrainingVideo': { findOne: () => ({ sort: () => ({ select: async () => ({ order: 2 }) }) }), create: async (value) => { calls.push(value); return value; } },
    './storageController': { confirmUpload: async (req, res) => { calls.push(req.body); res.json({ success: true, material: req.body }); } },
    './teacherController': { editMaterial: async (req, res) => res.json({ handler: 'teacher', id: req.params.id }) },
    './adminController': { directEditMaterial: async (req, res) => res.json({ handler: 'admin', id: req.params.id }) },
    ...overrides,
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/directUploadController.js'), 'utf8'), {
    module, require: (key) => dependencies[key], process: { env: { JWT_SECRET: secret } }, Date,
  });
  const handlers = module.exports;
  const sign = async (data = details, account = user) => { const res = response(); await handlers.getDirectUploadParams(request(data, account), res); return res; };
  return { ...handlers, sign, calls };
}

test('signed uploads use a stable scoped asset ID and preserve the raw extension', async () => {
  const f = fixture();
  const first = await f.sign();
  const second = await f.sign();
  assert.equal(first.code, 200);
  assert.equal(first.body.publicId, second.body.publicId);
  assert.equal(first.body.overwrite, false);
  assert.match(first.body.folder, /test-admin\/material$/);
  const raw = await f.sign({ ...details, filename: 'slides.pptx', mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  assert.equal(raw.body.resourceType, 'raw');
  assert.match(raw.body.publicId, /\.pptx$/);
});

test('students, unapproved teachers, teacher training uploads and oversized files are rejected', async () => {
  const f = fixture({ '../models/LibraryAccess': { findOne: () => ({ lean: async () => null }) } });
  assert.equal((await f.sign(details, { _id: 'student', role: 'student' })).code, 403);
  assert.equal((await f.sign(details, { _id: 'teacher', role: 'teacher' })).code, 403);
  assert.equal((await f.sign({ ...details, purpose: 'training' }, { _id: 'teacher', role: 'teacher' })).code, 403);
  assert.equal((await f.sign({ ...details, size: 501 * 1024 * 1024 })).code, 400);
});

test('student exam signing cannot grant material/training access or be confirmed as a study material', async () => {
  const f = fixture(), student = { _id: 'student', role: 'student' };
  assert.equal((await f.sign({ ...details, purpose: 'exam' }, student)).code, 200);
  assert.equal((await f.sign({ ...details, purpose: 'exam', mimetype: 'video/mp4' }, student)).code, 400);
  assert.equal((await f.sign({ ...details, purpose: 'exam', size: 21 * 1024 * 1024 }, student)).code, 400);
  assert.equal((await f.sign(details, student)).code, 403);
  const signed = await f.sign({ ...details, purpose: 'exam' });
  const res = response(); await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken }), res);
  assert.equal(res.code, 400); assert.equal(f.calls.length, 0);
});

test('confirmation verifies cloud metadata and ignores forged client URLs and IDs', async () => {
  const f = fixture();
  const signed = await f.sign();
  const res = response();
  await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken, title: 'Lesson', subject: 'Science', fileUrl: 'https://attacker/file', publicId: 'foreign' }), res);
  assert.equal(res.code, 200);
  assert.equal(f.calls[0], 'cloud');
  assert.equal(res.body.material.fileUrl, 'https://cloud/verified.pdf');
  assert.notEqual(res.body.material.publicId, 'foreign');
});

test('wrong owners and invalid/expired receipts cannot save metadata', async () => {
  const f = fixture();
  const signed = await f.sign();
  for (const [token, account, code] of [[signed.body.uploadToken, { _id: 'other', role: 'admin' }, 403], ['invalid', user, 410]]) {
    const res = response(); await f.confirmDirectUpload(request({ uploadToken: token }, account), res); assert.equal(res.code, code);
  }
  assert.equal(f.calls.length, 0);
});

test('incomplete cloud assets and cloud outages never call the database writer', async () => {
  for (const status of [409, 503]) {
    const f = fixture({ '../config/cloudinary': { utils: { api_sign_request: () => 'sig' }, api: { resource: async (id) => {
      if (status === 503) throw Error('offline');
      return { public_id: id, resource_type: 'image', bytes: 100 };
    } } } });
    const signed = await f.sign(), res = response();
    await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken }), res);
    assert.equal(res.code, status);
    assert.equal(f.calls.length, 0);
  }
});

test('repeated confirmation returns the saved record without repeating upload or notifications', async () => {
  const f = fixture({ '../models/StudyMaterial': { findOne: async () => ({ _id: 'saved' }) } });
  const signed = await f.sign(), res = response();
  await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken }), res);
  assert.equal(res.body.material._id, 'saved');
  assert.equal(f.calls.length, 0);
});

test('replacement files follow the existing teacher approval or admin editing handler', async () => {
  const f = fixture();
  for (const role of ['admin', 'teacher']) {
    const account = { _id: role, role }, signed = await f.sign(details, account), res = response();
    await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken, materialId: 'original' }, account), res);
    assert.equal(res.body.handler, role);
    assert.equal(res.body.id, 'original');
  }
});

test('training video metadata is created only after cloud verification', async () => {
  const f = fixture({ '../models/TrainingVideo': { findOne: (query) => query ? Promise.resolve(null) : { sort: () => ({ select: async () => ({ order: 2 }) }) }, create: async (value) => { f.calls.push(value); return value; } } });
  const signed = await f.sign({ ...details, filename: 'lesson.mp4', mimetype: 'video/mp4', purpose: 'training' }), res = response();
  await f.confirmDirectUpload(request({ uploadToken: signed.body.uploadToken, title: 'Training', targetAudience: 'teacher', isMandatory: false }), res);
  assert.equal(res.code, 201);
  assert.equal(f.calls[0], 'cloud');
  assert.equal(res.body.video.order, 3);
  assert.equal(res.body.video.cloudinaryUrl, 'https://cloud/verified.pdf');
  assert.equal(res.body.video.isMandatory, false);
});

function loadExistingController(filename, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers', filename), 'utf8'), {
    module, exports: module.exports, require: (key) => dependencies[key] || {},
    console, process: { env: {} }, Date,
  });
  return module.exports;
}
const verifiedAsset = { publicId: 'new-file', fileUrl: 'https://cloud/new.mp4', resourceType: 'video', storageType: 'cloudinary', mimeType: 'video/mp4', fileSize: 123 };

test('direct teacher replacement stages the new file, keeps the published file and deduplicates retry notifications', async () => {
  let saves = 0, alerts = 0;
  const material = { _id: 'material', title: 'Old', publicId: 'old-file', approvalStatus: 'approved', save: async () => { saves++; } };
  const controller = loadExistingController('teacherController.js', {
    '../models/StudyMaterial': { findOne: async (query) => query.teacher === 'teacher' ? material : null },
    '../utils/cache': { del() {}, delPrefix() {} },
    '../utils/adminCache': { getAdminUserIds: async () => ['admin'] },
    '../services/notificationService': { sendNotification: async () => { alerts++; } },
  });
  const req = { ...request({ title: 'New' }, { _id: 'teacher', role: 'teacher' }), params: { id: 'material' }, directUploadAsset: verifiedAsset, directUploadId: 'teacher:upload', app: { get() {} } };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = response(); await controller.editMaterial(req, res); assert.equal(res.code, 200);
  }
  assert.equal(material.publicId, 'old-file');
  assert.equal(material.approvalStatus, 'pending_edit');
  assert.equal(material.pendingChanges.fileReplacement.publicId, 'new-file');
  assert.equal(saves, 1);
  assert.equal(alerts, 1);
  const denied = response(); await controller.editMaterial({ ...req, user: { _id: 'different-teacher' } }, denied);
  assert.equal(denied.code, 404);
});

test('direct admin replacement deletes the previous file only after a successful save', async () => {
  for (const failSave of [false, true]) {
    const calls = [];
    const material = { publicId: 'old-file', resourceType: 'video', storageType: 'cloudinary', save: async () => { calls.push('save'); if (failSave) throw Error('database offline'); } };
    const controller = loadExistingController('adminController.js', {
      '../models/StudyMaterial': { findById: async () => material },
      '../services/storageService': { deleteFile: async (id) => calls.push(id) },
    });
    const res = response();
    await controller.directEditMaterial({ ...request({ title: 'New' }), directUploadAsset: verifiedAsset }, res);
    assert.equal(res.code, failSave ? 500 : 200);
    assert.deepEqual(calls, failSave ? ['save'] : ['save', 'old-file']);
    assert.equal(calls.includes('new-file'), false);
  }
});

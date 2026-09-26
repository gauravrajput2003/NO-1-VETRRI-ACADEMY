const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('a failed email still returns success after the enquiry is saved', async () => {
  const originalLoad = Module._load;
  const originalError = console.error;
  const saved = { _id: 'enquiry-1', name: 'Student', course: 'Maths' };
  const logged = [];
  Module._load = function (request, parent, isMain) {
    if (request === '../models/Enquiry') return { create: async () => saved };
    if (request === '../utils/email') return { sendEnquiryEmail: async () => { throw new Error('SMTP unavailable'); } };
    if (request === '../services/notificationService') return { sendBulkNotifications: async () => {} };
    if (request === '../utils/adminCache') return { getAdminUserIds: async () => [] };
    return originalLoad.call(this, request, parent, isMain);
  };
  console.error = (...args) => logged.push(args);
  try {
    delete require.cache[require.resolve('../controllers/enquiryController')];
    const { submitEnquiry } = require('../controllers/enquiryController');
    const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await submitEnquiry({ body: { name: 'Student', phone: '1234567890' }, app: { get: () => null } }, response);
    assert.equal(response.code, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.enquiry._id, saved._id);
    assert.match(logged[0][1].message, /SMTP unavailable/);
  } finally {
    Module._load = originalLoad;
    console.error = originalError;
    delete require.cache[require.resolve('../controllers/enquiryController')];
  }
});

test('enquiry email sends escaped fields over HTTPS', async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldFrom = process.env.RESEND_FROM_EMAIL;
  const originalFetch = global.fetch;
  let requestUrl;
  let requestOptions;
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.RESEND_FROM_EMAIL = 'notifications@no1vettriacademy.com';
  global.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return { ok: true };
  };
  try {
    delete require.cache[require.resolve('../utils/email')];
    const { sendEnquiryEmail } = require('../utils/email');
    await sendEnquiryEmail({
      name: '<Student>', phone: '1234567890', email: 'student@example.com',
      grade: '10th', course: 'Maths', message: 'First line\nSecond line',
      createdAt: new Date('2026-09-25T10:00:00Z'),
    });
    const message = JSON.parse(requestOptions.body);
    assert.equal(requestUrl, 'https://api.resend.com/emails');
    assert.equal(requestOptions.headers.Authorization, 'Bearer test-api-key');
    assert.deepEqual(message.to, ['vettrieducationalinstitutions@gmail.com']);
    assert.match(message.from, /notifications@no1vettriacademy.com/);
    assert.match(message.html, /&lt;Student&gt;/);
    assert.doesNotMatch(message.html, /<Student>/);
    assert.match(message.html, /First line<br>Second line/);
    assert.match(message.html, /Submitted/);
  } finally {
    global.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = oldFrom;
    delete require.cache[require.resolve('../utils/email')];
  }
});

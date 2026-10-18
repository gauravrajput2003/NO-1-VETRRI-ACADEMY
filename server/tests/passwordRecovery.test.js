const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('retired public reset cannot query accounts or change passwords', async () => {
  let accountLookups = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8'), {
    module, require: (name) => name === '../models/User'
      ? { findOne: async () => { accountLookups++; throw new Error('Must not query accounts'); } }
      : {}, console, process: { env: {} }, Date,
  });
  for (const identifier of ['unknown@example.invalid', 'admin@example.invalid', '9876543210']) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports.forgotPasswordPublic({ body: { identifier, newPassword: 'NewPassword123' } }, res);
    assert.equal(res.code, 410);
    assert.equal(res.body.code, 'ADMIN_ASSISTED_RECOVERY_REQUIRED');
    assert.equal(res.body.success, false);
  }
  assert.equal(accountLookups, 0);
});

test('temporary passwords are ten readable characters generated with crypto randomness', () => {
  const { generateTemporaryPassword } = require('../utils/passwordRecovery');
  const generated = new Set();
  for (let i = 0; i < 100; i++) {
    const password = generateTemporaryPassword();
    assert.match(password, /^[A-HJ-NP-Za-km-np-z2-9]{4}-[A-HJ-NP-Za-km-np-z2-9]{5}$/);
    generated.add(password);
  }
  assert.equal(generated.size, 100);
});

test('temporary credential expiry starts at send, not at generation', () => {
  const { expiryFromSend, canCompleteReset } = require('../utils/passwordRecovery');
  const generatedAt = new Date('2026-10-18T00:00:00Z');
  const sentAt = new Date(+generatedAt + 5 * 3600000);
  const expiresAt = expiryFromSend(sentAt);
  assert.equal(+expiresAt, +sentAt + 24 * 3600000);
  const request = { status: 'sent', failedAttempts: 0, tempPasswordExpiresAt: expiresAt };
  assert.equal(canCompleteReset(request, new Date(+sentAt + 23 * 3600000 + 59 * 60000)), true);
  assert.equal(canCompleteReset(request, expiresAt), false);
  assert.equal(canCompleteReset(request, new Date(+expiresAt + 60000)), false);
  for (const status of ['pending', 'used', 'expired', 'rejected', 'locked']) {
    assert.equal(canCompleteReset({ ...request, status }, sentAt), false);
  }
  assert.equal(canCompleteReset({ ...request, failedAttempts: 5 }, sentAt), false);
});

test('only approved active student/teacher accounts qualify, never admins', () => {
  const { eligibleForRecovery } = require('../utils/passwordRecovery');
  for (const role of ['student', 'teacher']) {
    assert.equal(eligibleForRecovery({ role, isActive: true, isApproved: true }), true);
    assert.equal(eligibleForRecovery({ role, isActive: false, isApproved: true }), false);
    assert.equal(eligibleForRecovery({ role, isActive: true, isApproved: false }), false);
  }
  assert.equal(eligibleForRecovery({ role: 'admin', isActive: true, isApproved: true }), false);
  assert.equal(eligibleForRecovery(null), false);
});

test('completion validates confirmation and does not reuse the temporary credential', () => {
  const { validNewPassword } = require('../utils/passwordRecovery');
  assert.equal(validNewPassword('LongNew123', 'LongNew123', 'Other-Temp'), true);
  assert.equal(validNewPassword('short', 'short', 'Other-Temp'), false);
  assert.equal(validNewPassword('LongNew123', 'Mismatch123', 'Other-Temp'), false);
  assert.equal(validNewPassword('Other-Temp', 'Other-Temp', 'Other-Temp'), false);
  assert.equal(validNewPassword({ length: 12 }, { length: 12 }, 'Other-Temp'), false);
});

test('authentication rejects access tokens issued before a password reset', async () => {
  let nextCalls = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8'), {
    module, require: (key) => ({
      jsonwebtoken: { verify: () => ({ id: 'synthetic-user', tokenVersion: 0 }) },
      '../models/User': { findById: () => ({ select: async () => ({ _id: 'synthetic-user', tokenVersion: 1, isActive: true }) }) },
    }[key] || {}), process: { env: {} }, console, Date,
  });
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await module.exports.verifyToken({ headers: { authorization: 'Bearer old-token' } }, res, () => nextCalls++);
  assert.equal(res.code, 401);
  assert.equal(nextCalls, 0);
});

test('refresh rejects a pre-reset token version even when its string was retained', async () => {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8'), {
    module, require: (key) => ({
      jsonwebtoken: { verify: () => ({ id: 'synthetic-user', tokenVersion: 0 }) },
      '../models/User': { findOne: async () => ({ _id: 'synthetic-user', tokenVersion: 1, isActive: true }) },
    }[key] || {}), process: { env: {} }, console, Date,
  });
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await module.exports.refreshAccessToken({ body: { refreshToken: 'old-synthetic-refresh' } }, res);
  assert.equal(res.code, 401);
});

test('must-change middleware permits only limited bootstrap, logout and current-password change', async () => {
  const module = { exports: {} };
  const user = { _id: 'synthetic-user', role: 'teacher', name: 'Teacher', tokenVersion: 0, isActive: true, mustChangePassword: true, salary: { bankAccount: 'PRIVATE' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8'), {
    module, require: key => ({
      jsonwebtoken: { verify: () => ({ id: user._id, tokenVersion: 0 }) },
      '../models/User': { findById: () => ({ select: async () => user }) },
      '../models/LoginLog': { findOne: async () => ({}) },
    }[key] || {}), process: { env: {} }, console, Date,
  });
  const run = async (path, method = 'GET') => {
    let allowed = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports.verifyToken({ headers: { authorization: 'Bearer synthetic' }, originalUrl: path, method }, res, () => { allowed = true; });
    return { allowed, ...res };
  };
  assert.equal((await run('/api/teacher/dashboard')).code, 403);
  assert.equal((await run('/api/profile/forgot-password', 'PATCH')).code, 403);
  const bootstrap = await run('/api/auth/me');
  assert.equal(bootstrap.body.user.mustChangePassword, true);
  assert.equal(bootstrap.body.user.salary, undefined);
  assert.equal((await run('/api/profile/password', 'PATCH')).allowed, true);
  assert.equal((await run('/api/auth/logout', 'POST')).allowed, true);
});

test('all password-request admin routes are behind authentication and the admin guard', () => {
  const router = require('../routes/adminRoutes');
  const { verifyToken } = require('../middleware/auth');
  const { adminOnly } = require('../middleware/roleCheck');
  const paths = ['/password-resets', '/password-resets/:id/generate', '/password-resets/:id/send', '/password-resets/:id/mark-copied', '/password-resets/:id/reject'];
  for (const path of paths) {
    const index = router.stack.findIndex(layer => layer.route?.path === path);
    assert(index >= 0);
    assert(router.stack.slice(0, index).some(layer => layer.handle === verifyToken));
    assert(router.stack.slice(0, index).some(layer => layer.handle === adminOnly));
    for (const role of ['student', 'teacher', undefined]) {
      const res = { status(code) { this.code = code; return this; }, json() { return this; } };
      let passed = false;
      adminOnly({ user: role ? { role } : null }, res, () => { passed = true; });
      assert.equal(passed, false); assert([401, 403].includes(res.code));
    }
  }
});

test('the real User save hook hashes changed passwords and revokes earlier sessions', async () => {
  const User = require('../models/User');
  const user = new User({ name: 'Synthetic', role: 'student', mobile: '0000000000', password: 'OriginalSynthetic7' });
  const preSave = () => new Promise((resolve, reject) => User.schema.s.hooks.execPre('save', user, [], error => error ? reject(error) : resolve()));
  await preSave(); user.$__reset(); user.isNew = false;
  user.refreshToken = 'synthetic-refresh'; user.password = 'ChangedSynthetic8';
  await preSave();
  assert.equal(user.tokenVersion, 1);
  assert.equal(user.refreshToken, '');
  assert(user.passwordChangedAt instanceof Date);
  assert.equal(await user.matchPassword('ChangedSynthetic8'), true);
  assert.equal(await user.matchPassword('OriginalSynthetic7'), false);
});

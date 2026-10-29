const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

function harness() {
  const user = { _id: 'user', role: 'student', tokenVersion: 3, isActive: true };
  const sessions = ['phone', 'laptop'].map((id) => ({ _id: id, userId: 'user',
    refreshHash: createHash('sha256').update(id).digest('hex'), revokedAt: null,
    expiresAt: new Date(Date.now() + 60000) }));
  const module = { exports: {} };
  const dependencies = {
    '../models/User': {
      findById: async () => user,
      findOne: async ({ refreshToken }) => refreshToken === 'legacy' ? user : null,
      findByIdAndUpdate: async (_id, update) => { if (update.$inc) user.tokenVersion += update.$inc.tokenVersion; },
    },
    '../models/UserSession': {
      findOne: async (query) => sessions.find((record) => record._id === query._id && record.userId === query.userId && record.refreshHash === query.refreshHash && !record.revokedAt),
      updateOne: async (query) => { sessions.find((record) => record._id === query._id).revokedAt = new Date(); },
      updateMany: async () => { sessions.forEach((record) => { record.revokedAt = new Date(); }); },
      exists: async () => sessions.some((record) => !record.revokedAt),
    },
    '../models/LoginLog': { findOne: async () => null },
    jsonwebtoken: { verify: (token) => ({ id: 'user', tokenVersion: 3, ...(token === 'legacy' ? {} : { sid: token }) }) },
    '../utils/generateToken': { generateToken: (_id, _role, _version, sid) => `access-${sid || 'legacy'}`, setCookieToken() {}, clearCookieToken() {} },
    '../utils/recoveryDevices': { revokedDeviceFields: () => ({}) },
    'node:crypto': require('node:crypto'),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8'), {
    module, require: (key) => dependencies[key] || {}, process: { env: {} }, Date, console,
  });
  const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, clearCookie() {} });
  const refresh = async (token) => { const res = response(); await module.exports.refreshAccessToken({ body: { refreshToken: token } }, res); return res; };
  return { api: module.exports, refresh, response, sessions, user };
}

test('phone and laptop refresh independently; laptop logout leaves phone active', async () => {
  const h = harness();
  assert.equal((await h.refresh('phone')).body.token, 'access-phone');
  assert.equal((await h.refresh('laptop')).body.token, 'access-laptop');
  const res = h.response();
  await h.api.logout({ user: h.user, sessionId: 'laptop' }, res);
  assert.equal(res.body.success, true);
  assert.equal((await h.refresh('laptop')).code, 401);
  assert.equal((await h.refresh('phone')).body.token, 'access-phone');
});

test('logout-all revokes both devices and changes the account token version', async () => {
  const h = harness();
  await h.api.logoutAll({ user: h.user }, h.response());
  assert.equal(h.user.tokenVersion, 4);
  assert.equal((await h.refresh('phone')).code, 401);
  assert.equal((await h.refresh('laptop')).code, 401);
});

test('expired sessions and password-version changes reject refresh', async () => {
  const h = harness();
  h.sessions[0].expiresAt = new Date(Date.now() - 1000);
  assert.equal((await h.refresh('phone')).code, 401);
  h.user.tokenVersion++;
  assert.equal((await h.refresh('laptop')).code, 401);
});

test('legacy refresh records remain accepted during the migration', async () => {
  const h = harness();
  assert.equal((await h.refresh('legacy')).body.token, 'access-legacy');
});

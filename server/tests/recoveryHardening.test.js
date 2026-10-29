const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('readiness uses server registrations and current session version, never the client flag', () => {
  const { recoveryReadiness } = require('../utils/recoveryDevices');
  const user = { tokenVersion: 2, recoveryReadyDevices: ['ExpoPushToken[old]'], expoPushToken: 'ExpoPushToken[old]' };
  assert.equal(recoveryReadiness(user).ready, false);
  assert.match(recoveryReadiness(user).reason, /authenticated sign-in/i);
  user.recoveryRegistrations = [{ token: 'ExpoPushToken[ok]', registeredAt: new Date(), tokenVersion: 2 }];
  assert.equal(recoveryReadiness(user).tokens[0], 'ExpoPushToken[ok]');
  user.tokenVersion++;
  assert.equal(recoveryReadiness(user).ready, false);
  assert.match(recoveryReadiness(user).reason, /revoked/i);
});

test('logout-all revokes every token and recovery registration and bumps the session version', async () => {
  let operation;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8'), {
    module, require: key => key === '../models/User' ? { findByIdAndUpdate: async (id, update) => { operation = update; } }
      : key === '../models/UserSession' ? { updateMany: async () => {} }
      : key === '../utils/recoveryDevices' ? require('../utils/recoveryDevices') : {}, console, process: { env: {} }, Date,
  });
  const res = { clearCookie() {}, status() { return this; }, json(body) { this.body = body; } };
  await module.exports.logoutAll({ user: { _id: 'synthetic' } }, res);
  assert.equal(operation.$inc.tokenVersion, 1);
  assert.equal(operation.$set.expoPushToken, null);
  for (const field of ['deviceTokens', 'recoveryDevices', 'recoveryReadyDevices', 'recoveryRegistrations']) assert.equal(operation.$set[field].length, 0);
  assert.equal(res.body.success, true);
});

test('recovery request timing has a 1000ms floor and known/unknown controller paths stay within 200ms', async () => {
  const module = { exports: {} };
  const { performance } = require('node:perf_hooks');
  const work = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/passwordRecoveryController.js'), 'utf8'), {
    module, Date, setTimeout, console, require: key => ({
      mongoose: {}, 'node:crypto': require('node:crypto'),
      '../services/passwordRecoveryService': { resolveAccount: async id => id === 'known' ? { _id: 'user' } : null, request: async body => { work.push(body.identifier); } },
      '../middleware/passwordRecoveryLimits': { recordRecoveryAttempt: async () => true },
      '../utils/passwordRecovery': require('../utils/passwordRecovery'),
      '../utils/recoveryDevices': require('../utils/recoveryDevices'),
    }[key] || {}),
  });
  const elapsed = [], responses = [];
  for (const identifier of ['known', 'unknown']) {
    const res = { set() {}, status(code) { this.code = code; return this; }, json(body) { responses.push({ code: this.code, body: JSON.stringify(body) }); } };
    const start = performance.now(); await module.exports.request({ body: { identifier } }, res); elapsed.push(performance.now() - start);
  }
  assert.deepEqual(responses[0], responses[1]); assert.deepEqual(work, ['known', 'unknown']);
  assert(elapsed.every(ms => ms >= 995), JSON.stringify(elapsed));
  assert(Math.abs(elapsed[0] - elapsed[1]) < 200, JSON.stringify(elapsed));
});

test('grep guard rejects logging/reporting/analytics calls that reference credential fields', () => {
  const banned = /\b(?:tempPassword|newPassword|confirmPassword|decrypted|recoveryCiphertext|encryptedPayload|credentialText)\b/;
  const calls = /\b(?:console\.(?:log|warn|error|debug|info|trace)|(?:logger|analytics|Sentry|sentry)\.\w+|logDev|warnDev|infoProd|errorCrit|captureException|captureMessage|trackEvent)\s*\(([\s\S]*?)\);/g;
  const violations = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'tests'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file); else if (/\.[cm]?js$/.test(file)) {
      const code = fs.readFileSync(file, 'utf8'); for (const hit of code.matchAll(calls)) if (banned.test(hit[1])) violations.push(file + ':' + (code.slice(0, hit.index).match(/\n/g) || []).length);
    }
  } }
  assert(calls.test("console.error('bad', tempPassword);")); calls.lastIndex = 0;
  walk(path.join(__dirname, '..')); assert.deepEqual(violations, []);
});

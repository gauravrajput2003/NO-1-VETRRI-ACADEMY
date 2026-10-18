const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const { createRecoveryCipher } = require('../utils/recoveryCipher');

// In-memory persistence adapter: exercise the real service, hash/encryption and
// authorization, without connecting to the production database or push provider.
function fixture() {
  const { createPasswordRecoveryService } = require('../services/passwordRecoveryService');
  let clock = Date.parse('2026-10-18T00:00:00Z'), sequence = 0, tail = Promise.resolve();
  const data = { User: [], ResetRequest: [], ChatMessage: [], PushDelivery: [] };
  const uid = '012345678901234567890123', admin = { _id: '012345678901234567890124', role: 'admin', name: 'Admin', isActive: true };
  const token = 'ExponentPushToken[verified-device]';
  data.User.push({ _id: uid, role: 'student', name: 'Student', email: 'student@example.invalid', mobile: '9876543210', isActive: true, isApproved: true, recoveryDevices: [token], recoveryReadyDevices: [token], tokenVersion: 0, refreshToken: 'old-refresh' }, admin);
  function matches(row, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (key === '$or') return value.some((entry) => matches(row, entry));
      const actual = row[key];
      if (value instanceof RegExp) return value.test(actual);
      if (value && typeof value === 'object' && !(value instanceof Date)) return Object.entries(value).every(([op, expected]) => {
        if (op === '$in') return expected.map(String).includes(String(actual));
        if (op === '$ne') return String(actual) !== String(expected);
        if (op === '$exists') return (actual !== undefined) === expected;
        if (op === '$lte') return +new Date(actual) <= +new Date(expected);
        if (op === '$gt') return +new Date(actual) > +new Date(expected);
        return false;
      });
      return String(actual) === String(value);
    });
  }
  function update(row, operation, insert = false) {
    Object.assign(row, insert ? operation.$setOnInsert : {}, operation.$set);
    for (const key of Object.keys(operation.$unset || {})) delete row[key];
    for (const [key, value] of Object.entries(operation.$inc || {})) row[key] = (row[key] || 0) + value;
  }
  const query = (run) => ({ select() { return this; }, session() { return this; }, limit() { return this; }, sort() { return this; }, lean() { return this; }, then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); } });
  const models = {};
  for (const name of Object.keys(data)) {
    const rows = data[name];
    models[name] = {
      find: (filter = {}) => query(() => rows.filter(r => matches(r, filter))),
      findOne: (filter) => query(() => rows.find(r => matches(r, filter)) || null),
      findById: (id) => query(() => rows.find(r => String(r._id) === String(id)) || null),
      findOneAndUpdate: (filter, operation, options = {}) => query(() => {
        let row = rows.find(r => matches(r, filter));
        if (!row && options.upsert) { row = { _id: `request-${++sequence}`, createdAt: new Date(clock), revision: 0, failedAttempts: 0, deliveryChannels: [] }; update(row, operation, true); rows.push(row); }
        else if (row) update(row, operation);
        return row || null;
      }),
      updateMany: async (filter, operation) => { rows.filter(r => matches(r, filter)).forEach(r => update(r, operation)); },
      deleteMany: async (filter) => { for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], filter)) rows.splice(i, 1); },
      bulkWrite: async (operations) => { for (const op of operations) await models[name].findOneAndUpdate(op.updateOne.filter, op.updateOne.update, { upsert: true }); },
    };
  }
  data.User[0].save = async function () { this.password = await bcrypt.hash(this.password, 4); this.tokenVersion++; this.refreshToken = ''; };
  const cipher = createRecoveryCipher(randomBytes(32).toString('base64'));
  const service = createPasswordRecoveryService({ ...models, bcrypt, cipher: () => cipher, now: () => new Date(clock),
    transaction: (fn) => { const result = tail.then(() => fn({})); tail = result.catch(() => {}); return result; },
    createTextMessage: async ({ message, recoveryCiphertext, recoveryRequestId, receiverId }) => {
      const record = { _id: `chat-${++sequence}`, receiverId, message, recoveryCiphertext, recoveryRequestId };
      data.ChatMessage.push(record); return record;
    }, publishTextMessage: async () => {},
  });
  return { service, data, user: data.User[0], admin, token, advance: ms => { clock += ms; }, now: () => new Date(clock) };
}

async function prepared(f) {
  await f.service.request({ identifier: 'student@example.invalid', deviceToken: 'ExponentPushToken[attacker-device]' });
  const request = f.data.ResetRequest[0];
  const result = await f.service.generate(request._id, f.admin);
  return { request, password: result.password };
}

test('unknown/admin/inactive identifiers have identical response and create no request', async () => {
  const f = fixture();
  const expected = await f.service.request({ identifier: 'missing@example.invalid' });
  f.admin.email = 'admin@example.invalid';
  assert.deepEqual(await f.service.request({ identifier: f.admin.email }), expected);
  f.user.isActive = false;
  assert.deepEqual(await f.service.request({ identifier: f.user.email }), expected);
  assert.equal(f.data.ResetRequest.length, 0);
});

test('duplicates collapse and unverified request tokens cannot receive credentials', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  await f.service.request({ identifier: '+91 98765 43210' });
  assert.equal(f.data.ResetRequest.length, 1);
  assert.equal(request.deviceToken, undefined);
  assert.equal(f.data.PushDelivery.length, 0);
  await f.service.send(request._id, f.admin, { password, channels: ['push', 'chat'] });
  assert.equal(f.data.PushDelivery.length, 1);
  assert.equal(f.data.PushDelivery[0].token, f.token);
  const serialized = JSON.stringify(f.data);
  assert.equal(serialized.includes(password), false);
});

test('all administrative actions reject non-admins', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  for (const action of [() => f.service.generate(request._id, f.user), () => f.service.send(request._id, f.user, { password, channels: ['chat'] }), () => f.service.reject(request._id, f.user)]) await assert.rejects(action, e => e.status === 403);
});

test('generated password is unusable; sending five hours later starts a fresh 24-hour clock', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  const details = { identifier: f.user.email, tempPassword: password, newPassword: 'NewPrivatePassword', confirmPassword: 'NewPrivatePassword' };
  assert.equal(await f.service.complete(details), false);
  assert.equal(request.tempPasswordExpiresAt, undefined);
  f.advance(5 * 3600000);
  await f.service.send(request._id, f.admin, { password, channels: ['chat'] });
  assert.equal(+request.tempPasswordExpiresAt, +f.now() + 24 * 3600000);
  const expiry = +request.tempPasswordExpiresAt;
  f.advance(3600000);
  await f.service.send(request._id, f.admin, { password, channels: ['chat'] });
  assert.equal(+request.tempPasswordExpiresAt, expiry);
  assert.equal(f.data.ChatMessage.length, 1);
});

test('completion works once, changes hash/version, revokes refresh, redacts chat and purges outbox', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  f.user.mustChangePassword = true;
  await f.service.send(request._id, f.admin, { password, channels: ['push', 'chat'] });
  f.advance(23 * 3600000 + 59 * 60000);
  const details = { identifier: f.user.email, tempPassword: password, newPassword: 'OnlyTheUserKnows', confirmPassword: 'OnlyTheUserKnows' };
  assert.equal(await f.service.complete(details), true);
  assert.equal(await f.service.complete(details), false);
  assert.equal(request.status, 'used');
  assert.equal(f.user.tokenVersion, 1);
  assert.equal(f.user.refreshToken, '');
  assert.equal(f.user.mustChangePassword, false);
  assert.equal(await bcrypt.compare(details.newPassword, f.user.password), true);
  assert.equal(f.data.ChatMessage[0].message, 'Temporary password was used');
  assert.equal(f.data.ChatMessage[0].recoveryCiphertext, undefined);
  assert.equal(f.data.PushDelivery.length, 0);
});

test('five wrong credentials lock the request; regeneration invalidates earlier credentials', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  const replacement = await f.service.generate(request._id, f.admin);
  await assert.rejects(() => f.service.send(request._id, f.admin, { password, channels: ['chat'] }));
  await f.service.send(request._id, f.admin, { password: replacement.password, channels: ['chat'] });
  for (let i = 0; i < 5; i++) assert.equal(await f.service.complete({ identifier: f.user.email, tempPassword: 'wrong', newPassword: 'ValidNewPassword', confirmPassword: 'ValidNewPassword' }), false);
  assert.equal(request.failedAttempts, 5);
  assert.equal(request.status, 'locked');
});

test('expired sent and seven-day pending requests are redacted and become unusable', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  await f.service.send(request._id, f.admin, { password, channels: ['chat', 'push'] });
  f.advance(24 * 3600000 + 60000);
  assert.equal(await f.service.complete({ identifier: f.user.email, tempPassword: password, newPassword: 'ValidNewPassword', confirmPassword: 'ValidNewPassword' }), false);
  assert.equal(request.status, 'expired');
  assert.equal(f.data.ChatMessage[0].recoveryCiphertext, undefined);
  const g = fixture(); await prepared(g); g.advance(7 * 86400000);
  await g.service.expire();
  assert.equal(g.data.ResetRequest[0].status, 'expired');
});

test('manual sharing requires explicit identity verification and starts expiry', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  await assert.rejects(() => f.service.send(request._id, f.admin, { password, channels: ['copy'] }));
  await f.service.send(request._id, f.admin, { password, channels: ['copy'], identityVerified: true });
  assert.equal(request.status, 'sent');
  assert.equal(+request.tempPasswordExpiresAt, +f.now() + 24 * 3600000);
});

test('concurrent completion consumes once and only the recipient can decrypt chat credentials', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  await f.service.send(request._id, f.admin, { password, channels: ['chat'] });
  const record = f.data.ChatMessage[0];
  const own = await f.service.readRecoveryMessages([record], f.user);
  assert(own[0].message.includes(password)); assert.equal(own[0].recoveryCiphertext, undefined);
  const admin = await f.service.readRecoveryMessages([record], f.admin);
  assert.equal(admin[0].message.includes(password), false);
  const details = { identifier: f.user.email, tempPassword: password, newPassword: 'NewPrivate123', confirmPassword: 'NewPrivate123' };
  const results = await Promise.all([f.service.complete(details), f.service.complete(details)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(f.user.tokenVersion, 1);
});

test('legacy devices without the private recovery channel cannot receive a password', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  f.user.recoveryReadyDevices = [];
  await assert.rejects(() => f.service.send(request._id, f.admin, { password, channels: ['push', 'chat'] }), e => e.status === 409);
  assert.equal(f.data.PushDelivery.length, 0);
  await f.service.send(request._id, f.admin, { password, channels: ['copy'], identityVerified: true });
  assert.equal(request.status, 'sent');
});

test('regenerating an expired request refreshes pending lifetime without changing its original request date', async () => {
  const f = fixture(), { request, password } = await prepared(f);
  const createdAt = +request.createdAt;
  await f.service.send(request._id, f.admin, { password, channels: ['chat'] });
  f.advance(8 * 86400000); await f.service.expire();
  const next = await f.service.generate(request._id, f.admin);
  assert.equal(+request.createdAt, createdAt);
  await f.service.send(request._id, f.admin, { password: next.password, channels: ['chat'] });
  assert.equal(+request.tempPasswordExpiresAt, +f.now() + 86400000);
});

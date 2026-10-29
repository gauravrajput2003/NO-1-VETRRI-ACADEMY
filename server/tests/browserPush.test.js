const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function harness() {
  const sent = [], removed = [];
  const subscriptions = ['active', 'revoked', 'gone'].map((id) => ({ _id: id, sessionId: id, endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } }));
  const module = { exports: {} };
  const mocks = {
    'web-push': { setVapidDetails() {}, sendNotification: async (subscription, body) => { if (subscription.endpoint.endsWith('/gone')) throw { statusCode: 410 }; sent.push(JSON.parse(body)); } },
    '../models/BrowserPushSubscription': { find: async () => subscriptions, deleteOne: async ({ _id }) => removed.push(_id) },
    '../models/UserSession': { exists: async ({ _id }) => _id !== 'revoked' },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/browserPushService.js'), 'utf8'), {
    module, require: (key) => mocks[key], process: { env: { WEB_PUSH_PUBLIC_KEY: 'public', WEB_PUSH_PRIVATE_KEY: 'private', WEB_PUSH_EMAIL: 'academy@example.invalid' } }, URL, Date,
  });
  return { service: module.exports, sent, removed };
}
test('browser push accepts supported HTTPS providers and rejects private/arbitrary endpoints', () => {
  const { service } = harness(); const keys = { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) };
  assert.equal(service.configured(), true);
  assert.equal(service.validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys }), true);
  for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.attacker.invalid/x', 'https://user:pass@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8080/x']) assert.equal(service.validSubscription({ endpoint, keys }), false);
  assert.equal(service.validSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { auth: 'invalid' } }), false);
});
test('ordinary browser notifications carry account/deep-link identity; revoked and expired endpoints are removed', async () => {
  const h = harness();
  await h.service.sendBrowserNotification({ _id: 'student', tokenVersion: 2, role: 'student' }, { _id: 'notification', title: 'Class starting', message: 'Open your class', type: 'class_starting', link: '/student/classes' });
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].userId, 'student'); assert.equal(h.sent[0].link, '/student/classes');
  assert.deepEqual(h.removed.sort(), ['gone', 'revoked']);
});
test('browser push never transports password recovery credentials', async () => {
  const h = harness();
  for (const type of ['password_recovery', 'recovery_sent']) await h.service.sendBrowserNotification({ _id: 'student' }, { type, message: 'private temporary credential' });
  assert.equal(h.sent.length, 0); assert.equal(h.removed.length, 0);
});

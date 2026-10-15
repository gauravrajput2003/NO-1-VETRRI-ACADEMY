const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { isExpoPushToken } = require('../utils/pushToken');

function loadService(filename, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'), {
    module, exports: module.exports,
    require: (name) => name in dependencies ? dependencies[name] : require(name),
    console: { warn() {}, error() {} }, process: { env: {} },
    setImmediate() {}, setInterval: () => ({ unref() {} }), Date, AbortSignal,
    ...globals,
  }, { filename });
  return module.exports;
}

function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (expected && typeof expected === 'object') {
      return Object.entries(expected).every(([operator, value]) => ({
        $in: () => value.includes(row[key]), $lt: () => row[key] < value,
        $lte: () => row[key] <= value, $gt: () => row[key] > value, $gte: () => row[key] >= value,
      }[operator])());
    }
    return row[key] === expected;
  });
}

function harness(response = () => ({ data: [] }), env = {}) {
  const rows = [], requests = [], removed = [];
  const apply = (row, update) => {
    Object.assign(row, update.$set || {});
    for (const [key, value] of Object.entries(update.$inc || {})) row[key] += value;
    for (const key of Object.keys(update.$unset || {})) delete row[key];
  };
  const model = {
    bulkWrite: async (operations) => {
      for (const { updateOne: op } of operations) {
        if (!rows.some((row) => row.dedupeKey === op.filter.dedupeKey)) rows.push({ _id: `row-${rows.length}`, ...op.update.$setOnInsert, updatedAt: new Date() });
      }
    },
    findOneAndUpdate(filter, update) {
      const row = rows.find((item) => matches(item, filter));
      if (row) apply(row, update);
      return { select() { return this; }, lean: async () => row ? { ...row } : null };
    },
    updateOne: async (filter, update) => { const row = rows.find((item) => matches(item, filter)); if (row) apply(row, update); },
    updateMany: async (filter, update) => rows.filter((row) => matches(row, filter)).forEach((row) => apply(row, update)),
    find(filter) {
      return { select() { return this; }, limit() { return this; }, lean: async () => rows.filter((row) => matches(row, filter)).map((row) => ({ ...row })) };
    },
  };
  const service = loadService('services/pushService.js', {
    '../models/User': { updateMany: async (filter) => removed.push(filter.expoPushToken) },
    '../models/PushDelivery': model, '../utils/pushToken': { isExpoPushToken },
  }, {
    process: { env },
    fetch: async (url, options) => {
      const request = { url, body: JSON.parse(options.body), headers: options.headers };
      requests.push(request);
      const result = await response(request);
      return { ok: result.ok !== false, status: result.status || 200, json: async () => result };
    },
  });
  return { ...service, rows, requests, removed };
}

const payload = { title: 'Class is live', body: 'Join now', data: { notificationId: 'notification-1', type: 'class_starting', classId: 'class-1' } };

test('both Expo token formats are valid; native tokens and malformed tokens are rejected', () => {
  for (const token of ['ExponentPushToken[old_123-abc]', 'ExpoPushToken[new_123]']) assert.equal(isExpoPushToken(token), true);
  for (const token of [null, 'native-fcm-token', 'ExpoPushToken[]', 'ExponentPushToken[x]extra', 'ExponentPushToken[has space]']) assert.equal(isExpoPushToken(token), false);
});

test('enqueue is durable, filters invalid tokens and deduplicates the same event/device', async () => {
  const h = harness();
  const result = await h.sendPushNotifications(['ExpoPushToken[a]', 'ExpoPushToken[a]', 'bad'], payload);
  await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
  assert.equal(result.queued, 1);
  assert.equal(h.rows.length, 1);
  assert.equal(h.requests.length, 0);
  assert.equal(h.rows[0].status, 'queued');
});

test('worker sends a visible high-priority notification and waits for a receipt', async () => {
  const h = harness(() => ({ data: [{ status: 'ok', id: 'ticket-1' }] }), { EXPO_ACCESS_TOKEN: 'test-secret' });
  await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
  await h.processPushQueue();
  assert.equal(h.rows[0].status, 'receipt_pending');
  assert.equal(h.requests[0].body[0].channelId, 'vettri-default');
  assert.equal(h.requests[0].body[0].priority, 'high');
  assert.equal(h.requests[0].body[0].title, payload.title);
  assert.equal(h.requests[0].headers.Authorization, 'Bearer test-secret');
});

test('batch limit is 100; remaining work survives for the next cycle', async () => {
  const h = harness(({ body }) => ({ data: body.map((_, i) => ({ status: 'ok', id: `ticket-${i}` })) }));
  await h.sendPushNotifications(Array.from({ length: 105 }, (_, i) => `ExpoPushToken[token${i}]`), payload);
  await h.processPushQueue();
  assert.equal(h.requests[0].body.length, 100);
  assert.equal(h.rows.filter((row) => row.status === 'queued').length, 5);
  await h.processPushQueue();
  assert.equal(h.requests[1].body.length, 5);
});

test('HTTP 429 and network failures are retried without discarding tokens', async () => {
  for (const response of [() => ({ ok: false, status: 429, errors: [{ code: 'RATE_LIMIT' }] }), () => { throw new Error('Network down'); }]) {
    const h = harness(response);
    await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
    await h.processPushQueue();
    assert.equal(h.rows[0].status, 'queued');
    assert.equal(h.rows[0].attempts, 1);
    assert.ok(h.rows[0].nextAttemptAt > new Date());
    assert.equal(h.removed.length, 0);
  }
});

test('tokens from different Expo projects cannot block a production batch', async () => {
  const h = harness(({ body }) => body.length > 1
    ? { ok: false, status: 400, errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }
    : { data: [{ status: 'ok', id: `ticket-${body[0].to}` }] });
  await h.sendPushNotifications(['ExpoPushToken[a]', 'ExpoPushToken[b]'], payload);
  await h.processPushQueue();
  assert.equal(h.requests.length, 3);
  assert.equal(h.rows.filter((row) => row.status === 'receipt_pending').length, 2);
});

test('missing Expo tickets are retryable rather than silently counted as success', async () => {
  const h = harness();
  await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
  await h.processPushQueue();
  assert.equal(h.rows[0].errorCode, 'MissingTicket');
  assert.equal(h.rows[0].status, 'queued');
});

test('invalid credentials are visible and do not delete valid device tokens', async () => {
  const h = harness(() => ({ data: [{ status: 'error', details: { error: 'InvalidCredentials' } }] }));
  await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
  await h.processPushQueue();
  assert.equal(h.rows[0].status, 'failed');
  assert.equal(h.rows[0].errorCode, 'InvalidCredentials');
  assert.equal(h.removed.length, 0);
});

test('receipt errors remove only DeviceNotRegistered tokens; provider success completes delivery', async () => {
  for (const error of ['DeviceNotRegistered', 'InvalidCredentials', null]) {
    const h = harness(() => ({ data: { ticket: error ? { status: 'error', details: { error } } : { status: 'ok' } } }));
    await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
    Object.assign(h.rows[0], { status: 'receipt_pending', ticketId: 'ticket', attempts: 1 });
    await h.checkPushReceipts();
    assert.equal(h.rows[0].status, error ? 'failed' : 'delivered');
    assert.equal(h.removed.length, error === 'DeviceNotRegistered' ? 1 : 0);
  }
});

test('stuck work is recovered after a server restart and retry exhaustion terminates', async () => {
  const h = harness(() => ({ data: [{ status: 'error', details: { error: 'MessageRateExceeded' } }] }));
  await h.sendPushNotifications(['ExpoPushToken[a]'], payload);
  Object.assign(h.rows[0], { status: 'sending', attempts: 4 });
  await h.processPushQueue();
  assert.equal(h.rows[0].attempts, 5);
  assert.equal(h.rows[0].status, 'failed');
});

test('socket failures do not block push; references needed by existing app taps are included', async () => {
  const pushes = [];
  const service = loadService('services/notificationService.js', {
    '../models/Notification': { create: async (data) => ({ _id: 'notification-1', ...data }) },
    '../models/User': { findById: () => ({ select: async () => ({ expoPushToken: 'ExpoPushToken[a]' }) }) },
    './pushService': { sendPushNotifications: async (...args) => pushes.push(args) },
    '../utils/logger': { errorCrit() {} },
  });
  const result = await service.sendNotification({ recipientId: 'student', type: 'doubt_reply', title: 'Reply', message: 'Answered', referenceId: 'doubt-1', referenceType: 'Doubt', io: { to() { throw new Error('socket down'); } } });
  assert.equal(result.success, true);
  assert.equal(pushes.length, 1);
  assert.equal(pushes[0][1].data.referenceId, 'doubt-1');
  assert.equal(pushes[0][1].data.notificationId, 'notification-1');
});

test('bulk notifications deduplicate recipients and report partial failures', async () => {
  const saved = [];
  const service = loadService('services/notificationService.js', {
    '../models/Notification': { create: async (data) => { saved.push(data.recipient); if (data.recipient === 'bad') throw new Error('save failed'); return { _id: 'id' }; } },
    '../models/User': { findById: () => ({ select: async () => null }) },
    './pushService': {}, '../utils/logger': { errorCrit() {} },
  });
  const result = await service.sendBulkNotifications({ recipientIds: ['student', 'student', null, 'bad'] });
  assert.equal(saved.length, 2);
  assert.equal(result.success, false);
});

test('material notifications respect assignment, course, grade, locks and approval', async () => {
  let queries = 0;
  const service = loadService('services/materialNotificationService.js', {
    '../models/User': { find: () => { queries++; return { select() { return this; }, lean: async () => [] }; } },
    './notificationService': { sendBulkNotifications: async () => {} },
  });
  const filter = service.materialRecipientFilter({ teacher: 't1', course: 'c1', grade: '10', lockedForAll: true, unlockedFor: ['s1'], lockedFor: ['s2'] });
  assert.equal(filter.grade, '10');
  assert.equal(filter.role, 'student');
  assert.equal(filter.$or[0].assignedTeachers, 't1');
  assert.equal(filter.$or[1].course, 'c1');
  assert.equal(filter._id.$in[0], 's1');
  assert.equal(filter._id.$nin[0], 's2');
  await service.notifyMaterialAvailable({ material: { approvalStatus: 'pending_new' } });
  assert.equal(queries, 0);
});

test('class reminder times use IST on UTC servers, including midnight boundaries', () => {
  const { getClassStart } = loadService('jobs/classReminder.js', {
    'node-cron': {}, '../models/ClassSchedule': {}, '../models/Notification': {}, '../services/notificationService': {},
  });
  assert.equal(getClassStart({ scheduledDate: '2026-10-15T00:00:00Z', scheduledTime: '10:00' }).toISOString(), '2026-10-15T04:30:00.000Z');
  assert.equal(getClassStart({ scheduledDate: '2026-10-14T18:30:00Z', scheduledTime: '00:10' }).toISOString(), '2026-10-14T18:40:00.000Z');
  assert.equal(getClassStart({ scheduledDate: '2026-10-15', scheduledTime: '25:00' }), null);
});

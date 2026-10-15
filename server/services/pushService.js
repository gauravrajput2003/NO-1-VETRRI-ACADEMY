const { createHash, randomUUID } = require('node:crypto');
const User = require('../models/User');
const PushDelivery = require('../models/PushDelivery');
const { isExpoPushToken } = require('../utils/pushToken');

const EXPO_URL = 'https://exp.host/--/api/v2/push/';
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 5;
const RECEIPT_DELAY_MS = 15 * 60000;
const TRANSIENT_ERRORS = new Set(['MessageRateExceeded', 'ExpoServerError', 'NetworkError', 'MissingTicket']);
let running = false;
let worker;

async function expoRequest(path, body) {
  const response = await fetch(`${EXPO_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    const error = new Error('Expo push request failed');
    error.code = result.errors?.[0]?.code || `HTTP_${response.status}`;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  return result.data;
}

async function recordFailure(delivery, code, retryable = TRANSIENT_ERRORS.has(code)) {
  const retry = retryable && delivery.attempts < MAX_ATTEMPTS;
  await PushDelivery.updateOne({ _id: delivery._id }, { $set: {
    status: retry ? 'queued' : 'failed', errorCode: code,
    nextAttemptAt: new Date(Date.now() + Math.min(60 * 60000, 30000 * 2 ** delivery.attempts)),
  }, $unset: { ticketId: '' } });
  // Never log raw tokens or bodies (messages can contain private information).
  console.warn(`[Push] ${code}; delivery=${delivery._id}; retry=${retry}`);
  if (code === 'DeviceNotRegistered') {
    await User.updateMany({ expoPushToken: delivery.token }, { $unset: { expoPushToken: '' } });
  }
}

/** Queue visible OS notifications; success is not proof of device delivery. */
async function sendPushNotifications(tokens, payload) {
  const validTokens = [...new Set((tokens || []).filter(isExpoPushToken))];
  if (!validTokens.length) return { sent: 0, failed: 0, queued: 0, deadTokens: [] };
  const eventId = payload.data?.notificationId || payload.data?.messageId || randomUUID();
  const operations = validTokens.map((token) => {
    const dedupeKey = createHash('sha256').update(`${eventId}:${token}`).digest('hex');
    return { updateOne: {
      filter: { dedupeKey },
      update: { $setOnInsert: { dedupeKey, token, payload, status: 'queued', attempts: 0, nextAttemptAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000) } },
      upsert: true,
    } };
  });
  await PushDelivery.bulkWrite(operations, { ordered: false });
  // The recurring worker recovers queued work if the process exits here.
  setImmediate(() => processPushQueue().catch((error) => console.error('[Push] Worker error:', error.name)));
  return { sent: 0, failed: 0, queued: validTokens.length, deadTokens: [] };
}

async function sendQueuedBatch() {
  const batch = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    // Atomic lease prevents two server instances from sending the same row.
    const delivery = await PushDelivery.findOneAndUpdate({
      status: { $in: ['queued', 'sending'] }, nextAttemptAt: { $lte: new Date() },
      expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS },
    }, { $set: { status: 'sending', nextAttemptAt: new Date(Date.now() + 2 * 60000) }, $inc: { attempts: 1 } },
    { new: true, sort: { nextAttemptAt: 1 } }).select('+token +payload').lean();
    if (!delivery) break;
    batch.push(delivery);
  }
  if (!batch.length) return;
  await sendClaimedBatch(batch);
}

async function sendClaimedBatch(batch) {
  let tickets;
  try {
    tickets = await expoRequest('send', batch.map(({ token, payload }) => ({
      to: token, title: payload.title, body: payload.body, data: payload.data || {},
      sound: payload.sound || 'default', priority: 'high', channelId: 'vettri-default',
      ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
    })));
    tickets = Array.isArray(tickets) ? tickets : [tickets];
  } catch (error) {
    // Legacy/development tokens can belong to another Expo project. One such
    // token must not block all production devices in the same outbox batch.
    if (error.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && batch.length > 1) {
      for (const delivery of batch) await sendClaimedBatch([delivery]);
      return;
    }
    for (const delivery of batch) await recordFailure(delivery, error.code || 'NetworkError', error.retryable ?? true);
    return;
  }
  for (let i = 0; i < batch.length; i++) {
    const ticket = tickets[i];
    if (ticket?.status === 'ok' && ticket.id) {
      await PushDelivery.updateOne({ _id: batch[i]._id }, { $set: {
        status: 'receipt_pending', ticketId: ticket.id, nextAttemptAt: new Date(Date.now() + RECEIPT_DELAY_MS),
      }, $unset: { errorCode: '' } });
    } else {
      await recordFailure(batch[i], ticket?.details?.error || 'MissingTicket');
    }
  }
}

async function checkPushReceipts() {
  const deliveries = await PushDelivery.find({ status: 'receipt_pending', nextAttemptAt: { $lte: new Date() } })
    .select('+token').limit(1000).lean();
  if (!deliveries.length) return;
  const receipts = await expoRequest('getReceipts', { ids: deliveries.map((delivery) => delivery.ticketId) });
  for (const delivery of deliveries) {
    const receipt = receipts?.[delivery.ticketId];
    if (receipt?.status === 'ok') {
      await PushDelivery.updateOne({ _id: delivery._id, status: 'receipt_pending' }, { $set: { status: 'delivered' }, $unset: { errorCode: '' } });
    } else if (receipt?.status === 'error') {
      await recordFailure(delivery, receipt.details?.error || 'ReceiptError');
    } else if (Date.now() - new Date(delivery.updatedAt).getTime() > 23 * 60 * 60000) {
      // No receipt is NOT proof of failure; do not resend an already delivered alert.
      await recordFailure(delivery, 'ReceiptUnavailable', false);
    } else {
      await PushDelivery.updateOne({ _id: delivery._id }, { $set: { nextAttemptAt: new Date(Date.now() + RECEIPT_DELAY_MS) } }, { timestamps: false });
    }
  }
}

async function processPushQueue() {
  if (running) return;
  running = true;
  try {
    await PushDelivery.updateMany({ status: 'sending', attempts: { $gte: MAX_ATTEMPTS }, nextAttemptAt: { $lte: new Date() } },
      { $set: { status: 'failed', errorCode: 'SendOutcomeUnknown' } });
    await sendQueuedBatch();
    try { await checkPushReceipts(); } catch (error) { console.error('[Push] Receipt check failed:', error.code || error.name); }
  } finally { running = false; }
}

function startPushDeliveryWorker() {
  if (worker) return;
  const run = () => processPushQueue().catch((error) => console.error('[Push] Worker failed:', error.name));
  worker = setInterval(run, 10000);
  worker.unref();
  run();
}

module.exports = { sendPushNotifications, processPushQueue, checkPushReceipts, startPushDeliveryWorker };

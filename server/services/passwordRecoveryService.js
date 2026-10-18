const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createHash } = require('node:crypto');
const { buildLoginLookup } = require('../utils/loginLookup');
const { isExpoPushToken } = require('../utils/pushToken');
const { recoveryCipher } = require('../utils/recoveryCipher');
const policy = require('../utils/passwordRecovery');
const chat = require('./chatMessageService');
const fail = (message = policy.RECOVERY_FAILURE_MESSAGE, status = 400) => Object.assign(new Error(message), { status });

function createPasswordRecoveryService(dependencies = {}) {
  const {
    User = require('../models/User'), ResetRequest = require('../models/ResetRequest'),
    ChatMessage = require('../models/ChatMessage'), PushDelivery = require('../models/PushDelivery'),
    transaction = (fn) => mongoose.connection.transaction(fn), cipher = recoveryCipher,
    now = () => new Date(), createTextMessage = chat.createTextMessage,
    publishTextMessage = chat.publishTextMessage, bcrypt: hashing = bcrypt,
  } = dependencies;
  const adminOnly = (admin) => { if (admin?.role !== 'admin' || admin.isActive === false) throw fail('Admin access required.', 403); };
  const trustedTokens = (user) => [...new Set([...(user.recoveryDevices || []), user.expoPushToken]
    .filter(token => isExpoPushToken(token) && (user.recoveryReadyDevices || []).includes(token)))];
  async function account(identifier, session) {
    if (typeof identifier !== 'string' || identifier.length > 254) return null;
    const lookup = buildLoginLookup(identifier);
    let found = await User.find(lookup.exactQuery).select('+recoveryDevices +recoveryReadyDevices').limit(2).session(session || null);
    if (!found.length && lookup.formattedQuery) found = await User.find(lookup.formattedQuery).select('+recoveryDevices +recoveryReadyDevices').limit(2).session(session || null);
    return found.length === 1 && policy.eligibleForRecovery(found[0]) ? found[0] : null;
  }
  async function redact(request, message, session) {
    await ChatMessage.updateMany({ recoveryRequestId: request._id }, {
      $set: { message }, $unset: { recoveryCiphertext: '' },
    }, { session });
    await PushDelivery.deleteMany({ recoveryRequestId: request._id }, { session });
  }
  async function close(request, status, session) {
    await ResetRequest.findOneAndUpdate({ _id: request._id, revision: request.revision }, {
      $set: { status, activeRequest: false }, $unset: { tempPasswordHash: '', deviceToken: '' },
    }, { session });
    await redact(request, status === 'used' ? 'Temporary password was used' : 'Temporary password is no longer available', session);
  }
  const pendingExpired = (request) => request.status === 'pending'
    && +new Date(request.pendingSince || request.createdAt) <= +now() - policy.RESET_REQUEST_PENDING_DAYS * 86400000;
  async function loadAdmin(id, session) {
    const request = await ResetRequest.findById(id).select('+tempPasswordHash +deviceToken').session(session);
    if (!request) throw fail('Request not found.', 404);
    return request;
  }
  async function request({ identifier, deviceToken }) {
    const result = { success: true, message: policy.RECOVERY_REQUEST_MESSAGE };
    const user = await account(identifier);
    if (!user) return result;
    const tokens = trustedTokens(user);
    // A public request may refer to a known installation, never enroll a new one.
    const verifiedDevice = tokens.includes(deviceToken) ? deviceToken : undefined;
    try {
      await ResetRequest.findOneAndUpdate({ userId: user._id, activeRequest: true }, {
        $setOnInsert: { identifier: buildLoginLookup(identifier).key, userId: user._id, role: user.role,
          status: 'pending', activeRequest: true, pendingSince: now(), ...(verifiedDevice ? { deviceToken: verifiedDevice } : {}) },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
    return result;
  }
  async function generate(id, admin) {
    adminOnly(admin);
    cipher(); // Fail closed before generating if encryption is not configured.
    const password = policy.generateTemporaryPassword();
    const hash = await hashing.hash(password, 12);
    let result;
    await transaction(async session => {
      const request = await loadAdmin(id, session);
      if (['used', 'rejected'].includes(request.status) || pendingExpired(request)) throw fail('Create a new recovery request.', 409);
      const user = await User.findById(request.userId).session(session);
      if (!policy.eligibleForRecovery(user)) throw fail('Account is unavailable.', 409);
      await redact(request, 'Temporary password was replaced', session);
      result = await ResetRequest.findOneAndUpdate({ _id: id, revision: request.revision }, {
        $set: { status: 'pending', activeRequest: true, tempPasswordHash: hash, failedAttempts: 0,
          deliveryChannels: [], handledBy: admin._id, handledAt: now(), pendingSince: now() },
        $inc: { revision: 1 }, $unset: { sentAt: '', tempPasswordExpiresAt: '', chatMessageId: '' },
      }, { new: true, session });
      if (!result) throw fail('Request changed. Refresh and try again.', 409);
    });
    return { success: true, password, request: summary(result) };
  }
  async function send(id, admin, { password, channels, identityVerified }, io) {
    adminOnly(admin);
    if (!Array.isArray(channels) || !channels.length || channels.some(c => !['push', 'chat', 'copy'].includes(c))) throw fail('Choose valid delivery channels.');
    if (channels.includes('copy') && identityVerified !== true) throw fail('Verify the account owner independently before sharing a password.');
    if (typeof password !== 'string' || password.length > 100) throw fail();
    let result, chatRecord;
    const encryption = cipher();
    await transaction(async session => {
      chatRecord = null;
      const request = await loadAdmin(id, session);
      if (!['pending', 'sent'].includes(request.status) || pendingExpired(request) || !request.tempPasswordHash
        || (request.status === 'sent' && !policy.canCompleteReset(request, now()))
        || !await hashing.compare(password.trim(), request.tempPasswordHash)) throw fail();
      const user = await User.findById(request.userId).select('+recoveryDevices +recoveryReadyDevices').session(session);
      if (!policy.eligibleForRecovery(user)) throw fail('Account is unavailable.', 409);
      const tokens = trustedTokens(user);
      // Revalidate ownership at send time; account switching removes trusted installations.
      if (request.deviceToken && tokens.includes(request.deviceToken)) tokens.push(request.deviceToken);
      const missing = [...new Set(channels)].filter(c => !(request.deliveryChannels || []).includes(c));
      if (missing.includes('push') && !tokens.length) throw fail('No verified device is available. Verify identity and use Copy instead.', 409);
      const sentAt = request.sentAt || now();
      const expiresAt = request.tempPasswordExpiresAt || policy.expiryFromSend(sentAt);
      const version = request.revision;
      const context = `${id}:${version}`;
      if (missing.includes('chat')) {
        chatRecord = await createTextMessage({ sender: admin, receiverId: user._id,
          message: 'Temporary password sent. Open Reset Password to use it.', session,
          recoveryRequestId: request._id,
          recoveryCiphertext: encryption.seal({ password: password.trim() }, `chat:${context}`),
        });
      }
      if (missing.includes('push')) {
        const payload = { title: 'Temporary password',
          body: `Your temporary password: ${password.trim()} (valid for ${policy.TEMP_PASSWORD_TTL_HOURS} hours). Tap to reset.`,
          data: { type: 'password_reset', requestId: String(request._id), revision: version,
            identifier: request.identifier, tempPassword: password.trim(), expiresAt: expiresAt.toISOString() },
          channelId: 'vettri-recovery', ttl: Math.max(1, Math.floor((+expiresAt - +now()) / 1000)),
        };
        await PushDelivery.bulkWrite([...new Set(tokens)].map(token => ({ updateOne: {
          filter: { dedupeKey: createHash('sha256').update(`password-reset:${context}:${token}`).digest('hex') },
          update: { $setOnInsert: { token, recoveryRequestId: request._id,
            payload: { title: 'Temporary password', body: 'Open Reset Password to continue.', data: { type: 'password_reset', requestId: String(request._id), revision: version } },
            encryptedPayload: encryption.seal(payload, `push:${context}`),
            status: 'queued', attempts: 0, nextAttemptAt: now(), expiresAt } }, upsert: true,
        } })), { session });
      }
      result = await ResetRequest.findOneAndUpdate({ _id: id, revision: version, status: request.status }, {
        $set: { status: 'sent', sentAt, tempPasswordExpiresAt: expiresAt, handledBy: admin._id, handledAt: now(),
          deliveryChannels: [...new Set([...(request.deliveryChannels || []), ...missing])],
          ...(chatRecord ? { chatMessageId: chatRecord._id } : {}) },
      }, { new: true, session });
      if (!result) throw fail('Request changed. Refresh and try again.', 409);
    });
    if (chatRecord) await publishTextMessage({ sender: admin, record: chatRecord, io }).catch(() => {});
    return { success: true, request: summary(result) };
  }
  async function complete({ identifier, tempPassword, newPassword, confirmPassword }) {
    if (typeof tempPassword !== 'string' || tempPassword.length > 100 || !policy.validNewPassword(newPassword, confirmPassword, tempPassword.trim())) return false;
    const user = await account(identifier);
    // Constant-cost password comparison also runs for unknown accounts.
    const candidate = user ? await ResetRequest.findOne({ userId: user._id, activeRequest: true }).select('+tempPasswordHash') : null;
    const fallbackHash = '$2a$12$9U55oOrDL9RGLs2eO8Go5uZpIez.NB1tc7wr4X0x7gbSoQgYXVnra';
    const matches = await hashing.compare(tempPassword.trim(), candidate?.tempPasswordHash || fallbackHash);
    if (!candidate) return false;
    let succeeded = false;
    await transaction(async session => {
      succeeded = false;
      const request = await loadAdmin(candidate._id, session);
      if ((request.status === 'sent' && +new Date(request.tempPasswordExpiresAt) <= +now()) || pendingExpired(request)) {
        await close(request, 'expired', session); return;
      }
      if (!policy.canCompleteReset(request, now()) || request.revision !== candidate.revision) return;
      if (!matches) {
        const attempts = request.failedAttempts + 1;
        await ResetRequest.findOneAndUpdate({ _id: request._id, revision: request.revision, failedAttempts: request.failedAttempts, status: 'sent' }, {
          $set: { failedAttempts: attempts, ...(attempts >= policy.RESET_MAX_FAILED_ATTEMPTS ? { status: 'locked', activeRequest: false } : {}) },
        }, { session });
        if (attempts >= policy.RESET_MAX_FAILED_ATTEMPTS) {
          await ResetRequest.findOneAndUpdate({ _id: request._id }, { $unset: { tempPasswordHash: '' } }, { session });
          await redact(request, 'Temporary password was locked', session);
        }
        return;
      }
      const target = await User.findById(user._id).session(session);
      if (!policy.eligibleForRecovery(target)) return;
      const consumed = await ResetRequest.findOneAndUpdate({ _id: request._id, revision: request.revision, status: 'sent', tempPasswordExpiresAt: { $gt: now() } }, {
        $set: { status: 'used', activeRequest: false }, $unset: { tempPasswordHash: '', deviceToken: '' },
      }, { new: true, session });
      if (!consumed) return;
      target.password = newPassword;
      target.mustChangePassword = false;
      target.refreshToken = '';
      await target.save({ session }); // User hook hashes and bumps tokenVersion/passwordChangedAt.
      await redact(request, 'Temporary password was used', session);
      succeeded = true;
    });
    return succeeded;
  }
  async function reject(id, admin) {
    adminOnly(admin);
    await transaction(async session => {
      const request = await loadAdmin(id, session);
      if (['used', 'rejected'].includes(request.status)) throw fail('This request is already closed.', 409);
      await close(request, 'rejected', session);
      await ResetRequest.findOneAndUpdate({ _id: id }, { $set: { handledBy: admin._id, handledAt: now() } }, { session });
    });
    return { success: true };
  }
  async function expire() {
    const due = await ResetRequest.find({ $or: [
      { status: 'pending', pendingSince: { $lte: new Date(+now() - policy.RESET_REQUEST_PENDING_DAYS * 86400000) } },
      { status: 'pending', pendingSince: { $exists: false }, createdAt: { $lte: new Date(+now() - policy.RESET_REQUEST_PENDING_DAYS * 86400000) } },
      { status: 'sent', tempPasswordExpiresAt: { $lte: now() } },
    ] }).limit(100);
    for (const record of due) await transaction(async session => {
      const fresh = await loadAdmin(record._id, session);
      if (pendingExpired(fresh) || (fresh.status === 'sent' && +new Date(fresh.tempPasswordExpiresAt) <= +now())) await close(fresh, 'expired', session);
    });
    return due.length;
  }
  async function readRecoveryMessages(messages, viewer) {
    const output = [];
    for (const record of messages) {
      const safe = record.toObject ? record.toObject() : { ...record };
      delete safe.recoveryCiphertext;
      if (record.recoveryRequestId && record.recoveryCiphertext && String(record.receiverId) === String(viewer._id)) {
        const request = await ResetRequest.findById(record.recoveryRequestId);
        if (policy.canCompleteReset(request, now())) {
          try { const value = cipher().open(record.recoveryCiphertext, `chat:${request._id}:${request.revision}`);
            safe.message = `Your temporary password: ${value.password}. Use Reset Password before ${new Date(request.tempPasswordExpiresAt).toISOString()}.`; }
          catch { safe.message = 'Temporary password is no longer available'; }
        } else safe.message = 'Temporary password is no longer available';
      }
      output.push(safe);
    }
    return output;
  }
  return { request, generate, send, complete, reject, expire, readRecoveryMessages };
}

function summary(record) {
  return { _id: record._id, status: record.status, requestedAt: record.createdAt,
    sentAt: record.sentAt, tempPasswordExpiresAt: record.tempPasswordExpiresAt,
    hasGeneratedPassword: Boolean(record.tempPasswordHash || record.revision), deliveryChannels: record.deliveryChannels || [] };
}
const service = createPasswordRecoveryService();
module.exports = { ...service, createPasswordRecoveryService, summary };

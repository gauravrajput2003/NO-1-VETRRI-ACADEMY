const mongoose = require('mongoose');
const { randomInt } = require('node:crypto');
const service = require('../services/passwordRecoveryService');
const ResetRequest = require('../models/ResetRequest');
const User = require('../models/User');
const { recordRecoveryAttempt } = require('../middleware/passwordRecoveryLimits');
const policy = require('../utils/passwordRecovery');
const { recoveryReadiness } = require('../utils/recoveryDevices');

const noStore = res => res.set('Cache-Control', 'no-store');
const waitUntil = async (start) => {
  const delay = 1000 + randomInt(40) - (Date.now() - start);
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
};
async function request(req, res) {
  const start = Date.now();
  noStore(res);
  try {
    const account = await service.resolveAccount(req.body?.identifier);
    if (await recordRecoveryAttempt(req, policy.RESET_REQUESTS_PER_HOUR, 'request', account?._id)) await service.request(req.body || {}, account);
  } catch (error) { console.error('[Recovery] Request unavailable:', error.name); }
  await waitUntil(start);
  // Neither existence, role, throttling nor account status are disclosed publicly.
  res.status(202).json({ success: true, message: policy.RECOVERY_REQUEST_MESSAGE });
}
async function complete(req, res) {
  const start = Date.now();
  noStore(res);
  let success = false;
  try {
    const account = await service.resolveAccount(req.body?.identifier);
    if (await recordRecoveryAttempt(req, 30, 'complete', account?._id)) success = await service.complete(req.body || {});
  }
  catch (error) { console.error('[Recovery] Completion unavailable:', error.name); }
  await waitUntil(start);
  res.status(success ? 200 : 400).json({ success, message: success ? 'Password updated. Please sign in.' : policy.RECOVERY_FAILURE_MESSAGE });
}
const action = fn => async (req, res) => {
  noStore(res);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request.' });
  try { res.json(await fn(req)); }
  catch (error) {
    const status = error.code === 11000 ? 409 : error.status || 503;
    res.status(status).json({ success: false, message: error.code === 11000 ? 'A newer request already exists. Refresh the list.'
      : error.status ? error.message : 'Recovery is unavailable. Check the server recovery configuration and try again.' });
  }
};
async function list(req, res) {
  noStore(res);
  try {
    await service.expire();
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim().slice(0, 80);
    const filter = {};
    if (req.query.status === 'pending' || req.query.status === 'sent') filter.status = req.query.status;
    else if (req.query.status === 'closed') filter.status = { $in: ['used', 'expired', 'locked', 'rejected'] };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const users = await User.find({ $or: [{ name: regex }, { mobile: regex }, { email: regex }] }).select('_id').limit(1000).lean();
      filter.userId = { $in: users.map(user => user._id) };
    }
    const [records, total, pendingCount] = await Promise.all([
      ResetRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('userId', 'name role grade subjects mobile email profilePic tokenVersion +recoveryRegistrations').lean(),
      ResetRequest.countDocuments(filter), ResetRequest.countDocuments({ status: 'pending' }),
    ]);
    const requests = records.map(record => ({ ...service.summary(record),
      hasGeneratedPassword: record.revision > 0 && ['pending', 'sent'].includes(record.status),
      user: record.userId ? { _id: record.userId._id, name: record.userId.name, role: record.userId.role,
        grade: record.userId.grade, subjects: record.userId.subjects, mobile: record.userId.mobile,
        email: record.userId.email, profilePic: record.userId.profilePic } : null,
      hasVerifiedDevice: recoveryReadiness(record.userId).ready,
      deviceReadinessReason: recoveryReadiness(record.userId).reason,
    }));
    res.json({ success: true, requests, total, page, pages: Math.ceil(total / limit), pendingCount });
  } catch { res.status(503).json({ success: false, message: 'Unable to load password requests. Please retry.' }); }
}
module.exports = { request, complete, list,
  generate: action(req => service.generate(req.params.id, req.user)),
  send: action(req => service.send(req.params.id, req.user, req.body || {}, req.app.get('io'))),
  markCopied: action(req => service.send(req.params.id, req.user, { ...req.body, channels: ['copy'] }, req.app.get('io'))),
  reject: action(req => service.reject(req.params.id, req.user)),
};

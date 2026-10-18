const { createHash } = require('node:crypto');
const RateLimit = require('../models/RecoveryRateLimit');
const { buildLoginLookup } = require('../utils/loginLookup');
const { RESET_REQUESTS_PER_HOUR } = require('../utils/passwordRecovery');

// Shared Mongo counters survive process restarts and apply across Render instances.
async function recordRecoveryAttempt(req, limit = RESET_REQUESTS_PER_HOUR, scope = 'request') {
  const time = Date.now(), bucket = Math.floor(time / 3600000);
  const keys = [`ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`,
    `identifier:${buildLoginLookup(typeof req.body.identifier === 'string' ? req.body.identifier.slice(0, 254) : '').key}`];
  const counters = await Promise.all(keys.map(key => RateLimit.findOneAndUpdate({
    _id: createHash('sha256').update(`${scope}:${bucket}:${key}`).digest('hex'),
  }, { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * 3600000) } }, { upsert: true, new: true })));
  return counters.every(counter => counter.attempts <= limit);
}
module.exports = { recordRecoveryAttempt };

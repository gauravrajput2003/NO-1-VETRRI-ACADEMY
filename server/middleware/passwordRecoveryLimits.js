const { createHash } = require('node:crypto');
const RateLimit = require('../models/RecoveryRateLimit');
const { buildLoginLookup } = require('../utils/loginLookup');
const { RESET_REQUESTS_PER_HOUR } = require('../utils/passwordRecovery');

// Each key is atomically pruned and admitted; arrays are bounded by the budget.
function createRecoveryLimiter({ RateLimit: Model = RateLimit, now = Date.now } = {}) {
  return async function recordRecoveryAttempt(req, limit = RESET_REQUESTS_PER_HOUR, scope = 'request', userId) {
    const time = now(), windowMs = 3600000;
    const keys = [`ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`,
      `identifier:${buildLoginLookup(typeof req.body?.identifier === 'string' ? req.body.identifier.slice(0, 254) : '').key}`,
      ...(userId ? [`user:${String(userId)}`] : [])];
    const counters = await Promise.all(keys.map(async key => {
      const filter = { _id: createHash('sha256').update(`sliding-v1:${scope}:${key}`).digest('hex') };
      const pipeline = [
        { $set: { events: { $filter: { input: { $ifNull: ['$events', []] }, as: 'at', cond: { $gt: ['$$at', time - windowMs] } } } } },
        { $set: { allowed: { $lt: [{ $size: '$events' }, limit] } } },
        { $set: { events: { $cond: ['$allowed', { $concatArrays: ['$events', [time]] }, '$events'] }, expiresAt: new Date(time + windowMs + 300000) } },
      ];
      try { return await Model.findOneAndUpdate(filter, pipeline, { upsert: true, new: true }); }
      catch (error) { if (error.code !== 11000) throw error; return Model.findOneAndUpdate(filter, pipeline, { new: true }); }
    }));
    return counters.every(counter => counter?.allowed === true);
  };
}
module.exports = { createRecoveryLimiter, recordRecoveryAttempt: createRecoveryLimiter() };

const { canCompleteReset } = require('../utils/passwordRecovery');
async function resolveRecoveryPush(delivery, dependencies = {}) {
  const { ResetRequest = require('../models/ResetRequest'), User = require('../models/User'),
    cipher = require('../utils/recoveryCipher').recoveryCipher } = dependencies;
  const request = await ResetRequest.findById(delivery.recoveryRequestId);
  if (!canCompleteReset(request) || request.revision !== delivery.payload?.data?.revision || !delivery.encryptedPayload) return null;
  const owned = await User.exists({ _id: request.userId, isActive: true, isApproved: { $ne: false },
    recoveryRegistrations: { $elemMatch: { token: delivery.token, registeredAt: { $lte: new Date() } } } });
  if (!owned) return null;
  const payload = cipher().open(delivery.encryptedPayload, `push:${request._id}:${request.revision}`);
  return { ...payload, ttl: Math.max(1, Math.floor((+new Date(request.tempPasswordExpiresAt) - Date.now()) / 1000)) };
}
module.exports = { resolveRecoveryPush };

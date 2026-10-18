const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createRecoveryCipher } = require('../utils/recoveryCipher');
test('worker decrypts only an unexpired current recovery to a still-owned device', async () => {
  const { resolveRecoveryPush } = require('../services/recoveryPushPayload');
  const cipher = createRecoveryCipher(randomBytes(32).toString('base64'));
  const request = { _id: 'r1', userId: 'u1', revision: 2, status: 'sent', failedAttempts: 0, tempPasswordExpiresAt: new Date(Date.now() + 3600000) };
  let ownsDevice = true;
  const delivery = { token: 'ExpoPushToken[known]', recoveryRequestId: 'r1', payload: { data: { revision: 2 } },
    encryptedPayload: cipher.seal({ body: 'SYNTHETIC SECRET', data: { revision: 2 }, ttl: 86400 }, 'push:r1:2') };
  const deps = { ResetRequest: { findById: async () => request }, User: { exists: async () => ownsDevice }, cipher: () => cipher };
  const payload = await resolveRecoveryPush(delivery, deps);
  assert.equal(payload.body, 'SYNTHETIC SECRET');
  assert(payload.ttl <= 3600);
  ownsDevice = false; assert.equal(await resolveRecoveryPush(delivery, deps), null);
  ownsDevice = true; request.status = 'used'; assert.equal(await resolveRecoveryPush(delivery, deps), null);
  request.status = 'sent'; request.revision++; assert.equal(await resolveRecoveryPush(delivery, deps), null);
  request.revision--; request.tempPasswordExpiresAt = new Date(0); assert.equal(await resolveRecoveryPush(delivery, deps), null);
});

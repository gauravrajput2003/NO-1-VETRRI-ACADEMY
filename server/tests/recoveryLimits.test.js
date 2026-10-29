const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { buildLoginLookup } = require('../utils/loginLookup');
test('Mongo-backed recovery limits count both normalized identifier and IP independently', async () => {
  const counters = new Map();
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/passwordRecoveryLimits.js'), 'utf8'), {
    module, Date, Promise, require: key => ({
      'node:crypto': require('node:crypto'), '../utils/loginLookup': { buildLoginLookup },
      '../utils/passwordRecovery': { RESET_REQUESTS_PER_HOUR: 3 },
      '../models/RecoveryRateLimit': { findOneAndUpdate: async ({ _id }) => {
        const attempts = (counters.get(_id) || 0) + 1; counters.set(_id, attempts); return { allowed: attempts <= 3 };
      } },
    }[key]),
  });
  const { recordRecoveryAttempt } = module.exports;
  for (let i = 0; i < 3; i++) assert.equal(await recordRecoveryAttempt({ ip: 'ip-' + i, body: { identifier: i ? '+91 98765 43210' : '9876543210' } }), true);
  assert.equal(await recordRecoveryAttempt({ ip: 'new-ip', body: { identifier: '9876543210' } }), false);
  for (let i = 0; i < 3; i++) assert.equal(await recordRecoveryAttempt({ ip: 'shared-ip', body: { identifier: 'different-' + i + '@example.invalid' } }), true);
  assert.equal(await recordRecoveryAttempt({ ip: 'shared-ip', body: { identifier: 'last@example.invalid' } }), false);
});

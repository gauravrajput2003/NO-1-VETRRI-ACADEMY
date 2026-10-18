const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

test('recovery encryption fails closed without a separate valid key', () => {
  const { createRecoveryCipher } = require('../utils/recoveryCipher');
  for (const key of ['', 'short', Buffer.alloc(16).toString('base64')]) {
    assert.throws(() => createRecoveryCipher(key));
  }
});

test('credential ciphertext is randomized, authenticated and bound to its purpose', () => {
  const { createRecoveryCipher } = require('../utils/recoveryCipher');
  const cipher = createRecoveryCipher(randomBytes(32).toString('base64'));
  const value = { password: 'SYNTHETIC-SECRET', identifier: 'test@example.invalid' };
  const first = cipher.seal(value, 'request-one');
  const second = cipher.seal(value, 'request-one');
  assert.notEqual(first, second);
  assert.equal(first.includes(value.password), false);
  assert.deepEqual(cipher.open(first, 'request-one'), value);
  assert.throws(() => cipher.open(first, 'request-two'));
  const parts = first.split('.');
  parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => cipher.open(parts.join('.'), 'request-one'));
});

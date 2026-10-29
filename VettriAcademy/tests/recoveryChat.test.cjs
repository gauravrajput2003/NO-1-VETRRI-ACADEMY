const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const toolkit = require('@reduxjs/toolkit');
function fixture() {
  const code = require('@babel/core').transformSync(fs.readFileSync(path.join(__dirname, '../src/redux/slices/chatSlice.js'), 'utf8'), { configFile: false, babelrc: false, plugins: [require('@babel/plugin-transform-modules-commonjs')] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date, require: key => key === '@reduxjs/toolkit' ? toolkit : key.includes('recoveryChat') ? require('../src/utils/recoveryChat.cjs') : {} });
  return module.exports;
}
const message = (delta = 60000) => ({ _id: 'm1', conversationId: 'a_b', recoveryRequestId: 'r1', credentialType: 'password_recovery', recoveryStatus: 'sent', expiresAt: new Date(Date.now() + delta).toISOString(), message: 'Synthetic private credential' });
test('expired/used recovery messages never enter Redux as plaintext', () => {
  const chat = fixture();
  for (const msg of [message(-1), { ...message(), recoveryStatus: 'used' }, { ...message(), expiresAt: undefined }]) {
    const state = chat.default(undefined, chat.fetchMessages.fulfilled({ messages: [msg], page: 1, conversationId: 'a_b' }, 'id', {}));
    assert.equal(state.messages[0].message.includes('Synthetic'), false);
  }
});
test('redaction, expiry purge, logout and five-minute background scrub retained credentials', () => {
  const chat = fixture(); const init = () => chat.default(undefined, chat.fetchMessages.fulfilled({ messages: [message()], page: 1, conversationId: 'a_b' }, 'id', {}));
  for (const action of [{ type: 'auth/logout/pending' }, chat.redactRecoveryMessages({ requestId: 'r1', status: 'used' }), chat.purgeRecoveryMessages({ clearAll: true }), chat.purgeRecoveryMessages({ now: Date.now() + 70000 })]) {
    const state = chat.default(init(), action); assert(!JSON.stringify(state).includes('Synthetic private credential'));
  }
  const { backgroundExpired } = require('../src/utils/recoveryChat.cjs');
  assert.equal(backgroundExpired(1000, 300999), false); assert.equal(backgroundExpired(1000, 301000), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/utils/passwordRecoveryState.js', import.meta.url), 'utf8').catch(() => '');
const helpers = source ? await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) : {};
test('reset state moves through requested, submitting, error and success, clearing secrets', () => {
  const { initialRecoveryState, recoveryReducer } = helpers;
  assert.equal(typeof recoveryReducer, 'function');
  let state = initialRecoveryState();
  state = recoveryReducer(state, { type: 'REQUEST' }); assert.equal(state.phase, 'requesting');
  state = recoveryReducer(state, { type: 'REQUESTED', now: 1000 }); assert.equal(state.phase, 'requested');
  state = recoveryReducer(state, { type: 'FIELD', field: 'tempPassword', value: 'abcd-Ef234' });
  state = recoveryReducer(state, { type: 'SUBMIT' }); assert.equal(state.phase, 'submitting');
  state = recoveryReducer(state, { type: 'ERROR', message: 'Retry' }); assert.equal(state.phase, 'requested');
  state = recoveryReducer(state, { type: 'SUCCESS' }); assert.equal(state.phase, 'success');
  assert.equal(state.tempPassword, ''); assert.equal(state.newPassword, '');
});
test('notification prefill validates type, credential shape and expiry and returns ephemeral fields', () => {
  const { recoveryNotificationPrefill } = helpers;
  assert.equal(typeof recoveryNotificationPrefill, 'function');
  const data = { type: 'password_reset', identifier: 'student@example.invalid', tempPassword: 'Abcd-Ef234', expiresAt: new Date(Date.now() + 60000).toISOString() };
  assert.equal(recoveryNotificationPrefill(data).tempPassword, data.tempPassword);
  assert.equal(recoveryNotificationPrefill({ ...data, type: 'chat_message' }), null);
  assert.equal(recoveryNotificationPrefill({ ...data, expiresAt: new Date(0).toISOString() }), null);
  assert.equal(recoveryNotificationPrefill({ ...data, tempPassword: '<script>' }), null);
});
test('failed resend from a notification prefill retains the recovery step', () => {
  const { initialRecoveryState, recoveryReducer } = helpers;
  let state = initialRecoveryState({ identifier: 'preview@example.invalid', tempPassword: 'Abcd-Ef234' });
  state = recoveryReducer(state, { type: 'REQUEST' });
  state = recoveryReducer(state, { type: 'ERROR', message: 'Offline' });
  assert.equal(state.phase, 'requested');
  assert.equal(state.tempPassword, 'Abcd-Ef234');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLoginMobile as phone } from '../src/utils/loginCredentials.js';
import { normalizeLoginMobile as website } from '../../client/src/utils/loginCredentials.js';
import backend from '../../server/utils/studentCredentials.js';

test('copied login phones strip country prefix and formatting consistently across all panels', () => {
  for (const input of ['9876543210', ' +91 98765 43210 ', '+91 (98765)-43210', '09876543210', '98765.43210\n']) {
    for (const normalize of [phone, website, backend.normalizeLoginMobile]) assert.equal(normalize(input), '9876543210');
  }
  assert.equal(phone(undefined), '');
  assert.equal(phone('12345'), '12345'); // Do not invent missing digits.
});

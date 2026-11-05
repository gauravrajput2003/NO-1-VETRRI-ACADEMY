import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSessionDisplay, loginDurationSummary, formatAttendanceDuration } from '../src/utils/loginAttendance.js';

const now = Date.parse('2026-10-29T13:00:00Z'); // 18:30 in the academy timezone

test('today’s unfinished session shows elapsed time even without a saved duration', () => {
  const session = loginSessionDisplay({ loginTime: '2026-10-29T12:35:00Z' }, now);
  assert.equal(session.ongoing, true);
  assert.equal(session.duration, 25);
  assert.equal(formatAttendanceDuration(session.duration), '25m');
});

test('a historical unclosed session is unknown rather than still active or zero minutes', () => {
  const session = loginSessionDisplay({ loginTime: '2026-10-28T13:31:00Z' }, now);
  assert.equal(session.ongoing, false);
  assert.equal(session.duration, null);
  assert.equal(formatAttendanceDuration(session.duration), 'NA');
});

test('completed sessions use recorded duration, including an actual zero-minute session', () => {
  const session = loginSessionDisplay({ loginTime: '2026-10-28T12:00:00Z', logoutTime: '2026-10-28T13:00:00Z', sessionDuration: 45 }, now);
  assert.equal(session.duration, 45);
  assert.equal(loginSessionDisplay({ sessionDuration: 0, duration: 60 }, now).duration, 0);
  assert.equal(formatAttendanceDuration(0), '0m');
});

test('a valid login/logout interval fills a missing duration without requiring a database change', () => {
  const session = loginSessionDisplay({ loginTime: '2026-10-28T12:00:00Z', logoutTime: '2026-10-28T13:15:00Z' }, now);
  assert.equal(session.duration, 75);
  assert.equal(formatAttendanceDuration(session.duration), '1h 15m');
});

test('average excludes unknown historical records but includes zero and ongoing sessions', () => {
  const logs = [
    { loginTime: '2026-10-28T12:00:00Z' },
    { loginTime: '2026-10-27T12:00:00Z', sessionDuration: 0 },
    { loginTime: '2026-10-26T12:00:00Z', sessionDuration: 60 },
    { loginTime: '2026-10-29T12:30:00Z' },
  ].map((log) => loginSessionDisplay(log, now));
  assert.deepEqual(loginDurationSummary(logs), { average: 30, missing: 1 });
  assert.deepEqual(loginDurationSummary([{ duration: null }]), { average: null, missing: 1 });
});

test('active-day boundaries use India time rather than the UTC day', () => {
  const start = { loginTime: '2026-10-28T19:00:00Z' }; // Oct 29 00:30 IST
  assert.equal(loginSessionDisplay(start, Date.parse('2026-10-28T19:30:00Z')).ongoing, true);
  assert.equal(loginSessionDisplay({ loginTime: '2026-10-28T18:00:00Z' }, Date.parse('2026-10-28T19:30:00Z')).ongoing, false);
});

test('invalid/future timestamps do not create negative or multi-day elapsed durations', () => {
  for (const loginTime of ['invalid', '2026-10-30T12:00:00Z']) {
    assert.deepEqual(loginDurationSummary([loginSessionDisplay({ loginTime }, now)]), { average: null, missing: 1 });
  }
  assert.equal(formatAttendanceDuration(-1), 'NA');
  assert.equal(formatAttendanceDuration(NaN), 'NA');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getScheduleDateRange, shiftScheduleDate } from '../src/utils/scheduleDateRange.js';

process.env.TZ = 'Asia/Kolkata';

test('daily and specific-date filters cover the full local day', () => {
  for (const period of ['daily', 'date']) {
    const range = getScheduleDateRange(period, new Date(2026, 9, 5, 15, 45));
    assert.equal(range.from, '2026-10-04T18:30:00.000Z');
    assert.equal(range.to, '2026-10-05T18:29:59.999Z');
  }
});

test('a Sunday belongs to the Monday–Sunday week that precedes it', () => {
  const range = getScheduleDateRange('weekly', new Date(2026, 9, 11));
  assert.equal(range.start.getDay(), 1);
  assert.equal(range.start.getDate(), 5);
  assert.equal(range.end.getDay(), 0);
  assert.equal(range.end.getDate(), 11);
});

test('weekly filters cross the year boundary correctly', () => {
  const range = getScheduleDateRange('weekly', new Date(2026, 0, 1));
  assert.equal(range.from, '2025-12-28T18:30:00.000Z');
  assert.equal(range.to, '2026-01-04T18:29:59.999Z');
});

test('monthly filters include the last day of leap and non-leap February', () => {
  const leap = getScheduleDateRange('monthly', new Date(2028, 1, 15));
  assert.equal(leap.start.getDate(), 1);
  assert.equal(leap.end.getDate(), 29);
  assert.equal(leap.to, '2028-02-29T18:29:59.999Z');
  const normal = getScheduleDateRange('monthly', new Date(2026, 1, 15));
  assert.equal(normal.end.getDate(), 28);
});

test('moving one month from January 31 does not skip February', () => {
  const selected = new Date(2026, 0, 31);
  const next = shiftScheduleDate('monthly', selected, 1);
  assert.equal(next.getMonth(), 1);
  assert.equal(next.getDate(), 1);
  assert.equal(selected.getMonth(), 0);
  assert.equal(selected.getDate(), 31);
});

test('moving one week and one day preserves calendar navigation', () => {
  const selected = new Date(2026, 9, 5);
  assert.equal(shiftScheduleDate('weekly', selected, 1).getDate(), 12);
  assert.equal(shiftScheduleDate('daily', selected, -1).getDate(), 4);
  assert.equal(shiftScheduleDate('date', selected, 1).getDate(), 6);
  assert.equal(selected.getDate(), 5);
});

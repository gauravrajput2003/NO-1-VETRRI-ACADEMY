import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminChatDirectory, adminChatPreview } from '../src/utils/adminChatDirectory.js';

const admin = { _id: 'admin', role: 'admin' };
const teacher = { _id: 'teacher', name: 'Priya', role: 'teacher' };
const student = { _id: 'student', name: 'Bala', role: 'student' };
const thread = (other, time, sender, unread = 0) => ({ conversationId: ['admin', other._id].sort().join('_'), participants: [admin, other], lastMessage: 'Latest message', lastMessageAt: time, lastMessageBy: sender, unreadCount: { admin: unread, [other._id]: 7 } });

test('Recent includes sent and received chats in newest-first order with this admin unread count', () => {
  const rows = buildAdminChatDirectory([teacher, student], [thread(teacher, '2026-10-18T10:00:00Z', 'teacher', 2), thread(student, '2026-10-18T11:00:00Z', 'admin')], 'admin');
  assert.deepEqual(rows.recent.map(r => r._id), ['student', 'teacher']);
  assert.equal(rows.recent[1].unreadCount, 2);
  assert.equal(rows.contacts.find(r => r._id === 'student').unreadCount, 0);
  assert.equal(adminChatPreview(rows.recent[0], 'admin'), 'You: Latest message');
  assert.equal(adminChatPreview(rows.recent[1], 'admin'), 'Priya: Latest message');
  assert.equal(teacher.lastMessage, undefined);
});

test('Recent keeps participants outside the paged contact directory and excludes other admin accounts', () => {
  const own = thread(student, '2026-10-18T11:00:00Z', 'student', 1);
  const foreign = { ...thread(teacher, '2026-10-18T12:00:00Z', 'teacher'), participants: [{ _id: 'other-admin' }, teacher] };
  const rows = buildAdminChatDirectory([], [own, foreign, { participants: [admin, null] }], 'admin');
  assert.equal(rows.recent.length, 1); assert.equal(rows.recent[0]._id, 'student');
  assert.equal(buildAdminChatDirectory([], [own], undefined).recent.length, 0);
});

test('empty contacts remain available under All without inventing a recent conversation', () => {
  const rows = buildAdminChatDirectory([teacher], [{ participants: [admin, teacher], unreadCount: {} }], 'admin');
  assert.equal(rows.contacts.length, 1); assert.equal(rows.recent.length, 0);
  assert.equal(adminChatPreview(rows.contacts[0], 'admin'), 'Tap to start direct messaging');
});

test('attachment previews and unknown legacy sender labels are preserved', () => {
  const record = { ...thread(teacher, '2026-10-18T11:00:00Z', 'admin'), lastMessage: '📎 homework.pdf' };
  const row = buildAdminChatDirectory([], [record], 'admin').recent[0];
  assert.equal(adminChatPreview(row, 'admin'), 'You: 📎 homework.pdf');
  assert.equal(adminChatPreview({ lastMessage: 'Legacy message' }, 'admin'), 'Legacy message');
});

test('switching admin accounts does not expose stale directory previews from another admin', () => {
  const rows = buildAdminChatDirectory([{ ...teacher, conversationId: 'other-admin_teacher', lastMessage: 'Private other admin message', unreadCount: 2 }], [], 'admin');
  assert.equal(rows.contacts[0].lastMessage, ''); assert.equal(rows.contacts[0].unreadCount, 0);
  assert.equal(rows.contacts[0].conversationId, undefined);
});

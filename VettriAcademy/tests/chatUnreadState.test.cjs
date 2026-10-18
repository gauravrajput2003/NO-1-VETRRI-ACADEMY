const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const toolkit = require('@reduxjs/toolkit');
function harness({ failRead = false, failCount = false } = {}) {
  const code = require('@babel/core').transformSync(fs.readFileSync(path.join(__dirname, '../src/redux/slices/chatSlice.js'), 'utf8'), { configFile: false, babelrc: false, plugins: [require('@babel/plugin-transform-modules-commonjs')] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: key => key === '@reduxjs/toolkit' ? toolkit : {
    markAsReadAPI: async () => { if (failRead) throw Error('offline'); },
    getUnreadCountAPI: async () => { if (failCount) throw Error('offline'); return { data: { count: 8 } }; },
  } });
  const chat = module.exports;
  const state = { ...chat.default(undefined, { type: 'init' }), unreadCount: 10, conversations: [{ conversationId: 'admin_teacher', unreadCount: { admin: 2, teacher: 7 } }, { conversationId: 'admin_student', unreadCount: { admin: 8 } }], chatUsers: [{ _id: 'teacher', conversationId: 'admin_teacher', unreadCount: 2 }] };
  const store = toolkit.configureStore({ reducer: { auth: () => ({ user: { _id: 'admin' } }), chat: chat.default }, preloadedState: { chat: state }, middleware: getDefault => getDefault({ serializableCheck: false }) });
  return { chat, store };
}
test('opening a conversation clears only own badge and updates total from server; repeated reads are harmless', async () => {
  const { chat, store } = harness();
  await store.dispatch(chat.markConversationRead('admin_teacher'));
  await store.dispatch(chat.markConversationRead('admin_teacher'));
  const state = store.getState().chat;
  assert.equal(state.unreadCount, 8); assert.equal(state.conversations[0].unreadCount.admin, 0);
  assert.equal(state.conversations[0].unreadCount.teacher, 7); assert.equal(state.conversations[1].unreadCount.admin, 8);
  assert.equal(state.chatUsers[0].unreadCount, 0);
});
test('a failed read request preserves unread badges; a count refresh failure still clears an acknowledged read', async () => {
  const failed = harness({ failRead: true });
  await failed.store.dispatch(failed.chat.markConversationRead('admin_teacher'));
  assert.equal(failed.store.getState().chat.unreadCount, 10);
  const fallback = harness({ failCount: true });
  await fallback.store.dispatch(fallback.chat.markConversationRead('admin_teacher'));
  assert.equal(fallback.store.getState().chat.unreadCount, 8);
});

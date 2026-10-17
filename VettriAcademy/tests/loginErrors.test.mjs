import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as mobile from '../src/utils/loginErrors.js';
import * as web from '../../client/src/utils/loginErrors.js';

for (const [name, helpers] of [['mobile', mobile], ['website', web]]) {
  test(`${name} preserves wrong-password/unregistered/account-status messages`, () => {
    for (const message of ['Incorrect password. Please try again or use Forgot Password.', 'This phone number is not registered. Please contact the academy.', 'Account deactivated. Contact admin.', 'Your account is pending admin approval.']) {
      assert.equal(helpers.getLoginErrorMessage({ response: { status: 400, data: { message } } }), message);
    }
    assert.match(helpers.getLoginErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' }), /Cannot reach the server/);
    assert.match(helpers.getLoginErrorMessage({ code: 'ECONNABORTED', request: {} }), /taking too long/);
    assert.match(helpers.getLoginErrorMessage({ response: { status: 503, data: { message: 'internal DB error' } } }), /temporarily unavailable/);
    assert.match(helpers.getLoginErrorMessage({ response: { status: 429 } }), /Too many/);
  });
}

test('both actual Axios interceptors preserve login 401 errors without attempting session refresh', async () => {
  for (const file of ['../src/services/api.js', '../../client/src/services/api.js']) {
    let rejected;
    let refreshes = 0;
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
      .replace(/^import .*;\r?\n/gm, '').replace(/^export default api;?\r?$/gm, '').replaceAll('export const ', 'const ');
    const axios = { create: () => ({ interceptors: { request: { use() {} }, response: { use(success, failure) { rejected = failure; } } } }), post: async () => { refreshes++; throw Error('refresh must not run'); } };
    vm.runInNewContext(source, { axios, Platform: { OS: 'android' }, API_BASE_URL: 'https://example.test/api', isLoginRequest: mobile.isLoginRequest });
    for (const url of ['/auth/login', '/auth/login/student', '/auth/login/teacher', '/auth/login/admin', 'https://example.test/api/auth/login/student?source=test']) {
      const original = { config: { url }, response: { status: 401, data: { message: 'Incorrect password' } } };
      await assert.rejects(rejected(original), (error) => error === original);
    }
    assert.equal(refreshes, 0);
  }
});

test('protected API URLs still qualify for normal session refresh', () => {
  for (const url of ['/auth/me', '/student/dashboard', '/admin/students', '/auth/refresh']) {
    assert.equal(mobile.isLoginRequest(url), false);
    assert.equal(web.isLoginRequest(url), false);
  }
});

function loginThunk(dependencies = {}) {
  const source = fs.readFileSync(new URL('../src/redux/slices/authSlice.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export default authSlice.reducer;?\r?$/gm, '').replaceAll('export const ', 'const ');
  const context = vm.createContext({
    createAsyncThunk: (name, callback) => callback,
    createSlice: () => ({ actions: {}, reducer: {} }), REHYDRATE: 'rehydrate',
    getLoginErrorMessage: mobile.getLoginErrorMessage,
    loginAPI: async () => ({ data: { success: true, token: 'token', user: { _id: 'user', role: 'student' } } }),
    setToken: async () => {}, setRefreshToken: async () => {}, setUserData: async () => {}, connectSocket() {},
    ...dependencies,
  });
  vm.runInContext(source + '\nglobalThis.loginHandler = loginUser;', context);
  return () => context.loginHandler({ identifier: '9876543210', password: 'wrong' }, { rejectWithValue: (message) => ({ rejected: message }) });
}

test('the real login thunk returns credential errors unchanged and labels local storage failures separately', async () => {
  const failed = loginThunk({ loginAPI: async () => { throw { response: { status: 400, data: { message: 'Incorrect password' } } }; } });
  assert.equal((await failed()).rejected, 'Incorrect password');
  const storageFailure = loginThunk({ setToken: async () => { throw Error('disk unavailable'); } });
  assert.match((await storageFailure()).rejected, /device could not save your session/);
});

test('a realtime socket failure does not turn successful credentials into a network error', async () => {
  const run = loginThunk({ connectSocket() { throw Error('socket offline'); } });
  const result = await run();
  assert.equal(result.success, true);
  assert.equal(result.user._id, 'user');
});

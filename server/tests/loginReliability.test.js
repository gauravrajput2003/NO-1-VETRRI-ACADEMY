const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { buildLoginLookup } = require('../utils/loginLookup');

function load(file, dependencies, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module, exports: module.exports,
    require: (name) => dependencies[name] || {},
    process: { env }, console: { error() {} }, Date,
  });
  return module.exports;
}

function loginHarness({ storedMobile = '+91 98765 43210', passwordMatches = true, missing = false, duplicate = false, active = true, approved = true, role = 'student' } = {}) {
  const calls = { saved: 0, passwordChecks: 0, fallback: 0, tokens: 0 };
  const user = {
    _id: 'user-1', name: 'Test User', role, isActive: active, isApproved: approved,
    firstLogin: true, profilePic: 'avatar',
    matchPassword: async () => { calls.passwordChecks++; return passwordMatches; },
    save: async () => { calls.saved++; },
  };
  const model = {
    findOne(query) {
      calls.exactQuery = query;
      const found = !missing && (query.email === 'user@example.test' || query.$or?.some((condition) => condition.mobile === storedMobile));
      return { maxTimeMS: async (ms) => { assert.equal(ms, 8000); return found ? user : null; } };
    },
    find(query) {
      calls.fallback++;
      calls.formattedQuery = query;
      const matches = !missing && query.mobile.test(storedMobile) ? [user] : [];
      if (matches.length && duplicate) matches.push({ ...user, _id: 'user-2' });
      return { limit(value) { assert.equal(value, 2); return this; }, maxTimeMS: async () => matches };
    },
  };
  const { login } = load('controllers/authController.js', {
    '../models/User': model, '../utils/loginLookup': { buildLoginLookup },
    '../utils/generateToken': {
      generateToken: () => { calls.tokens++; return 'access-token'; },
      generateRefreshToken: () => 'refresh-token', setCookieToken() {},
    },
  });
  return {
    calls, user,
    async run(identifier = '9876543210', password = 'test-password', requestedRole = role) {
      const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await login({ params: { role: requestedRole }, body: { identifier, password } }, response);
      return response;
    },
  };
}

test('legacy phone lookup accepts country codes, split groups and common separators', () => {
  const { formattedQuery } = buildLoginLookup('9876543210', 'student');
  for (const value of ['9876543210', '+919876543210', '+91 98765 43210', '+91-98765-43210', '91 98765 43210', '(98765) 43210', '09876543210']) {
    assert.equal(formattedQuery.mobile.test(value), true, value);
  }
  for (const value of ['79876543210', '987654321099', '+44 9876543210', '9876543211']) assert.equal(formattedQuery.mobile.test(value), false, value);
  assert.equal(formattedQuery.role, 'student');
});

test('formatted phone login succeeds without changing the account phone number or password', async () => {
  const h = loginHarness();
  const response = await h.run();
  assert.equal(response.code, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user._id, 'user-1');
  assert.equal(h.calls.fallback, 1);
  assert.equal(h.calls.passwordChecks, 1);
  assert.equal(h.calls.saved, 1);
  assert.equal(h.calls.formattedQuery.role, 'student');
  assert.equal(h.user.password, undefined);
  assert.equal(h.user.mobile, undefined);
});

test('existing exact phone and case-insensitive email login keep their fast path', async () => {
  for (const identifier of ['9876543210', ' USER@EXAMPLE.TEST ']) {
    const h = loginHarness({ storedMobile: '9876543210' });
    assert.equal((await h.run(identifier)).code, 200);
    assert.equal(h.calls.fallback, 0);
  }
});

test('wrong password and missing accounts return a form error, not session-refresh HTTP 401', async () => {
  for (const options of [{ passwordMatches: false }, { missing: true }]) {
    const h = loginHarness(options);
    const response = await h.run();
    assert.equal(response.code, 400);
    assert.match(response.body.message, /incorrect/);
    assert.equal(h.calls.saved, 0);
    assert.equal(h.calls.tokens, 0);
  }
});

test('ambiguous formatted numbers require email instead of choosing another student', async () => {
  const h = loginHarness({ duplicate: true });
  const response = await h.run();
  assert.equal(response.code, 400);
  assert.match(response.body.message, /registered email/);
  assert.equal(h.calls.passwordChecks, 0);
  assert.equal(h.calls.saved, 0);
});

test('inactive accounts, pending teachers and invalid password types remain rejected', async () => {
  assert.equal((await loginHarness({ active: false }).run()).code, 403);
  assert.equal((await loginHarness({ role: 'teacher', approved: false }).run()).code, 403);
  const h = loginHarness();
  assert.equal((await h.run('9876543210', { invalid: true })).code, 400);
  assert.equal(h.calls.passwordChecks, 0);
});

function limiterOptions() {
  return load('middleware/rateLimiter.js', {
    'express-rate-limit': (options) => options,
    'node:crypto': require('node:crypto'),
    '../utils/loginLookup': { buildLoginLookup },
    jsonwebtoken: { verify: (token) => { if (token === 'invalid') throw new Error('bad signature'); return { id: token }; } },
  }, { JWT_SECRET: 'test-only-secret' });
}

test('parents sharing an IP have separate failure counters, but alternate spellings share the same account counter', () => {
  const { authLimiter } = limiterOptions();
  const request = (identifier) => ({ body: { identifier }, ip: '192.0.2.1' });
  const key = authLimiter.keyGenerator(request('9876543210'));
  assert.notEqual(key, authLimiter.keyGenerator(request('8765432109')));
  assert.equal(key, authLimiter.keyGenerator(request('+91 98765 43210')));
  assert.equal(authLimiter.skipSuccessfulRequests, true);
  assert.equal(authLimiter.max, 10);
});

test('email rate keys normalize case and never contain the raw identifier', () => {
  const { authLimiter } = limiterOptions();
  const key = (identifier) => authLimiter.keyGenerator({ body: { identifier }, ip: '192.0.2.1' });
  assert.equal(key(' USER@EXAMPLE.TEST '), key('user@example.test'));
  assert.equal(key('user@example.test').includes('user@example.test'), false);
});

test('the general limiter recognizes verified users before route authentication and rejects forged identities', () => {
  const { generalLimiter } = limiterOptions();
  const request = (token) => ({ headers: { authorization: `Bearer ${token}` }, ip: '192.0.2.1' });
  assert.equal(generalLimiter.limit(request('user-1')), 300);
  assert.notEqual(generalLimiter.keyGenerator(request('user-1')), generalLimiter.keyGenerator(request('user-2')));
  assert.equal(generalLimiter.limit(request('invalid')), 100);
  assert.equal(generalLimiter.keyGenerator(request('invalid')), 'ip:192.0.2.1');
});

test('login uses its dedicated limiter; other protected routes retain general throttling', () => {
  const { generalLimiter } = limiterOptions();
  for (const route of ['/api/auth/login', '/api/auth/login/student', '/api/auth/login/teacher', '/api/auth/login/admin']) assert.equal(generalLimiter.skip({ path: route }), true);
  assert.equal(generalLimiter.skip({ path: '/api/student/dashboard' }), false);
  assert.equal(generalLimiter.skip({ path: '/api/auth/register' }), false);
});

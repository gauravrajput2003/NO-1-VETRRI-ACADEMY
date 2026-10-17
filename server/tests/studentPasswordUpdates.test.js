const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const User = require('../models/User');
const { normalizeLoginMobile } = require('../utils/studentCredentials');
const { buildLoginLookup } = require('../utils/loginLookup');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

function harness({ targetRole = 'student', role = targetRole, duplicate = false } = {}) {
  const student = new User({ name: 'Test Student', mobile: '+91 98765 43210', email: 'student@example.test', password: 'Initial123', role, grade: '10th', refreshToken: 'old-refresh-token' });
  let saved = 0;
  student.populate = async () => student;
  student.save = async () => {
    // Execute the real User validation + bcrypt pre-save hooks, without a live DB.
    await new Promise((resolve, reject) => User.schema.s.hooks.execPre('save', student, [], (error) => error ? reject(error) : resolve()));
    saved++;
    student.$__reset();
    student.isNew = false;
  };
  const dependencies = {
    mongoose: require('mongoose'),
    '../models/User': { findOne: async (query) => query.role === targetRole ? (role === targetRole ? student : null) : duplicate ? { _id: 'other' } : null },
    '../utils/studentCredentials': { normalizeLoginMobile }, '../utils/loginLookup': { buildLoginLookup },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controllers/adminController.js'), 'utf8'), {
    module, exports: module.exports, require: (key) => dependencies[key] || {}, Buffer, Date, console,
  });
  const update = async (body) => {
    const res = response(); await module.exports[targetRole === 'teacher' ? 'updateTeacher' : 'updateStudent']({ body, params: { id: String(student._id) } }, res); return res;
  };
  return { student, update, saved: () => saved };
}

test('an admin can correct a student password repeatedly without recreating the account', async () => {
  const f = harness();
  const originalId = String(f.student._id);
  await f.student.save();
  for (const [next, previous] of [['  Correct123  ', 'Initial123'], ['Correct124', 'Correct123']]) {
    const res = await f.update({ password: next });
    assert.equal(res.code, 200);
    assert.equal(res.body.passwordUpdated, true);
    assert.equal(String(res.body.student._id), originalId);
    assert.equal(res.body.student.grade, '10th');
    assert.equal(res.body.student.password, undefined);
    assert.equal(res.body.student.refreshToken, undefined);
    assert.equal(await f.student.matchPassword(next.trim()), true);
    assert.equal(await f.student.matchPassword(previous), false);
    assert.notEqual(f.student.password, next.trim());
    assert.equal(f.student.refreshToken, '');
  }
});

test('blank or omitted passwords keep the existing hash, refresh session and teacher assignment', async () => {
  const f = harness(); await f.student.save();
  const hash = f.student.password;
  f.student.assignedTeachers = [f.student._id];
  await f.student.save();
  for (const body of [{ grade: '11th' }, { password: '' }, { password: '   ' }]) {
    const res = await f.update(body);
    assert.equal(res.code, 200);
    assert.equal(res.body.passwordUpdated, false);
    assert.equal(f.student.password, hash);
    assert.equal(f.student.refreshToken, 'old-refresh-token');
    assert.equal(String(f.student.assignedTeachers[0]), String(f.student._id));
    assert.equal(await f.student.matchPassword('Initial123'), true);
  }
});

test('short, non-text and overlong passwords are rejected before any save', async () => {
  for (const password of ['12345', 123456, {}, 'a'.repeat(73), '😀'.repeat(19)]) {
    const f = harness(), res = await f.update({ password });
    assert.equal(res.code, 400);
    assert.equal(f.saved(), 0);
  }
});

test('student editing cannot reset a teacher or admin account', async () => {
  for (const role of ['teacher', 'admin']) {
    const f = harness({ role }), res = await f.update({ password: 'Correct123' });
    assert.equal(res.code, 404);
    assert.equal(f.saved(), 0);
  }
});

test('phone/name/email edits save and copied phone numbers match login lookup', async () => {
  const f = harness();
  const res = await f.update({ name: '  Updated Student  ', mobile: '+91 (87654) 32109', email: ' UPDATED@EXAMPLE.TEST ' });
  assert.equal(res.code, 200);
  assert.equal(res.body.student.mobile, '8765432109');
  assert.equal(res.body.student.name, 'Updated Student');
  assert.equal(res.body.student.email, 'updated@example.test');
  assert.equal(buildLoginLookup(res.body.student.mobile, 'student').formattedQuery.mobile.test('+91 87654 32109'), true);
});

test('another account using a formatted version of the number prevents reassignment', async () => {
  const f = harness({ duplicate: true });
  const res = await f.update({ mobile: '8765432109', password: 'Correct123' });
  assert.equal(res.code, 409);
  assert.equal(f.saved(), 0);
});

test('unchanged legacy phone formatting does not block a password correction', async () => {
  const f = harness({ duplicate: true });
  const res = await f.update({ mobile: '9876543210', password: 'Correct123' });
  assert.equal(res.code, 200);
  assert.equal(res.body.student.mobile, '+91 98765 43210');
});

test('teacher passwords can be corrected repeatedly with the same account and profile', async () => {
  const f = harness({ targetRole: 'teacher' });
  f.student.qualification = 'M.Sc';
  f.student.isApproved = false;
  await f.student.save();
  const originalId = String(f.student._id);
  for (const [password, previous] of [[' Teacher123 ', 'Initial123'], ['Teacher124', 'Teacher123']]) {
    const res = await f.update({ password });
    assert.equal(res.code, 200);
    assert.equal(res.body.passwordUpdated, true);
    assert.equal(String(res.body.teacher._id), originalId);
    assert.equal(res.body.teacher.qualification, 'M.Sc');
    assert.equal(res.body.teacher.isApproved, false);
    assert.equal(res.body.teacher.password, undefined);
    assert.equal(res.body.teacher.refreshToken, undefined);
    assert.equal(await f.student.matchPassword(password.trim()), true);
    assert.equal(await f.student.matchPassword(previous), false);
    assert.equal(f.student.refreshToken, '');
  }
});

test('teacher blank passwords preserve the existing hash and session', async () => {
  const f = harness({ targetRole: 'teacher' }); await f.student.save();
  const hash = f.student.password;
  for (const body of [{ teacherBio: 'Updated biography' }, { password: '' }, { password: '  ' }]) {
    const res = await f.update(body);
    assert.equal(res.code, 200);
    assert.equal(res.body.passwordUpdated, false);
    assert.equal(f.student.password, hash);
    assert.equal(f.student.refreshToken, 'old-refresh-token');
  }
});

test('teacher password validation rejects invalid replacements without saving', async () => {
  for (const password of ['12345', {}, 123456, 'a'.repeat(73), '😀'.repeat(19)]) {
    const f = harness({ targetRole: 'teacher' }), res = await f.update({ password });
    assert.equal(res.code, 400);
    assert.equal(f.saved(), 0);
  }
});

test('teacher edits cannot reset student/admin passwords and phone conflicts are rejected', async () => {
  for (const role of ['student', 'admin']) {
    const f = harness({ targetRole: 'teacher', role }), res = await f.update({ password: 'Teacher123' });
    assert.equal(res.code, 404);
    assert.equal(f.saved(), 0);
  }
  const f = harness({ targetRole: 'teacher', duplicate: true });
  assert.equal((await f.update({ mobile: '8765432109', password: 'Teacher123' })).code, 409);
  assert.equal(f.saved(), 0);
});

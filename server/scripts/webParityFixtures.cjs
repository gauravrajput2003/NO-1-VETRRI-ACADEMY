// Creates explicitly labelled, isolated fixtures in the existing app database.
// Credentials stay in the OS temp directory; they must never be committed.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const file = path.join(require('node:os').tmpdir(), 'vettri-web-parity-fixtures.json');

(async () => {
  if (fs.existsSync(file)) throw new Error('An acceptance fixture file already exists; clean that run before creating another.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const User = require('../models/User');
  const run = crypto.randomBytes(5).toString('hex');
  const grade = `WEB_PARITY_${run}`;
  const records = { run, grade, accounts: {} };
  for (const role of ['admin', 'teacher', 'student', 'outsider']) {
    const password = `Parity!${crypto.randomBytes(12).toString('hex')}`;
    let mobile;
    do { mobile = `9${crypto.randomInt(100000000, 999999999)}`; } while (await User.exists({ mobile }));
    const user = await User.create({ name: `[WEB PARITY TEST ${run}] ${role}`, email: `web-parity-${run}-${role}@example.invalid`,
      mobile, password, role: role === 'outsider' ? 'student' : role, grade: role === 'outsider' ? `${grade}_OTHER` : grade, board: 'CBSE',
      isActive: true, isApproved: true, firstLogin: false, admissionFormFilled: true,
      ...(role === 'student' ? { assignedTeachers: [records.accounts.teacher.id] } : {}),
    });
    records.accounts[role] = { id: String(user._id), identifier: user.email, password };
  }
  await require('../models/LibraryAccess').create({ teacher: records.accounts.teacher.id, approved: true, approvedBy: records.accounts.admin.id });
  fs.writeFileSync(file, JSON.stringify(records), { mode: 0o600 });
  console.log(`Test fixture file: ${file}`);
  console.log('Created four labelled test accounts; no existing account was changed.');
  await mongoose.disconnect();
})().catch(async (error) => { console.error('Fixture setup failed:', error.name); await mongoose.disconnect(); process.exitCode = 1; });

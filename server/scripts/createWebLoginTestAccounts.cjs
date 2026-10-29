// Dedicated test accounts for the owner to use in either mobile or browser.
// No existing account or password is modified. Credentials stay outside Git.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const file = path.join(require('node:os').tmpdir(), 'vettri-web-login-test-accounts.json');

(async () => {
  if (fs.existsSync(file)) { console.log(`Test credentials already saved at ${file}`); return; }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require('../models/User');
  const run = crypto.randomBytes(4).toString('hex');
  const accounts = {};
  for (const role of ['teacher', 'student']) {
    const password = `Web${role === 'teacher' ? 'Teacher' : 'Student'}!${crypto.randomBytes(5).toString('hex')}`;
    let mobile;
    do { mobile = `9${crypto.randomInt(100000000, 999999999)}`; } while (await User.exists({ mobile }));
    const email = `web-test-${role}-${run}@example.invalid`;
    const user = await User.create({ name: `[WEB LOGIN TEST ${run}] ${role}`, email, mobile, password,
      role, grade: `WEB_LOGIN_TEST_${run}`, board: 'CBSE', isActive: true, isApproved: true,
      firstLogin: false, admissionFormFilled: true,
      ...(role === 'student' ? { assignedTeachers: [accounts.teacher.id] } : {}),
    });
    accounts[role] = { id: String(user._id), email, password };
    fs.writeFileSync(file, JSON.stringify({ run, accounts }, null, 2), { mode: 0o600 });
  }
  const existing = await User.findOne({ email: 'teacher@gmail.com' }).select('role isActive isApproved').lean();
  console.log(JSON.stringify({ credentialsFile: file, existingScreenshotAccount: existing ? { role: existing.role, active: existing.isActive, approved: existing.isApproved } : 'not found in configured app database' }));
  await mongoose.disconnect();
})().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });

// Run from a trusted interactive terminal. Never pass passwords as CLI arguments.
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('node:readline');
const { Writable } = require('node:stream');
const User = require('../models/User');
const { buildLoginLookup } = require('../utils/loginLookup');
const { validNewPassword } = require('../utils/passwordRecovery');

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Use a trusted interactive terminal for admin recovery.');
  if (process.argv.length !== 3) throw new Error('Usage: node server/scripts/reset-admin-password.js <admin-email-or-mobile>');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  let hidden = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk, encoding); callback(); } });
  const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
  const ask = prompt => new Promise(resolve => { process.stdout.write(prompt); hidden = true;
    rl.question('', value => { hidden = false; process.stdout.write('\n'); resolve(value); }); });
  try {
    let password = await ask('New admin password (input hidden): ');
    let confirmation = await ask('Confirm password (input hidden): ');
    if (!validNewPassword(password, confirmation, '')) throw new Error('Passwords must match and be 6–72 UTF-8 bytes.');
    await mongoose.connect(process.env.MONGO_URI);
    const lookup = buildLoginLookup(process.argv[2], 'admin');
    let admins = await User.find(lookup.exactQuery).limit(2);
    if (!admins.length && lookup.formattedQuery) admins = await User.find(lookup.formattedQuery).limit(2);
    if (admins.length !== 1 || !admins[0].isActive) throw new Error('An active, unambiguous admin account is required.');
    const admin = admins[0];
    admin.password = password;
    admin.mustChangePassword = true;
    admin.refreshToken = '';
    await admin.save();
    password = confirmation = '';
    console.log('Admin password updated. Sign in and set your final password.');
  } finally { rl.close(); await mongoose.disconnect(); }
}
main().catch(error => { console.error('Admin recovery failed:', error.name === 'Error' ? error.message : 'Check database access/configuration.'); process.exitCode = 1; });

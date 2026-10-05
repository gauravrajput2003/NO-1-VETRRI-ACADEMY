// Run from server/: node scripts/createReviewAdmin.js
// Set REVIEW_ADMIN_PASSWORD in the environment; credentials are never printed.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = 'google.review@gmail.com';
// Internal placeholder required by the User schema; email is the login identifier.
const mobile = 'google-play-review-admin';

async function main() {
  const password = process.env.REVIEW_ADMIN_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error('Set REVIEW_ADMIN_PASSWORD to a password of at least 6 characters.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must point to the app database.');
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const matches = await User.find({ $or: [{ email }, { mobile }] });
  if (matches.length) {
    if (matches.length !== 1) {
      throw new Error('Review identifiers belong to multiple accounts; no changes made.');
    }
    const existing = matches[0];
    if (existing.email !== email || existing.mobile !== mobile || existing.role !== 'admin') {
      throw new Error('A review identifier is already in use by a different account; no changes made.');
    }
    if (!existing.isActive || !(await existing.matchPassword(password))) {
      throw new Error('Review account already exists with different credentials or status; no changes made.');
    }
    console.log('Review admin already exists and password verification passed.');
    return;
  }

  const user = await User.create({
    name: 'Google Play Review Admin',
    displayName: 'Google Play Review Admin',
    email,
    mobile,
    password,
    role: 'admin',
    isActive: true,
    isApproved: true,
    firstLogin: false,
    institutionName: 'No.1 Vettri Academy',
  });
  const saved = await User.findById(user._id);
  if (!saved || saved.role !== 'admin' || !saved.isActive || !(await saved.matchPassword(password))) {
    throw new Error('Review admin verification failed.');
  }
  console.log('Review admin created; stored password hash and active admin role verified.');
}

main()
  .catch((error) => {
    // Avoid printing connection strings or authentication secrets from driver errors.
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoParseError' || error.name === 'MongoServerError') {
      console.error(`Database operation failed (${error.name}); check database access and configuration.`);
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

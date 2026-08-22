// Run once: node scripts/migrateAssignedTeachers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await User.updateMany(
    { assignedTeacher: { $exists: true, $ne: null } },
    [{ $set: { assignedTeachers: ['$assignedTeacher'] } }]
  );

  console.log(`Migrated ${result.modifiedCount} students.`);

  // Optional cleanup — only run after confirming the app works with assignedTeachers
  // await User.updateMany({}, { $unset: { assignedTeacher: '' } });

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
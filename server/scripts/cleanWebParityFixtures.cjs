require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs'), path = require('node:path'), mongoose = require('mongoose');
const directory = require('node:os').tmpdir();
const file = path.join(directory, 'vettri-web-parity-fixtures.json');
(async () => {
  const fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const ids = Object.values(fixture.accounts).map((account) => new mongoose.Types.ObjectId(account.id));
  const users = await require('../models/User').find({ _id: { $in: ids } });
  if (users.length !== ids.length || users.some((user) => !user.name.startsWith(`[WEB PARITY TEST ${fixture.run}]`))) throw new Error('Refusing to clean unverified test accounts');
  const collection = (name) => mongoose.connection.collection(name);
  const getIds = async (name, filter) => (await collection(name).find(filter, { projection: { _id: 1 } }).toArray()).map((record) => record._id);
  const classes = await getIds('classschedules', { teacherId: { $in: ids } });
  const doubts = await getIds('doubts', { studentId: { $in: ids } });
  const announcements = await getIds('announcements', { postedBy: { $in: ids } });
  const exams = await getIds('exams', { createdBy: { $in: ids } });
  const operations = [
    ['usersessions', { userId: { $in: ids } }], ['browserpushsubscriptions', { userId: { $in: ids } }], ['loginlogs', { userId: { $in: ids } }],
    ['classattendances', { $or: [{ studentId: { $in: ids } }, { classId: { $in: classes } }] }], ['livesessions', { classId: { $in: classes } }], ['classschedules', { _id: { $in: classes } }],
    ['pdfprogresses', { userId: { $in: ids } }], ['pdfbookmarks', { userId: { $in: ids } }], ['pdfnotes', { userId: { $in: ids } }], ['pdfanalytics', { studentId: { $in: ids } }],
    ['studymaterials', { teacher: { $in: ids } }], ['materialfolders', { createdBy: { $in: ids }, grade: fixture.grade }],
    ['examsubmissions', { exam: { $in: exams } }], ['examscores', { student: { $in: ids } }], ['exams', { _id: { $in: exams } }],
    ['salarytransactions', { teacherId: { $in: ids } }], ['feesrecords', { student: { $in: ids } }], ['leaveapplications', { applicant: { $in: ids } }],
    ['doubtreplies', { doubtId: { $in: doubts } }], ['doubtauditlogs', { doubtId: { $in: doubts } }], ['doubts', { _id: { $in: doubts } }],
    ['supporttickets', { userId: { $in: ids } }], ['chatmessages', { $or: [{ senderId: { $in: ids } }, { receiverId: { $in: ids } }] }], ['conversations', { participants: { $in: ids } }],
    ['notifications', { $or: [{ recipient: { $in: ids } }, { sender: { $in: ids } }] }], ['announcementreads', { $or: [{ userId: { $in: ids } }, { announcementId: { $in: announcements } }] }], ['announcements', { _id: { $in: announcements } }],
    ['trainingvideoprogresses', { teacherId: { $in: ids } }], ['trainingvideos', { uploadedBy: { $in: ids } }], ['libraryaccesses', { teacher: { $in: ids } }], ['teacherpermissions', { teacherId: { $in: ids } }],
  ];
  let deleted = 0;
  for (const [name, filter] of operations) deleted += (await collection(name).deleteMany(filter)).deletedCount;
  const cloudinary = require('../config/cloudinary'); let assets = 0;
  for (const asset of fixture.uploads || []) {
    if (!ids.some((id) => asset.publicId.startsWith(`vettri-academy/direct/${id}/`))) throw new Error('Refusing to delete an unverified storage asset');
    await cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.resourceType }); assets++;
  }
  deleted += (await collection('users').deleteMany({ _id: { $in: ids }, name: { $regex: `^\\[WEB PARITY TEST ${fixture.run}\\]` } })).deletedCount;
  await mongoose.disconnect();
  fs.unlinkSync(file);
  const pdf = path.join(directory, 'vettri-web-parity.pdf'); if (fs.existsSync(pdf)) fs.unlinkSync(pdf);
  const report = { date: new Date().toISOString(), run: fixture.run, removedFixtureRecords: deleted, cleanedStorageReferences: assets, credentialsRemoved: true };
  fs.writeFileSync(path.join(__dirname, '../../docs/WEB_PARITY_CLEANUP_RESULTS.json'), JSON.stringify(report, null, 2));
  console.log(`Removed ${deleted} fixture records and cleaned ${assets} test storage references. Existing accounts were not changed.`);
})().catch(async (error) => { console.error('Fixture cleanup failed:', error.message); await mongoose.disconnect(); process.exitCode = 1; });

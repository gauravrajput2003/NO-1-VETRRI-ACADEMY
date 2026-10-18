const cron = require('node-cron');
const Announcement = require('../models/Announcement');
const Read = require('../models/AnnouncementRead');
const { retentionCutoff } = require('../utils/announcementRetention');
let running = false;
async function purgeExpiredAnnouncements(now = new Date()) {
  if (running) return;
  running = true;
  try {
    // TTL also removes old announcements while the app server is asleep.
    await Announcement.deleteMany({ createdAt: { $lte: retentionCutoff(now) } });
    const orphanReads = await Read.aggregate([
      { $lookup: { from: Announcement.collection.name, localField: 'announcementId', foreignField: '_id', as: 'announcement' } },
      { $match: { announcement: { $size: 0 } } },
      { $limit: 1000 }, { $project: { _id: 1 } },
    ]);
    if (orphanReads.length) await Read.deleteMany({ _id: { $in: orphanReads.map(r => r._id) } });
  } finally { running = false; }
}
function startAnnouncementRetentionJob() {
  const run = () => purgeExpiredAnnouncements().catch(error => console.error('[Announcement retention]', error.message));
  cron.schedule('7 * * * *', run, { timezone: 'Asia/Kolkata' });
  run();
}
module.exports = { purgeExpiredAnnouncements, startAnnouncementRetentionJob };

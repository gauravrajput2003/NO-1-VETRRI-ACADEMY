const cron = require('node-cron');
const ClassSchedule = require('../models/ClassSchedule');
const Notification = require('../models/Notification');
const { sendBulkNotifications } = require('../services/notificationService');
let running = false;

// Class times are entered in India's local time, regardless of the host timezone.
function getClassStart(cls) {
  if (!/^\d{1,2}:\d{2}$/.test(String(cls.scheduledTime))) return null;
  const [hours, minutes] = cls.scheduledTime.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(cls.scheduledDate));
  return new Date(`${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:30`);
}

async function runClassReminderCycle(io, now = new Date()) {
  // Wide date bounds support both date-only and local-midnight records, including
  // classes just after midnight IST when the server is still on yesterday in UTC.
  const classes = await ClassSchedule.find({
    scheduledDate: { $gte: new Date(now.getTime() - 86400000), $lte: new Date(now.getTime() + 2 * 86400000) },
    status: 'scheduled',
  }).select('_id subject scheduledTime scheduledDate studentIds teacherId').lean();
  for (const cls of classes) {
    const start = getClassStart(cls);
    const minutes = start ? (start - now) / 60000 : NaN;
    // Catch up after a brief outage rather than missing a 60-second window.
    if (!(minutes > 0 && minutes <= 15)) continue;
    const recipientIds = [...new Set([...(cls.studentIds || []), cls.teacherId].filter(Boolean).map(String))];
    const reminderFor = start.toISOString();
    const alreadySent = await Notification.find({ type: 'class_starting', 'data.classId': cls._id, 'data.reminderFor': reminderFor })
      .select('recipient').lean();
    const sent = new Set(alreadySent.map((notification) => String(notification.recipient)));
    await sendBulkNotifications({
      recipientIds: recipientIds.filter((id) => !sent.has(id)), type: 'class_starting',
      title: `Class starts soon: ${cls.subject}`,
      message: `Your ${cls.subject} class starts at ${cls.scheduledTime} IST. Get ready!`,
      link: '/student/classes', referenceId: cls._id, referenceType: 'ClassSchedule',
      data: { classId: cls._id, reminderFor }, io,
    });
  }
}

function startClassReminderJob(io) {
  cron.schedule('* * * * *', async () => {
    if (running) return;
    running = true;
    try { await runClassReminderCycle(io); }
    catch (error) { console.error('[CRON][classReminder] Failed:', error.message); }
    finally { running = false; }
  });
}

module.exports = { startClassReminderJob, runClassReminderCycle, getClassStart };

const cron = require('node-cron');

const CRON_TIMEOUT_MS = 50000;
let isClassReminderRunning = false;
const classReminderStats = { runs: 0, skips: 0, errors: 0 };

function runWithTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cron job timed out')), timeoutMs);
    }),
  ]);
}

async function runClassReminderCycle(io) {
  const ClassSchedule = require('../models/ClassSchedule');
  const Notification = require('../models/Notification');

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const upcomingClasses = await ClassSchedule.find({
    scheduledDate: { $gte: todayStart, $lte: todayEnd },
    status: 'scheduled',
  })
    .select('_id subject scheduledTime scheduledDate studentIds course grade')
    .lean();

  for (const cls of upcomingClasses) {
    if (!cls?.scheduledTime || !Array.isArray(cls.studentIds) || cls.studentIds.length === 0) {
      continue;
    }

    const [hours, minutes] = String(cls.scheduledTime).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      continue;
    }

    const classDateTime = new Date(cls.scheduledDate);
    classDateTime.setHours(hours, minutes, 0, 0);
    const diffMinutes = (classDateTime - now) / 60000;

    if (diffMinutes >= 14.5 && diffMinutes <= 15.5) {
      const existingNotif = await Notification.findOne({
        type: 'class_starting',
        'data.classId': cls._id,
        createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) },
      })
        .select('_id')
        .lean();
      if (existingNotif) continue;

      const notifications = cls.studentIds.map((sid) => ({
        recipient: sid,
        type: 'class_starting',
        title: `Class starting in 15 min: ${cls.subject}`,
        message: `Your ${cls.subject} class starts at ${cls.scheduledTime}. Get ready!`,
        link: '/student/classes',
        data: { classId: cls._id },
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        const room = `course_${cls.course}_${cls.grade}`;
        io.to(room).emit('notification:new', {
          type: 'class_starting',
          title: `Class starting in 15 min: ${cls.subject}`,
          classId: cls._id,
        });
      }
    }
  }
}

const startClassReminderJob = (io) => {
  cron.schedule('* * * * *', () => {
    if (isClassReminderRunning) {
      classReminderStats.skips += 1;
      return;
    }
    isClassReminderRunning = true;

    setImmediate(async () => {
      classReminderStats.runs += 1;
      const start = Date.now();
      console.log('[CRON][classReminder] Job started at', new Date().toISOString());
      try {
        await runWithTimeout(() => runClassReminderCycle(io), CRON_TIMEOUT_MS);
        const duration = Date.now() - start;
        console.log(`[CRON][classReminder] Job completed in ${duration}ms (runs=${classReminderStats.runs}, skips=${classReminderStats.skips}, errors=${classReminderStats.errors})`);
        if (duration > 30000) {
          console.warn(`[CRON][classReminder] SLOW JOB WARNING: took ${duration}ms`);
        }
      } catch (error) {
        classReminderStats.errors += 1;
        console.error(`[CRON][classReminder] Failed or timed out: ${error.message} (runs=${classReminderStats.runs}, skips=${classReminderStats.skips}, errors=${classReminderStats.errors})`);
      } finally {
        isClassReminderRunning = false;
      }
    });
  });
};

module.exports = { startClassReminderJob, runClassReminderCycle };

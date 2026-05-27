const cron = require('node-cron');

// Run every minute — check for classes starting in 15 minutes
const startClassReminderJob = (io) => {
  cron.schedule('* * * * *', async () => {
    try { 
      const ClassSchedule = require('../models/ClassSchedule');
      const Notification = require('../models/Notification');

      const now = new Date();
      const in15min = new Date(now.getTime() + 15 * 60 * 1000);
      const in16min = new Date(now.getTime() + 16 * 60 * 1000);

      // Find classes starting in exactly 15 minutes (±30s window)
      const today = now.toISOString().split('T')[0];
      const todayStart = new Date(today);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59);

      const upcomingClasses = await ClassSchedule.find({
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        status: 'scheduled',
      });

      for (const cls of upcomingClasses) {
        // Parse scheduledTime "HH:MM" and combine with scheduledDate
        const [hours, minutes] = cls.scheduledTime.split(':').map(Number);
        const classDateTime = new Date(cls.scheduledDate);
        classDateTime.setHours(hours, minutes, 0, 0);

        const diff = classDateTime - now;
        const diffMinutes = diff / 60000;

        // Within 14.5–15.5 min window (fires once per class)
        if (diffMinutes >= 14.5 && diffMinutes <= 15.5) {
          // Check we haven't already notified (skip if recently emitted)
          const existingNotif = await Notification.findOne({
            type: 'class_starting',
            'data.classId': cls._id,
            createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) },
          });
          if (existingNotif) continue;

          // Create notifications for all enrolled students
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

            // Emit via Socket.io
            const room = `course_${cls.course}_${cls.grade}`;
            io.to(room).emit('notification:new', {
              type: 'class_starting',
              title: `Class starting in 15 min: ${cls.subject}`,
              classId: cls._id,
            });
          }
        }
      }
    } catch (error) {
      // Silent — don't spam logs for every-minute job errors
    }
  });
};

module.exports = { startClassReminderJob };

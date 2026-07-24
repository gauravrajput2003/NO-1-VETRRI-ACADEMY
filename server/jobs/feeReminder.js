const cron = require('node-cron');

const CRON_TIMEOUT_MS = 50000;
const BATCH_SIZE = 100;
let isFeeReminderRunning = false;
const feeReminderStats = { runs: 0, skips: 0, errors: 0 };
   
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function runWithTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cron job timed out')), timeoutMs);
    }),
  ]);
}

const getMonthContext = (date = new Date()) => {
  const year = date.getFullYear();
  const monthNumber = date.getMonth() + 1;
  const monthName = MONTH_NAMES[date.getMonth()];
  return {
    year,
    monthNumber,
    monthName,
    monthYear: `${monthName} ${year}`,
  };
};

const getDueDateForMonth = (year, monthNumber, dueDay) => {
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const day = Math.min(Math.max(Number(dueDay) || 1, 1), lastDay);
  const dueDate = new Date(year, monthNumber - 1, day);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate;
};

const shouldSendToday = (status, currentDay) => {
  if (status === 'paid') return currentDay >= 1 && currentDay <= 5;
  if (status === 'partial') return currentDay >= 1;
  return true;
};

const runFeeReminderCycle = async (io, options = {}) => {
  const { force = false } = options;
  const today = new Date();
  const currentDay = today.getDate();
  if (!force && (currentDay < 1 || currentDay > 5)) {
    return { notificationsSent: 0, paid: 0, pending: 0, overdue: 0, skipped: true };
  }

  const User = require('../models/User');
  const FeesRecord = require('../models/FeesRecord');
  const Notification = require('../models/Notification');
  const { sendPushNotifications } = require('../services/pushService');

  const context = getMonthContext(today);
  const records = await FeesRecord.find({ monthYear: context.monthYear }).lean();
  const recordsByStudentId = new Map(records.map((record) => [record.student.toString(), record]));

  const result = { notificationsSent: 0, paid: 0, pending: 0, overdue: 0 };
  const todayStamp = today.toISOString().slice(0, 10);

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const students = await User.find({ role: 'student', isActive: true })
      .select('name email mobile course grade feeAmount feeFrequency feeDueDate expoPushToken')
      .sort({ _id: 1 })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (students.length < BATCH_SIZE) {
      hasMore = false;
    }

    for (const student of students) {
      const record = recordsByStudentId.get(student._id.toString());
      const dueAmount = Number(record?.dueAmount || record?.amount || student.feeAmount || 0);
      if (dueAmount <= 0) continue;

      const paidAmount = Number(record?.paidAmount || 0);
      const dueDate = record?.dueDate || getDueDateForMonth(context.year, context.monthNumber, student.feeDueDate || 1);
      const remainingAmount = Math.max(dueAmount - paidAmount, 0);
      const status = record?.status || (remainingAmount === 0 ? 'paid' : paidAmount > 0 ? 'partial' : (today > dueDate ? 'overdue' : 'pending'));

      if (record && Array.isArray(record.notificationsSent) && record.notificationsSent.includes(todayStamp)) {
        continue;
      }
      if (!shouldSendToday(status, currentDay)) {
        continue;
      }

      let title = 'Fee Reminder';
      let message = `Your fee of Rs.${dueAmount} for ${context.monthYear} is due soon.`;
      let type = 'fee_reminder';

      if (status === 'paid') {
        title = 'Fee Payment Received';
        message = `Your fee payment of Rs.${paidAmount} for ${context.monthYear} has been recorded successfully.`;
        type = 'fee_paid';
        result.paid += 1;
      } else if (status === 'partial') {
        title = 'Partial Payment Reminder';
        message = `Rs.${paidAmount} has been received for ${context.monthYear}. Remaining balance: Rs.${remainingAmount}.`;
        type = 'fee_partial';
        result.pending += 1;
      } else if (status === 'overdue') {
        const overdueBy = Math.max(0, Math.ceil((today.getTime() - new Date(dueDate).getTime()) / 86400000));
        title = 'Overdue Payment Notice';
        message = `Your fee of Rs.${dueAmount} for ${context.monthYear} is now ${overdueBy} day(s) overdue.`;
        type = 'fee_overdue';
        result.overdue += 1;
      } else {
        result.pending += 1;
      }

      const notification = await Notification.create({
        recipient: student._id,
        type,
        title,
        message,
        link: '/student/fees',
        data: {
          monthYear: context.monthYear,
          dueAmount,
          paidAmount,
          remainingAmount,
          status,
        },
      });

      if (student.expoPushToken) {
        try {
          await sendPushNotifications([student.expoPushToken], {
            title,
            body: message,
            data: {
              type,
              ...(notification.data || {}),
              notificationId: notification._id.toString(),
            },
          });
        } catch (pushError) {
          console.error(`[CRON][feeReminder] Expo push failed for student ${student._id}: ${pushError.message}`);
        }
      }

      result.notificationsSent += 1;

      if (record) {
        const notificationsSent = Array.isArray(record.notificationsSent) ? record.notificationsSent : [];
        notificationsSent.push(todayStamp);
        const overdueBy = status === 'overdue'
          ? Math.max(0, Math.ceil((today.getTime() - new Date(dueDate).getTime()) / 86400000))
          : 0;

        await FeesRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              notificationsSent: [...new Set(notificationsSent)],
              overdueBy,
            },
          }
        );
      }

      io?.to(`user:${student._id}`).emit('notification:new', notification);
    }

    skip += BATCH_SIZE;
    if (hasMore) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  return result;
};

const startFeeReminderJob = (io) => {
  cron.schedule('0 3 * * *', () => {
    if (isFeeReminderRunning) {
      feeReminderStats.skips += 1;
      return;
    }
    isFeeReminderRunning = true;

    setImmediate(async () => {
      feeReminderStats.runs += 1;
      const start = Date.now();
      console.log('[CRON][feeReminder] Job started at', new Date().toISOString());
      try {
        await runWithTimeout(() => runFeeReminderCycle(io, { force: false }), CRON_TIMEOUT_MS);
        const duration = Date.now() - start;
        console.log(`[CRON][feeReminder] Job completed in ${duration}ms (runs=${feeReminderStats.runs}, skips=${feeReminderStats.skips}, errors=${feeReminderStats.errors})`);
        if (duration > 30000) {
          console.warn(`[CRON][feeReminder] SLOW JOB WARNING: took ${duration}ms`);
        }
      } catch (error) {
        feeReminderStats.errors += 1;
        console.error(`[CRON][feeReminder] Failed or timed out: ${error.message} (runs=${feeReminderStats.runs}, skips=${feeReminderStats.skips}, errors=${feeReminderStats.errors})`);
      } finally {
        isFeeReminderRunning = false;
      }
    });
  });
};

module.exports = { runFeeReminderCycle, startFeeReminderJob };

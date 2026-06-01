const cron = require('node-cron');

const CRON_TIMEOUT_MS = 50000;
let isWeeklyTopPerformerRunning = false;
const weeklyTopPerformerStats = { runs: 0, skips: 0, errors: 0 };

function runWithTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Cron job timed out')), timeoutMs);
    }),
  ]);
}

async function runWeeklyTopPerformerCycle() {
  const WeeklyTopPerformer = require('../models/WeeklyTopPerformer');
  const ClassAttendance = require('../models/ClassAttendance');
  const ClassSchedule = require('../models/ClassSchedule');
  const ExamScore = require('../models/ExamScore');
  const User = require('../models/User');

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  const students = await User.find({ role: 'student', isActive: true })
    .select('_id course grade')
    .lean();

  const groups = {};
  for (const student of students) {
    const key = `${student.course || 'general'}_${student.grade || 'all'}`;
    if (!groups[key]) {
      groups[key] = { course: student.course?.toString(), grade: student.grade, students: [] };
    }
    groups[key].students.push(student);
  }

  for (const group of Object.values(groups)) {
    if (!group.students.length) continue;

    const studentIds = group.students.map((s) => s._id);
    const studentIdSet = new Set(studentIds.map((id) => id.toString()));

    const scores = await ExamScore.find({
      student: { $in: studentIds },
      examDate: { $gte: weekStart, $lte: weekEnd },
      isPublished: true,
    })
      .select('student marksObtained maxMarks')
      .lean();

    const examStats = new Map();
    for (const score of scores) {
      const sid = String(score.student);
      const prev = examStats.get(sid) || { totalPercent: 0, count: 0 };
      prev.totalPercent += (Number(score.marksObtained || 0) / Math.max(1, Number(score.maxMarks || 0))) * 100;
      prev.count += 1;
      examStats.set(sid, prev);
    }

    const classes = await ClassSchedule.find({
      studentIds: { $in: studentIds },
      scheduledDate: { $gte: weekStart, $lte: weekEnd },
    })
      .select('_id studentIds')
      .lean();

    const classIds = classes.map((cls) => cls._id);
    const classCountByStudent = new Map();
    for (const cls of classes) {
      const ids = Array.isArray(cls.studentIds) ? cls.studentIds : [];
      for (const sid of ids) {
        const sidStr = String(sid);
        if (!studentIdSet.has(sidStr)) continue;
        classCountByStudent.set(sidStr, (classCountByStudent.get(sidStr) || 0) + 1);
      }
    }

    const attendedCounts = classIds.length > 0
      ? await ClassAttendance.aggregate([
          {
            $match: {
              studentId: { $in: studentIds },
              classId: { $in: classIds },
              status: { $in: ['present', 'late'] },
            },
          },
          {
            $group: {
              _id: '$studentId',
              attended: { $sum: 1 },
            },
          },
        ])
      : [];
    const attendedByStudent = new Map(attendedCounts.map((item) => [String(item._id), item.attended]));

    const rankings = group.students.map((student) => {
      const sid = String(student._id);
      const exam = examStats.get(sid);
      const examAvgPercent = exam && exam.count > 0 ? exam.totalPercent / exam.count : 0;
      const totalClasses = classCountByStudent.get(sid) || 0;
      const attended = attendedByStudent.get(sid) || 0;
      const attendancePercent = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
      const score = examAvgPercent * 0.6 + attendancePercent * 0.4;

      return {
        studentId: student._id,
        score,
        examAvgPercent,
        attendancePercent,
      };
    });

    rankings.sort((a, b) => b.score - a.score);
    const top3 = rankings.slice(0, 3).map((r, i) => ({ ...r, rank: i + 1, points: 3 - i }));

    await WeeklyTopPerformer.create({
      weekStart,
      weekEnd,
      course: group.course,
      grade: group.grade,
      rankings: top3,
      calculatedAt: new Date(),
    });

    await new Promise((resolve) => setImmediate(resolve));
  }
}

// Run every Monday at 6 AM IST (00:30 UTC)
const startWeeklyTopPerformerJob = () => {
  cron.schedule('30 0 * * 1', () => {
    if (isWeeklyTopPerformerRunning) {
      weeklyTopPerformerStats.skips += 1;
      return;
    }
    isWeeklyTopPerformerRunning = true;

    setImmediate(async () => {
      weeklyTopPerformerStats.runs += 1;
      const start = Date.now();
      console.log('[CRON][weeklyTopPerformer] Job started at', new Date().toISOString());
      try {
        await runWithTimeout(() => runWeeklyTopPerformerCycle(), CRON_TIMEOUT_MS);
        const duration = Date.now() - start;
        console.log(`[CRON][weeklyTopPerformer] Job completed in ${duration}ms (runs=${weeklyTopPerformerStats.runs}, skips=${weeklyTopPerformerStats.skips}, errors=${weeklyTopPerformerStats.errors})`);
        if (duration > 30000) {
          console.warn(`[CRON][weeklyTopPerformer] SLOW JOB WARNING: took ${duration}ms`);
        }
      } catch (error) {
        weeklyTopPerformerStats.errors += 1;
        console.error(`[CRON][weeklyTopPerformer] Failed or timed out: ${error.message} (runs=${weeklyTopPerformerStats.runs}, skips=${weeklyTopPerformerStats.skips}, errors=${weeklyTopPerformerStats.errors})`);
      } finally {
        isWeeklyTopPerformerRunning = false;
      }
    });
  });
};

module.exports = { startWeeklyTopPerformerJob, runWeeklyTopPerformerCycle };

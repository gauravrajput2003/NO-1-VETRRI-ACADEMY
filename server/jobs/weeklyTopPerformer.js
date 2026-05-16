const cron = require('node-cron');
const mongoose = require('mongoose');

// Run every Monday at 6 AM IST (00:30 UTC)
const startWeeklyTopPerformerJob = () => {
  cron.schedule('30 0 * * 1', async () => {
    try {   
      console.log('🏆 Running weekly top performer calculation...');
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

      const students = await User.find({ role: 'student', isActive: true });

      // Group students by course+grade
      const groups = {};
      for (const student of students) {
        const key = `${student.course || 'general'}_${student.grade || 'all'}`;
        if (!groups[key]) groups[key] = { course: student.course?.toString(), grade: student.grade, students: [] };
        groups[key].students.push(student);
      }

      for (const [key, group] of Object.entries(groups)) {
        const rankings = [];

        for (const student of group.students) {
          // Exam average for this week
          const scores = await ExamScore.find({
            student: student._id,
            examDate: { $gte: weekStart, $lte: weekEnd },
            isPublished: true,
          });
          const examAvgPercent = scores.length > 0
            ? scores.reduce((sum, s) => sum + (s.marksObtained / s.maxMarks) * 100, 0) / scores.length
            : 0;

          // Attendance % for this week
          const classes = await ClassSchedule.find({
            studentIds: student._id,
            scheduledDate: { $gte: weekStart, $lte: weekEnd },
          });
          const attended = await ClassAttendance.countDocuments({
            studentId: student._id,
            classId: { $in: classes.map((c) => c._id) },
            status: { $in: ['present', 'late'] },
          });
          const attendancePercent = classes.length > 0 ? (attended / classes.length) * 100 : 0;

          const score = examAvgPercent * 0.6 + attendancePercent * 0.4;

          rankings.push({ studentId: student._id, score, examAvgPercent, attendancePercent });
        }

        // Sort by score desc, take top 3
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
      }

      console.log('✅ Weekly top performers calculated.');
    } catch (error) {
      console.error('❌ Weekly top performer job error:', error.message);
    }
  });
};

module.exports = { startWeeklyTopPerformerJob };

const ClassSchedule = require('../models/ClassSchedule');
const { classStart } = require('../utils/academicDates');
const { id } = require('../utils/examAccess');
async function recordTeacherStart(cls, user, now = new Date()) {
  if (user.role !== 'teacher' || id(cls.teacherId) !== id(user)) return false;
  const planned = classStart(cls);
  if (!planned || +now < +planned - 30 * 60000 || +now > +planned + (cls.durationMinutes || 60) * 60000) return false;
  const result = await ClassSchedule.updateOne({ _id: cls._id, teacherStartedAt: { $exists: false } }, { $set: { teacherStartedAt: now } });
  return result.modifiedCount > 0;
}
module.exports = { recordTeacherStart };

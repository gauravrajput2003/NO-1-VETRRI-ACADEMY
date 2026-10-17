const id = (value) => String(value?._id || value || '');
function canManageExam(user, exam) { return user.role === 'admin' || (user.role === 'teacher' && id(exam.teacher) === id(user)); }
function canViewExam(user, exam) {
  return canManageExam(user, exam) || (user.role === 'student' && exam.status === 'published' && exam.studentIds.some((student) => id(student) === id(user)));
}
function studentExamView(exam, now = new Date()) {
  const { createdBy, paperSubmittedBy, studentIds, ...safe } = exam.toObject ? exam.toObject() : exam;
  if (now < new Date(exam.startsAt)) delete safe.paper;
  return safe;
}
module.exports = { id, canManageExam, canViewExam, studentExamView };

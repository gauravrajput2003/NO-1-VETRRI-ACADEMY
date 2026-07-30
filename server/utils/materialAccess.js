const isMaterialLockedForStudent = (material, studentId) => {
  return (
    material.lockedFor.includes(studentId) ||
    (material.lockedForAll && !material.unlockedFor.includes(studentId))
  );
};

const isMaterialAccessibleForStudent = (material, student) => {
  // Gate 1: Admin approval — material must be fully approved
  if (material.approvalStatus !== 'approved') {
    return { allowed: false, reason: 'not_approved_by_admin' };
  }

  // Gate 2: Teacher lock/unlock
  const teacherLocked = isMaterialLockedForStudent(material, student._id);
  if (teacherLocked) {
    return { allowed: false, reason: 'locked_by_teacher' };
  }

  // Gate 3: Grade match
  if (material.grade && material.grade !== 'all' && material.grade !== student.grade) {
    return { allowed: false, reason: 'grade_mismatch' };
  }

  return { allowed: true, reason: null };
};

module.exports = { isMaterialLockedForStudent, isMaterialAccessibleForStudent };

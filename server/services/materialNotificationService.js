const User = require('../models/User');
const { sendBulkNotifications } = require('./notificationService');

// Match the material listing's course/teacher/grade scope AND its access locks.
function materialRecipientFilter(material) {
  const scope = [{ assignedTeachers: material.teacher }];
  if (material.course) scope.push({ course: material.course });
  return {
    role: 'student', isActive: true,
    $or: scope,
    ...(material.grade && material.grade !== 'all' ? { grade: material.grade } : {}),
    _id: {
      $nin: material.lockedFor || [],
      ...(material.lockedForAll ? { $in: material.unlockedFor || [] } : {}),
    },
  };
}

async function notifyMaterialAvailable({ material, senderId, io }) {
  if (material.approvalStatus !== 'approved') return;
  try {
    const students = await User.find(materialRecipientFilter(material)).select('_id').lean();
    await sendBulkNotifications({
      recipientIds: students.map((student) => student._id), senderId,
      type: 'study_material', title: 'Study Material Available',
      message: `"${material.title}" (${material.subject}) is now available to study.`,
      link: '/student/materials', referenceId: material._id, referenceType: 'StudyMaterial',
      data: { materialId: String(material._id) }, io,
    });
  } catch (error) { console.error('[Material Notification] Failed:', error.name); }
}

module.exports = { notifyMaterialAvailable, materialRecipientFilter };

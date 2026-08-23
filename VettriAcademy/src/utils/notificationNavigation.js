
const STUDENT_ROUTES = {
  // Core Learning
  live_class: { screen: 'ClassDetail' },
  class_starting: { screen: 'ClassDetail' },
  class_reminder: { screen: 'ClassDetail' },
  recording_available: { screen: 'ClassDetail' },
  study_material: { screen: 'MaterialDetail' },
  new_material: { screen: 'MaterialDetail' },
  material_unlocked: { screen: 'MaterialDetail' },
  new_score: { screen: 'ExamScores' },
  general: { screen: 'ExamScores' }, // 'general' is used for new scores

  // Doubts
  doubt_created: { screen: 'DoubtDetail' },
  doubt_assigned: { screen: 'DoubtDetail' },
  doubt_reply: { screen: 'DoubtDetail' },
  doubt_status: { screen: 'DoubtDetail' },
  chat: { screen: 'DoubtDetail' }, // Legacy chat notifications

  // Administrative
  announcement: { screen: 'StudentDashboard' }, // Or a dedicated Announcements screen if one exists
  fee_reminder: { screen: 'Fees' },
  fee_paid: { screen: 'Fees' },
  fee_partial: { screen: 'Fees' },
  fee_overdue: { screen: 'Fees' },
  leave_approved: { screen: 'Leave' },
  leave_rejected: { screen: 'Leave' },
  leave_applied: { screen: 'Leave' },

  // Fallback
  default: { screen: 'StudentDashboard' },
};

const TEACHER_ROUTES = {
  // Core Teaching
  doubt_assigned: { screen: 'DoubtDetail' },
  doubt_reply: { screen: 'DoubtDetail' },
  doubt_status: { screen: 'DoubtDetail' },

  // Administrative
  general: { screen: 'TeacherMaterials' }, // For material approval/rejection
  leave_approved: { screen: 'TeacherLeaves' },
  leave_rejected: { screen: 'TeacherLeaves' },
  leave_update: { screen: 'TeacherLeaves' },
  compensation_approved: { screen: 'TeacherLeaves' },
  compensation_completed: { screen: 'TeacherLeaves' },
  salary_paid: { screen: 'Salary' },

  // Fallback
  default: { screen: 'TeacherDashboard' },
};

const ADMIN_ROUTES = {
  // Approvals & Management
  study_material: { screen: 'AdminPendingApprovals' }, // Teacher uploaded/edited/deleted material
  leave_applied: { screen: 'AdminLeaves' },
  new_enquiry: { screen: 'Enquiries' },

  // Financial
  fee_reminder: { screen: 'FeeManagement' },
  fee_paid: { screen: 'FeeManagement' },
  fee_partial: { screen: 'FeeManagement' },
  fee_overdue: { screen: 'FeeManagement' },

  // Doubts
  doubt_created: { screen: 'DoubtDetail' },
  doubt_assigned: { screen: 'DoubtDetail' },
  doubt_reply: { screen: 'DoubtDetail' },

  // General
  announcement: { screen: 'Announcements' },

  // Fallback
  default: { screen: 'AdminDashboard' },
};

const getParams = (notification) => {
  const data = notification.data || {};
  const referenceId = notification.referenceId || data.referenceId || data.classId;
  if (!referenceId) return {};
  const type = notification.type || '';

  if (type.startsWith('doubt') || type === 'chat') {
    return { doubtId: referenceId };
  }
  if (type.includes('material')) {
    return { materialId: referenceId };
  }
  if (type.includes('class') || type.includes('recording')) {
    return { classId: referenceId };
  }
  // Add other param mappings as needed
  return { id: referenceId };
};

export const resolveNotificationTarget = (notification, role) => {
  // Push payloads put their fields inside `data`, while in-app notifications
  // keep them at the top level. Normalize both formats before routing.
  const normalized = { ...notification, ...(notification.data || {}) };
  const routeMap = {
    student: STUDENT_ROUTES,
    teacher: TEACHER_ROUTES,
    admin: ADMIN_ROUTES,
  }[role || 'student'];

  const target = routeMap[normalized.type] || routeMap.default;
  const params = getParams(normalized);

  if (__DEV__ && !routeMap[normalized.type]) {
    console.warn(
      `[Notification Navigation] No route found for role:'${role}' and type:'${normalized.type}'. Falling back to ${target.screen}.`
    );
  }

  return { ...target, params: { ...target.params, ...params } };
};

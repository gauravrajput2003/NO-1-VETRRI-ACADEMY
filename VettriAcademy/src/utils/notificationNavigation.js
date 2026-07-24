/**
 * Resolves a notification (push payload, socket notif, or list item)
 * into a React Navigation target.
 */
export function resolveNotificationTarget(notification) {
  const type = notification?.type || notification?.data?.type;
  const link = notification?.link || notification?.data?.link;
  const data = notification?.data || {};

  if (['doubt_created', 'doubt_assigned', 'doubt_reply', 'doubt_status'].includes(type)) {
    const doubtId = data.doubtId || data.doubt || data.doubt_id;
    return doubtId
      ? { screen: 'DoubtDetail', params: { doubtId: String(doubtId) } }
      : { screen: 'DoubtCenter' };
  }

  // Screen names must match navigator Stack.Screen `name` values.
  // Leave links map to `Leave` (both student & teacher navigators use that name).
  // `/student/dashboard` maps to `StudentDashboard` (not a bare `Dashboard` route).
  const linkMap = {
    '/student/leave': 'Leave',
    '/teacher/leave': 'Leave',
    '/student/materials': 'Materials',
    '/student/exam-scores': 'ExamScores',
    '/student/dashboard': 'StudentDashboard',
    '/student/fees': 'Fees',
    '/student/classes': 'Classes',
    '/teacher/salary': 'Salary',
    '/admin/leaves': 'AdminLeaves',
    '/admin/enquiries': 'Enquiries',
  };

  if (link && linkMap[link]) return { screen: linkMap[link], params: {} };
  return { screen: 'Notifications', params: {} };
}

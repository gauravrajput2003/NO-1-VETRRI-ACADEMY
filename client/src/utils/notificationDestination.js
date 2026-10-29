export function notificationDestination(link, role = 'student') {
  const aliases = { AdminQueries: '/admin/support', HelpCenter: `/${role}/support`, DoubtCenter: `/${role}/doubts`, DoubtDetail: `/${role}/doubts`, ExamManagement: `/${role}/exams`,
    '/admin/materials/pending': '/admin/material-review', '/admin/leaves': '/admin/leave', '/student/exam-scores': '/student/progress' };
  const path = aliases[link] || link;
  return typeof path === 'string' && path.startsWith(`/${role}/`) && !path.includes('\\') ? path : `/${role}/dashboard`;
}

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const resolveSource = (base, reference) => ['', '.jsx', '.js'].map((extension) => path.resolve(path.dirname(base), reference + extension)).find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
const common = { ExamManagementScreen: 'exams', AcademicReportsScreen: 'teacher-performance', AnnouncementsInboxScreen: 'announcements',
  ChatRoomScreen: 'chat', AdminChatScreen: 'messages', DiscussScenarioScreen: 'doubts', DoubtThreadScreen: 'doubts', HelpCenterScreen: 'support', AdminQueriesScreen: 'support',
  NotificationsScreen: 'notifications', SettingsScreen: 'settings', ProfileScreen: 'profile', ForgotPasswordScreen: '/forgot-password',
  DownloadCenterScreen: 'downloads', NcertViewerScreen: 'downloads', DocumentViewerScreen: 'downloads', PdfViewerScreen: 'materials/pdf/:id',
  ClassDetailScreen: 'classes', MaterialsScreen: 'materials', MaterialDetailScreen: 'materials', BookmarkScreen: 'bookmarks', NotesScreen: 'notes',
  TopPerformersScreen: 'top-performers', StudentTrainingVideosScreen: 'training', StudentVideoPlayerScreen: 'training', TrainingVideosScreen: 'training', VideoPlayerScreen: 'training',
  DashboardScreen: 'dashboard', TeacherDashboard: 'dashboard', DashboardScreen3D: 'dashboard', LiveClassScreen: 'live-class', LiveMonitorScreen: 'live-monitor',
  GradesScreen: 'scores', TeacherMaterialsScreen: 'materials', StudentsScreen: 'students', LeaveScreen: 'leave', SalaryScreen: 'salary', ClassSchedulerScreen: 'schedule', PdfAnalyticsScreen: 'pdf-analytics',
  ClassesScreen: 'classes', AttendanceScreen: 'attendance', ExamScoresScreen: 'scores', FeeStatusScreen: 'fees',
  ManageStudentsScreen: 'students', ManageTeachersScreen: 'teachers', FeeManagementScreen: 'fees', StudentFeeHistoryScreen: 'fees', SalaryManagementScreen: 'salaries',
  AdminLeavesScreen: 'leave', AnnouncementsScreen: 'announcements', CourseManagementScreen: 'courses', EnquiriesScreen: 'enquiries',
  AdminMaterialsScreen: 'library', AdminPendingApprovalsScreen: 'material-review', LibraryAccessScreen: 'material-review', AdminTrainingVideosScreen: 'training',
  StudentMarksScreen: 'class-marks', MonthlyTopRankersScreen: 'class-marks', AdminClassOverviewScreen: 'classes', PasswordRequestsScreen: 'password-requests',
};
const entries = [];
for (const role of ['student', 'teacher', 'admin']) {
  const navigator = path.join(root, `VettriAcademy/src/navigation/${role[0].toUpperCase() + role.slice(1)}Navigator.jsx`);
  const source = fs.readFileSync(navigator, 'utf8');
  const imports = [...source.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)];
  for (const [, variable, reference] of imports) {
    if (!reference.includes('/screens/')) continue;
    const file = resolveSource(navigator, reference); if (!file) continue;
    const screen = path.basename(file).replace(/\.[^.]+$/, '');
    const text = fs.readFileSync(file, 'utf8');
    const routeNames = [...source.matchAll(new RegExp('<(?:Stack|Tab)\\.Screen[^>]*name="([^"]+)"[^>]*component=\\{' + variable + '\\}', 'g'))].map((match) => match[1]);
    const actions = [...new Set([...text.matchAll(/(?:const|function)\s+((?:handle|on|load|fetch|save|submit|create|update|delete|open|mark|send|download|upload|toggle|start|stop|export|apply|approve|reject|complete|cancel|refresh|confirm)\w*)\s*(?:=|\()/g)].map((match) => match[1]))];
    const dispatched = [...new Set([...text.matchAll(/dispatch\(\s*(\w+)\(/g)].map((match) => match[1]))];
    const dependencies = [...text.matchAll(/from\s+['"]([^'"]*(?:services|slices)[^'"]*)['"]/g)].map((match) => resolveSource(file, match[1])).filter(Boolean);
    const endpoints = [...new Set([text, ...dependencies.map((dependency) => fs.readFileSync(dependency, 'utf8'))].flatMap((body) => [...body.matchAll(/(?:api|apiClient)\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g)].map((match) => `${match[1].toUpperCase()} ${match[3]}`)))];
    let destination = common[screen] || common[variable] || 'UNMAPPED';
    if (role === 'admin' && screen === 'ClassSchedulerScreen') destination = 'classes';
    if (role === 'admin' && screen === 'ChatRoomScreen') destination = 'messages';
    if (screen === 'DashboardScreen') destination = 'dashboard';
    const route = destination.startsWith('/') ? destination : `/${role}/${destination}`;
    const dashboard = fs.readFileSync(path.join(root, `client/src/pages/${role}/Dashboard.jsx`), 'utf8');
    const relative = destination.split('/')[0];
    entries.push({ role, screen, source: path.relative(root, file).replaceAll('\\', '/'), mobileRoutes: routeNames, webRoute: route,
      routeRegistered: destination.startsWith('/') || dashboard.includes(`path="${relative}"`) || dashboard.includes(`path="${destination}"`), actions, dispatched,
      apiEvidence: endpoints, contractFiles: dependencies.map((dependency) => path.relative(root, dependency).replaceAll('\\', '/')),
      verification: 'Source inventoried; see acceptance report for executed interactions. Registration does not prove action parity.' });
  }
}
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/WEB_MOBILE_ACTION_INVENTORY.json'), JSON.stringify(entries, null, 2) + '\n');
let markdown = '# Mobile screen and action inventory\n\nGenerated from the role navigators and screen sources. Actions include named handlers and dispatched thunks. API evidence includes each screen’s imported API/slice modules and can contain endpoints used by other actions in that module. It is evidence for review, not a claim that every endpoint belongs to that screen.\n\n';
markdown += '| Role | Mobile screen | Browser route | Registered | Actions / dispatched operations |\n|---|---|---|---|---|\n';
for (const entry of entries) markdown += `| ${entry.role} | [${entry.screen}](../${entry.source}) | ${entry.webRoute} | ${entry.routeRegistered ? 'yes' : '**missing**'} | ${[...entry.actions, ...entry.dispatched].join(', ') || 'Inline navigation/display; inspect source'} |\n`;
markdown += '\nThe JSON companion contains mobile navigation aliases, source paths, API evidence and dependent contract files for each entry. Runtime results belong in WEB_APP_ACCEPTANCE_REPORT.md.\n';
fs.writeFileSync(path.join(root, 'docs/WEB_MOBILE_ACTION_INVENTORY.md'), markdown);
console.log(`${entries.length} screen/role entries inventoried; ${entries.filter((entry) => !entry.routeRegistered).length} routes still missing.`);

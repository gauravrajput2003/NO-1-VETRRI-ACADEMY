# Target design adoption — 29 October 2026

The user's third screenshot is the visual target. This delivery moves the actual authenticated application beyond the standalone Step 1 preview.

## Step 2: shared portal shell

Student, Teacher and Admin layouts now use the same teal sidebar, ivory workspace, identity topbar, original academy mark, role-specific navigation and responsive drawer. Existing route declarations and menu labels/hrefs were compared with Git and preserved exactly. The student notification badge state and admin socket-monitor subscription remain in their original dashboard components.

New shell styling is scoped to authenticated portals. A token-based compatibility layer makes existing dark page components readable while they receive individual shared-component migrations. This is not a claim that every remaining page has been individually rebuilt. Admin page search navigates existing menu destinations; it does not introduce a new backend search endpoint.

Files:

- Added `client/src/design-system/PortalShell.jsx` and `portal.css`.
- Updated `client/src/design-system/components.jsx` and `components.css` for real router links, topbar slots, split hero actions, shared layout utilities and compact notifications.
- Updated `client/src/pages/student/Dashboard.jsx`, `teacher/Dashboard.jsx`, `admin/Dashboard.jsx` to adopt the shell while retaining routes/state/effects. Mobile navigation labels/destinations are preserved; icons now use Lucide.
- Updated `client/src/components/NotificationBell.jsx` with academy/panel presentation variants using the existing notification APIs and handlers. Bell/panel read state stays synchronized.
- Updated `client/src/App.jsx` for ivory loading/session-error presentation, light toasts and the small white/gold install card. Authentication conditions, role routing and install callbacks are retained.

## Step 3: actual teacher dashboard

The teacher dashboard now has the target's dynamic welcome hero, classroom/scheduler links, pink training notice, linked white stat cards, a class/notifications split and the existing upcoming classes, student overview, scores and grading sections below. Real teacher data remains provided by the original `DashboardHome` fetch sequence; its calls/state assignments were compared with the original source and retained.

My Students now uses the shared light DataTable with search and pagination. The student-count link still opens `/teacher/students`; all records remain available. Missing courses show NA and no admission-status column is displayed.

The existing LiveClass handles scheduling status, meeting links, go-live/end, recording upload and attendance. Its presentation now uses warm tags, light cards, side-by-side completed-class controls and the shared accessible attendance modal. The embedded dashboard removes duplicate page headings, not class controls or data fetching.

Files:

- Added `client/src/pages/teacher/TeacherDashboardContent.jsx` as the presentation layer.
- Updated `client/src/pages/teacher/DashboardHome.jsx` to delegate rendering while keeping data fetching/state.
- Updated `client/src/pages/teacher/MyStudents.jsx` to use shared PageHeader/Avatar/DataTable.
- Updated `client/src/pages/teacher/LiveClass.jsx` for tags, embedded headings, attendance modal, action layout and removal of decorative emoji.
- Added screenshots and verification output under `docs/design-system/adoption/`.

## Validation and limits

- Production Vite build passed. Existing large-chunk and Browserslist warnings remain.
- Fourteen contrast checks and seven existing attendance-duration regression checks passed.
- Isolated Chrome checks exercised the actual React app with mocked API responses. They covered the student-count route, all 15 student rows via pagination, NA/missing-course presentation, removed admission column, search, existing recording/attendance controls, notification mark-all endpoint, mobile navigation and laptop overflow. Student/admin shell menu counts and admin page search were checked too.
- The screenshots use fixture data shaped like the supplied screenshot. They do not assert new live-database acceptance or change any production records. API requests in the browser test were fulfilled locally; sockets were blocked.
- No server files, login credentials, role permissions, API origin or API route definitions were changed for this visual adoption.

The user can view the real implementation at `/teacher/dashboard` and `/teacher/students` in their normal local app after refreshing. The `/design-system.html` page remains a separate sample-data component gallery. Student/Admin dashboards and the remaining individual pages still need their full page-by-page component migration in the original order of work; their shared shell is adopted here.

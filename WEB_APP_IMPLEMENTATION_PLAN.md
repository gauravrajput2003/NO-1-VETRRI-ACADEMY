# Vettri Academy: mobile and laptop web feature parity

Repository review: 23 October 2026. Scope: implementation plan only; no application source or production configuration changed.

## 1. Recommended approach

Complete the existing `client/` React web application. Keep `VettriAcademy/` as the React Native/Expo mobile frontend and `server/` as the shared Express backend. Both frontends must use the same MongoDB users, password hashes, roles, assignments, classes, materials and academic records.

No account migration, password reset campaign or second database is required to add web access. Existing student, teacher and admin credentials should work unchanged. Preserve the backend's identifier normalization, account approval and access rules. Parents can use their child's existing student account; the current User model has no parent role. A separate parent account linked to multiple children would be additional product scope.

Suggested URL structure: retain `https://no1vettriacademy.in/` as the public website and expose `/login/student`, `/login/teacher`, `/login/admin`, `/student/*`, `/teacher/*`, `/admin/*` from the same web build. Add a visible “Open Learning App” entry to the public website. A separate `app.` subdomain is an alternative if the current website hosting cannot serve this build, but is not required by the code.

```text
React Native app (VettriAcademy/) ----+
                                    +--> Express API + Socket.IO (server/)
React laptop web app (client/) ------+          |
                                               +--> Existing MongoDB
                                               +--> Existing Cloudinary / S3
                                               +--> Existing mobile push delivery
                                               +--> Browser push adapter (new)
```

Use the existing React 18, Vite, Tailwind, Axios and Socket.IO stack. Reuse the web components and pure business rules. Native screens need browser components for files, PDF reading, notifications and media. The mobile package already has `expo start --web`, but that is not evidence that every native screen works on laptops; completing the existing browser frontend is the proposed path.

## 2. What is already present

| Area | Repository evidence | Assessment |
|---|---|---|
| Web dashboards | `client/src/App.jsx`, `client/src/pages/{student,teacher,admin}/Dashboard.jsx` | Existing role-specific shells, navigation and pages; extend them. |
| Shared API | `client/src/config/apiOrigin.js`, `VettriAcademy/src/utils/constants.js` | Both default to `https://no-1-vetrri-academy.onrender.com`; confirm deployed environment overrides before release. |
| Shared login | `client/src/context/AuthContext.jsx`, `server/routes/authRoutes.js`, `server/models/User.js` | Web already calls `/api/auth/login/:role`; users/passwords remain in the existing backend. |
| Classes | Web student classes, teacher LiveClass and admin ClassScheduler pages | Reuse class listing, external meeting links, recordings and admin scheduling; validate current API contracts. |
| Materials | Web teacher StudyMaterials, student StudyMaterials and directUpload services | Basic upload/list/access exists; mobile has richer folders, review and reader workflows. |
| Academics | `client/src/pages/academic/{Exams,Reports}.jsx` | Existing exam/report implementation; validate parity with current mobile submission and marking flows. |
| Communication | Web chat pages, NotificationBell, AnnouncementBanner, admin Announcements | Existing components, with specific contract gaps below. |
| Other operations | Attendance, fees, leave, profiles, teacher training, users, permissions and enquiries pages | Existing implementation to verify and complete, not automatically production-ready. |
| Installable web shell | `client/public/{manifest.json,sw.js}`, `client/src/main.jsx` | Initial PWA setup and icon files exist; installation and cache behavior need repair. |

Presence of a file or route is not proof that the workflow works end to end. The matrix below is a source review baseline, not a completed acceptance audit.

## 3. Concrete gaps found in the current source

1. **Password recovery is disconnected and outdated.** `ForgotPassword.jsx`, `ResetPassword.jsx` and `FirstLoginSetup.jsx` are not registered in `App.jsx`. Forgot/reset pages call `/auth/password/forgot` and `/auth/password/reset/:token`, while the current backend uses `/auth/password-reset/request` and `/auth/password-reset/complete`. Use the current temporary-password flow documented in `server/PASSWORD_RECOVERY.md`; do not add a second recovery system.
2. **Forced password change is not handled in the web route guard.** `server/middleware/auth.js` restricts `mustChangePassword` users, but `ProtectedRoute` only checks login/role. The existing setup component updates `firstLogin` rather than completing the current forced-change/session flow. A password change invalidates older tokens; require sign-in again or use an explicitly supported renewed session.
3. **Simultaneous mobile and laptop sessions need backend work.** User stores one `refreshToken`; login replaces it and logout clears it. A second device can invalidate the first device's refresh path even while its access token still works. Add compatible multi-session refresh records and per-session logout. Current `onlineUsers` also maps one user to one socket; model multiple connections and only mark offline when the final connection closes.
4. **Chat payloads differ from the backend.** Teacher web chat sends `{ conversationId, content }` and attaches `conversationId` to file uploads. Current backend text sending uses `{ receiverId, message }`; file sending requires `receiverId`. Review student/admin clients too, plus message field names, pagination, unread counts, typing events and server broadcasts. Preserve the backend's messaging restrictions; the doubt module supplies its separate academic discussion flow.
5. **Teacher scheduling has no web route/page.** Backend `/classes/schedule` create/update/delete supports teachers and enforces ownership; mobile TeacherNavigator exposes ClassSchedulerScreen. Web teacher LiveClass handles existing classes but supplies no scheduler. Extract a role-aware scheduler from the admin implementation.
6. **Materials lack full review/reader parity.** Student web materials open a URL in a new tab; there is no web PDF reader, resume-reading, bookmarks, notes or teacher PDF analytics screen. Teacher web materials do not expose the mobile folder/edit/replacement workflow. Admin web routes lack dedicated material approvals and library-access management.
7. **Several mobile modules lack web routes.** Doubts, support tickets, Download Center/NCERT, student training, student top performers, teacher salary and admin salary/password requests need implementation or routing. Verify every reachable mobile action during the detailed inventory.
8. **Route definitions are duplicated.** `App.jsx` declares role children while dashboard components declare their own descendant `<Routes>` rather than rendering an `<Outlet>`. Some aliases differ, for example admin courses/admissions. Consolidate routing and navigation to avoid maintaining conflicting definitions.
9. **Socket identity/room membership needs server enforcement.** Current `server/index.js` accepts user IDs, roles and arbitrary room names from clients without a JWT handshake. Authenticate the socket, derive the user and authorize room membership. Coordinate with mobile so existing releases continue to work during rollout; do not make an uncoordinated mandatory-handshake change.
10. **PWA install state is not reactive.** `main.jsx` dispatches `pwa-ready`, but PWABanner reads globals with placeholder setters and no event subscription. The banner is student-only. Implement stateful installation for supported browsers and all roles; review portrait orientation and cache only deliberately selected public assets. Background web notifications are not implemented by the existing Expo push worker.
11. **Backend entry points diverge.** Root `package.json` starts root `index.js`, which references route/middleware paths absent at root and omits newer server wiring. `server/PASSWORD_RECOVERY.md` explicitly identifies `server/` as supported. Verify hosting root/start command; use `server/` and document or repair the root entry point before relying on it.

## 4. Feature parity backlog

| Feature group | Users | Web work / acceptance scope |
|---|---|---|
| Identity and onboarding | All | Same identifiers/passwords, role redirects, approval/deactivated states, profile/avatar, first login, forced change, recovery and logout. |
| Scheduling and classes | Teacher/admin/student | Teacher and admin create/edit/cancel, repeats/date ranges, assigned-student selection, filters/calendar, reminders, join/go-live/end, recordings, attendance and live monitoring. Teacher may change only permitted classes. |
| Material library | All by permission | Folders, upload progress, edit/replace/delete, approval/rejection, library permission approval/revocation, locks and per-student access. Reuse signed upload/download endpoints and backend checks. |
| Reading and downloads | Student/teacher/admin as allowed | In-app PDF reading, page resume, bookmarks, notes, reading analytics; browser download/preview for supported files, NCERT and Download Center. |
| Video learning | Students/teachers; admin manages | Assigned training, mandatory/incomplete state, watch position, completion, admin upload/URL/edit/status/order and progress matrix. |
| Exams and performance | All by role | Exam create/publish, student assets/submissions, teacher marking, scores, marks reports, teacher performance/grading and weekly/monthly rankings supported by the mobile workflows. |
| Attendance and leave | All by role | Class and login attendance, history/export, student/teacher leave, approvals and compensation workflow. |
| Chat and doubts | All by permission | Admin Desk messaging, files/media, unread/read/typing, permitted deletion; doubts create/reply/assign/status, attachments and admin retention/export. |
| Announcements and alerts | All; admin publishes | Media announcements, targeting, inbox/read state, notifications with correct browser destinations and reconnect resync. Browser recording where the mobile flow records voice/video. |
| Financial operations | Student/teacher/admin | Student fees/history/proofs where available; admin fee settings/payments/reminders; teacher salary/history/slip; admin salary configuration, processing, proofs, edits and reports. Match actual app actions. |
| Administration | Admin | Student/teacher create/edit/approve/deactivate/delete as supported, courses, permissions, enquiries/admissions/demo bookings, live monitor, library, password requests and support queue. |
| Support, settings and AI | All as supported | Ticket creation, attachments/history/detail; admin resolution; password/settings and existing Vettri AI flow. |

Create a tracked parity inventory before implementation: mobile navigator -> screen -> action -> API/payload -> permission -> web route -> acceptance check -> verified status. Include entry points inside screens, not just navigator names. Only mark complete after actual web/mobile verification.

## 5. Implementation order and deliverables

### Phase 1: baseline, identity and shared contracts

- Inventory mobile actions and existing web coverage. Audit the web API module and direct API calls against current server routes/controllers, including attendance logs, leaderboard and grading paths. Add a small contract reference for requests/responses and Socket.IO events.
- Confirm deployment uses `server/`, the same database/storage and expected API origin. Document public frontend environment variables in a safe example file; never copy backend secrets into Vite/Expo public variables.
- Consolidate routes into one protected tree with role layouts and `<Outlet>`, synchronized navigation and a useful role-specific 404.
- Complete login/refresh/logout handling, including one shared refresh operation for concurrent expired requests, transient network errors and role-appropriate session expiry. Keep AuthContext, request tokens and socket authentication synchronized.
- Implement multi-session refresh storage additively. Continue accepting valid legacy refresh tokens during migration, issue tracked sessions for new logins, preserve explicit logout-all and tokenVersion password invalidation. Test old installed mobile clients separately before replacing existing logout semantics.
- Wire the current recovery request/complete forms, admin Password Requests and forced-password-change screen. Browser-only recovery must work without an enrolled Android device through the existing admin-verified fallback; never equate knowing an identifier with account ownership.

Exit: existing test accounts sign in on phone and laptop, restore sessions, recover/change passwords correctly and cannot access other roles' data. The agreed multi-device logout behavior is verified.

### Phase 2: first usable laptop teaching and learning release

- Add teacher `/teacher/schedule`; reuse a shared scheduler with role-specific selection and controls. Preserve course, board, grade, subject, teacher/student assignment and the backend's date/recurrence semantics. Display academy times consistently in Asia/Kolkata.
- Validate external meeting creation/link entry, go-live, joining, ending, recordings and attendance. Compare the existing student class page with the backend join endpoint so joining performs the same tracking action as mobile.
- Complete teacher material upload, folders, replacements and permission/error states; add admin library approvals/material review; expose approved resources to the correct students.
- Repair chat HTTP and socket contracts, Admin Desk entry and file/media sending. Ensure messages persist once, reconnect correctly and appear on the other platform.
- Fix notifications/announcement destinations and state refresh after reconnect or returning to a tab.

Exit: a teacher schedules and starts a class on a laptop, a mobile student sees and joins it, a material uploaded from either platform becomes visible to the appropriate students after required approval, and communication works both ways.

### Phase 3: full mobile feature parity

- Implement integrated PDF reading, shared progress/bookmarks/notes and reading analytics using `/pdf/*`; use backend-authorized asset URLs. Handle expired URLs and browser popup/download behavior.
- Add Download Center/NCERT, student training/watch progress, doubts and support workflows.
- Complete salary, fee and reporting operations; confirm all supported exports/downloads and approval/compensation actions.
- Verify existing exams, attendance, leave, grading, rankings, admin user/course management, settings, profiles, AI and announcements against the mobile action inventory. Close every missing action; avoid treating visible dashboards as sufficient coverage.

Exit: every agreed mobile action has a working browser equivalent or a documented browser-specific behavior accepted for release.

### Phase 4: desktop UX, PWA, regression and production rollout

- Verify laptop navigation, keyboard use, readable tables, forms, previews, loading/empty/error states and upload retry/cancel behavior. Target 1366x768 and 1920x1080 first, plus tablet/mobile browser layouts.
- Split role/page bundles as warranted by the build output; keep the marketing scene from slowing entry to the learning dashboard.
- Repair installation and service-worker updates. Keep credentials, recovery data, authenticated API responses and protected learning assets out of general offline caches. Optional offline materials require explicit access, storage and logout/revocation design; the current shell cache is not full offline parity.
- Add browser push subscriptions, authenticated registration/removal endpoints, a backend web delivery adapter and service-worker push/click handling. Preserve existing Expo delivery. Test denied permissions, expiration, logout/shared laptops and deep links. Browser push uses service-worker subscriptions, as documented by [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
- Deploy to staging with isolated test data. Exercise Chrome and Edge on Windows, Safari on macOS where supported, and a supported Firefox version. Run mobile regressions on the currently released app and candidate app when backend changes are introduced.
- Configure production HTTPS, exact HTTP/Socket.IO CORS origins (including `www` or app subdomain if used), SPA deep-link fallback and storage CORS. `client/public/web.config` covers IIS-style rewrites only; validate the actual host. Verify `.in` DNS and serving behavior independently.
- Roll out compatible backend changes first, web next, then any coordinated mobile socket update. Maintain a known web build and backward-compatible backend rollback path; avoid irreversible schema removal during rollout.

Exit: acceptance checks pass, direct route refresh works on the deployed host, existing mobile releases still function, and monitoring can distinguish login, upload, class, chat and notification failures.

Phases 1-2 deliver the urgent laptop teaching/student access milestone. Phases 3-4 are required before claiming full parity. Estimate effort after the action inventory and staging audit; source-file counts alone are not a reliable schedule.

## 6. Proposed code organization

Keep existing `client/src/pages/` role grouping. Extract shared implementations rather than duplicating every page per role:

- `routes/`: one route registry, role guards/layouts and navigation metadata.
- `services/`: shared HTTP transport plus domain modules for auth, classes, materials/PDF, chat/doubts, finance, support and notifications. Keep browser file handling in adapters.
- `components/`: role-aware scheduler, material browser/upload form, PDF reader, media preview, reusable tables and attachment picker.
- `pages/student/`: training, downloads, bookmarks/notes, doubts, support, rankings and announcement/notification inboxes.
- `pages/teacher/`: scheduler, PDF analytics, salary, doubts/support and shared inboxes.
- `pages/admin/`: material review, library access, salary, password requests, support and doubt administration.
- `server/models/` and `server/services/`: additive session/browser-subscription records and shared delivery logic. Enforce permissions server-side.

Avoid a monorepo/package migration in the first milestone. Share or extract pure identifier/date/validation rules only where it reduces verified drift; do not import React Native screens into the Vite frontend.

## 7. Acceptance checks that prove one backend and two frontends

1. Same existing student, teacher and admin credentials work on both platforms; role and approval restrictions match. No duplicate accounts are created.
2. Keep phone and browser signed in through access-token expiry; both refresh successfully. Browser logout does not unexpectedly revoke mobile push enrollment or unrelated sessions. Logout-all and password change revoke the intended sessions.
3. Teacher creates/edits/cancels a permitted class on web; mobile sees correct local time, roster and status. A teacher cannot modify another teacher's class. Students join from either platform and attendance appears once as intended.
4. Upload PDF/PPT/image/video from each platform; approval, folder placement, locked/unlocked access, replacement, revocation and expired URLs behave consistently. Test denied library access and interrupted uploads.
5. Read a PDF on web, add a bookmark/note and resume on mobile; repeat in reverse. Analytics and permissions are correct.
6. Complete training/exam submissions on one platform and verify progress/results on the other. Validate late/closed exams, mandatory videos and grading/report access.
7. Send permitted chat text/files in both directions, verify read/unread and pagination, reconnect without duplicate messages, and validate recovery-message redaction. Test doubts separately from Admin Desk chat.
8. Exercise leave/compensation, attendance, fee and salary updates, proofs and exported reports using test records. Verify cross-platform results and denial for unrelated users.
9. Publish a targeted announcement, deliver an ordinary notification, click it on web and mobile and verify the right screen/read state. Test permission-denied and offline recovery.
10. Test recovery with and without an enrolled Android device, one-use temporary credentials, forced password change and stale-token rejection. Confirm sensitive responses are not cached.
11. Test malformed/unauthorized HTTP and socket requests, room membership, shared-laptop logout, denied file/microphone permissions and notification destinations.
12. Open and refresh every protected deep link on staging, install/update the PWA where supported, and run the current mobile release against the candidate backend.

Use focused integration/contract tests for changed backend behavior and browser end-to-end coverage for the critical journeys above. Existing `server/tests/` and `VettriAcademy/tests/` provide a regression baseline; the client currently has no dedicated test script in package.json. Test real MongoDB transaction/session behavior in staging where required.

## 8. Review boundaries and open deployment facts

- Reviewed local packages, routing/navigation, API/auth/session code, class routes/controllers, chat contracts, upload paths, notification/PWA code and operational docs. Existing uncommitted backend work was left untouched.
- No production accounts, private credentials, database writes, deployment or real notifications were used for this review. Public API origins are configuration, not secret credentials.
- The public `.in` website could not be retrieved by the browsing tool; its actual hosting, DNS, currently deployed build and backend environment remain unverified. Repository source can differ from what is live.
- Native filesystem/background download and Android push behavior need browser equivalents; external meeting screen sharing remains with the current meeting provider. A built-in video-conferencing engine is a separate project unless the mobile app already requires it.
- Recovery/browser push are distinct: reuse the existing recovery authorization and verified fallback; ordinary browser push support does not automatically authorize delivery of temporary credentials.
- Validation: `npm run build` in `client/` passed (Vite reported 45.98 seconds). Warnings: outdated Browserslist data and chunks above 500 kB; the main JavaScript bundle was approximately 2.19 MB minified and the HeroScene chunk approximately 826 kB. Address loading performance during Phase 4. A successful build verifies compilation only, not runtime feature parity.

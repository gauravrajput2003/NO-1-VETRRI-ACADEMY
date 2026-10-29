# Shared mobile/web acceptance report

Date: 24 October 2026. Scope: the working tree implementing `WEB_APP_IMPLEMENTATION_PLAN.md`.

## Environment and evidence

The user authorized the existing `server/.env`, MongoDB and storage. Tests used four newly created accounts labelled `WEB PARITY TEST 87996e4723`, their own grade/assignments and synthetic academic/financial records. A local acceptance API disabled background jobs and filtered notification recipients to fixture IDs. The normal production entry point remains `server/index.js`; do not deploy `webParityServer.cjs`.

The candidate code was exercised locally against shared storage/database. It has not been deployed to the hosted mobile API. Existing mobile installations therefore do not automatically receive these code changes yet. Once deployed, browser actions use the same shared notification/data services as mobile actions.

Evidence: `WEB_MOBILE_ACTION_INVENTORY.md` and `.json` (91 screen/role entries and handler/thunk/API mappings), `WEB_PARITY_API_RESULTS.json` (23 passing integration groups), `WEB_HOSTING_RESULTS.json` (public HTTPS checks), `WEB_PARITY_CLEANUP_RESULTS.json` (174 fixture records/eight storage references cleaned and temporary credentials removed). Some API groups were rerun individually after fixes; results are merged for the same fixture run.

## Integration coverage

| Area | Verified against shared API/database/storage |
| --- | --- |
| Identity | Same credentials, independent refresh sessions, per-session logout, profile restrictions, admin edits without password changes, teacher permissions |
| Classes | Schedule, assignment visibility, start/join, attendance persistence and own/assigned-user boundaries |
| Materials | Actual signed Cloudinary upload, idempotent confirmation, metadata edit, file replacement, review and scoped access |
| Reading | Shared page, bookmark and note records; uploaded two-page PDF rendered in browser |
| Financial | Fixture salary configuration, partial payment, correction and PDF slip; fixture fee payment/student visibility |
| Exams | Signed question/answer uploads, actual MongoDB transaction submission, grading, student result and unrelated-user denial |
| Leave | Application, approval, compensation completion and admin confirmation |
| Communication | Doubt reply/status/access, chat persistence/read/access, announcement/read receipt, support/reply/access and notification inbox |
| Training | Audience, watch position/duration and completion through the shared API |
| Sockets | Concurrent legacy/JWT clients, event delivery, forged JWT rejection; isolated strict-mode legacy rejection/JWT acceptance |
| Hosting | Candidate CORS preflight for apex and www HTTPS origins |

Bulk payroll recording was regression-tested with model stubs and was not invoked across real teachers. Browser salary controls and fixture payments were inspected. Individual report formats/filters have not all received browser acceptance. Source route/action inventory does not establish exhaustive action-level runtime coverage.

## Browser checks and limits

Actual Chromium in-app browser checks covered student sign-in/profile save/attendance, PDF canvas with page two/bookmark/note, teacher sign-in/salary and exam details showing the saved answer/85-of-100 grade, and admin sign-in/dashboard/salary/profile/notifications. The browser exposed the notification enable control. Teacher scheduling showed assigned students/classes; automation could not complete native date/time fields, so class creation is supported by API evidence rather than a browser submission claim.

Viewport requests covered 1366×768 and 1920×1080. The larger profile view had no horizontal overflow and Tab moved into the next input. Temporary viewport overrides were reset. These are limited layout/keyboard checks, not a complete accessibility audit. Physical Chrome/Edge, camera/microphone capture, media codecs, real provider push receipt and PWA install/update still need acceptance.

Screenshots: `acceptance/teacher-exam-browser.png` and `acceptance/admin-profile-browser.png`, containing fixture data only.

The web production build passed: main entry 545.90 KB / 164.81 KB gzip, deferred PDF reader 489.15 KB, export 709.88 KB, marketing scene 825.79 KB and PDF worker 1264.34 KB. Chunk-size and outdated Browserslist warnings remain. Dependency installation reported audit findings; incompatible force-upgrades were not applied.

All 134 backend tests passed with local networking enabled, including recovery sliding-window HTTP coverage. Backend syntax and CRLF-aware Git whitespace checks passed. A subsequent training null-check ordering correction also passed syntax verification.

## Deployment and acceptance procedure

1. Deploy the normal `server/` entry point with existing backend database/storage secrets. Keep `SOCKET_REQUIRE_AUTH=false` during mobile compatibility rollout. Verify `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` and `WEB_PUSH_EMAIL` or `WEB_PUSH_SUBJECT`; private keys must never enter Vite configuration.
2. Deploy `client/` with `VITE_API_ORIGIN` and `VITE_SOCKET_URL` matching mobile's hosted API. Defaults are `https://no-1-vetrri-academy.onrender.com`; verify host overrides. `client/.env.example` contains public values only.
3. Use root `vercel.json` for repository-root hosting, or `client/vercel.json` when the Vercel project root is `client/`. Both provide SPA fallback and non-cached service-worker delivery.
4. Verify homepage, all three login URLs and direct/reloaded student/teacher/admin deep links. Check HTTPS, CORS/authorization preflight and Socket.IO upgrades on apex/www. Public checks currently show homepage 200 and deep links 404; the checked-in configuration has not changed the hosted website.
5. On actual phone/laptop, verify simultaneous sessions, sign-out, upload/review/replacement, exam submission/grading, classes/chat and PDF resume. Confirm mobile notification receipt and browser background delivery/click/read acknowledgement. Browser notifications are opt-in through the bell.
6. Verify Chrome/Edge keyboard/forms/download dialogs, audio/video capture and playback, PDF signed URL refresh and PWA install/update across two build versions. Training playback expects browser-playable media URLs; arbitrary provider webpage URLs require a provider-specific player and were not verified.

## Socket retirement gate

`GET /api/admin/socket-rollout` exposes candidate connection counters and strict-mode state. Counters reset on restart and are not durable mobile adoption analytics. Test the old installed app with compatibility enabled. Release the mobile JWT-handshake change in `VettriAcademy/src/services/socket.js`, verify the installed updated build and collect adoption evidence. Only then enable `SOCKET_REQUIRE_AUTH=true`; roll back the flag if a supported legacy app loses realtime access. Simulated-client success does not establish Play Store adoption.

No production deployment, account migration, physical-device acceptance or real push-provider receipt is claimed. Remaining release checks are acceptance gates, not a waiver of the original plan.

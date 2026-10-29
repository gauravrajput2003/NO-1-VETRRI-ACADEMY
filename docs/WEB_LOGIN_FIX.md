# Login correction — 26 October 2026

The supplied error screenshot showed a network failure, not an incorrect-password response. The development API proxy targeted port 5000 with no backend listening. The mobile Render API health endpoint returned 200. In addition, a teacher attempting the old student web form was sent to a role-restricted endpoint, while mobile uses unified `/api/auth/login`.

## Changes

- All login URLs (`/login`, `/login/student`, `/login/teacher`, `/login/admin`) now share one page based on the actual mobile `LoginScreen.jsx`: teal/pink gradient, cap mark, white card, visible password toggle and Sign In control. The static gold login and inactive social controls were removed from those routes.
- Login now calls the same unified endpoint as mobile and routes by the role returned by the server. Existing credential hashes are unchanged. Passwords are sent unchanged, with no new six-character client restriction; identifiers are trimmed like mobile.
- Standalone Vite development uses the hosted mobile API through same-origin `/api` and `/socket.io` proxies. The proxy strips the outgoing browser Origin only in the development server, avoiding hosted CORS rejection when another project occupies port 5173. No production API CORS setting is relaxed.
- `API_PROXY_TARGET=http://127.0.0.1:5000` explicitly selects the local candidate backend when it is running. Clear any old `VITE_API_ORIGIN`/`VITE_SOCKET_URL` override when using same-origin development proxies.

## Verification

- Hosted health: 200. Web proxy health including browser port 5174 Origin: 200.
- The screenshot's `teacher@gmail.com` account exists in the configured app database and is active/approved with teacher role. Its existing password was neither retrieved nor changed.
- Dedicated labelled teacher and student test accounts signed in through the real browser and reached `/teacher/dashboard` and `/student/dashboard`. The teacher saw its assigned test student. These accounts are retained for the owner's manual testing; credentials are in the OS temporary directory and the chat, never tracked in Git.
- Seven focused mobile/web login error/credential tests passed. Production web build passed; pre-existing size/Browserslist warnings remain. Main entry after removing duplicated login pages is approximately 521 KB minified.
- Login screenshot: `acceptance/mobile-style-web-login.png`.

The current development server is on `http://127.0.0.1:5174/login` because port 5173 belongs to another project. Hosted `no1vettriacademy.in` still requires deployment for these UI changes. This development mode uses the deployed mobile API; testing candidate-only backend features still requires running `server/` and selecting its explicit local proxy target.

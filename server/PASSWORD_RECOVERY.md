# Admin-assisted password recovery

This implements audit finding B01 without an SMS/OTP provider. Application code is local until deployed. No real account, password, cloud notification or production database was changed during implementation/testing.

## Security decisions

- Public `/api/auth/forgot-password` is retired: HTTP 410 with `ADMIN_ASSISTED_RECOVERY_REQUIRED`. It never queries an account or changes a password. Existing authenticated admin student/teacher password-edit facilities remain available.
- Unknown, inactive, unapproved, ambiguous and administrator identifiers receive the same public request response; no ResetRequest is created for them. Matching active students/teachers get at most one active request, enforced by a unique partial Mongo index.
- Knowing an identifier or supplying a device token does **not** authorize a new delivery device. Only tokens previously registered while authenticated qualify. Devices must also register the new private Android recovery channel before receiving a password. Account switching removes the token from the previous account's recovery lists; logout preserves recovery enrollment while removing the ordinary notification token.
- New/lost/unregistered phones use **Copy after the admin independently verifies identity**, for example through the academy's existing records/contact process. The UI asks for explicit confirmation and the API requires `identityVerified: true`. No public request enrolls a new device.
- Temporary credentials are generated with `crypto.randomInt`, compared using bcrypt, and are **not normal account-login passwords**. Users redeem them on Reset Password; no temporary login or auto-login is issued.
- Temporary-password hashes are the only credential representation in ResetRequest. Chat and push payloads use AES-256-GCM with a separate server-only key and request/revision-bound authenticated data. Conversation previews, ordinary notifications, socket events, list responses and logs contain no temporary password.
- HTTP chat and recovery use the same text-message authorization/persistence service. Only the actual message recipient can decrypt an unexpired recovery chat message through the authenticated HTTP reader. Admins cannot fetch the plaintext again. Socket delivery carries the generic preview, never the password or ciphertext.
- Generation leaves the request pending with no temporary-password expiry. First Send/Copy activates it; retries/additional delivery channels preserve the original expiry. Regeneration replaces the hash, invalidates earlier credentials and clears older encrypted delivery records.
- Completion and consumption run in a Mongo transaction. Successful `.save()` runs the real User bcrypt hook, increments tokenVersion, sets passwordChangedAt, clears the refresh token and clears mustChangePassword. Older access/refresh tokens then fail. Legacy JWTs without a version count as version zero, preserving existing sign-ins until a password change.
- Five wrong credential attempts lock the request. Used, locked, rejected, replaced or expired credentials lose their encrypted chat/outbox contents. Pending lifetimes are seven days from the latest pending transition; original requestedAt remains unchanged. Cleanup runs each minute and on startup; validity is checked again during completion, chat reads and push dispatch, independently of the job.
- When a free Render process sleeps, jobs/dispatch pause. Cleanup catches up on startup; expiry checks still reject stale credentials when a request is handled. Already-delivered OS notifications cannot be remotely erased by deleting a Mongo outbox record.
- Forced password-change accounts get only a minimal `/auth/me` bootstrap, logout and current-password-change access. The app renders a dedicated, non-dismissible Set New Password screen rather than dashboards. Public temporary credentials do not set this flag because they are redeemed before login. The admin CLI does set it.

## Render configuration — required before enabling recovery

Add **`PASSWORD_RECOVERY_ENCRYPTION_KEY`** to the backend Render service's secret environment. It must be exactly 32 random bytes encoded as Base64. Generate it privately on your machine, for example:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
```

Paste that value into Render. Do not put it in Git, an Expo `EXPO_PUBLIC_*` variable, a browser/client build, logs, screenshots or this document. Keep a protected backup and use the same key on all backend instances. Generate/Send fail closed if it is missing or invalid; the rest of the backend can still start.

Do not casually rotate this key while recovery requests are outstanding: existing ciphertext needs the old key. To rotate, first invalidate outstanding requests/deliveries through an authorized maintenance process, then change the key and generate new credentials. No real key has been generated or committed by this implementation.

Existing `MONGO_URI`, JWT and Expo/FCM settings are reused. No Firebase service-account replacement, new Firebase project, SMS gateway or additional dependency is required by this change. Real FCM delivery remains dependent on the already configured credentials and device permission.

MongoDB must support transactions (Atlas/replica set), and the backend account must be able to create indexes. Startup awaits ResetRequest and recovery-rate-limit indexes before accepting requests. Treat an index startup failure as a deployment failure; do not bypass the unique index.

### Configuration constants

Defined in `server/utils/passwordRecovery.js`:

| Constant | Default |
|---|---:|
| TEMP_PASSWORD_TTL_HOURS | 24 |
| RESET_REQUEST_PENDING_DAYS | 7 |
| RESET_MAX_FAILED_ATTEMPTS | 5 |
| RESET_REQUESTS_PER_HOUR | 3 |

Request limits use persisted, hashed IP and normalized-identifier counters in hourly buckets, shared across instances/restarts. Both counters must allow the request. Limited requests retain the same HTTP 202 generic response. Completion has a separate 30-attempt/hour IP+identifier budget in addition to the five-attempt credential lock. Request/complete responses have a 700–779 ms minimum response target; unusually slow database/network operations can exceed this, so it is not a mathematical constant-time guarantee.

Android channel: `vettri-recovery`, HIGH importance, PRIVATE lock-screen visibility; Android supplies its redacted public lock-screen presentation. No custom native `publicVersion` renderer was added. User/OS privacy settings and vendor behavior must be checked on a physical device. The default public channel is not used for credential payloads.

## Endpoints

| Method/path under `/api` | Access | Behavior |
|---|---|---|
| POST `/auth/password-reset/request` | Public, limited | `{ identifier, deviceToken? }`; generic response |
| POST `/auth/password-reset/complete` | Public, limited | `{ identifier, tempPassword, newPassword, confirmPassword }`; no auto-login |
| GET `/admin/password-resets` | Admin | `page`, `limit` (max 50), `search`, `status=pending/sent/closed`; pending count |
| POST `/admin/password-resets/:id/generate` | Admin | Returns plaintext once; no expiry until Send/Copy |
| POST `/admin/password-resets/:id/send` | Admin | `{ password, channels: ['push','chat'] }`; verified recovery-ready devices only |
| POST `/admin/password-resets/:id/mark-copied` | Admin | `{ password, identityVerified: true }`; activates without push/chat |
| POST `/admin/password-resets/:id/reject` | Admin | Invalidates and clears delivery secrets |

All recovery/admin responses use `Cache-Control: no-store`. The supplied password is rechecked against the stored bcrypt hash on Send/Copy; a stale generation cannot be delivered. Sending the same channel again does not duplicate delivery or restart expiry. The existing durable push worker is reused, with 24-hour-at-most TTL reduced to the actual remaining lifetime at dispatch. A queued request's `sent` status means **activated/queued**, not proof the device displayed it; Expo receipts are separate delivery evidence.

## Rollout order and installed apps

1. Set the backend encryption secret and deploy the `/server` backend first. Check successful index initialization and service health. **Do not deploy the stale root `index.js`; use the supported server directory.**
2. Verify the old public reset endpoint returns 410, ordinary login and authenticated admin password editing still work, and old version-zero JWTs remain valid for accounts whose password has not changed.
3. Publish the updated Android app promptly. Old installed versions keep ordinary login/features, but their old public Forgot Password form is intentionally disabled server-side and tells users to contact the admin/update. The new flow cannot be backported to those old UIs solely by changing Render.
4. Each updated device must sign in/restore an authenticated session once, permit notifications and register `vettri-recovery`. The app then sends `recoveryChannelReady: true` with its authenticated push registration. Subsequent ordinary logout retains only verified recovery enrollment.
5. A device that logged out before enrollment, a fresh reinstall/new phone, a device with denied notification permission, an older installed version, and currently iOS/web clients use the admin-verified Copy fallback. They are never silently enrolled by a public request. Web supports the form/admin screens but Expo native push-token registration is skipped there.
6. Run the physical-device script below before production rollout. Rendering and mock/unit checks do not prove FCM delivery, Android lock-screen redaction or a live Mongo transaction commit.

No deployment, Git commit/push, EAS build, Play publication or real test notification was performed as part of the implementation.

## Manual device script

1. On a physical Android phone, install the candidate app, sign in as a test student/teacher, allow notifications, then log out normally. Avoid Android Force Stop; it has different push restrictions.
2. Open Forgot Password. Enter the registered phone/email and request a temporary password. Confirm the same white card expands, the identifier becomes read-only with Change, the green banner appears, and Resend has a 60-second cooldown. Deny notifications/offline-test separately; recovery requests must not wait indefinitely for push registration.
3. Sign in as an admin on another device/web preview. Open **Password Requests** from the dashboard or Settings; verify pending count, name/role/class/contact, search, filters and refresh.
4. Open the request and generate. Verify the random readable password appears once, the status remains pending, and no expiry is set. The displayed value must disappear on leaving/backgrounding the screen. Reopen: plaintext must not be fetchable; Regenerate should be required.
5. Generate again and choose Send via App; confirm the recipient. Verify status/expiry starts now, one Admin Desk message exists and the existing push outbox processes it. Regenerate or reject the request separately to verify earlier credentials stop working.
6. With the student's app normally closed, verify the private recovery notification arrives, makes the expected sound and hides the password on the locked screen. Unlock and tap: Reset Password should open with identifier/temp prefilled. Repeat with the app foregrounded/backgrounded and from a cold start. Check that Expo's last-response cache is cleared after the tap.
7. Enter a new matching password, verify rules/errors, and reset. Expect a checkmark and `Password updated. Please sign in.` Sign in with the new password; old password and old access/refresh tokens must fail. Reusing the temp password must fail. Admin must not be able to see the final password.
8. Check chat redaction (`Temporary password was used`) and removal of encrypted outbox/chat credentials. Verify unrelated roles/users cannot decrypt the recovery message.
9. On a fresh/unregistered device, verify Send via App is unavailable. Independently verify identity as admin, select Copy, confirm, and share via the academy's approved channel. The timer must start on Copy; copying/sending again must not extend it.
10. Exercise five wrong attempts (locks), 24-hour expiry, seven-day pending expiry and a second concurrent completion in staging. Test phone/tablet/rotation, large fonts, keyboard/back, denied permissions, lost internet and a Render restart. Real Mongo transaction rollback/concurrency is a staging check; unit fixtures are not a Mongo server.

## Admin recovery CLI

```powershell
node server/scripts/reset-admin-password.js admin@example.invalid
```

Run only in a trusted interactive terminal with backend/DB access, substituting the real admin identifier. Password and confirmation are entered with hidden input, not CLI arguments or environment values. Only one active admin account may match. Saving uses the User hash/version hook and requires setting a final password after login. This script was syntax-checked but not run against any database.

## Verification and review

- Existing and new Node tests run offline with synthetic fixtures. New coverage includes retired endpoint behavior, generic responses, role exclusion/guards, crypto, trusted/private-channel devices, duplicate collapse, generate/send timing, one-time/concurrent consumption, expiry, lockout, copy verification, revocation and message redaction.
- Mobile reducer/prefill tests cover request/submission/success/error, mismatch handling and invalid/expired notification data. Web preview uses only `server/tests/fixtures/recoveryPreview.cjs`, bound to loopback, with synthetic accounts and no Mongo/Expo calls.
- Phone/tablet screenshots are visual evidence from the synthetic preview, not real student data or an Android-device test.
- This is a B01-focused implementation plus required supporting session/chat/outbox changes. It does **not** claim to fix unrelated audit findings such as the pre-existing unauthenticated legacy Socket.IO transport. Recovery secrets are deliberately never emitted on that transport.

Primary changed/new implementation areas: auth/profile controllers and middleware, JWT/User save hook, ResetRequest/RecoveryRateLimit models and recovery service/controller/job, shared HTTP chat service and encrypted chat fields/reader, existing push worker/encrypted fields/dispatch validator, admin recovery CLI, mobile Reset Password/Admin Password Requests screens, dashboard/settings links, notification handling/channel, API helpers, and tests. No dependency or lockfile changes were made.

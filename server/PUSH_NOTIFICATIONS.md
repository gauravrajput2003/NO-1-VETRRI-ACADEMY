# Push notification repair and rollout

All changes in this repair are backend-only. No Expo build, frontend change,
dependency upgrade, commit or push is required to review the code locally.
The changed backend must be deployed before the installed app benefits.

## Confirmed production blocker

The user-authorized direct push test to the active `google.review@gmail.com`
admin account returned HTTP 200 with an Expo ticket containing
`status: error`, `details.error: InvalidCredentials`. The push was rejected;
there is no receipt ID to poll. Repair the project's FCM V1 service account in
EAS using step 4 below. No Firebase service-account private key or EAS CLI was
available in this workspace to perform that credential change.

## What changed

- Accept both `ExpoPushToken[...]` and `ExponentPushToken[...]` registrations.
- Clear token ownership on logout/account switching, so subsequent notifications
  are not sent to the previous account on a shared installation.
- Persist push work in `PushDelivery`; send visible notifications with the
  installed app's `vettri-default` channel, sound and high Android priority.
- Atomically lease queued work; retry network errors, HTTP 429/5xx and transient
  Expo errors with backoff (maximum five attempts). Outstanding work survives
  process restarts. Delivery is at least once: an ambiguous network failure or
  crash after sending can cause a duplicate, as with other push transports.
- Fetch Expo receipts after 15 minutes. An accepted ticket is not proof that FCM
  accepted the message. `DeviceNotRegistered` removes the dead token;
  `InvalidCredentials` does not. Receipt errors are retained for diagnostics.
- Send text, attachments and socket chat through the same in-app/push service.
  Socket emission failures no longer suppress pushes.
- Include reference IDs in the push data used by the existing app's navigation.
- Notify students when approved material becomes accessible, respecting course,
  teacher, grade and access locks. Include global unlocks and direct admin uploads.
- Send class-change/cancellation and bulk-schedule notifications; class reminders
  use Asia/Kolkata time and catch up within the 15-minute pre-class window.
- Notices target the intended role, course and grade and bulk work is bounded.
- Existing leave application/approval/rejection, doubt assignment/reply/status,
  support creation/reply, live class, recordings, scores, salary and fee alerts
  now use the repaired shared push path. Material submissions already notified
  admins and approval/rejection already notified the requesting teacher.

## Deploy and verify

1. Deploy the changes to the backend service running `server/index.js`. Use the
   existing MongoDB connection. `PushDelivery` adds an outbox collection with
   status/due-date, unique event/device and seven-day TTL indexes. Ensure normal
   Mongoose index creation is enabled, or provision these indexes in deployment.
2. Keep this service running continuously. An in-process worker runs every ten
   seconds and class reminders every minute. A hosting instance that sleeps or
   scales to zero cannot send a reminder until it wakes; external scheduling or
   an always-on instance is needed for timely reminders while nobody uses the app.
3. Run read-only diagnostics from the repository root:

   ```powershell
   node server/scripts/diagnosePush.js
   ```

   Alternatively, an authenticated admin can GET
   `/api/notifications/push-status`. Neither output exposes tokens or message
   bodies. `receipt_pending` means Expo accepted a request; `delivered` means FCM
   or APNs accepted it, not proof of display on a device.
4. If errors show `InvalidCredentials` or `MismatchSenderId`, verify the **FCM V1
   service account** uploaded to the Expo project
   `546a14a2-77ac-4b76-8596-097f8e81d7d8`. It must match Firebase project
   `no-1-vettri-academy` and Android package `com.vettriacademy.app` configured in
   the app. Updating the server-side service account in EAS does not itself
   require rebuilding the app. A wrong/missing Firebase configuration baked into
   the released binary does require a new release. Credentials have not been
   verified as valid: the authorized production test returned `InvalidCredentials`.
   In PowerShell, from `VettriAcademy`, run `eas credentials`, choose Android,
   production, Google Service Account, then **Manage your Google Service Account
   Key for Push Notifications (FCM V1)** and upload the matching service-account
   JSON key. This is the FCM push credential, not a Play Store submission key.
5. If Expo's enhanced push security is enabled, set `EXPO_ACCESS_TOKEN` on the
   backend hosting service. The worker uses it for sends and receipt queries.
   Do not put access tokens or service-account private keys in frontend code.
6. Test with the existing Play Store app: open it online, log into the intended
   account, allow notifications, then close it normally. Trigger each feature
   with a different sender and check the notification tray. Wait for receipts
   when diagnosing provider delivery errors. Do not replay old notices to all
   users as a test.

## What the backend cannot repair remotely

- The read-only database audit on 15 October 2026 found registered tokens for
  2/2 active admins, 37/57 teachers and 4/140 students. Missing tokens do not prove
  whether those users installed the app or denied permissions. A backend cannot
  invent tokens: users must open the installed app online and grant permission.
  Re-login runs the existing registration path again after the backend deploy.
- The app's existing push-token refresh listener forwards a native FCM token to
  the Expo-token endpoint. This must stay rejected; native and Expo tokens are
  different. A future frontend release should call `getExpoPushTokenAsync`
  again inside that listener, retry failed registrations and recheck permissions
  when the app resumes. No frontend files were changed in this repair.
- The schema currently stores one token per user, so simultaneous delivery to
  multiple installations for one account is not supported.
- The backend cannot enable Android notification permission, undo Force stop,
  override a muted channel or guarantee delivery under battery/network limits.
- No production deployment or end-to-end phone-delivery confirmation is implied
  by passing mocked local tests. The first requested test email was not found as
  an active app account; the corrected review account test was rejected by Expo
  with `InvalidCredentials`, so neither attempt delivered a phone notification.

## Local verification

```powershell
node --test server/tests/*.test.js
git diff --check
```

Sources: [Expo sending/retry/receipt guidance](https://docs.expo.dev/push-notifications/sending-notifications/),
[Android FCM V1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/),
[Expo troubleshooting](https://docs.expo.dev/push-notifications/faq/).

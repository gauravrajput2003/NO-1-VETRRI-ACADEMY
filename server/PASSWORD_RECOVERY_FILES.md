# Password recovery change inventory

Working-tree snapshot against HEAD. Shared files already contained unrelated local edits before this task; their diffs include those existing edits. This patch is for review, not blind application over another checkout. No environment files, keys, dependencies or lockfiles are included.

- Modified: [server/controllers/authController.js](<D:/NO 1 VETRRI ACADEMY/server/controllers/authController.js>).
- Modified: [server/controllers/chatController.js](<D:/NO 1 VETRRI ACADEMY/server/controllers/chatController.js>).
- Modified: [server/controllers/profileController.js](<D:/NO 1 VETRRI ACADEMY/server/controllers/profileController.js>).
- New: [server/controllers/passwordRecoveryController.js](<D:/NO 1 VETRRI ACADEMY/server/controllers/passwordRecoveryController.js>).
- Modified: [server/index.js](<D:/NO 1 VETRRI ACADEMY/server/index.js>).
- Modified: [server/middleware/auth.js](<D:/NO 1 VETRRI ACADEMY/server/middleware/auth.js>).
- New: [server/middleware/passwordRecoveryLimits.js](<D:/NO 1 VETRRI ACADEMY/server/middleware/passwordRecoveryLimits.js>).
- Modified: [server/models/User.js](<D:/NO 1 VETRRI ACADEMY/server/models/User.js>).
- Modified: [server/models/ChatMessage.js](<D:/NO 1 VETRRI ACADEMY/server/models/ChatMessage.js>).
- Modified: [server/models/PushDelivery.js](<D:/NO 1 VETRRI ACADEMY/server/models/PushDelivery.js>).
- New: [server/models/ResetRequest.js](<D:/NO 1 VETRRI ACADEMY/server/models/ResetRequest.js>).
- New: [server/models/RecoveryRateLimit.js](<D:/NO 1 VETRRI ACADEMY/server/models/RecoveryRateLimit.js>).
- Modified: [server/routes/authRoutes.js](<D:/NO 1 VETRRI ACADEMY/server/routes/authRoutes.js>).
- Modified: [server/routes/adminRoutes.js](<D:/NO 1 VETRRI ACADEMY/server/routes/adminRoutes.js>).
- New: [server/services/chatMessageService.js](<D:/NO 1 VETRRI ACADEMY/server/services/chatMessageService.js>).
- New: [server/services/passwordRecoveryService.js](<D:/NO 1 VETRRI ACADEMY/server/services/passwordRecoveryService.js>).
- New: [server/services/recoveryPushPayload.js](<D:/NO 1 VETRRI ACADEMY/server/services/recoveryPushPayload.js>).
- Modified: [server/services/pushService.js](<D:/NO 1 VETRRI ACADEMY/server/services/pushService.js>).
- Modified: [server/utils/generateToken.js](<D:/NO 1 VETRRI ACADEMY/server/utils/generateToken.js>).
- New: [server/utils/passwordRecovery.js](<D:/NO 1 VETRRI ACADEMY/server/utils/passwordRecovery.js>).
- New: [server/utils/recoveryCipher.js](<D:/NO 1 VETRRI ACADEMY/server/utils/recoveryCipher.js>).
- New: [server/jobs/passwordRecovery.js](<D:/NO 1 VETRRI ACADEMY/server/jobs/passwordRecovery.js>).
- New: [server/scripts/reset-admin-password.js](<D:/NO 1 VETRRI ACADEMY/server/scripts/reset-admin-password.js>).
- New: [server/tests/passwordRecovery.test.js](<D:/NO 1 VETRRI ACADEMY/server/tests/passwordRecovery.test.js>).
- New: [server/tests/passwordRecoveryLifecycle.test.js](<D:/NO 1 VETRRI ACADEMY/server/tests/passwordRecoveryLifecycle.test.js>).
- New: [server/tests/recoveryEncryption.test.js](<D:/NO 1 VETRRI ACADEMY/server/tests/recoveryEncryption.test.js>).
- New: [server/tests/recoveryLimits.test.js](<D:/NO 1 VETRRI ACADEMY/server/tests/recoveryLimits.test.js>).
- New: [server/tests/recoveryPush.test.js](<D:/NO 1 VETRRI ACADEMY/server/tests/recoveryPush.test.js>).
- New: [server/tests/fixtures/recoveryPreview.cjs](<D:/NO 1 VETRRI ACADEMY/server/tests/fixtures/recoveryPreview.cjs>).
- New: [server/PASSWORD_RECOVERY.md](<D:/NO 1 VETRRI ACADEMY/server/PASSWORD_RECOVERY.md>).
- Modified: [VettriAcademy/src/navigation/RootNavigator.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/navigation/RootNavigator.jsx>).
- Modified: [VettriAcademy/src/navigation/AdminNavigator.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/navigation/AdminNavigator.jsx>).
- New: [VettriAcademy/src/components/PasswordRequestsButton.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/components/PasswordRequestsButton.jsx>).
- New: [VettriAcademy/src/screens/admin/PasswordRequestsScreen.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/admin/PasswordRequestsScreen.jsx>).
- Modified: [VettriAcademy/src/screens/admin/DashboardScreen.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/admin/DashboardScreen.jsx>).
- Modified: [VettriAcademy/src/screens/common/ForgotPasswordScreen.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/common/ForgotPasswordScreen.jsx>).
- Modified: [VettriAcademy/src/screens/common/SettingsScreen.jsx](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/screens/common/SettingsScreen.jsx>).
- Modified: [VettriAcademy/src/services/api.js](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/services/api.js>).
- Modified: [VettriAcademy/src/services/pushNotifications.js](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/services/pushNotifications.js>).
- New: [VettriAcademy/src/utils/passwordRecoveryState.js](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/src/utils/passwordRecoveryState.js>).
- New: [VettriAcademy/tests/passwordRecovery.test.mjs](<D:/NO 1 VETRRI ACADEMY/VettriAcademy/tests/passwordRecovery.test.mjs>).

## Verification

- Full backend suite: 118 tests passed; full mobile suite: 39 tests passed.
- Final recovery mobile tests rerun: 3 passed. Seven touched JSX modules parsed successfully.
- Current-source Android production JavaScript/Hermes export completed (6,535,847-byte bundle); production API host present, synthetic loopback API absent. This is not a signed AAB or Gradle/native compatibility check.
- Phone/tablet web preview checked with synthetic data. Preview servers stopped after verification.
- Physical-device FCM delivery, lock-screen privacy, native rotation/keyboard behavior and actual Mongo transaction rollback/concurrency remain staging checks.
- Deployment instructions and manual test script: [PASSWORD_RECOVERY.md](<D:/NO 1 VETRRI ACADEMY/server/PASSWORD_RECOVERY.md>).
- [Working-tree review patch](<C:/Users/gaura/.codex/visualizations/2026/10/05/01a10be8-ac0c-70f0-a5bc-7c413ab0ab03/password-recovery/password-recovery-working-tree.patch>) contains the 41 listed implementation/test/guide files; this inventory is supplied separately.

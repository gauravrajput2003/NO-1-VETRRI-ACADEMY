# Android release readiness

## App-side changes

- `orientation: "default"` permits rotation. This is the shared Expo orientation setting and applies to iOS as well as Android.
- `withAdaptiveAndroid` ensures MainActivity uses `screenOrientation="unspecified"`, `resizeableActivity="true"`, and no activity aspect-ratio limits. The existing keyboard mode `adjustResize` is preserved.
- The plugin removes deprecated status/navigation bar colour, divider colour and status contrast requests from generated app themes. Navigation contrast protection is preserved.
- App-owned StatusBar components no longer pass `backgroundColor` or `translucent`; icon brightness (`barStyle`) is preserved. Modal `statusBarTranslucent` / `navigationBarTranslucent` props are separate window-layout controls and were not blindly removed.
- Video and document headers use safe-area insets, including side cutouts in landscape. Video bottom actions account for the navigation area.
- Login height, student summary-card widths and AI drawer width now respond to resizing/rotation. Existing responsive screens continue to use their dimension hooks. All screens still need device coverage; unlocking rotation is not proof of full tablet/landscape usability.
- Existing R8 minification, resource shrinking and optimized default ProGuard rules remain enabled. No package versions were changed.

## Local evidence

Clean Android prebuild succeeded with the installed Expo SDK 54 template. Source manifest MainActivity contains:

```xml
android:screenOrientation="unspecified"
android:resizeableActivity="true"
android:windowSoftInputMode="adjustResize"
```

Generated Gradle configuration retains both release minification/shrinking flags and `proguard-android-optimize.txt`. Generated app styles no longer contain `android:statusBarColor`. Generated `android/` is removed after verification to retain managed workflow.

Final app test run: 29 tests passed, including adaptive manifest/theme regression checks and R8 configuration checks. Both Android JavaScript/Hermes and Expo web exports passed. Browser smoke tests using intercepted demo API data kept student/teacher/admin header controls in bounds at 360×780, 780×360 and 1024×768 with no page runtime errors. The student AI input stayed in bounds after portrait/landscape resizing. These smoke tests cover header/drawer layout only, not all screens or native keyboard/system-bar interactions.

## What is still unconfirmed

Installed React Native 0.81.5 and react-native-screens 4.16.x still contain native system-window APIs covered by the Android 15 deprecation warning. Examples include ReactAndroid `WindowUtil.kt` and screens `ScreenWindowTraits.kt`. App-side cleanup does not erase framework bytecode. Some calls support older Android versions; deleting them from node_modules is not a safe release fix. The exact call sites reported by Play must be checked against the next compiled bundle. Further remediation may require a compatible Expo/React Native dependency upgrade, which has not been performed.

No native release compilation is available locally without the Android/JDK toolchain. JavaScript exports and config tests do not prove release/R8 runtime compatibility or a specific Play obfuscation percentage.

Before production publication, use a signed release/internal test to check: login with keyboard open in both orientations; student/teacher/admin dashboards; drawers, dialogs and chat inputs; document/video viewers; tablet split-screen and resizing; gesture and three-button navigation on Android 15/16. Check actual AAB `mapping.txt`/R8 metadata and Play's new analysis. Keep the build's deobfuscation mapping. EAS auto-increment remains enabled; do not reuse release 22's version code.

No EAS build, commit, push or deployment is part of these local changes.

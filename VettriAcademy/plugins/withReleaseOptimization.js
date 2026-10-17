const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

// Keep release settings in managed configuration so clean prebuilds retain them.
module.exports = function withReleaseOptimization(config) {
  config = withGradleProperties(config, (config) => {
    for (const key of ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds']) {
      config.modResults = config.modResults.filter((entry) => entry.type !== 'property' || entry.key !== key);
      config.modResults.push({ type: 'property', key, value: 'true' });
    }
    return config;
  });
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') throw new Error('Release optimization expects the Expo SDK 54 Groovy Android template.');
    const contents = config.modResults.contents.replaceAll('proguard-android.txt', 'proguard-android-optimize.txt');
    if (!contents.includes('getDefaultProguardFile("proguard-android-optimize.txt")')
      && !contents.includes("getDefaultProguardFile('proguard-android-optimize.txt')")) {
      throw new Error('Release optimization could not find the default ProGuard rules in app/build.gradle. Review the Android template.');
    }
    config.modResults.contents = contents;
    return config;
  });
};

const { withAndroidManifest, withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

// Keep the managed Android activity resizable across clean prebuilds.
module.exports = function withAdaptiveAndroid(config) {
  config = withAndroidManifest(config, config => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$['android:screenOrientation'] = 'unspecified';
    activity.$['android:resizeableActivity'] = 'true';
    delete activity.$['android:maxAspectRatio'];
    delete activity.$['android:minAspectRatio'];
    return config;
  });
  return withAndroidStyles(config, config => {
    const deprecated = new Set(['android:statusBarColor', 'android:navigationBarColor', 'android:navigationBarDividerColor', 'android:enforceStatusBarContrast']);
    for (const style of config.modResults.resources.style || []) {
      style.item = (style.item || []).filter(item => !deprecated.has(item.$?.name));
    }
    return config;
  });
};

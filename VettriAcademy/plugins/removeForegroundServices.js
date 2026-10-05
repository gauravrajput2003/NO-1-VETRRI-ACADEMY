const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function removeForegroundServices(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const removeEntries = (entries, names) => {
      for (const name of names) {
        const existing = entries.find((entry) => entry.$?.['android:name'] === name);
        if (existing) {
          existing.$['tools:node'] = 'remove';
        } else {
          entries.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
        }
      }
    };

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    removeEntries(manifest['uses-permission'], [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    ]);

    const application = manifest.application?.[0];
    if (!application) {
      throw new Error('removeForegroundServices: Android manifest has no application element');
    }
    application.service = application.service || [];
    removeEntries(application.service, [
      'expo.modules.audio.service.AudioRecordingService',
      'expo.modules.audio.service.AudioControlsService',
    ]);

    return config;
  });
};

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function hooks() {
  const callbacks = {}, module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plugins/withReleaseOptimization.js'), 'utf8'), {
    module, require: () => ({
      withGradleProperties(config, callback) { callbacks.properties = callback; return config; },
      withAppBuildGradle(config, callback) { callbacks.gradle = callback; return config; },
    }),
  });
  module.exports({});
  return callbacks;
}

test('release properties are enabled without duplicates or changes to other properties', () => {
  const { properties } = hooks();
  const config = { modResults: [
    { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'false' },
    { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
    { type: 'property', key: 'hermesEnabled', value: 'true' },
  ] };
  properties(config); properties(config);
  for (const key of ['android.enableMinifyInReleaseBuilds', 'android.enableShrinkResourcesInReleaseBuilds']) {
    const entries = config.modResults.filter((entry) => entry.key === key);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].value, 'true');
  }
  assert.equal(config.modResults.find((entry) => entry.key === 'hermesEnabled').value, 'true');
});

test('optimized default rules survive repeated prebuild modification and preserve custom rules', () => {
  const { gradle } = hooks();
  const config = { modResults: { language: 'groovy', contents: 'proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"' } };
  gradle(config); gradle(config);
  assert.equal(config.modResults.contents, 'proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"');
});

test('unexpected templates fail visibly rather than silently disabling optimization', () => {
  assert.throws(() => hooks().gradle({ modResults: { language: 'groovy', contents: '' } }), /could not find/);
});

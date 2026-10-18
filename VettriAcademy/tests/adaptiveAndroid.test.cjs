const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { AndroidConfig } = require('@expo/config-plugins');

test('adaptive manifest permits rotation/resizing and preserves other Android settings on repeated prebuilds', () => {
  let modify;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plugins/withAdaptiveAndroid.js'), 'utf8'), {
    module, require: () => ({ AndroidConfig, withAndroidManifest: (config, callback) => { modify = callback; return config; }, withAndroidStyles: config => config }),
  });
  module.exports({});
  const activity = { $: { 'android:name': '.MainActivity', 'android:screenOrientation': 'portrait', 'android:resizeableActivity': 'false', 'android:maxAspectRatio': '1.8', 'android:minAspectRatio': '1.2', 'android:windowSoftInputMode': 'adjustResize', 'android:exported': 'true' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }] }] };
  const manifest = { manifest: { 'uses-permission': [{ $: { 'android:name': 'android.permission.RECORD_AUDIO' } }], application: [{ activity: [activity] }] } };
  const config = { modResults: manifest };
  modify(config); modify(config);
  assert.equal(activity.$['android:screenOrientation'], 'unspecified');
  assert.equal(activity.$['android:resizeableActivity'], 'true');
  assert.equal(activity.$['android:maxAspectRatio'], undefined);
  assert.equal(activity.$['android:minAspectRatio'], undefined);
  assert.equal(activity.$['android:windowSoftInputMode'], 'adjustResize');
  assert.equal(activity.$['android:exported'], 'true');
  assert.equal(manifest.manifest['uses-permission'][0].$['android:name'], 'android.permission.RECORD_AUDIO');
});

test('managed release keeps edge-to-edge and registers rotation/resizing plus R8 plugins', () => {
  const { expo } = require('../app.json');
  assert.equal(expo.orientation, 'default');
  assert.equal(expo.android.edgeToEdgeEnabled, true);
  assert.ok(expo.plugins.includes('./plugins/withAdaptiveAndroid'));
  assert.ok(expo.plugins.includes('./plugins/withReleaseOptimization'));
});

test('app themes no longer request deprecated system-bar colors or status contrast', () => {
  let modify;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plugins/withAdaptiveAndroid.js'), 'utf8'), {
    module, require: () => ({ AndroidConfig, withAndroidManifest: config => config, withAndroidStyles: (config, callback) => { modify = callback; return config; } }),
  });
  module.exports({});
  const items = ['android:statusBarColor', 'android:navigationBarColor', 'android:navigationBarDividerColor', 'android:enforceStatusBarContrast', 'android:enforceNavigationBarContrast', 'android:editTextBackground', 'colorPrimary'].map(name => ({ $: { name }, _: 'original' }));
  const config = { modResults: { resources: { style: [{ $: { name: 'AppTheme' }, item: items }] } } };
  modify(config); modify(config);
  assert.deepEqual(Array.from(config.modResults.resources.style[0].item, item => item.$.name), ['android:enforceNavigationBarContrast', 'android:editTextBackground', 'colorPrimary']);
});

test('resizable screens do not retain unbound dimension references in module styles', () => {
  const parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
  for (const file of ['screens/student/DashboardScreen.jsx', 'screens/auth/LoginScreen.jsx', 'components/AIAssistantDrawer.jsx']) {
    const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, { ReferencedIdentifier(reference) {
      if (['width', 'SW', 'SH', 'DRAWER_WIDTH'].includes(reference.node.name)) {
        assert.ok(reference.scope.hasBinding(reference.node.name), `${file}:${reference.node.loc.start.line} has an unbound dimension`);
      }
    } });
  }
});

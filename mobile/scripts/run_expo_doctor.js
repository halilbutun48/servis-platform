const fs = require('fs');
const path = require('path');

function ok(message) {
  console.log(`OK ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function hasPlugin(appJson, name) {
  return Array.isArray(appJson?.expo?.plugins) && appJson.expo.plugins.some((plugin) => {
    if (typeof plugin === 'string') {
      return plugin === name;
    }
    return Array.isArray(plugin) && plugin[0] === name;
  });
}

const mobileRoot = process.cwd();
const packageJson = readJson(path.join(mobileRoot, 'package.json'));
const appJson = readJson(path.join(mobileRoot, 'app.json'));

const deps = packageJson.dependencies || {};
const requiredDeps = ['expo', 'expo-location', 'expo-secure-store', 'expo-speech', 'expo-task-manager', 'expo-updates'];
requiredDeps.forEach((dep) => {
  if (deps[dep]) {
    ok(`dependency present: ${dep}`);
  } else {
    fail(`dependency missing: ${dep}`);
  }
});

if (appJson?.expo?.runtimeVersion?.policy === 'appVersion') {
  ok('runtimeVersion policy is appVersion');
} else {
  fail('runtimeVersion policy is appVersion');
}

if (appJson?.expo?.updates?.checkAutomatically === 'ON_LOAD') {
  ok('updates checkAutomatically is ON_LOAD');
} else {
  fail('updates checkAutomatically is ON_LOAD');
}

if (appJson?.expo?.extra?.appRole === 'DRIVER') {
  ok('appRole is DRIVER');
} else {
  fail('appRole is DRIVER');
}

if (appJson?.expo?.extra?.releaseStage) {
  ok('release stage is set');
} else {
  fail('release stage is set');
}

if (hasPlugin(appJson, 'expo-secure-store')) {
  ok('secure-store plugin present');
} else {
  fail('secure-store plugin present');
}

if (hasPlugin(appJson, 'expo-location')) {
  ok('location plugin present');
} else {
  fail('location plugin present');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('=== EXPO DOCTOR LOCAL CHECK PASS ===');

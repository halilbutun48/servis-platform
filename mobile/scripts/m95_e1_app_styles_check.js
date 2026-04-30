const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const appPath = path.join(root, 'mobile', 'App.js');
const statePath = path.join(root, 'mobile', 'src', 'app', 'mobileAppState.js');

function fail(message) {
  throw new Error(`M95-E1 app styles check failed: ${message}`);
}

const app = fs.readFileSync(appPath, 'utf8');
const state = fs.readFileSync(statePath, 'utf8');

if (!/import\s*\{[^}]*\bstyles\b[^}]*\}\s*from\s*['"]\.\/src\/app\/mobileAppState['"]/.test(app)) {
  fail('mobile/App.js must import styles from mobileAppState.');
}

if (!/styles\s*=\s*\{\s*styles\s*\}/.test(app)) {
  fail('MobileAppContent must receive the shared styles prop.');
}

if (!/style\s*=\s*\{\s*styles\.safe\s*\}/.test(app)) {
  fail('SafeAreaView must use styles.safe.');
}

if (!/export\s+const\s+styles\s*=\s*StyleSheet\.create\(/.test(state)) {
  fail('mobileAppState.js must export styles via StyleSheet.create.');
}

if (!/safe:\s*\{/.test(state)) {
  fail('mobileAppState.js must define safe style.');
}

console.log('M95-E1 app styles check passed');

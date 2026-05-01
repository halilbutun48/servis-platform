const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(mobileRoot, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E15 PIN CHANGE LAYOUT + SUBMIT CHECK ===');

const pin = read(path.join('src', 'screens', 'PinChangeScreen.js'));
const app = read('App.js');
const content = read(path.join('src', 'app', 'MobileAppContent.js'));
const lifecycle = read(path.join('src', 'app', 'useMobileAppLifecycle.js'));
const packageJson = JSON.parse(read('package.json'));

must(/KeyboardAvoidingView/.test(pin), 'PIN screen uses KeyboardAvoidingView');
must(/ScrollView/.test(pin), 'PIN screen uses ScrollView');
must(/keyboardShouldPersistTaps="handled"/.test(pin), 'PIN screen keeps keyboard taps handled');
must(/keyboardDismissMode="on-drag"/.test(pin), 'PIN screen dismisses keyboard on drag');
must(/justifyContent:\s*'flex-start'/.test(pin), 'PIN screen is top aligned instead of centered');
must(/errorShell/.test(pin), 'PIN screen keeps a stable error shell');
must(/minHeight:\s*28/.test(pin), 'PIN screen error shell keeps a minimum height');
must(/submitLockRef/.test(pin), 'PIN screen defines a submit lock ref');
must(/disabled=\{busy \|\| submitLockRef\.current\}/.test(pin), 'PIN screen disables submit while locked');
must(/disabled=\{busy \|\| submitLockRef\.current\}/.test(pin), 'PIN screen disables logout while locked');
must(/secureTextEntry/.test(pin), 'PIN field keeps secure text entry');
must(!/\[object Object\]/.test(pin), 'PIN screen does not keep object-object text');
must(!/token/i.test(pin), 'PIN screen source does not expose token text');
must(!/password/i.test(pin), 'PIN screen source does not expose password text');

must(/DriverShellLoadingScreen/.test(content), 'MobileAppContent still keeps driver shell fallback');
must(/function handleDriverShellReady\(\)/.test(app), 'App still keeps driver shell ready handler');
must(/ensureDeviceId/.test(lifecycle) && /from '\.\.\/lib\/api'/.test(lifecycle), 'lifecycle ensureDeviceId import stays fixed');
must(Boolean(packageJson?.scripts?.['check:m95e15']), 'package exposes m95e15 check');
must(String(packageJson?.scripts?.['check:m1'] || '').includes('check:m95e15'), 'check:m1 includes m95e15');
must(String(packageJson?.scripts?.['acceptance:mobile'] || '').includes('check:m95e15'), 'acceptance chain includes m95e15');

console.log('M95-E15 PIN change layout + submit check passed');

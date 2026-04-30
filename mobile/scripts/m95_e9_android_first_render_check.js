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

console.log('=== M95-E9 ANDROID FIRST RENDER CHECK ===');

const app = read('App.js');
const content = read(path.join('src', 'app', 'MobileAppContent.js'));
const login = read(path.join('src', 'screens', 'LoginScreen.js'));
const state = read(path.join('src', 'app', 'mobileAppState.js'));
const release = read(path.join('src', 'lib', 'release.js'));
const api = read(path.join('src', 'lib', 'api.js'));
const appConfig = read('app.config.js');
const plugin = read(path.join('plugins', 'withLocalEmulatorNetworkSecurity.js'));
const pkg = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));
const localProfile = eas?.build?.['local-apk'] || null;

must(/import\s+\{[^}]*Platform[^}]*\}\s+from\s+'react-native'/.test(app), 'App.js imports Platform');
must(/Platform\.OS === 'ios' \? <StatusBar barStyle="dark-content" \/> : null/.test(app), 'App.js renders StatusBar only on iOS');
must(!/<StatusBar barStyle="dark-content" \/>/.test(app.replace(/Platform\.OS === 'ios' \? <StatusBar barStyle="dark-content" \/> : null/g, '')), 'App.js has no unconditional StatusBar render');
must(/<SafeAreaView style=\{styles\.safe\}>/.test(app), 'App.js keeps styles.safe on root shell');

must(/if \(loading\) \{\s*return <LoadingScreen styles=\{shellStyles\} \/>\s*;\s*\}/s.test(content), 'MobileAppContent keeps loading fallback');
must(/if \(!state\?\.session\?\.token\)/.test(content), 'MobileAppContent keeps login screen path');
must(/<LoginScreen[\s\S]*onLogin=\{onLogin\}[\s\S]*apiBaseUrl=\{apiBaseUrl\}/.test(content), 'MobileAppContent forwards login screen props');
must(/safe:\s*\{/.test(state), 'shared app state keeps safe shell style');

must(/withLocalEmulatorNetworkSecurity/.test(appConfig), 'app config keeps local network security plugin');
must(/if \(isLocalEmulator\)/.test(appConfig), 'app config still gates the plugin by local emulator');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'app config keeps local cleartext only');
must(/createRunOncePlugin/.test(plugin), 'network security plugin remains a run-once plugin');
must(/network_security_config\.xml/.test(plugin), 'network security plugin still writes xml');
must(/10\.0\.2\.2/.test(plugin), 'network security plugin still allows emulator host');

must(/EXPO_PUBLIC_API_BASE_URL/.test(api), 'api keeps API base env usage');
must(/return rawRequest\('\/api\/auth\/login'/.test(api), 'login still targets /api/auth/login');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local emulator root host remains in local-apk profile');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https requirement for non-local stages');
must(/local-emulator/.test(release), 'release guard still knows the local emulator stage');

must(Boolean(pkg?.scripts?.['check:m95e9']), 'package exposes m95e9 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e9'), 'check:m1 includes m95e9');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e9'), 'acceptance chain includes m95e9');

console.log('M95-E9 android first render check passed');

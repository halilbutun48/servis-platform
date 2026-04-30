const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel, root = mobileRoot) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E8 ANDROID NETWORK SECURITY LOCAL CHECK ===');

const appConfig = read('app.config.js');
const plugin = read(path.join('plugins', 'withLocalEmulatorNetworkSecurity.js'));
const api = read(path.join('src', 'lib', 'api.js'));
const release = read(path.join('src', 'lib', 'release.js'));
const eas = JSON.parse(read('eas.json'));
const runbook = read(path.join('..', 'docs', 'RUNBOOK_M95E0_ANDROID_BUILD.md'));
const pkg = JSON.parse(read('package.json'));

const localProfile = eas?.build?.['local-apk'] || null;
const previewProfile = eas?.build?.preview || null;
const productionProfile = eas?.build?.production || null;
const runbookLower = runbook.toLowerCase();

must(Boolean(localProfile), 'local-apk profile exists');
must(Boolean(previewProfile), 'preview profile exists');
must(Boolean(productionProfile), 'production profile exists');

must(/withLocalEmulatorNetworkSecurity/.test(appConfig), 'app config imports local network security plugin');
must(/if \(isLocalEmulator\)/.test(appConfig), 'app config gates plugin by local emulator stage');
must(/plugins\.push\(withLocalEmulatorNetworkSecurity\)/.test(appConfig), 'app config enables plugin only for local emulator');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'app config keeps cleartext traffic local only');

must(/createRunOncePlugin/.test(plugin), 'network security plugin is a run-once plugin');
must(/android:usesCleartextTraffic/.test(plugin), 'plugin sets android usesCleartextTraffic');
must(/android:networkSecurityConfig/.test(plugin), 'plugin sets android networkSecurityConfig');
must(/network_security_config\.xml/.test(plugin), 'plugin writes network security xml');
must(/cleartextTrafficPermitted="false"/.test(plugin), 'plugin keeps base config locked down');
must(/cleartextTrafficPermitted="true"/.test(plugin), 'plugin allows local cleartext domains');
must(/10\.0\.2\.2/.test(plugin), 'plugin allows emulator host');
must(/localhost/.test(plugin), 'plugin allows localhost when local-only');
must(/127\.0\.0\.1/.test(plugin), 'plugin allows loopback when local-only');

must(String(localProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase() === 'local-emulator', 'local profile keeps local-emulator stage');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local profile keeps root host api base');
must(!String(previewProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase().includes('local-emulator'), 'preview stage is not local-emulator');
must(!String(productionProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase().includes('local-emulator'), 'production stage is not local-emulator');
must(/pathname\s*!==\s*'\/'/.test(release), 'release guard keeps local emulator root host');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https requirement for non-local stages');
must(/return rawRequest\('\/api\/auth\/login'/.test(api), 'login still targets /api/auth/login');
must(/\/api\/api/.test(runbook), 'runbook warns against duplicate api path');
must(runbook.includes('network security config'), 'runbook explains native network security config');
must(
  runbookLower.includes("tarayıcı host'a erişebiliyor olsa bile") ||
    runbookLower.includes('native fetch ayrı izin ister'),
  'runbook distinguishes browser reachability from app fetch',
);
must(runbook.includes('Production build\'de cleartext açık kalmamalıdır') || runbook.includes('Production build\'de cleartext açık kalmamalıdır.'), 'runbook keeps production cleartext warning');
must(Boolean(pkg?.scripts?.['check:m95e8']), 'package exposes m95e8 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e8'), 'check:m1 includes m95e8');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e8'), 'acceptance chain includes m95e8');

console.log('M95-E8 android network security local check passed');

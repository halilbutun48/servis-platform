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

console.log('=== M95-E7 ANDROID CLEARTEXT LOCAL CHECK ===');

const appConfig = read('app.config.js');
const api = read(path.join('src', 'lib', 'api.js'));
const release = read(path.join('src', 'lib', 'release.js'));
const eas = JSON.parse(read('eas.json'));
const runbook = read(path.join('..', 'docs', 'RUNBOOK_M95E0_ANDROID_BUILD.md'));
const pkg = JSON.parse(read('package.json'));
const localProfile = eas?.build?.['local-apk'] || null;
const previewProfile = eas?.build?.preview || null;
const productionProfile = eas?.build?.production || null;

must(Boolean(localProfile), 'local-apk profile exists');
must(Boolean(previewProfile), 'preview profile exists');
must(Boolean(productionProfile), 'production profile exists');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'app config gates cleartext by local emulator stage');
must(String(localProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase() === 'local-emulator', 'local profile keeps local-emulator stage');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local profile uses root host api base');
must(!String(previewProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase().includes('local-emulator'), 'preview stage is not local-emulator');
must(!String(productionProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase().includes('local-emulator'), 'production stage is not local-emulator');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https requirement for non-local stages');
must(/pathname\s*!==\s*'\/'/.test(release), 'release guard still expects local emulator root host');
must(/return rawRequest\('\/api\/auth\/login'/.test(api), 'login still targets /api/auth/login');
must(runbook.includes('cleartext'), 'runbook explains cleartext policy');
must(runbook.includes('local-emulator'), 'runbook mentions local-emulator cleartext exception');
must(runbook.includes('Production build\'de cleartext açık kalmamalıdır') || runbook.includes('Production build\'de cleartext açık kalmamalıdır.'), 'runbook keeps production cleartext warning');
must(Boolean(pkg?.scripts?.['check:m95e7']), 'package exposes m95e7 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e7'), 'check:m1 includes m95e7');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e7'), 'acceptance chain includes m95e7');

console.log('M95-E7 android cleartext local check passed');

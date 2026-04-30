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

console.log('=== M95-E6 API BASE JOIN CHECK ===');

const api = read(path.join('src', 'lib', 'api.js'));
const release = read(path.join('src', 'lib', 'release.js'));
const eas = JSON.parse(read('eas.json'));
const runbook = read(path.join('..', 'docs', 'RUNBOOK_M95E0_ANDROID_BUILD.md'));
const pkg = JSON.parse(read('package.json'));

const localProfile = eas?.build?.['local-apk'] || null;

must(Boolean(localProfile), 'local-apk profile exists');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local-apk uses root host api base');
must(String(localProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase() === 'local-emulator', 'local-apk keeps local-emulator stage');

must(/function buildUrl\(path\)/.test(api), 'api keeps buildUrl helper');
must(/new URL\(normalizedPath, baseUrl\)\.toString\(\)/.test(api), 'api joins base and path with URL');
must(!/\/api\/api\/auth\/login/.test(api), 'api source does not hardcode duplicate api login path');
must(/return rawRequest\('\/api\/auth\/login'/.test(api), 'login keeps /api/auth/login endpoint path');
must(/String\(releaseGuard\?\.stage \|\| ''\)\.trim\(\)\.toLowerCase\(\) !== 'local-emulator'/.test(api), 'login diagnostics remain local-emulator only');

must(/protocol\s*!==\s*'http:'/.test(release), 'release guard keeps local-emulator http branch');
must(/hostname\s*!==\s*'10\.0\.2\.2'/.test(release), 'release guard pins emulator host');
must(/port.*3000/.test(release), 'release guard pins emulator port');
must(/pathname\s*!==\s*'\/'/.test(release), 'release guard requires emulator root host');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https requirement for non-local stages');

must(runbook.includes('http://10.0.2.2:3000'), 'runbook documents emulator root host');
must(runbook.includes('/api/...'), 'runbook documents endpoint path joining');
must(runbook.includes('/api/api'), 'runbook documents duplicate api path warning');
must(runbook.includes('tekrar etmemelidir'), 'runbook warns against duplicate api path');
must(Boolean(pkg?.scripts?.['check:m95e6']), 'package exposes m95e6 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e6'), 'check:m1 includes m95e6');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e6'), 'acceptance chain includes m95e6');

console.log('M95-E6 API base join check passed');

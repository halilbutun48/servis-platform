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

console.log('=== M95-E14 LIFECYCLE NAMED IMPORTS CHECK ===');

const lifecycle = read(path.join('src', 'app', 'useMobileAppLifecycle.js'));
const voice = read(path.join('src', 'lib', 'voice.js'));
const shellCheck = read(path.join('scripts', 'm95_e12_post_login_driver_shell_check.js'));
const packageJson = JSON.parse(read('package.json'));

must(/from '\.\.\/lib\/voice'/.test(lifecycle), 'useMobileAppLifecycle.js imports voice helpers from ../lib/voice');
must(/buildCompletionCueKey/.test(lifecycle), 'useMobileAppLifecycle.js keeps buildCompletionCueKey');
must(/buildDriverChangeCueKey/.test(lifecycle), 'useMobileAppLifecycle.js keeps buildDriverChangeCueKey');
must(/buildVoiceCueKey/.test(lifecycle), 'useMobileAppLifecycle.js keeps buildVoiceCueKey');
must(/buildVoiceWelcomeKey/.test(lifecycle), 'useMobileAppLifecycle.js keeps buildVoiceWelcomeKey');
must(/speakDriverChangeAlert/.test(lifecycle), 'useMobileAppLifecycle.js keeps speakDriverChangeAlert');
must(/speakNextStop/.test(lifecycle), 'useMobileAppLifecycle.js keeps speakNextStop');
must(/speakReachedStopAndNext/.test(lifecycle), 'useMobileAppLifecycle.js keeps speakReachedStopAndNext');
must(/speakRouteCompleted/.test(lifecycle), 'useMobileAppLifecycle.js keeps speakRouteCompleted');
must(/speakShiftWelcome/.test(lifecycle), 'useMobileAppLifecycle.js keeps speakShiftWelcome');

const mobileStateImportMatch = lifecycle.match(/import\s+\{([\s\S]*?)\}\s+from\s+'\.\/mobileAppState';/);
must(Boolean(mobileStateImportMatch), 'useMobileAppLifecycle.js keeps mobileAppState import block');
const mobileStateImportBlock = mobileStateImportMatch[1];
must(/applyGpsRuntimeSnapshot/.test(mobileStateImportBlock), 'mobileAppState import keeps applyGpsRuntimeSnapshot');
must(/decorateGpsState/.test(mobileStateImportBlock), 'mobileAppState import keeps decorateGpsState');
must(/hydrateStateFromSnapshot/.test(mobileStateImportBlock), 'mobileAppState import keeps hydrateStateFromSnapshot');
must(/isNetworkError/.test(mobileStateImportBlock), 'mobileAppState import keeps isNetworkError');
must(/readGpsRuntimeSnapshot/.test(mobileStateImportBlock), 'mobileAppState import keeps readGpsRuntimeSnapshot');
must(!/buildCompletionCueKey/.test(mobileStateImportBlock), 'mobileAppState import does not keep buildCompletionCueKey');
must(!/buildDriverChangeCueKey/.test(mobileStateImportBlock), 'mobileAppState import does not keep buildDriverChangeCueKey');
must(!/buildVoiceCueKey/.test(mobileStateImportBlock), 'mobileAppState import does not keep buildVoiceCueKey');
must(!/buildVoiceWelcomeKey/.test(mobileStateImportBlock), 'mobileAppState import does not keep buildVoiceWelcomeKey');

must(/export function buildCompletionCueKey/.test(voice), 'voice.js exports buildCompletionCueKey');
must(/export function buildDriverChangeCueKey/.test(voice), 'voice.js exports buildDriverChangeCueKey');
must(/export function buildVoiceCueKey/.test(voice), 'voice.js exports buildVoiceCueKey');
must(/export function buildVoiceWelcomeKey/.test(voice), 'voice.js exports buildVoiceWelcomeKey');

must(/ensureDeviceId/.test(lifecycle), 'useMobileAppLifecycle.js keeps ensureDeviceId usage');
must(/from '\.\.\/lib\/api'/.test(lifecycle), 'useMobileAppLifecycle.js keeps ensureDeviceId import from ../lib/api');
must(/DriverShellLoadingScreen/.test(shellCheck), 'existing post-login shell check remains present');
must(Boolean(packageJson?.scripts?.['check:m95e14']), 'package exposes m95e14 check');
must(String(packageJson?.scripts?.['check:m1'] || '').includes('check:m95e14'), 'check:m1 includes m95e14');
must(String(packageJson?.scripts?.['acceptance:mobile'] || '').includes('check:m95e14'), 'acceptance chain includes m95e14');

console.log('M95-E14 lifecycle named imports check passed');

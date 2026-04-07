const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function assertContains(text, needles, label) {
  const arr = Array.isArray(needles) ? needles : [needles];
  const missing = arr.filter((needle) => !text.includes(needle));
  if (missing.length) {
    fail(`${label} missing => ${missing.join(', ')}`);
    return;
  }
  ok(label);
}

const pkg = JSON.parse(read('mobile/package.json'));
const pkgText = JSON.stringify(pkg);
const storage = read('mobile/src/lib/storage.js');
const api = read('mobile/src/lib/api.js');
const app = read('mobile/App.js');
const routeScreen = read('mobile/src/screens/RouteScreen.js');
const liveScreen = read('mobile/src/screens/LiveScreen.js');
const todayScreen = read('mobile/src/screens/TodayScreen.js');
const loginScreen = read('mobile/src/screens/LoginScreen.js');
const backgroundGps = read('mobile/src/lib/backgroundGps.js');
const release = read('mobile/src/lib/release.js');

assertContains(pkgText, ['check:m82.8', 'acceptance:mobile', 'doctor:mobile'], 'package exposes verification 2.0 entrypoints');
assertContains(pkg.scripts['acceptance:mobile'] || '', ['check:m82.4', 'check:m82.5', 'check:m82.6', 'check:m82.7', 'check:m82.8'], 'acceptance chain keeps M82.4-M82.8 gates');
assertContains(storage, ['getLastMobileSnapshot', 'saveLastMobileSnapshot', 'getSelectedShiftId', 'saveSelectedShiftId', 'getPendingSessionEvent', 'savePendingSessionEvent'], 'storage keeps snapshot + selected shift + pending session event');
assertContains(api, ['fetchShiftRoute', 'startDriverShift', 'pauseDriverShift', 'resumeDriverShift', 'completeDriverShift', 'markDriverStopReached', 'skipDriverStop', 'reopenDriverStop', 'undoDriverStop', 'AbortController'], 'api exposes shift route + manual ops + timeout');
assertContains(app, ['selectedShiftId', 'syncSignedIn', 'getPendingSessionEvent', 'RouteScreen', 'LiveScreen'], 'app wires selected shift + pending session event + split screens');
assertContains(routeScreen, ['Vardiyayı başlat', 'Durak ulaşıldı', 'Durağı atla', 'Geri al', 'Yeniden aç', 'Vardiyayı tamamla'], 'route screen exposes driver manual operations');
assertContains(liveScreen, ['Resmi kaynak', 'Yerel telefon onizleme', 'Resmi tazelik', 'Release / env'], 'live screen distinguishes official source from local preview');
assertContains(todayScreen, ['Release hazirligi', 'Resmi GPS tazeligi', 'Rota ekranını aç', 'Canlı ekranını aç'], 'today screen keeps release card and split navigation entry');
assertContains(loginScreen, ['Release / env kabul kontrolu'], 'login screen exposes release acceptance status');
assertContains(backgroundGps, ['getSelectedShiftId', 'savePendingSessionEvent', 'fetchShiftRoute', 'publishGps'], 'background gps keeps selected shift + session failure + route-only publish path');
assertContains(app, ['retryCount', 'nextRetryAt'], 'app keeps retry/backoff visibility in runtime state');
assertContains(release, ['buildReleaseInfo', 'acceptanceBlocking', 'releaseTarget', 'envStage'], 'release helper exposes acceptance metadata');

if (process.exitCode) {
  console.error('=== M82.8 VERIFICATION 2.0 CHECK FAIL ===');
  process.exit(process.exitCode);
}

console.log('=== M82.8 VERIFICATION 2.0 CHECK PASS ===');

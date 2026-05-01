const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function read(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function fail(message) {
  throw new Error(`M95-E17 FAIL: ${message}`);
}

function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) fail(message || `Eksik içerik: ${needle}`);
}

function assertNotIncludes(text, needle, message) {
  if (text.includes(needle)) fail(message || `İstenmeyen içerik: ${needle}`);
}

const api = read('src/lib/api.js');
const flow = read('src/app/mobileAppFlow.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');
const app = read('App.js');
const packageJson = JSON.parse(read('package.json'));

assertIncludes(api, "const QUERY_CACHE_TTL_MS", '/api/me için TTL guard eksik.');
assertIncludes(api, "const QUERY_RATE_LIMIT_COOLDOWN_MS", '/api/me için cooldown guard eksik.');
assertIncludes(api, 'requestWithQueryCache(', 'Query cache helper eksik.');
assertIncludes(api, "export async function fetchMe({ force = false } = {})", '/api/me fetch helper force parametresi eksik.');
assertIncludes(api, "return requestWithQueryCache('me'", '/api/me in-flight/TTL guard eksik.');
assertIncludes(api, "return requestWithQueryCache('notifications'", 'Notification cache eksik.');
assertIncludes(api, "return requestWithQueryCache('driver-today'", 'Driver today cache eksik.');
assertIncludes(api, "return requestWithQueryCache('driver-active-route'", 'Active route cache eksik.');
assertIncludes(api, "return requestWithQueryCache('driver-shift-route'", 'Shift route cache eksik.');
assertIncludes(api, "return requestWithQueryCache('kvkk-current'", 'KVKK cache eksik.');
assertIncludes(api, 'clearApiQueryCache()', 'Query cache temizliği eksik.');
assertIncludes(api, "code: 'RATE_LIMITED'", '429 cooldown kodu eksik.');

assertIncludes(flow, 'loadRouteBundle({', 'Route bundle helper eksik.');
assertIncludes(flow, 'force = false', 'Route helper force parametresi eksik.');
assertIncludes(flow, 'fetchShiftRoute(selectedShiftId, { force })', 'Shift route force parametresi eksik.');
assertIncludes(flow, 'fetchActiveRoute({ force })', 'Active route force parametresi eksik.');
assertIncludes(flow, 'fetchToday({ force }).catch(() => null)', 'Today refresh force parametresi eksik.');
assertIncludes(flow, 'fetchShiftRoute(preferredShiftId, { force })', 'GPS sonrası route force parametresi eksik.');

assertIncludes(lifecycle, 'const syncSignedInRef = useRef(syncSignedIn);', 'syncSignedIn ref guard eksik.');
assertIncludes(lifecycle, 'const refreshGpsStatusRef = useRef(refreshGpsStatus);', 'refreshGpsStatus ref guard eksik.');
assertIncludes(lifecycle, 'const applySessionFailureRef = useRef(applySessionFailure);', 'applySessionFailure ref guard eksik.');
assertIncludes(lifecycle, 'onSync: () => syncSignedInRef.current({ soft: true, skipMe: true })', 'Realtime sync me çağırmamalı.');
assertIncludes(lifecycle, 'if (session?.token && lastSyncedSessionTokenRef?.current === session.token) return;', 'Login sonrası çift bootstrap guard eksik.');
assertIncludes(lifecycle, 'await syncSignedInRef.current({ soft: Boolean(snapshot) });', 'Initial bootstrap kontrollü değil.');
assertIncludes(lifecycle, 'syncSignedInRef.current({ soft: true, skipMe: true }).catch(() => null);', 'Auto sync me fetchten ayrılmıyor.');
assertIncludes(lifecycle, 'refreshGpsStatusRef.current({ publishNow: true }).catch(() => null);', 'Active-state refresh yolu eksik.');
assertIncludes(lifecycle, 'refreshGpsStatusRef.current({ publishNow: false }).catch(() => null);', 'Driver GPS warmup yolu eksik.');
assertNotIncludes(lifecycle, 'syncSignedInRef.current({ soft: true, force: true })', 'Auto sync hala force ile tetikleniyor.');
assertNotIncludes(lifecycle, 'refreshGpsStatusRef.current({ publishNow: true, force: true })', 'Auto GPS refresh hala force ile tetikleniyor.');

assertIncludes(app, 'async function syncSignedIn({ soft = false, preferredShiftIdOverride = null, force = false, skipMe = false } = {})', 'syncSignedIn skipMe parametresi eksik.');
assertIncludes(app, 'const shouldFetchMe = !skipMe || !state.me;', 'me fetch kontrolü eksik.');
assertIncludes(app, 'const me = shouldFetchMe ? await fetchMe({ force }) : state.me;', 'Controlled me fetch eksik.');
assertIncludes(app, 'const notificationsPromise = fetchMyNotifications({ force }).catch(() => []);', 'Notifications fetch force parametresi eksik.');
assertIncludes(app, 'fetchKvkkCurrent({ force }).catch(() => null),', 'KVKK fetch force parametresi eksik.');
assertIncludes(app, 'fetchToday({ force }).catch(() => null),', 'Today fetch force parametresi eksik.');
assertIncludes(app, 'refreshRouteAfterGpsPublishFlow({', 'GPS sonrası route refresh akışı eksik.');
assertIncludes(app, 'force,', 'Force parametresi route akışına taşınmamış.');
assertIncludes(app, 'lastSyncedSessionTokenRef.current = String(', 'Session bootstrap guard eksik.');
assertIncludes(app, 'async function refreshKvkkStatus({ accepted = false, force = false } = {})', 'KVKK refresh force opsiyonu eksik.');
assertIncludes(app, "const rateLimited = Number(error?.status || 0) === 429 || String(error?.code || '').toUpperCase() === 'RATE_LIMITED';", '429 throttling guard eksik.');
assertIncludes(app, "status: 'throttled'", '429 sonrası cooldown durumu eksik.');
assertNotIncludes(app, 'fetchMe()', 'Çıplak fetchMe çağrısı kalmış.');
assertNotIncludes(app, 'fetchMyNotifications()', 'Çıplak notifications çağrısı kalmış.');
assertNotIncludes(app, 'fetchToday()', 'Çıplak today çağrısı kalmış.');
assertNotIncludes(app, 'fetchKvkkCurrent()', 'Çıplak kvkk çağrısı kalmış.');

if (!packageJson.scripts?.['check:m95e17']) {
  fail('package.json içinde check:m95e17 yok.');
}

if (!String(packageJson.scripts?.['check:m1'] || '').includes('check:m95e17')) {
  fail('check:m1 zincirinde check:m95e17 yok.');
}

if (!String(packageJson.scripts?.['acceptance:mobile'] || '').includes('check:m95e17')) {
  fail('acceptance:mobile zincirinde check:m95e17 yok.');
}

console.log('M95-E17 me request loop check passed');

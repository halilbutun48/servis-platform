#!/usr/bin/env node
/*
  M81.3 Mobile GPS Flow Smoke
  Purpose: verify that the mobile background GPS layer, mobile state layer,
  backend GPS ingest route, and WebSocket publication surface are wired together.
  This is intentionally static/contract-based so it can run without a phone,
  Expo runtime, Postgres, Redis, OSRM, or a running API.
*/
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const strict = process.argv.includes('--strict');
let failCount = 0;
let warnCount = 0;

function rel(p) { return path.join(repoRoot, p); }
function exists(p) { return fs.existsSync(rel(p)); }
function read(p) {
  const f = rel(p);
  if (!fs.existsSync(f)) return '';
  return fs.readFileSync(f, 'utf8');
}
function ok(msg) { console.log(`OK ${msg}`); }
function warn(msg) { warnCount += 1; console.log(`WARN ${msg}`); }
function fail(msg) { failCount += 1; console.log(`FAIL ${msg}`); }
function mustPath(p, msg) { exists(p) ? ok(msg) : fail(`${msg} (${p})`); }
function must(text, needle, msg) { text.includes(needle) ? ok(msg) : fail(msg); }
function mustAny(text, needles, msg) { needles.some((n) => text.includes(n)) ? ok(msg) : fail(msg); }
function warnAny(text, needles, msg) { needles.some((n) => text.includes(n)) ? ok(msg) : warn(msg); }

console.log('=== M81.3 MOBILE GPS FLOW SMOKE ===');
console.log(`Repo root: ${repoRoot}`);
console.log(`Mode: ${strict ? 'strict' : 'soft'}`);

const files = {
  mobilePkg: 'mobile/package.json',
  app: 'mobile/App.js',
  appState: 'mobile/src/app/mobileAppState.js',
  backgroundGps: 'mobile/src/lib/backgroundGps.js',
  realtime: 'mobile/src/lib/realtime.js',
  gpsLib: 'mobile/src/lib/gps.js',
  today: 'mobile/src/screens/TodayScreen.js',
  live: 'mobile/src/screens/LiveScreen.js',
  backendGps: 'backend/src/routes/gps.js',
  backendServer: 'backend/src/server.js',
};

Object.entries(files).forEach(([key, p]) => mustPath(p, `${key} file exists`));

const mobilePkg = read(files.mobilePkg);
const app = read(files.app);
const appState = read(files.appState);
const backgroundGps = read(files.backgroundGps);
const realtime = read(files.realtime);
const gpsLib = read(files.gpsLib);
const today = read(files.today);
const live = read(files.live);
const backendGps = read(files.backendGps);
const backendServer = read(files.backendServer);
const apiLib = read('mobile/src/lib/api.js');


// Mobile background runtime chain
must(backgroundGps, 'requestBackgroundPermissionsAsync', 'mobile requests background GPS permission');
must(backgroundGps, 'startLocationUpdatesAsync', 'mobile can start background location updates');
warnAny(backgroundGps, ['stopLocationUpdatesAsync', 'stopDriverBackgroundLocation'], 'mobile can stop background location updates');
mustAny(backgroundGps, ['getDriverBackgroundRuntimeStatus', 'readGpsRuntimeSnapshot'], 'mobile exposes background runtime snapshot source');
mustAny(app, ['readGpsRuntimeSnapshot', 'getDriverBackgroundRuntimeStatus'], 'App reads GPS runtime snapshot');
must(appState, 'backgroundPermissionStatus', 'state keeps background permission status');
must(appState, 'backgroundTaskState', 'state keeps background task status');
mustAny(today + live, ['backgroundPermissionStatus', 'backgroundPermissionText', 'Arka plan izni'], 'mobile UI exposes background permission status');
mustAny(today + live, ['backgroundTaskState', 'backgroundTaskText', 'Arka plan servis'], 'mobile UI exposes background service status');

// Mobile publish / API chain
mustAny(gpsLib + app + backgroundGps, ['postGps', 'publishGps', 'sendGps', '/gps', 'gps'], 'mobile has GPS publish surface');
mustAny(apiLib, ['headers.Authorization', 'Authorization', 'Bearer'], 'central api layer carries auth header/token path');
mustAny(backgroundGps + app, ['sessionToken'], 'background GPS flow passes session token');
warnAny(realtime + mobilePkg, ['socket.io-client', 'WebSocket'], 'mobile realtime dependency/surface is visible');

// Backend ingest and publication chain
mustAny(backendGps, ['router.post', '.post('], 'backend GPS route exposes POST ingest');
mustAny(backendGps + backendServer, ['/api/gps', 'gpsRouter', 'gps'], 'backend mounts GPS route surface');
warnAny(backendGps, ['gps:update', 'io.to', 'emit(', 'publish'], 'backend GPS ingest has WS publish/update signal');
warnAny(backendGps, ['vehicle_last', 'vehicleLast', 'GpsPoint', 'gpsPoint', 'latest'], 'backend GPS ingest touches latest/history persistence path');
warnAny(backendGps, ['queue', 'autoReached', 'enqueue'], 'backend GPS ingest touches auto-reached queue or decoupled path');

// Dependency sanity: do not fail in soft mode because repo may vendor or defer install,
// but strict mode fails if realtime imports socket.io-client without dependency metadata.
const importsSocketIo = realtime.includes('socket.io-client');
const declaresSocketIo = mobilePkg.includes('socket.io-client');
if (importsSocketIo && !declaresSocketIo) {
  const msg = 'mobile realtime imports socket.io-client but mobile/package.json does not declare it';
  strict ? fail(msg) : warn(msg);
} else if (importsSocketIo && declaresSocketIo) {
  ok('mobile socket.io-client dependency is declared');
} else {
  warn('mobile socket.io-client import not found; realtime may use another transport');
}

console.log('=== M81.3 SUMMARY ===');
console.log(`WARN: ${warnCount}`);
console.log(`FAIL: ${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.log('M81.3 MOBILE GPS FLOW SMOKE FAIL');
} else {
  console.log('M81.3 MOBILE GPS FLOW SMOKE PASS');
}

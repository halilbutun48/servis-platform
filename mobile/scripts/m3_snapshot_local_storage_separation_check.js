const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(text, needle, msg) {
  if (!text.includes(needle)) {
    throw new Error(`FAIL ${msg}`);
  }
  ok(msg);
}

console.log('=== M3 SNAPSHOT / LOCAL STORAGE SEPARATION CHECK ===');

const pkg = JSON.parse(read('package.json'));
const storage = read('src/lib/storage.js');
const appState = read('src/app/mobileAppState.js');
const app = read('App.js');

must(JSON.stringify(pkg.scripts || {}), '"check:m3"', 'package json exposes check:m3');

must(storage, 'const SESSION_KEY =', 'storage defines session key');
must(storage, 'const DEVICE_KEY =', 'storage defines device key');
must(storage, 'const VOICE_ENABLED_KEY =', 'storage defines voice guidance key');
must(storage, 'const SNAPSHOT_KEY =', 'storage defines snapshot key');
must(storage, 'const SELECTED_SHIFT_KEY =', 'storage defines selected shift key');
must(storage, 'const PENDING_SESSION_EVENT_KEY =', 'storage defines pending session recovery key');

must(storage, 'getSession', 'storage exposes session helpers');
must(storage, 'getDeviceId', 'storage exposes device id helpers');
must(storage, 'getVoiceGuidanceEnabled', 'storage exposes voice preference helpers');
must(storage, 'getLastMobileSnapshot', 'storage exposes snapshot helpers');
must(storage, 'getSelectedShiftId', 'storage exposes selected shift helpers');
must(storage, 'getPendingSessionEvent', 'storage exposes pending session helpers');

must(appState, 'buildMobileSnapshot', 'app state builds mobile snapshot');
must(appState, 'hydrateStateFromSnapshot', 'app state hydrates from snapshot');
must(appState, 'initialState', 'app state keeps initial runtime state');
must(appState, 'nextKvkkState', 'app state keeps recovery-oriented kvkk state');
must(appState, 'buildLocalPreviewSnapshot', 'app state keeps local preview snapshot helper');

must(app, 'getLastMobileSnapshot', 'app reads snapshot from local storage');
must(app, 'saveLastMobileSnapshot', 'app writes snapshot to local storage');
must(app, 'getSelectedShiftId', 'app reads selected shift from local storage');
must(app, 'saveSelectedShiftId', 'app writes selected shift to local storage');
must(app, 'getPendingSessionEvent', 'app reads pending recovery event');
must(app, 'clearPendingSessionEvent', 'app clears pending recovery event');
must(app, 'clearLastMobileSnapshot', 'app clears snapshot on session failure');
must(app, 'clearSelectedShiftId', 'app clears selected shift on session failure');
must(app, 'clearSession', 'app clears session on session failure');
must(app, 'hydrateStateFromSnapshot(snapshot, { session, deviceId, voiceEnabled, selectedShiftId })', 'app hydrates runtime from snapshot with separate ownership inputs');
must(app, 'saveVoiceGuidanceEnabled', 'app persists user voice preference');
must(app, 'saveSession', 'app persists session separately from snapshot');

console.log('=== M3 SNAPSHOT / LOCAL STORAGE SEPARATION CHECK PASS ===');

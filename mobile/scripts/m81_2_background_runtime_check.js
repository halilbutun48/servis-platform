const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M81.2 BACKGROUND GPS RUNTIME CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const state = read('src/app/mobileAppState.js');
const bg = read('src/lib/backgroundGps.js');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m81.2', 'm81.2 script present in package json');
must(bg, 'getDriverBackgroundRuntimeStatus', 'background gps runtime helper present');
must(bg, 'Location.ActivityType.AutomotiveNavigation', 'background gps uses automotive activity type');
must(bg, 'pausesUpdatesAutomatically: false', 'background gps disables automatic pause');
must(bg, 'showsBackgroundLocationIndicator: true', 'background gps indicator enabled');
must(bg, "reason: 'armed-active'", 'background gps active-state arming reason visible');
must(state, 'backgroundPermissionStatus', 'state keeps background permission state');
must(state, 'backgroundTaskState', 'state keeps background task state');
must(app, 'readGpsRuntimeSnapshot', 'app reads background runtime snapshot');
must(today, 'Arka plan izni', 'today screen shows background permission');
must(today, 'Arka plan servis', 'today screen shows background service status');
must(today, 'Son arka plan nedeni', 'today screen shows background reason');

console.log('=== M81.2 BACKGROUND GPS RUNTIME CHECK PASS ===');


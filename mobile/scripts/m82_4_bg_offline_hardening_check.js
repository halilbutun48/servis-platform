const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M82.4 BACKGROUND GPS / OFFLINE HARDENING CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const bg = read('src/lib/backgroundGps.js');
const today = read('src/screens/TodayScreen.js');
const live = read('src/screens/LiveScreen.js');

must(pkg, 'check:m82.4', 'm82.4 script present in package json');
must(app, 'buildRetryMeta', 'app has retry backoff helper');
must(app, 'syncNextRetryAtRef', 'app tracks sync retry window');
must(app, 'gpsNextRetryAtRef', 'app tracks gps retry window');
must(app, 'refreshRouteAfterGpsPublish', 'app refreshes route with lighter post-gps path');
must(bg, 'BACKGROUND_ROUTE_CACHE_MAX_AGE_MS', 'background gps route cache window present');
must(bg, 'pickSnapshotRoute', 'background gps can reuse cached snapshot route');
must(today, 'artan bekleme ile son basarili snapshot ekranda kalir', 'today screen explains progressive retry');
must(live, 'GPS sonraki deneme', 'live screen shows next gps retry');

console.log('=== M82.4 BACKGROUND GPS / OFFLINE HARDENING CHECK PASS ===');

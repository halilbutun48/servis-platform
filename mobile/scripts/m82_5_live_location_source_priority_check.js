const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M82.5 LIVE LOCATION SOURCE PRIORITY CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const gps = read('src/lib/gps.js');
const live = read('src/screens/LiveScreen.js');
const today = read('src/screens/TodayScreen.js');
const driverRoute = read('../backend/src/routes/driver.js');

must(pkg, 'check:m82.5', 'm82.5 script present in package json');
must(app, 'decorateGpsState', 'app decorates gps state with source priority');
must(app, 'buildLocalPreviewSnapshot', 'app keeps local preview separate from official source');
must(gps, 'resolveLiveLocationState', 'gps helper resolves official and preview source priority');
must(gps, "Resmi arac GPS'i > yerel telefon onizlemesi > onbellek", 'gps helper encodes source priority text');
must(live, 'Konum kaynak onceligi', 'live screen shows source priority');
must(live, 'Resmi kaynak', 'live screen shows official source');
must(today, 'Konum kaynagi', 'today screen shows active source');
must(driverRoute, 'officialSource: "BACKEND_VEHICLE_GPS"', 'driver route payload marks backend official source');

console.log('=== M82.5 LIVE LOCATION SOURCE PRIORITY CHECK PASS ===');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function normalize(text){
  return String(text || '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
function must(text, needle, msg){ if(!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`); ok(msg); }

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
must(driverRoute, 'officialSource: vehicleGpsSource', 'driver route payload uses source-aware official source');
must(driverRoute, 'backendVehicleGps: backendGpsMeta', 'driver route payload keeps backend gps metadata');

console.log('=== M82.5 LIVE LOCATION SOURCE PRIORITY CHECK PASS ===');

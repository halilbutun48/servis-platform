const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M57.1 FOREGROUND GPS PUBLISH CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const api = read('src/lib/api.js');
const gps = read('src/lib/gps.js');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.1', 'm57.1 script present in package json');
must(app, 'GPS_PUBLISH_INTERVAL_MS', 'app defines foreground gps publish interval');
must(app, 'publishGps', 'app uses api gps publish function');
must(app, 'refreshGpsStatus', 'app has gps state refresher');
must(app, 'Linking.openSettings', 'app can open device settings');
must(api, "request('/api/gps'", 'mobile api posts to /api/gps');
must(gps, 'resolveGpsPublishTarget', 'gps helper resolves active shift and vehicle');
must(gps, "['APPROVED', 'ACTIVE']", 'gps helper gates publish to approved or active shift');
must(today, "Surucunun telefon GPS'i", 'today screen has gps card title');
must(today, 'Ayarlari ac', 'today screen exposes settings action');
must(today, 'Konumu simdi gonder', 'today screen exposes manual publish action');
if (!(today.includes('Gorev yok') || app.includes('Bugun aktif gorev yok. Bu yuzden konum gonderilmiyor.'))) throw new Error('FAIL no-shift publish stop visible'); ok('no-shift publish stop visible');

console.log('=== M57.1 FOREGROUND GPS PUBLISH CHECK PASS ===');

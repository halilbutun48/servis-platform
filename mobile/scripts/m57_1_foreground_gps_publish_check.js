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

console.log('=== M57.1 FOREGROUND GPS PUBLISH CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const handlers = read('src/app/mobileAppHandlers.js');
const api = read('src/lib/api.js');
const gps = read('src/lib/gps.js');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.1', 'm57.1 script present in package json');
must(app, 'GPS_PUBLISH_INTERVAL_MS', 'app defines foreground gps publish interval');
must(app, 'publishGps', 'app uses api gps publish function');
must(app, 'refreshGpsStatus', 'app has gps state refresher');
must(handlers, 'Linking.openSettings', 'app can open device settings');
must(api, "request('/api/gps'", 'mobile api posts to /api/gps');
must(gps, 'resolveGpsPublishTarget', 'gps helper resolves active shift and vehicle');
must(gps, 'resolveDriverGpsShiftContext', 'gps helper shares driver GPS shift resolver');
must(gps, 'ACTIVE', 'gps helper keeps active shift publish support');
must(gps, 'IN_PROGRESS', 'gps helper keeps in-progress shift publish support');
must(gps, 'STARTED', 'gps helper keeps started shift publish support');
must(gps, 'APPROVED', 'gps helper keeps approved shift publish support');
must(gps, 'canPublish: reason === \'ready\'', 'gps helper gates publish through a shared ready resolver');
must(today, "Sürücünün telefon GPS'i", 'today screen has gps card title');
must(today, 'Ayarları aç', 'today screen exposes settings action');
must(today, 'Konumu simdi gonder', 'today screen exposes manual publish action');
if (!(normalize(today).includes(normalize('Görev yok')) || normalize(app).includes(normalize('Bugün aktif görev yok. Bu yüzden konum gönderilmiyor.')))) throw new Error('FAIL no-shift publish stop visible'); ok('no-shift publish stop visible');

console.log('=== M57.1 FOREGROUND GPS PUBLISH CHECK PASS ===');

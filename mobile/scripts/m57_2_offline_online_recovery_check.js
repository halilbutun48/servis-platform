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

console.log('=== M57.2 OFFLINE/ONLINE TOPARLAMA CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.2', 'm57.2 script present in package json');
must(app, 'isNetworkError', 'app has network error detector');
must(app, 'Baglanti yok. Veri eski olabilir.', 'app has offline message');
must(app, 'Baglanti geri geldi, bilgiler yenileniyor.', 'app has recovery message');
must(app, 'net:', 'app has net state');
must(today, 'DriverDiagnosticsCard', 'today screen has connectivity diagnostics card');
must(today, 'Bağlantı durumu', 'today screen shows connectivity status');
must(today, 'Bağlantı mesajı', 'today screen shows connectivity message');
must(today, 'Son online', 'today screen shows last online time');
must(today, 'Son offline', 'today screen shows last offline time');
must(today, 'Son toparlanma', 'today screen shows recovery time');
must(today, 'Yeniden deneme sayısı', 'today screen shows retry count');
must(today, 'Sonraki deneme', 'today screen shows next retry time');
must(today, 'Veri eski olabilir', 'today screen shows stale data badge');
must(today, 'Önbellekten açıldı', 'today screen shows cached data badge');

console.log('=== M57.2 OFFLINE/ONLINE TOPARLAMA CHECK PASS ===');

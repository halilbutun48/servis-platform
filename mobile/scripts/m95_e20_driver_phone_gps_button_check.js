const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function ok(msg) {
  console.log(`OK ${msg}`);
}
function normalize(text) {
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
function must(text, needle, msg) {
  if (!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  ok(msg);
}
function mustNot(text, needle, msg) {
  if (normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M95-E20 DRIVER PHONE GPS BUTTON CHECK ===');
const pkg = read('package.json');
const live = read('src/screens/LiveScreen.js');
const gps = read('src/lib/gps.js');
const bg = read('src/lib/backgroundGps.js');
const ui = read('src/screens/driverUiText.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');

must(pkg, 'check:m95e20', 'mobile package exposes m95e20 check');
must(pkg, 'check:m95e20', 'mobile check chain references m95e20');
must(pkg, 'acceptance:mobile', 'mobile acceptance chain exists');
must(live, 'driverGpsBackgroundReasonText', 'live screen imports GPS reason helper');
must(live, 'backgroundTaskRunning ? onPublishGpsNow : onRequestGpsPermission', 'live screen uses real start handler when background task is idle');
must(live, 'gpsPrimaryAction', 'live screen uses derived primary GPS action');
must(live, 'gpsPrimaryDisabled', 'live screen uses disabled guard for GPS action');
must(live, 'Aktif görev bulunmadığı için GPS gönderimi başlatılamıyor.', 'live screen shows no-task fallback text');
must(live, 'Görev desteği: ${backgroundTaskAvailable ? \'Hazır\' : \'Yok\'}', 'live screen shows task availability');
must(gps, "sourceLabelFromKey", 'gps helper can label GPS source');
must(gps, "source: normalizedSource", 'gps payload keeps source field');
must(gps, "Sürücünün telefon GPS'i", 'gps helper keeps driver phone GPS wording');
must(bg, "buildGpsPayload(latest, target.vehicleId, 'DRIVER_PHONE')", 'background GPS publishes as driver phone source');
must(ui, 'driverGpsBackgroundReasonText', 'driver UI text exposes GPS background reason helper');
must(ui, 'Arka plan GPS görevi desteklenmiyor', 'driver UI text covers unavailable task');
must(ui, 'Aktif görev yok', 'driver UI text covers no-active-shift action label');
must(ui, "Sürücünün telefon GPS'ini başlat", 'driver GPS start label kept');
mustNot(lifecycle, 'fetchMe(', 'lifecycle does not reintroduce fetchMe polling');

console.log('=== M95-E20 DRIVER PHONE GPS BUTTON CHECK PASS ===');

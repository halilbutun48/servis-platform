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

function mustAny(text, needles, msg) {
  const found = needles.some((needle) => normalize(text).includes(normalize(needle)));
  if (!found) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

function mustNot(text, needle, msg) {
  if (normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M95-E21 DRIVER PHONE GPS SHIFT RESOLVER CHECK ===');

const pkg = read('package.json');
const app = read('App.js');
const gps = read('src/lib/gps.js');
const bg = read('src/lib/backgroundGps.js');
const live = read('src/screens/LiveScreen.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const ui = read('src/screens/driverUiText.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');

must(pkg, 'check:m95e21', 'mobile package exposes m95e21 check');
must(pkg, 'check:m95e21', 'mobile check chain references m95e21');
must(pkg, 'acceptance:mobile', 'mobile acceptance chain exists');

must(gps, 'resolveDriverGpsShiftContext', 'gps helper exposes shared driver shift resolver');
must(gps, 'ACTIVE', 'gps resolver accepts active shifts');
must(gps, 'IN_PROGRESS', 'gps resolver accepts in-progress shifts');
must(gps, 'STARTED', 'gps resolver accepts started shifts');
must(gps, 'APPROVED', 'gps resolver accepts approved shifts');
must(gps, 'buildGpsPayload(position, vehicleId, source = \'DEVICE\', shiftId = null)', 'gps payload accepts shift context');
must(gps, 'payload.shiftId = normalizedShiftId', 'gps payload carries shiftId');
must(gps, 'const context = resolveDriverGpsShiftContext(today, route, selectedShiftId);', 'publish target shares the resolver');

must(bg, 'resolveDriverGpsShiftContext', 'background GPS uses shared resolver');
must(bg, "reason: 'no-shift'", 'background GPS surfaces missing-shift reason');
must(bg, "reason: 'no-vehicle'", 'background GPS surfaces missing-vehicle reason');
must(bg, "buildGpsPayload(latest, target.vehicleId, 'DRIVER_PHONE', target.shiftId)", 'background GPS publishes driver phone source with shift context');

must(live, 'resolveDriverGpsShiftContext', 'live screen uses shared driver shift resolver');
must(live, 'gpsContext.canPublish', 'live screen gates GPS action on resolver publish eligibility');
must(live, 'Seçili vardiya', 'live debug shows selected shift');
must(live, 'GPS vardiyası', 'live debug shows GPS shift');
must(live, 'Başlatma engeli', 'live debug shows resolver gate reason');
must(live, 'Bu görev için araç bilgisi bulunamadı.', 'live screen shows missing-vehicle message');
must(live, 'Aktif görev bulunmadığı için GPS gönderimi başlatılamıyor.', 'live screen keeps no-shift fallback');

must(today, 'resolveDriverGpsShiftContext', 'today screen uses shared resolver');
must(route, 'resolveDriverGpsShiftContext', 'route screen uses shared resolver');

must(ui, 'Araç bilgisi yok', 'driver ui text covers missing vehicle');
must(ui, 'Bu vardiya GPS gönderimi için hazır değil.', 'driver ui text covers not-ready shift');
must(ui, "Sürücünün telefon GPS'ini başlat", 'driver gps start label kept');
must(ui, 'Bu görev için araç bilgisi bulunamadı.', 'driver ui text covers missing vehicle reason');

must(app, "buildGpsPayload(current, target.vehicleId, 'DRIVER_PHONE', target.shiftId)", 'app publishes gps with shift context');
must(lifecycle, 'syncSignedInRef.current({ soft: true, skipMe: true })', 'lifecycle keeps controlled refresh path');
mustNot(lifecycle, 'fetchMe(', 'lifecycle does not reintroduce fetchMe polling');

console.log('=== M95-E21 DRIVER PHONE GPS SHIFT RESOLVER CHECK PASS ===');

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
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

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M95-E19 DRIVER UI TURKISH POLISH CHECK ===');

const pkg = JSON.parse(read('package.json'));
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const live = read('src/screens/LiveScreen.js');
const availability = read('src/screens/DriverAvailabilityCard.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');
const loading = read('src/screens/DriverShellLoadingScreen.js');
const ui = read('src/screens/mobileUi.js');
const textHelper = read('src/screens/driverUiText.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95e19'), 'package exposes m95e19 entrypoint');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m95e19'), 'check:m1 includes m95e19');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m95e19'), 'acceptance chain includes m95e19');

must(has(today, 'Yayın hazırlığı'), 'today screen keeps Turkish release title');
must(has(today, 'Yayın profilleri'), 'today screen keeps Turkish build profiles label');
must(has(today, 'Canlı test'), 'today screen keeps live test label');
must(has(today, 'Android önizleme'), 'today screen keeps android preview label');
must(has(today, 'Yayın paketi'), 'today screen keeps production bundle label');
must(has(today, 'Yayın hedefi'), 'today screen keeps release target label');
must(has(today, 'Ortam aşaması'), 'today screen keeps environment stage label');
must(has(today, 'Derleme durumu'), 'today screen keeps build status label');
must(has(today, 'API adresi'), 'today screen keeps api address label');
must(has(today, 'API şeması'), 'today screen keeps api scheme label');
must(has(today, 'Zaman aşımı'), 'today screen keeps timeout label');
must(has(today, 'Rota, tahmini varış ve hızlı işlemler tek yerde.'), 'today screen summary is Turkish');
must(has(today, 'Sürücünün telefon GPS\'i'), 'today screen keeps driver gps wording');

must(has(route, 'Görev / rota / tahmini varış'), 'route screen keeps Turkish task-route title');
must(has(route, 'Sıradaki'), 'route screen keeps Turkish next stop pill');
must(has(route, 'Ulaşıldı:'), 'route screen keeps Turkish reached text');
must(has(route, 'Atlandı:'), 'route screen keeps Turkish skipped text');
must(has(route, 'beklemeye alınır'), 'route screen keeps Turkish pending explanation');
must(has(route, 'humanizeDriverUiText'), 'route screen uses humanize helper');

must(has(live, 'Yayın / ortam'), 'live screen keeps Turkish release title');
must(has(live, 'API adresi'), 'live screen keeps api address label');
must(has(live, 'Zaman aşımı'), 'live screen keeps timeout label');
must(has(live, 'Ayarlara git'), 'live screen keeps settings action wording');
must(has(live, 'driverGpsPrimaryActionLabel'), 'live screen uses gps primary action helper');
must(has(live, 'driverGpsStatusLabel'), 'live screen uses gps status helper');
must(has(live, 'gpsActionTitle'), 'live screen builds gps action title');
must(has(live, 'Sürücünün telefon GPS\'i'), 'live screen keeps driver gps heading');

must(has(availability, 'Sürücü durumu'), 'availability card keeps Turkish title');
must(has(availability, 'Hazır bekleme tercihi cihazda kalır.'), 'availability card keeps shorter subtitle');
must(has(availability, 'Yeni iş atamasını oda/operasyon yapar.'), 'availability card keeps shorter footer text');

must(has(taskCard, 'Rota, tahmini varış ve hızlı işlemler tek yerde.'), 'task card keeps Turkish summary');
must(has(taskCard, 'Tahmini varış'), 'task card keeps tahmini varış label');
must(has(taskCard, 'Bugün atanmış görev görünmüyor.'), 'task card keeps empty state');

must(has(loading, 'Sürücü ekranı yükleniyor...'), 'loading screen keeps driver loading text');
must(has(loading, 'Oturum açıldı, görev bilgileri hazırlanıyor.'), 'loading screen keeps loading status text');

must(has(ui, "Platform.OS === 'android' ? 30 : 16"), 'mobile ui uses android top padding');
must(has(textHelper, "['driver', 'Sürücü']"), 'text helper maps driver');
must(has(textHelper, "['approved', 'Onaylı']"), 'text helper maps approved');
must(has(textHelper, "['ok', 'Hazır']"), 'text helper maps ok');
must(has(textHelper, "['ready', 'Hazır']"), 'text helper maps ready');
must(has(textHelper, "['online', 'Bağlantı var']"), 'text helper maps online');
must(has(textHelper, "['local-emulator', 'Yerel test']"), 'text helper maps local emulator');
must(has(textHelper, "['preview-internal', 'Önizleme']"), 'text helper maps preview internal');
must(has(textHelper, "['preview', 'Önizleme']"), 'text helper maps preview');
must(has(textHelper, "['production', 'Yayın']"), 'text helper maps production');
must(has(textHelper, "['expo go', 'Canlı test']"), 'text helper maps expo go');
must(has(textHelper, "['eas build', 'Derleme']"), 'text helper maps eas build');
must(has(textHelper, "['internal build', 'iç derleme']"), 'text helper maps internal build');
must(has(textHelper, "['preview apk', 'Android önizleme']"), 'text helper maps preview apk');
must(has(textHelper, "['android preview', 'Android önizleme']"), 'text helper maps android preview');
must(has(textHelper, "['production aab', 'Yayın paketi']"), 'text helper maps production aab');
must(has(textHelper, "['production bundle', 'Yayın paketi']"), 'text helper maps production bundle');
must(has(textHelper, "['build profiles', 'Yayın profilleri']"), 'text helper maps build profiles');
must(has(textHelper, "['undetermined', 'İzin sorulmadı']"), 'text helper maps undetermined');
must(has(textHelper, "['stopped', 'Durduruldu']"), 'text helper maps stopped');
must(has(textHelper, "['blocked', 'Gönderim kapalı']"), 'text helper maps blocked');
must(has(textHelper, "['blocking', 'Gönderim kapalı']"), 'text helper maps blocking');

console.log('M95-E19 driver UI Turkish polish check passed');

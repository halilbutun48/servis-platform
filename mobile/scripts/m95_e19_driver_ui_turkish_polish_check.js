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

function mustNot(text, needle, msg) {
  if (has(text, needle)) throw new Error(`FAIL ${msg}`);
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

must(has(today, 'Günaydın'), 'today screen keeps greeting');
must(has(today, 'Bugünkü Vardiya'), 'today screen keeps hero wardiya title');
must(has(today, 'Rota ekranına geç'), 'today screen keeps route transition action');
must(has(today, 'Gelişmiş durum'), 'today screen keeps advanced status card');
must(has(today, 'DriverAvailabilityCard'), 'today screen keeps driver status card');
must(has(today, 'NotificationCenterCard'), 'today screen keeps notification summary card');
must(has(today, 'DriverChangeAwarenessCard'), 'today screen keeps awareness card');
mustNot(today, 'Sürüş ve GPS yardımı', 'today screen no longer shows old gps helper card');
mustNot(today, 'Konumu şimdi gönder', 'today screen no longer shows direct publish action');

must(has(route, 'Rota, navigasyon ve durak akışı burada.'), 'route screen keeps premium route intro');
must(has(route, 'Rota #'), 'route screen keeps route hero title');
must(has(route, 'RouteNavigationCard'), 'route screen keeps route navigation card');
must(has(route, 'RouteVoiceSupportCard'), 'route screen keeps route voice support card');
must(has(route, 'RouteMiniMapCard'), 'route screen keeps route preview card');
must(has(route, 'Durak listesi'), 'route screen keeps stop list card');
must(has(route, 'Navigasyonu aç'), 'route screen keeps navigation action');
must(has(route, 'Sıradaki durağa git'), 'route screen keeps next stop navigation action');
must(has(route, 'Tüm rotayı aç'), 'route screen keeps full route action');
must(has(route, 'Gelişmiş durum'), 'route screen keeps advanced status card');
must(has(route, 'DriverTaskSummaryCard'), 'route screen keeps hero route summary card');
must(has(route, 'StopListCard'), 'route screen keeps stop list component');
mustNot(route, 'DriverAvailabilityCard', 'route screen no longer shows availability card');

must(has(live, 'Konum ve GPS durumu'), 'live screen keeps gps status title');
must(has(live, 'gpsActionTitle'), 'live screen keeps derived gps action title');
must(has(live, 'driverGpsPrimaryActionLabel'), 'live screen keeps gps primary action helper');
must(has(live, 'Gelişmiş durum'), 'live screen keeps advanced status card');
must(has(live, 'Sürücünün telefon GPS\'i'), 'live screen keeps driver gps wording');
must(has(live, 'GpsSourceStatusCard'), 'live screen uses gps source status card');
must(has(live, 'DriverDiagnosticsCard'), 'live screen keeps advanced diagnostics card');
mustNot(live, 'Sesli rehber', 'live screen no longer shows voice guidance card');

must(has(availability, 'Sürücü durumu'), 'availability card keeps Turkish title');
must(has(availability, 'Kısa sürücü durumu özeti.'), 'availability card keeps compact subtitle');
must(has(availability, 'Yeni iş atamasını oda/operasyon yapar.'), 'availability card keeps shorter footer text');
must(has(availability, 'QuickActionsGrid'), 'availability card keeps compact action grid');
must(has(availability, 'driverAvailabilityActionLabel'), 'availability card keeps helper driven action labels');

must(has(today, 'Bugünün ana görevi, kısa özet ve hızlı işlemler burada.'), 'today keeps Turkish summary');
must(has(today, 'Rota ekranına geç'), 'today keeps route transition wording');
must(has(taskCard, 'Temsilî rota önizlemesi'), 'task card keeps representative route preview wording');

must(has(loading, 'Sürücü ekranı yükleniyor...'), 'loading screen keeps driver loading text');
must(has(loading, 'Oturum açıldı, görev bilgileri hazırlanıyor.'), 'loading screen keeps loading status text');

must(has(ui, "Platform.OS === 'android' ? 30 : 16"), 'mobile ui uses android top padding');
must(has(ui, "Platform.OS === 'android' ? 108 : 96"), 'mobile ui keeps bottom padding');
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

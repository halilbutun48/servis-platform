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

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

function mustNot(text, needle, msg) {
  if (has(text, needle)) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E22B DRIVER ROUTE NAVIGATION PREMIUM CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const premium = read('src/screens/driverPremiumUi.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const live = read('src/screens/LiveScreen.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');
const gps = read('src/lib/gps.js');
const bg = read('src/lib/backgroundGps.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95e22b'), 'package exposes m95e22b entrypoint');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m95e22b'), 'check:m1 includes m95e22b');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m95e22b'), 'acceptance chain includes m95e22b');

must(has(content, 'DriverAppHeader'), 'mobile shell uses premium header');
must(has(content, 'DriverBottomTabBar'), 'mobile shell uses premium bottom tabs');
must(has(content, 'DriverShellFrame'), 'mobile shell uses shared driver shell frame');

must(has(premium, 'DriverAppHeader'), 'premium ui exports driver app header');
must(has(premium, 'DriverBottomTabBar'), 'premium ui exports driver bottom tab bar');
must(has(premium, 'RouteNavigationCard'), 'premium ui exports route navigation card');
must(has(premium, 'RouteVoiceSupportCard'), 'premium ui exports route voice card');
must(has(premium, 'RouteMiniMapCard'), 'premium ui exports route preview card');
must(has(premium, 'GpsSourceStatusCard'), 'premium ui exports gps status card');
mustNot(premium, 'Yakında', 'premium ui no longer shows "Yakında" text');

must(has(today, 'Bugünkü Vardiya'), 'today keeps premium hero');
must(has(today, 'DriverTaskSummaryCard'), 'today keeps task summary card');
must(has(today, 'NotificationCenterCard'), 'today keeps notification summary card');
must(has(today, 'DriverAvailabilityCard'), 'today keeps availability card');
must(has(today, 'DriverChangeAwarenessCard'), 'today keeps awareness card');
must(has(today, 'Rota ekranına geç'), 'today keeps route transition action');
mustNot(today, 'Sürüş ve GPS yardımı', 'today no longer shows the old gps helper card');
mustNot(today, 'Sürüş ve GPS yardımı', 'today no longer shows old gps helper card');
mustNot(today, 'Konumu şimdi gönder', 'today no longer shows old publish action');

must(has(route, 'Rota, navigasyon ve durak akışı burada.'), 'route keeps premium intro');
must(has(route, 'Rota #'), 'route keeps route hero title');
must(has(route, 'RouteNavigationCard'), 'route keeps navigation card');
must(has(route, 'RouteMiniMapCard'), 'route keeps mini route preview card');
must(has(route, 'RouteVoiceSupportCard'), 'route keeps voice support card');
must(has(route, 'Temsilî rota önizlemesi'), 'route keeps representative preview wording');
must(has(route, 'StopListCard'), 'route keeps stop list card');
must(has(route, 'Navigasyonu aç'), 'route keeps primary navigation action');
must(has(route, 'Sıradaki durağa git'), 'route keeps next stop navigation action');
must(has(route, 'Tüm rotayı aç'), 'route keeps full route action');
mustNot(route, 'DriverAvailabilityCard', 'route no longer shows availability card');

must(has(live, 'Konum ve GPS durumu'), 'live keeps gps source title');
must(has(live, 'Sürücünün telefon GPS\'i'), 'live keeps driver phone gps wording');
must(has(live, 'GpsSourceStatusCard'), 'live keeps gps source card');
must(has(live, 'driverGpsPrimaryActionLabel'), 'live keeps derived gps action helper');
must(has(live, 'gpsActionTitle'), 'live keeps gps action title');
must(has(live, 'Gelişmiş durum'), 'live keeps diagnostics card');
mustNot(live, 'Sesli rehber', 'live no longer shows voice guidance card');

must(has(taskCard, 'DriverTaskSummaryCard'), 'task card remains shared hero');
must(has(taskCard, 'Temsilî rota önizlemesi'), 'task card keeps representative route preview wording');
must(has(taskCard, 'Yenile'), 'task card keeps refresh action');

must(has(gps, 'resolveDriverGpsShiftContext'), 'shared gps resolver is preserved');
must(has(gps, 'DRIVER_PHONE'), 'driver phone gps source remains');
must(has(bg, "buildGpsPayload(latest, target.vehicleId, 'DRIVER_PHONE', target.shiftId)"), 'background gps publish keeps driver phone source');
must(has(lifecycle, 'syncSignedInRef.current({ soft: true, skipMe: true })'), 'lifecycle keeps controlled sync path');
mustNot(lifecycle, 'fetchMe(', 'lifecycle does not reintroduce fetchMe polling');

const appLines = app.split(/\r?\n/).length;
must(appLines < 1000, `App.js stays below the large-file risk line (${appLines})`);

console.log('M95-E22B driver route navigation premium check passed');

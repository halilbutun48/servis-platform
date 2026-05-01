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

console.log('=== M95-E22A DRIVER PREMIUM UI SHELL CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const ui = read('src/screens/mobileUi.js');
const premium = read('src/screens/driverPremiumUi.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const live = read('src/screens/LiveScreen.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');
const availability = read('src/screens/DriverAvailabilityCard.js');
const notifications = read('src/screens/NotificationCenterCard.js');
const textHelper = read('src/screens/driverUiText.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');
const gps = read('src/lib/gps.js');
const bg = read('src/lib/backgroundGps.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95e22a'), 'package exposes m95e22a entrypoint');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m95e22a'), 'check:m1 includes m95e22a');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m95e22a'), 'acceptance chain includes m95e22a');

must(has(content, 'DriverAppHeader'), 'mobile shell uses premium header');
must(has(content, 'DriverBottomTabBar'), 'mobile shell uses premium bottom tabs');
must(has(content, 'DriverShellFrame'), 'mobile shell uses shared driver shell frame');

must(has(ui, "Platform.OS === 'android' ? 30 : 16"), 'android safe-area top padding is preserved');
must(has(ui, 'TopTabs'), 'shared ui keeps top segmented tabs');
must(has(ui, 'Card({ children, style = null })'), 'shared ui keeps card wrapper');
must(has(ui, "variant = 'light'"), 'shared ui keeps themed tabs variant');

must(has(premium, 'DriverAppHeader'), 'premium ui exports driver app header');
must(has(premium, 'DriverBottomTabBar'), 'premium ui exports driver bottom tab bar');
must(has(premium, 'HeroShiftCard'), 'premium ui exports hero shift card');
must(has(premium, 'RouteMiniMapCard'), 'premium ui exports mini route preview');
must(has(premium, 'StopListCard'), 'premium ui exports stop list card');
must(has(premium, 'GpsSourceStatusCard'), 'premium ui exports gps source status card');
must(has(premium, 'DriverDiagnosticsCard'), 'premium ui exports diagnostics card');
must(has(premium, 'ShellIcon'), 'premium ui keeps shell icon helper');
must(has(premium, 'TopTabs'), 'premium header keeps segmented tabs');
must(has(premium, 'variant="dark"'), 'premium header keeps dark segmented tabs');
must(has(premium, 'Notifications'), 'premium bottom tabs keep notifications tab');
must(has(premium, 'Profil'), 'premium bottom tabs keep profile tab');

must(has(today, 'Günaydın'), 'today screen keeps greeting');
must(has(today, 'Bugünkü Vardiya'), 'today screen keeps hero shift card');
must(has(today, 'Sürüş ve GPS yardımı'), 'today screen keeps compact gps help card');
must(has(today, 'Gelişmiş durum'), 'today screen keeps diagnostics accordion');
must(has(today, 'DriverTaskSummaryCard'), 'today screen keeps task summary card');
must(has(today, 'DriverAvailabilityCard'), 'today screen keeps compact availability card');
must(has(today, 'NotificationCenterCard'), 'today screen keeps notification summary card');

must(has(route, 'Bugünkü rota'), 'route screen keeps hero route card');
must(has(route, 'StopListCard'), 'route screen keeps stop list');
must(has(route, 'DriverTaskSummaryCard'), 'route screen keeps route preview through task summary card');
must(has(route, 'Navigasyonu aç'), 'route screen keeps navigation action');
must(has(route, 'Gelişmiş durum'), 'route screen keeps diagnostics accordion');

must(has(live, 'Konum ve GPS durumu'), 'live screen keeps gps source card');
must(has(live, 'gpsActionTitle'), 'live screen keeps gps start action');
must(has(live, 'driverGpsPrimaryActionLabel'), 'live screen keeps publish action');
must(has(live, 'Gelişmiş durum'), 'live screen keeps diagnostics accordion');
must(has(live, 'GpsSourceStatusCard'), 'live screen uses gps source status card');

must(has(taskCard, 'HeroShiftCard'), 'task summary card uses premium hero card');
must(has(taskCard, 'Navigasyonu aç'), 'task summary card keeps navigation support action');
must(has(taskCard, 'Durak önizlemesi'), 'task summary card keeps mini route preview');
must(has(taskCard, 'Yenile'), 'task summary card keeps refresh support action');

must(has(availability, 'QuickActionsGrid'), 'availability card uses compact quick action grid');
must(has(availability, 'driverAvailabilityActionLabel'), 'availability card keeps helper driven labels');
must(has(availability, 'listDriverAvailabilityModes'), 'availability card keeps compact availability source');

must(has(notifications, 'Bildirimler'), 'notification card keeps Turkish title');
must(has(notifications, 'Son bildirim'), 'notification card keeps latest summary');
must(has(notifications, 'Son kayıtlar'), 'notification card keeps recent list');

must(has(textHelper, 'telefon GPS') && has(textHelper, 'başlat'), 'text helper keeps gps start wording');
must(has(textHelper, 'telefon GPS') && has(textHelper, 'hazır'), 'text helper keeps gps ready wording');
must(has(today, 'Görünür vardiya yok') || has(route, 'Vardiya görünmüyor') || has(live, 'Aktif görev bulunmadığı için GPS gönderimi başlatılamıyor.'), 'premium shell keeps safe empty states');

must(has(gps, 'resolveDriverGpsShiftContext'), 'shared gps resolver is preserved');
must(has(gps, 'DRIVER_PHONE'), 'driver phone gps source remains');
must(has(bg, "buildGpsPayload(latest, target.vehicleId, 'DRIVER_PHONE', target.shiftId)"), 'background gps publish keeps driver phone source');

must(has(lifecycle, 'syncSignedInRef.current({ soft: true, skipMe: true })'), 'lifecycle keeps controlled sync path');
mustNot(lifecycle, 'fetchMe(', 'lifecycle does not reintroduce fetchMe polling');

const appLines = app.split(/\r?\n/).length;
must(appLines < 1000, `App.js stays below the large-file risk line (${appLines})`);

console.log('M95-E22A driver premium UI shell check passed');

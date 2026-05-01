const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');

function read(rel, root = mobileRoot) {
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

console.log('=== M99-A MOBILE REGRESSION PACK CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const roleHome = read('src/screens/RoleHomeScreen.js');
const login = read('src/screens/LoginScreen.js');
const pin = read('src/screens/PinChangeScreen.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const live = read('src/screens/LiveScreen.js');
const notificationState = read('src/app/notificationState.js');
const boardingState = read('src/app/boardingChangeState.js');
const availabilityState = read('src/app/driverAvailabilityState.js');
const roleLiveState = read('src/app/roleLiveState.js');
const storage = read('src/lib/storage.js');
const api = read('src/lib/api.js');
const primer = read('../docs/PRIMER_SSOT.md', mobileRoot);
const registry = read('../docs/MILESTONE_REGISTRY_V1.md', mobileRoot);
const guide = read('../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md', mobileRoot);
const repoState = read('../tools/repo_contract_state.json', mobileRoot);

must(has(JSON.stringify(pkg.scripts || {}), 'check:m99a'), 'package exposes m99a check');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m99a'), 'check:m1 includes M99-A regression pack');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m99a'), 'acceptance chain includes M99-A regression pack');

must(has(app, 'fetchMe'), 'app keeps me bootstrap fetch');
must(has(app, 'acceptKvkkRequiredMany'), 'app keeps kvkk acceptance guard');
must(has(app, 'getApiBaseUrl'), 'app keeps api base url selection');
must(has(app, 'onLogout={mobileHandlers.handleLogout}'), 'app keeps logout wiring');
must(has(app, 'onMarkNotificationsSeen={mobileHandlers.handleMarkNotificationsSeen}'), 'app keeps notification seen wiring');
must(has(app, 'onSelectShift={mobileHandlers.handleSelectShift}'), 'app keeps shift selection wiring');
must(has(app, 'routeOpsText'), 'app keeps route operation message wiring');

must(has(content, 'LoginScreen'), 'mobile content keeps login screen');
must(has(content, 'PinChangeScreen'), 'mobile content keeps pin change screen');
must(has(content, 'RoleHomeScreen'), 'mobile content keeps role home screen');
must(has(content, 'notifications={state?.notifications || null}'), 'mobile content keeps notifications prop');
must(has(content, 'onMarkNotificationsSeen={onMarkNotificationsSeen}'), 'mobile content keeps seen handler');
must(has(content, 'onSelectShift={onSelectShift}'), 'mobile content keeps shift handler');
must(has(content, 'onSelectChild={onSelectChild}'), 'mobile content keeps child handler');
must(has(content, 'onRequestBoardingChange={onRequestBoardingChange}'), 'mobile content keeps boarding request handler');
must(has(content, 'onSetDriverAvailability={onSetDriverAvailability}'), 'mobile content keeps availability handler');

must(has(state, 'initialState'), 'state keeps initial state');
must(has(state, 'buildMobileSnapshot'), 'state keeps snapshot builder');
must(has(state, 'hydrateStateFromSnapshot'), 'state keeps snapshot hydrator');
must(has(state, 'notifications'), 'state keeps notification slice');
must(has(state, 'roleLive'), 'state keeps role live slice');
must(has(state, 'kvkk'), 'state keeps kvkk slice');
must(has(state, 'session'), 'state keeps session slice');

must(has(handlers, 'handleLogin'), 'handlers keep login flow');
must(has(handlers, 'handleLogout'), 'handlers keep logout flow');
must(has(handlers, 'handleSelectShift'), 'handlers keep shift selection flow');
must(has(handlers, 'handleSelectChild'), 'handlers keep child selection flow');
must(has(handlers, 'handleReportNoShow'), 'handlers keep no-show flow');
must(has(handlers, 'handleRequestBoardingChange'), 'handlers keep boarding flow');
must(has(handlers, 'handleMarkNotificationsSeen'), 'handlers keep notification seen flow');
must(has(handlers, 'handleSetDriverAvailability'), 'handlers keep availability flow');

must(has(roleHome, 'NotificationCenterCard'), 'role home keeps notification card');
must(has(roleHome, 'BoardingChangeCard'), 'role home keeps boarding change card');
must(has(roleHome, 'PersonelActivationCard'), 'role home keeps personel activation card');
must(has(roleHome, 'ParentActivationCard'), 'role home keeps parent activation card');
must(has(roleHome, 'LinkAccessCard'), 'role home keeps link access card');
must(has(roleHome, 'KvkkVisibilityMatrixCard'), 'role home keeps kvkk matrix card');
must(has(roleHome, "key === 'PERSONEL'"), 'role home keeps personel branch');
must(has(roleHome, "key === 'PARENT'"), 'role home keeps parent branch');

must(has(login, 'LoginScreen'), 'login screen exists');
must(has(pin, 'PinChangeScreen'), 'pin screen exists');
must(has(today, 'DriverTaskSummaryCard'), 'today screen keeps driver task summary');
must(has(today, 'NotificationCenterCard'), 'today screen keeps notification card');
must(has(today, 'DriverAvailabilityCard'), 'today screen keeps availability card');
must(has(today, 'DriverChangeAwarenessCard'), 'today screen keeps awareness card');
must(has(route, 'DriverTaskSummaryCard'), 'route screen keeps driver task summary');
must(has(route, 'Bugünkü rota'), 'route screen keeps route summary');
must(has(route, 'DriverAvailabilityCard'), 'route screen keeps availability card');
must(has(live, 'GPS'), 'live screen keeps gps wording');

must(has(notificationState, 'NOTIFICATION_ROLE_MESSAGES'), 'notification state keeps role messages');
must(has(notificationState, 'buildNotificationCenterState'), 'notification state keeps center builder');
must(has(notificationState, 'markNotificationCenterSeen'), 'notification state keeps seen reducer');
must(has(notificationState, 'Sürücü Bildirimleri'), 'notification state keeps driver copy');
must(has(notificationState, 'Personel Bildirimleri'), 'notification state keeps personel copy');
must(has(notificationState, 'Veli Bildirimleri'), 'notification state keeps parent copy');
must(has(notificationState, 'Operasyon Bildirimleri'), 'notification state keeps operation copy');

must(has(boardingState, 'OPERATION_NOTE'), 'boarding state keeps operation note kind');
must(has(boardingState, 'Bugün servisi kullanmayacağım'), 'boarding state keeps no-show copy');
must(has(boardingState, 'Farklı duraktan bineceğim'), 'boarding state keeps different stop copy');
must(has(boardingState, 'Durağa yetişemiyorum'), 'boarding state keeps late copy');
must(has(boardingState, 'Konumdan alınmak istiyorum'), 'boarding state keeps location pickup copy');

must(has(availabilityState, 'Moladayım'), 'availability state keeps break copy');
must(has(availabilityState, 'Müsaitim'), 'availability state keeps available copy');
must(has(availabilityState, 'Yeni iş alabilirim'), 'availability state keeps ready copy');
must(has(availabilityState, 'Bugünlük kapat'), 'availability state keeps closed today copy');

must(has(roleLiveState, 'buildPersonelRoleLiveState'), 'role live state keeps personel builder');
must(has(roleLiveState, 'buildParentRoleLiveState'), 'role live state keeps parent builder');

must(has(storage, 'SecureStore'), 'storage keeps secure store');
must(has(api, '/api/auth/login'), 'api keeps login endpoint');
must(has(api, '/api/me'), 'api keeps me endpoint');
must(has(api, '/api/notifications/my'), 'api keeps notifications endpoint');
must(has(api, 'fetchKvkkCurrent'), 'api keeps kvkk fetch helper');
must(has(api, '/api/kvkk/documents/current'), 'api keeps kvkk current endpoint');
must(has(api, '/api/kvkk/consents/accept-many'), 'api keeps kvkk accept-many endpoint');

must(has(primer, 'Mobile regression pack: `M99-A mobile regression pack`'), 'primer mentions M99-A');
must(has(registry, 'M99-A - mobile regression pack - active'), 'registry mentions M99-A');
must(has(guide, 'M99-A — mobile regression pack [CHECK]'), 'script guide mentions M99-A');
must(has(repoState, '"M99-A"'), 'repo state keeps M99-A visible');

console.log('M99-A mobile regression pack check passed');

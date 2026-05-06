const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

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

function mustNot(text, needle, msg) {
  if (has(text, needle)) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M99-B REAL SCENARIO TESTS CHECK ===');

const pkg = JSON.parse(read('package.json'));
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const roleHome = read('src/screens/RoleHomeScreen.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const live = read('src/screens/LiveScreen.js');
const notificationCard = read('src/screens/NotificationCenterCard.js');
const boardingCard = read('src/screens/BoardingChangeCard.js');
const availabilityCard = read('src/screens/DriverAvailabilityCard.js');
const awarenessCard = read('src/screens/DriverChangeAwarenessCard.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');
const notificationState = read('src/app/notificationState.js');
const boardingState = read('src/app/boardingChangeState.js');
const availabilityState = read('src/app/driverAvailabilityState.js');
const awarenessState = read('src/app/driverAwarenessState.js');
const roleLiveState = read('src/app/roleLiveState.js');
const primer = read('../docs/PRIMER_SSOT.md', mobileRoot);
const registry = read('../docs/MILESTONE_REGISTRY_V1.md', mobileRoot);
const guide = read('../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md', mobileRoot);
const repoState = read('../tools/repo_contract_state.json', mobileRoot);

must(has(JSON.stringify(pkg.scripts || {}), 'check:m99b'), 'package exposes m99b check');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m99b'), 'acceptance chain includes m99b');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m99b'), 'check:m1 includes m99b');

must(has(content, 'notifications={state?.notifications || null}'), 'mobile content forwards notifications state');
must(has(content, 'boardingChange={state?.boardingChange || null}'), 'mobile content forwards boarding state');
must(has(content, 'driverAvailability={driverAvailability || state?.driverAvailability || null}'), 'mobile content forwards driver availability');
must(has(content, 'driverAwareness={state?.driverAwareness || null}'), 'mobile content forwards driver awareness');

must(has(state, 'notifications: buildNotificationCenterState()'), 'state seeds notifications');
must(has(state, 'boardingChange: buildBoardingChangeState()'), 'state seeds boarding change');
must(has(state, 'driverAvailability: buildDriverAvailabilityState()'), 'state seeds driver availability');
must(has(state, 'driverAwareness: buildDriverAwarenessState()'), 'state seeds driver awareness');
must(has(handlers, 'handleMarkNotificationsSeen'), 'handlers keep notification seen flow');
must(has(handlers, 'handleRequestBoardingChange'), 'handlers keep boarding request flow');
must(has(handlers, 'handleSetDriverAvailability'), 'handlers keep availability flow');
must(has(handlers, 'handleSpeakDriverAwareness'), 'handlers keep driver awareness speak flow');

must(has(roleHome, 'RoleLivePremiumCard'), 'role home keeps personel live premium card bridge');
must(has(roleHome, 'RoleOverviewPremiumCard'), 'role home keeps parent live premium card bridge');
must(has(roleHome, 'NotificationCenterCard'), 'role home keeps notification center');
must(has(roleHome, 'BoardingChangeCard'), 'role home keeps boarding change card');
must(has(roleHome, 'PersonelActivationCard'), 'role home keeps personel activation card');
must(has(roleHome, 'ParentActivationCard'), 'role home keeps parent activation card');
must(has(roleHome, 'LinkAccessCard'), 'role home keeps link access card');
must(has(roleHome, 'KvkkVisibilityMatrixCard'), 'role home keeps kvkk matrix card');
must(has(roleHome, "key === 'PERSONEL'"), 'role home keeps personel branch');
must(has(roleHome, "key === 'PARENT'"), 'role home keeps parent branch');

must(has(today, 'DriverTaskSummaryCard'), 'today screen keeps driver task hero card');
must(has(today, 'Bugünkü Vardiya'), 'today screen keeps premium hero title');
must(has(today, 'showWorkflowActions'), 'today screen keeps workflow actions visible');
must(has(today, 'NotificationCenterCard'), 'today screen keeps notification center card');
must(has(today, 'DriverAvailabilityCard'), 'today screen keeps availability card');
must(has(today, 'DriverChangeAwarenessCard'), 'today screen keeps awareness card');
must(has(today, 'Rota ekranına geç'), 'today screen keeps route transition action');
must(has(today, 'onRefresh={onRefresh}'), 'today screen keeps refresh wiring');
mustNot(today, 'Sürüş ve GPS yardımı', 'today screen no longer shows the old gps helper card');
mustNot(today, 'Konumu şimdi gönder', 'today screen no longer shows the old publish action');

must(has(route, 'DriverTaskSummaryCard'), 'route screen keeps shared route card');
must(has(route, 'Rota #'), 'route screen keeps premium route hero title');
must(has(route, 'RouteNavigationCard'), 'route screen keeps navigation card');
must(has(route, 'RouteVoiceSupportCard'), 'route screen keeps voice support card');
must(has(route, 'RouteMiniMapCard'), 'route screen keeps mini route preview card');
must(has(route, 'Navigasyonu aç'), 'route screen keeps navigation action');
must(has(route, 'Sıradaki durağa git'), 'route screen keeps next stop navigation action');
must(has(route, 'Tüm rotayı aç'), 'route screen keeps full route action');
must(has(route, 'StopListCard'), 'route screen keeps stop list card');
mustNot(route, 'DriverAvailabilityCard', 'route screen no longer shows availability card');

must(has(live, 'Sürücünün telefon GPS\'i'), 'live screen keeps driver phone gps section');
must(has(live, 'Konum ve GPS durumu'), 'live screen keeps gps status card');
must(has(live, 'KVKK'), 'live screen keeps kvkk section');
must(has(live, 'GpsSourceStatusCard'), 'live screen keeps gps source card');
must(has(live, 'driverGpsPrimaryActionLabel'), 'live screen keeps publish gps helper');
must(has(live, 'gpsActionTitle'), 'live screen keeps publish gps title state');
mustNot(live, 'Sesli rehber', 'live screen no longer shows voice guidance section');

must(has(notificationCard, 'Son bildirimi gördüm'), 'notification card keeps seen action');
must(has(notificationCard, 'Son kayıtlar'), 'notification card keeps recent list');
must(has(notificationCard, 'Yeni yok'), 'notification card keeps unread summary');
must(has(notificationCard, 'Okundu'), 'notification card keeps read state');

must(has(boardingCard, 'Biniş değişikliği'), 'boarding card keeps title');
must(has(boardingCard, 'Son istekler'), 'boarding card keeps recent requests');
must(has(boardingCard, 'mobil yerel istek modelidir'), 'boarding card keeps local model note');
must(has(boardingCard, 'Rota dışı konum isteği manuel inceleme gerektirir'), 'boarding card keeps manual review note');

must(has(availabilityCard, 'Sürücü durumu'), 'availability card keeps title');
must(has(availabilityCard, 'Yeni iş atamasını oda/operasyon yapar'), 'availability card keeps operational assignment note');
must(has(availabilityCard, 'Yerel tercih'), 'availability card keeps local preference chip');

must(has(awarenessCard, 'Sürücü değişiklik farkındalığı'), 'awareness card keeps title');
must(has(awarenessCard, 'Son uyarıyı oku'), 'awareness card keeps speak action');
must(has(awarenessCard, 'Gördüm'), 'awareness card keeps acknowledge action');
must(has(awarenessCard, 'Son uyarılar'), 'awareness card keeps recent alerts list');

must(has(taskCard, 'Bugünkü görev'), 'task card keeps title');
must(has(today, 'Bugünün ana görevi, kısa özet ve hızlı işlemler burada.'), 'today keeps scenario summary');
must(has(today, 'Rota ekranına geç'), 'today keeps route transition wording');
must(has(taskCard, 'Temsilî rota önizlemesi'), 'task card keeps representative route preview wording');
must(has(taskCard, 'Durak ulaşıldı'), 'task card keeps reached action');
must(has(taskCard, 'Vardiyayı tamamla'), 'task card keeps complete action');

must(has(notificationState, 'NOTIFICATION_ROLE_MESSAGES'), 'notification state keeps role messages');
must(has(notificationState, 'Sürücü Bildirimleri'), 'notification state keeps driver copy');
must(has(notificationState, 'Personel Bildirimleri'), 'notification state keeps personel copy');
must(has(notificationState, 'Veli Bildirimleri'), 'notification state keeps parent copy');
must(has(notificationState, 'Operasyon Bildirimleri'), 'notification state keeps operation copy');

must(has(boardingState, 'Bugün servisi kullanmayacağım'), 'boarding state keeps no-show copy');
must(has(boardingState, 'Bugün öğrencim servise binmeyecek'), 'boarding state keeps parent no-show copy');
must(has(boardingState, 'Farklı duraktan bineceğim'), 'boarding state keeps different stop copy');
must(has(boardingState, 'Durağa yetişemiyorum'), 'boarding state keeps late copy');
must(has(boardingState, 'Konumdan alınmak istiyorum'), 'boarding state keeps pickup copy');
must(has(boardingState, 'Operasyona not gönder'), 'boarding state keeps operation note copy');

must(has(availabilityState, 'Görevdeyim'), 'availability state keeps driving copy');
must(has(availabilityState, 'Moladayım'), 'availability state keeps break copy');
must(has(availabilityState, 'Müsaitim'), 'availability state keeps available copy');
must(has(availabilityState, 'Yeni iş alabilirim'), 'availability state keeps ready copy');
must(has(availabilityState, 'Bugünlük kapat'), 'availability state keeps closed today copy');

must(has(awarenessState, 'buildDriverAwarenessState'), 'awareness state keeps builder');
must(has(awarenessState, 'markDriverAwarenessSeen'), 'awareness state keeps seen marker');
must(has(awarenessState, 'markDriverAwarenessAnnounced'), 'awareness state keeps announced marker');

must(has(roleLiveState, 'buildPersonelRoleLiveState'), 'role live state keeps personel builder');
must(has(roleLiveState, 'buildParentRoleLiveState'), 'role live state keeps parent builder');
must(has(primer, 'Mobile regression pack: `M99-A mobile regression pack`'), 'primer keeps M99-A note');
must(has(primer, 'Real scenario tests: `M99-B real scenario tests`'), 'primer mentions M99-B');
must(has(primer, 'Field launch readiness: `M99-C field launch readiness`'), 'primer mentions M99-C');

must(has(registry, 'M99-A - mobile regression pack - active'), 'registry keeps M99-A');
must(has(registry, 'M99-B - real scenario tests - active'), 'registry mentions M99-B');
must(has(registry, 'M99-C - field launch readiness - active'), 'registry mentions M99-C');

must(has(guide, 'M99-A — mobile regression pack [CHECK]'), 'script guide keeps M99-A');
must(has(guide, 'M99-B — real scenario tests [CHECK]'), 'script guide mentions M99-B');
must(has(guide, 'M99-C — field launch readiness [CHECK]'), 'script guide mentions M99-C');

must(has(repoState, '"M99-A"'), 'repo state keeps M99-A visible');
must(has(repoState, '"M99-B"'), 'repo state keeps M99-B visible');
must(has(repoState, '"M99-C"'), 'repo state keeps M99-C visible');

console.log('M99-B real scenario tests check passed');

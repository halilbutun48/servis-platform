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

console.log('=== M96-B NOTIFICATIONS FOUNDATION CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const notificationState = read('src/app/notificationState.js');
const notificationCard = read('src/screens/NotificationCenterCard.js');
const roleHome = read('src/screens/RoleHomeScreen.js');
const today = read('src/screens/TodayScreen.js');
const api = read('src/lib/api.js');
const backendNotificationsRoute = read('backend/src/routes/notifications.js', repoRoot);
const backendSchema = read('backend/prisma/schema.prisma', repoRoot);

must(has(JSON.stringify(pkg.scripts || {}), 'check:m96bnotifications'), 'package exposes m96bnotifications entrypoint');
must(has(pkg.scripts['acceptance:mobile'] || '', 'check:m96bnotifications'), 'acceptance chain keeps M96-B notification gate');
must(has(pkg.scripts['check:m1'] || '', 'acceptance:mobile'), 'check:m1 still delegates to mobile acceptance chain');

must(has(notificationState, 'NOTIFICATION_ROLE_MESSAGES'), 'notification state defines role message table');
must(has(notificationState, 'buildNotificationCenterState'), 'notification state builds notification center snapshots');
must(has(notificationState, 'markNotificationCenterSeen'), 'notification state marks notifications as seen locally');
must(has(notificationState, 'Sürücü Bildirimleri'), 'notification state defines driver copy');
must(has(notificationState, 'Personel Bildirimleri'), 'notification state defines personel copy');
must(has(notificationState, 'Veli Bildirimleri'), 'notification state defines parent copy');
must(has(notificationState, 'Operasyon Bildirimleri'), 'notification state defines operation copy');

must(has(notificationCard, 'NotificationCenterCard'), 'notification card component exists');
must(has(notificationCard, 'Son bildirimi gördüm'), 'notification card exposes local read action');
must(has(notificationCard, 'Son kayıtlar'), 'notification card shows recent items section');
must(has(notificationCard, 'Yeni yok'), 'notification card renders unread summary chip');
must(has(notificationCard, 'Okundu'), 'notification card renders seen state');
must(has(notificationCard, 'Yenile'), 'notification card renders refresh action');

must(has(content, 'notifications={state?.notifications || null}'), 'mobile content forwards notifications state');
must(has(content, 'onMarkNotificationsSeen={onMarkNotificationsSeen}'), 'mobile content forwards seen handler');

must(has(state, 'notifications: buildNotificationCenterState()'), 'state initializes notification center');
must(has(state, 'notifications: buildNotificationCenterState(notifications)'), 'state persists notification snapshots');
must(has(state, 'notifications: buildNotificationCenterState(snap.notifications)'), 'state hydrates notification snapshots');
must(has(state, 'buildNotificationCenterState'), 'state imports notification helper');

must(has(handlers, 'buildNotificationCenterState'), 'handlers import notification helper');
must(has(handlers, 'markNotificationCenterSeen'), 'handlers import seen helper');
must(has(handlers, 'handleMarkNotificationsSeen'), 'handlers expose seen action');
must(has(handlers, 'notifications: nextNotifications'), 'handlers persist updated notification snapshot');

must(has(app, 'fetchMyNotifications'), 'app fetches my notifications');
must(has(app, 'notificationsPromise'), 'app reuses notification fetch promise');
must(has(app, 'buildNotificationCenterState'), 'app builds notification center state');
must(has(app, 'onMarkNotificationsSeen={mobileHandlers.handleMarkNotificationsSeen}'), 'app wires seen handler to content');
must(has(app, 'notifications: nextNotifications'), 'app carries notifications through sync snapshots');

must(has(api, 'fetchMyNotifications'), 'api exposes my notifications fetch');
must(has(api, '/api/notifications/my'), 'api points to notifications route');

must(has(roleHome, 'NotificationCenterCard'), 'role home renders notification center card');
must(has(roleHome, 'notifications={notifications}'), 'role home receives notifications prop');
must(has(roleHome, 'onMarkLatestSeen={onMarkNotificationsSeen}'), 'role home wires seen action');
must(has(today, 'NotificationCenterCard'), 'today screen renders notification center card');
must(has(today, 'notifications={notifications}'), 'today screen receives notifications prop');
must(has(today, 'onMarkLatestSeen={onMarkNotificationsSeen}'), 'today screen wires seen action');

must(has(backendNotificationsRoute, '/api/notifications/my'), 'backend notifications route stays intact');
must(has(backendNotificationsRoute, 'SUPER_ADMIN'), 'backend notifications route keeps super admin scope');
must(has(backendNotificationsRoute, 'DRIVER'), 'backend notifications route keeps driver scope');
must(has(backendNotificationsRoute, 'PERSONEL'), 'backend notifications route keeps personel scope');
must(has(backendNotificationsRoute, 'PARENT'), 'backend notifications route keeps parent scope');

must(has(backendSchema, 'model Notification'), 'backend schema defines notification model');
must(has(backendSchema, 'dedupeKey'), 'backend schema keeps dedupe key');
must(has(backendSchema, 'payloadJson'), 'backend schema keeps payload json');
must(has(backendSchema, 'driverId'), 'backend schema keeps driver notification binding');
must(has(backendSchema, 'userId'), 'backend schema keeps user notification binding');
must(has(backendSchema, 'shiftId'), 'backend schema keeps shift notification binding');

console.log('M96-B notifications foundation check passed');

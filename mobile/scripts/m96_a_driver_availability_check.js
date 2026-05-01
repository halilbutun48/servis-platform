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

console.log('=== M96-A DRIVER AVAILABILITY CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const helper = read('src/app/driverAvailabilityState.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const card = read('src/screens/DriverAvailabilityCard.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m96a'), 'package exposes m96a entrypoint');
must(has(helper, 'Görevdeyim'), 'driver availability helper defines driving label');
must(has(helper, 'Moladayım'), 'driver availability helper defines break label');
must(has(helper, 'Müsaitim'), 'driver availability helper defines available label');
must(has(helper, 'Yeni iş alabilirim'), 'driver availability helper defines ready-for-job label');
must(has(helper, 'Yeni iş istemiyorum'), 'driver availability helper defines not-available label');
must(has(helper, 'Bugünlük kapat'), 'driver availability helper defines close-today label');
must(has(state, 'driverAvailability'), 'state tracks driver availability');
must(has(state, 'buildDriverAvailabilityState'), 'state builds driver availability snapshots');
must(has(state, 'driverAvailability: state.driverAvailability'), 'signed-in sync preserves driver availability');
must(has(handlers, 'handleSetDriverAvailability'), 'handlers expose driver availability setter');
must(has(handlers, 'applyDriverAvailabilityMode'), 'handlers apply driver availability mode');
must(has(handlers, 'persistDriverAvailabilityMode'), 'handlers persist driver availability mode');
must(has(handlers, 'pauseDriverShift'), 'handlers still use pause shift action');
must(has(handlers, 'resumeDriverShift'), 'handlers still use resume shift action');
must(has(handlers, 'completeDriverShift'), 'handlers still use complete shift action');
must(has(content, 'driverAvailability'), 'mobile content forwards driver availability');
must(has(content, 'onSetDriverAvailability'), 'mobile content forwards driver availability handler');
must(has(app, 'driverAvailability: state.driverAvailability'), 'app persists driver availability in snapshots');
must(has(app, 'onSetDriverAvailability'), 'app wires driver availability handler');
must(has(today, 'DriverAvailabilityCard'), 'today screen renders driver availability card');
must(has(route, 'DriverAvailabilityCard'), 'route screen renders driver availability card');
must(has(card, 'Sürücü durumu'), 'availability card shows driver availability title');
must(has(card, 'Hazır bekleme tercihi cihazda kalır.'), 'availability card explains local availability storage');
must(has(card, 'listDriverAvailabilityModes'), 'availability card renders helper-driven availability modes');

console.log('M96-A driver availability check passed');

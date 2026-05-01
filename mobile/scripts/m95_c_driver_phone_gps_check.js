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

console.log('=== M95-C DRIVER PHONE GPS CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const state = read('src/app/mobileAppState.js');
const bg = read('src/lib/backgroundGps.js');
const live = read('src/screens/LiveScreen.js');
const today = read('src/screens/TodayScreen.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95c'), 'package exposes m95c entrypoint');
must(has(app, 'syncDriverBackgroundLocation'), 'app wires driver background location sync');
must(has(app, 'refreshGpsStatus'), 'app wires gps refresh');
must(has(state, 'backgroundTaskAvailable'), 'state tracks background task availability');
must(has(state, 'backgroundTaskAvailableText'), 'state exposes background task availability text');
must(has(bg, 'task-unavailable'), 'background gps emits task unavailable reason');
must(has(bg, 'backgroundPreferred'), 'background gps keeps app-state preference');
must(has(live, 'GpsSourceStatusCard'), 'live screen shows task availability');
must(has(live, 'Konum ve GPS durumu'), 'live screen keeps gps status title');
must(has(live, 'Ekran kapalı kalsa da'), 'live screen explains screen-off behavior');
must(has(live, 'zayıf ağda kontrollü yeniden deneme'), 'live screen explains retry behavior');
must(has(live, "Sürücünün telefon GPS'i"), 'live screen keeps phone gps terminology');
must(has(today, 'Arka plan görev desteği'), 'today screen shows background task availability');
must(has(today, 'Konumu şimdi gönder'), 'today screen keeps phone gps terminology');
must(has(today, 'GPS sonraki deneme'), 'today screen shows next gps retry');

console.log('M95-C driver phone GPS check passed');

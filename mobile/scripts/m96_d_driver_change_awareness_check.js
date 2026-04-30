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

console.log('=== M96-D DRIVER CHANGE AWARENESS CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const voice = read('src/lib/voice.js');
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');
const card = read('src/screens/DriverChangeAwarenessCard.js');
const helper = read('src/app/driverAwarenessState.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m96d'), 'package exposes m96d entrypoint');
must(has(JSON.stringify(pkg.scripts || {}), 'acceptance:mobile') && has(JSON.stringify(pkg.scripts || {}), 'check:m96d'), 'acceptance chain includes m96d');
must(has(api, 'fetchMyNotifications'), 'api exposes notifications feed');
must(has(voice, 'speakDriverChangeAlert'), 'voice helper speaks driver change alerts');
must(has(voice, 'buildDriverChangeCueKey'), 'voice helper builds driver change cue keys');
must(has(helper, 'buildDriverAwarenessState'), 'driver awareness helper exists');
must(has(helper, 'markDriverAwarenessSeen'), 'driver awareness seen marker exists');
must(has(helper, 'markDriverAwarenessAnnounced'), 'driver awareness announced marker exists');
must(has(state, 'driverAwareness: buildDriverAwarenessState()'), 'state seeds driver awareness');
must(has(state, 'driverAwareness: buildDriverAwarenessState(snap.driverAwareness)'), 'state hydrates driver awareness');
must(has(state, 'driverAwareness'), 'state persists driver awareness snapshot');
must(has(handlers, 'handleSpeakDriverAwareness'), 'handlers expose speak driver awareness action');
must(has(handlers, 'handleAcknowledgeDriverAwareness'), 'handlers expose acknowledge driver awareness action');
must(has(handlers, 'markDriverAwarenessAnnounced'), 'handlers mark driver awareness as announced');
must(has(handlers, 'markDriverAwarenessSeen'), 'handlers mark driver awareness as seen');
must(has(app, 'fetchMyNotifications'), 'app sync reads notifications feed');
must(has(app, 'lastDriverAwarenessCueRef'), 'app tracks driver awareness cue ref');
must(has(app, 'buildDriverChangeCueKey'), 'app builds driver awareness cue key');
must(has(app, 'speakDriverChangeAlert'), 'app can speak driver awareness alerts');
must(has(app, 'driverAwareness: nextDriverAwareness'), 'app persists driver awareness snapshot');
must(has(content, 'driverAwareness'), 'content forwards driver awareness state');
must(has(content, 'onSpeakDriverAwareness'), 'content forwards speak driver awareness handler');
must(has(content, 'onAcknowledgeDriverAwareness'), 'content forwards acknowledge driver awareness handler');
must(has(today, 'DriverChangeAwarenessCard'), 'today screen renders driver awareness card');
must(has(today, 'driverAwareness={driverAwareness}'), 'today screen wires driver awareness state');
must(has(card, 'Sürücü değişiklik farkındalığı'), 'awareness card title exists');
must(has(card, 'Son uyarıyı oku'), 'awareness card speak action exists');
must(has(card, 'Gördüm'), 'awareness card acknowledge action exists');
must(has(card, 'Son uyarılar'), 'awareness card recent list exists');
must(has(card, 'Sesli uyarı açık') || has(card, 'Sesli uyarı kapalı'), 'awareness card exposes voice status');

console.log('M96-D driver change awareness check passed');

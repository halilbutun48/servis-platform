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

console.log('=== M95-D PERSONEL / PARENT LIVE CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const storage = read('src/lib/storage.js');
const api = read('src/lib/api.js');
const roleSurface = read('src/lib/roleSurface.js');
const roleHome = read('src/screens/RoleHomeScreen.js');
const roleLiveCard = read('src/screens/RoleLivePremiumCard.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95d'), 'package exposes m95d entrypoint');
must(has(app, 'fetchParentChildren'), 'app wires parent children fetch');
must(has(app, 'fetchParentLiveVehicles'), 'app wires parent live vehicles fetch');
must(has(app, 'fetchPersonelShifts'), 'app wires personel shifts fetch');
must(has(app, 'fetchLiveVehicles'), 'app wires live vehicles fetch');
must(has(app, 'buildPersonelRoleLiveState'), 'app builds personel live state');
must(has(app, 'buildParentRoleLiveState'), 'app builds parent live state');
must(has(app, 'getSelectedChildId'), 'app loads selected child id');
must(has(app, 'selectedChildId'), 'app stores selected child id');
must(has(content, 'roleLive'), 'content forwards role live state');
must(has(content, 'onSelectChild'), 'content forwards child selection');
must(has(content, 'onReportNoShow'), 'content forwards no-show action');
must(has(state, 'selectedChildId'), 'state tracks selected child id');
must(has(state, 'roleLive'), 'state tracks role live bundle');
must(has(storage, 'SELECTED_CHILD_KEY'), 'storage has selected child key');
must(has(storage, 'getSelectedChildId'), 'storage exposes selected child getter');
must(has(storage, 'saveSelectedChildId'), 'storage exposes selected child saver');
must(has(storage, 'clearSelectedChildId'), 'storage exposes selected child clearer');
must(has(api, 'fetchParentChildren'), 'api exposes parent children fetch');
must(has(api, 'fetchParentLiveVehicles'), 'api exposes parent live vehicles fetch');
must(has(api, 'fetchPersonelShifts'), 'api exposes personel shifts fetch');
must(has(api, 'fetchLiveVehicles'), 'api exposes live vehicles fetch');
must(has(api, 'reportSelfNoShow'), 'api exposes self no-show report');
must(has(handlers, 'handleSelectChild'), 'handlers expose child selection');
must(has(handlers, 'handleReportNoShow'), 'handlers expose no-show reporting');
must(has(roleSurface, "legacySubtitle: 'Personel canlı takip'"), 'role surface keeps personel live title');
must(has(roleSurface, "legacySubtitle: 'Veli canlı takip'"), 'role surface keeps parent live title');
must(has(roleLiveCard, "surface.legacySubtitle || legacyLabels?.liveTitle || 'Canlı takip'"), 'premium card renders live title bridge');
must(has(roleHome, 'Bugün servisi kullanmayacağım'), 'role home shows personel no-show action');
must(has(roleHome, 'Bugün öğrencim servise binmeyecek'), 'role home shows parent no-show action');
must(has(roleLiveCard, 'Canlı takip') || has(roleLiveCard, 'Servis akışı ve kritik bilgiler tek yerde.'), 'premium card shows live tracking content');
must(has(roleHome, 'Çocuk seçimi'), 'role home shows child chooser');
must(has(roleHome, 'Servis seçimi'), 'role home shows shift chooser');

console.log('M95-D personel/parent live check passed');

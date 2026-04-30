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

console.log('=== M96-C BOARDING CHANGE CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const state = read('src/app/mobileAppState.js');
const handlers = read('src/app/mobileAppHandlers.js');
const helper = read('src/app/boardingChangeState.js');
const screen = read('src/screens/RoleHomeScreen.js');
const card = read('src/screens/BoardingChangeCard.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m96c'), 'package exposes m96c entrypoint');
must(has(JSON.stringify(pkg.scripts || {}), 'acceptance:mobile') && has(JSON.stringify(pkg.scripts || {}), 'check:m96c'), 'acceptance chain includes m96c');
must(has(app, 'boardingChange'), 'app persists boarding change snapshot');
must(has(app, 'handleRequestBoardingChange'), 'app wires boarding change request handler');
must(has(content, 'boardingChange'), 'content forwards boarding change state');
must(has(content, 'onRequestBoardingChange'), 'content forwards boarding change handler');
must(has(state, 'boardingChange'), 'state tracks boarding change');
must(has(state, 'buildBoardingChangeState'), 'state builds boarding change snapshots');
must(has(state, 'boardingChange: state.boardingChange'), 'signed-in sync preserves boarding change');
must(has(handlers, 'handleRequestBoardingChange'), 'handlers expose boarding change request flow');
must(has(helper, 'listBoardingChangeOptions') && has(helper, 'buildBoardingChangeRequest'), 'helper defines boarding change surface');
must(has(helper, 'Bugün servisi kullanmayacağım'), 'helper keeps no-show wording');
must(has(helper, 'Farklı duraktan bineceğim'), 'helper keeps different-stop wording');
must(has(helper, 'Durağa yetişemiyorum'), 'helper keeps late-to-stop wording');
must(has(helper, 'Konumdan alınmak istiyorum'), 'helper keeps pickup-from-location wording');
must(has(helper, 'Operasyona not gönder'), 'helper keeps operation note wording');
must(has(screen, 'BoardingChangeCard'), 'role home renders boarding change card');
must(has(screen, 'Bugün servisi kullanmayacağım'), 'role home keeps personel no-show quick action');
must(has(screen, 'Bugün öğrencim servise binmeyecek'), 'role home keeps parent no-show quick action');
must(has(card, 'Biniş değişikliği'), 'boarding change card shows title');
must(has(card, 'Son istekler'), 'boarding change card shows recent request list');
must(has(card, 'listBoardingChangeOptions'), 'boarding change card uses helper-driven option list');
must(has(card, 'mobil yerel istek modelidir'), 'boarding change card keeps local foundation scope');
must(has(card, 'Durağa yetişemiyorum') || has(card, 'Durağa yetişemiyor') || has(helper, 'Durağa yetişemiyorum'), 'boarding change card exposes late-to-stop wording');
must(has(card, 'Konumdan alınmak istiyorum') || has(helper, 'Konumdan alınmak istiyorum'), 'boarding change card exposes pickup-from-location wording');

console.log('M96-C boarding change check passed');

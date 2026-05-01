const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function normalize(text){
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
function must(text, needle, msg){ if(!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M50 MOBILE RELEASE READINESS CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const appJson = read('app.json');
const eas = read('eas.json');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m50', 'm50 script present in package json');
must(pkg, 'doctor:expo', 'expo doctor script present');
must(pkg, 'build:preview:android', 'preview build script present');
must(pkg, 'build:production:android', 'production build script present');
must(appJson, 'runtimeVersion', 'app config has runtimeVersion');
must(appJson, 'updates', 'app config has updates policy');
must(eas, 'preview', 'eas has preview profile');
must(eas, 'production', 'eas has production profile');
must(app, 'RELEASE_INFO', 'app defines release info');
must(app, 'releaseInfo={RELEASE_INFO}', 'app passes release info to today screen');
must(today, 'Yayin hazirligi', 'today screen has release readiness card');
must(today, 'Uygulama surumu', 'today screen shows app version');
must(today, 'Yayin hedefi', 'today screen shows release target');
must(today, 'Yayin profilleri', 'today screen shows build profiles');
must(today, 'Canli test', 'today screen shows live test status');
must(today, 'Android onizleme', 'today screen shows android preview status');
must(today, 'Yayin paketi', 'today screen shows production bundle status');
must(today, 'Derleme durumu', 'today screen mentions build status');

console.log('=== M50 MOBILE RELEASE READINESS CHECK PASS ===');

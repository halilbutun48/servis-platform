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

console.log('=== M57.4 ANDROID PREVIEW / INTERNAL BUILD CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const appJson = read('app.json');
const eas = read('eas.json');
const env = read('.env.example');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.4', 'm57.4 script present in package json');
must(pkg, 'build:internal:android', 'package json has internal android build alias');
must(pkg, 'build:preview:android', 'package json has preview android build alias');
must(pkg, 'build:production:android', 'package json has production android build alias');
must(appJson, '"version": "0.2.', 'app config version present for m57.4');
if (!(/EXPO_PUBLIC_RELEASE_STAGE|releaseStage|preview|internal|production/i.test(appJson))) throw new Error('FAIL app config marks mobile release stage'); ok('app config marks mobile release stage');
must(appJson, '"androidPreviewTrack": "preview-internal"', 'app config exposes preview track');
must(appJson, '"productionTrack": "production"', 'app config exposes production track');
must(appJson, 'runtimeVersion', 'app config keeps runtimeVersion');
must(eas, '"distribution": "internal"', 'eas preview uses internal distribution');
must(eas, '"buildType": "apk"', 'eas preview uses apk');
must(eas, '"buildType": "app-bundle"', 'eas production uses app bundle');
must(eas, 'EXPO_PUBLIC_RELEASE_STAGE', 'eas profiles define release stage env');
must(env, 'EXPO_PUBLIC_RELEASE_STAGE=preview-internal', 'env example defines preview release stage');
must(app, 'androidPreview:', 'app defines android preview release info');
must(app, 'productionBundle:', 'app defines production bundle release info');
must(app, 'releaseDiscipline:', 'app defines release discipline info');
must(today, 'DriverDiagnosticsCard', 'today screen keeps diagnostics card');
must(today, 'Gelişmiş durum', 'today screen keeps diagnostics title');
must(today, 'Yayın hedefi', 'today screen shows release target line');
must(today, 'Yayın profilleri', 'today screen shows build profiles line');
must(today, 'Canlı test', 'today screen shows expo go status line');
must(today, 'Android önizleme', 'today screen shows android preview line');
must(today, 'Yayın paketi', 'today screen shows production bundle line');
must(today, 'Ortam aşaması', 'today screen shows env stage line');
must(today, 'Derleme durumu', 'today screen shows build status line');
must(today, 'Kabul özeti', 'today screen shows acceptance summary line');

console.log('=== M57.4 ANDROID PREVIEW / INTERNAL BUILD CHECK PASS ===');



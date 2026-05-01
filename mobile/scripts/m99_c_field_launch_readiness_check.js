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

console.log('=== M99-C FIELD LAUNCH READINESS CHECK ===');

const pkg = JSON.parse(read('package.json'));
const appJson = read('app.json');
const release = read('src/lib/release.js');
const today = read('src/screens/TodayScreen.js');
const live = read('src/screens/LiveScreen.js');
const evidencePack = read('../docs/EVIDENCE_PACK_20260428.md', mobileRoot);
const fieldGuide = read('../docs/MOBILE_FIELD_EVIDENCE_CAPTURE_GUIDE.md', mobileRoot);
const sahaTemplate = read('../docs/SAHA_EVIDENCE_PACK_TEMPLATE.md', mobileRoot);
const primer = read('../docs/PRIMER_SSOT.md', mobileRoot);
const registry = read('../docs/MILESTONE_REGISTRY_V1.md', mobileRoot);
const guide = read('../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md', mobileRoot);
const repoState = read('../tools/repo_contract_state.json', mobileRoot);

must(has(JSON.stringify(pkg.scripts || {}), 'check:m99c'), 'package exposes m99c check');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m99c'), 'acceptance chain includes m99c');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m99c'), 'check:m1 includes m99c');

must(has(appJson, 'Personel Servis Sürücü'), 'app config keeps mobile name');
must(has(appJson, 'Sürücünün telefon GPS’i ile görev sırasında konum güncellemek için izin gerekir.'), 'app config keeps location permission text');
must(has(appJson, 'android.permission.ACCESS_BACKGROUND_LOCATION'), 'app config keeps background location permission');
must(has(appJson, 'android.permission.FOREGROUND_SERVICE_LOCATION'), 'app config keeps foreground service location permission');
must(has(appJson, 'UIBackgroundModes'), 'app config keeps ios background mode');
must(has(appJson, 'releaseStage'), 'app config keeps release stage marker');

must(has(release, 'fieldHardeningSummary'), 'release info keeps field hardening summary');
must(has(release, 'releaseDiscipline'), 'release info keeps release discipline');
must(has(release, 'Expo Go degil'), 'release info keeps expo go guard');
must(has(release, 'Sürücünün telefon GPS’i'), 'release info keeps driver phone gps wording');
must(has(release, 'KVKK blokları ve release guard birlikte izlenir'), 'release info keeps combined field guard summary');

must(has(today, 'DriverDiagnosticsCard'), 'today screen keeps diagnostics card');
must(has(today, 'Gelişmiş durum'), 'today screen keeps advanced status card');
must(has(today, 'Yayın hedefi'), 'today screen shows release target');
must(has(today, 'Yayın profilleri'), 'today screen shows build profiles');
must(has(today, 'Canlı test'), 'today screen keeps live test status');
must(has(today, 'Yayın paketi'), 'today screen keeps production bundle status');
must(has(today, 'Ortam aşaması'), 'today screen keeps release env status');

must(has(live, 'Gelişmiş durum'), 'live screen keeps diagnostics card');
must(has(live, 'Ortam'), 'live screen keeps release env info');
must(has(live, 'Yayın durumu'), 'live screen keeps release status info');
must(has(live, 'Sürücünün telefon GPS\'i'), 'live screen keeps phone gps wording');

must(has(evidencePack, '90000'), 'evidence pack keeps long soak request count');
must(has(evidencePack, 'errors: 0'), 'evidence pack keeps clean error summary');
must(has(evidencePack, 'throttled: 0'), 'evidence pack keeps throttled summary');
must(has(evidencePack, 'real Android device'), 'evidence pack keeps real Android device note');
must(has(evidencePack, 'weak-network run'), 'evidence pack keeps weak network note');
must(has(evidencePack, 'driver-phone GPS background run'), 'evidence pack keeps driver-phone GPS field note');
must(has(evidencePack, 'permission-off / permission-on split'), 'evidence pack keeps permission split note');
must(has(evidencePack, 'operator note and screenshot pack'), 'evidence pack keeps operator evidence note');

must(has(fieldGuide, 'Gerçek Android cihaz'), 'field guide keeps real device step');
must(has(fieldGuide, 'zayıf ağ'), 'field guide keeps weak network step');
must(has(fieldGuide, 'Ekran kapalıyken GPS gönderimi'), 'field guide keeps screen off step');
must(has(fieldGuide, 'Sürücünün telefon GPS\'ini aç'), 'field guide keeps phone gps instruction');
must(has(fieldGuide, 'KVKK ve gerekli izinleri doğrula'), 'field guide keeps kvkk instruction');
must(has(fieldGuide, 'root / jailbreak'), 'field guide keeps hardening evaluation note');
must(has(fieldGuide, 'SSL pinning'), 'field guide keeps ssl pinning evaluation note');
must(has(fieldGuide, 'Token ve refresh token'), 'field guide keeps token storage note');

must(has(sahaTemplate, 'Cihaz modeli'), 'field template keeps device model field');
must(has(sahaTemplate, 'Ağ türü'), 'field template keeps network field');
must(has(sahaTemplate, 'GPS modu'), 'field template keeps gps mode field');
must(has(sahaTemplate, 'Ekran açık mı'), 'field template keeps screen state field');
must(has(sahaTemplate, 'Arka plan modu'), 'field template keeps background mode field');
must(has(sahaTemplate, 'Ekran görüntüleri'), 'field template keeps screenshot field');
must(has(sahaTemplate, 'Log çıktıları'), 'field template keeps log field');
must(has(sahaTemplate, 'Video kaydı'), 'field template keeps video field');
must(has(sahaTemplate, 'Operatör notu'), 'field template keeps operator note field');

must(has(primer, 'Field launch readiness: `M99-C field launch readiness`'), 'primer mentions M99-C');
must(has(registry, 'M99-C - field launch readiness - active'), 'registry mentions M99-C');
must(has(guide, 'M99-C — field launch readiness [CHECK]'), 'script guide mentions M99-C');
must(has(repoState, '"M99-C"'), 'repo state keeps M99-C visible');

console.log('M99-C field launch readiness check passed');

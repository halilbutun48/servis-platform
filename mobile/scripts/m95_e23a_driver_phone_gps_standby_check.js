const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
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

function must(text, needle, msg) {
  if (!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M95-E23A DRIVER PHONE GPS STANDBY CHECK ===');

const pkg = JSON.parse(read('package.json'));
const live = read('src/screens/LiveScreen.js');
const ui = read('src/screens/driverUiText.js');

must(JSON.stringify(pkg.scripts || {}), 'check:m95e23a', 'package exposes m95e23a check');
must(String(pkg.scripts?.['check:m1'] || ''), 'check:m95e23a', 'mobile check chain references m95e23a');
must(String(pkg.scripts?.['acceptance:mobile'] || ''), 'check:m95e23a', 'mobile acceptance chain references m95e23a');

must(ui, 'driverPhoneGpsStateLabel', 'driver UI text exports phone GPS mode helper');
must(ui, "Sürücünün telefon GPS'i devrede", 'driver UI text keeps active phone GPS label');
must(ui, "Sürücünün telefon GPS'i beklemede", 'driver UI text keeps standby phone GPS label');
must(ui, "Telefon GPS'i beklemede — görev yok", 'driver UI text keeps no-task phone GPS label');
must(ui, "replace(/^CACHED_/, '')", 'driver UI text normalizes cached source keys');

must(live, 'driverPhoneGpsStateLabel', 'live screen imports phone GPS mode helper');
must(live, 'phoneGpsStateText', 'live screen derives the phone GPS state text');
must(live, 'phoneGpsBadgeText', 'live screen derives the phone GPS badge text');
must(live, 'Telefon GPS durumu', 'live screen shows the phone GPS status summary');
must(live, "subtitle: phoneGpsStateText", 'live screen uses phone GPS state in the source card');
must(live, "badge: phoneGpsBadgeText", 'live screen uses derived badge text for the phone card');
must(live, "Sürücünün telefon GPS'i devrede", 'live screen shows the active phone GPS mode');
must(live, "Telefon GPS'i beklemede — görev yok", 'live screen shows the no-task phone GPS mode');
must(live, "gps?.officialFreshnessText || \"Araç GPS'i bekliyor.\"", 'live screen keeps vehicle source wording generic');

console.log('=== M95-E23A DRIVER PHONE GPS STANDBY CHECK PASS ===');

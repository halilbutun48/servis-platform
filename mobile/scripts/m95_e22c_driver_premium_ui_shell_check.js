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

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

function mustNot(text, needle, msg) {
  if (has(text, needle)) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E22C DRIVER PREMIUM UI SHELL CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const premium = read('src/screens/driverPremiumUi.js');
const shell = read('src/screens/DriverShellLoadingScreen.js');
const roleHome = read('src/screens/RoleHomeScreen.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95e22c'), 'package exposes m95e22c entrypoint');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m95e22c'), 'check:m1 includes m95e22c');

must(has(content, 'DriverAppHeader'), 'mobile shell keeps premium header');
must(has(content, 'DriverBottomTabBar'), 'mobile shell keeps premium bottom tabs');
must(has(content, 'DriverShellFrame'), 'mobile shell keeps shared driver shell frame');
must(has(content, 'PinChangeScreen'), 'mobile shell keeps driver pin change screen');
must(has(content, 'ForcePasswordChangeScreen'), 'mobile shell keeps non-driver password change screen');
must(has(content, 'RoleHomeScreen'), 'mobile shell keeps role home screen bridge');
must(has(content, 'role && role !== \'DRIVER\''), 'mobile shell keeps non-driver role routing');

must(has(premium, 'DriverAppHeader'), 'premium ui keeps driver app header');
must(has(premium, 'DriverBottomTabBar'), 'premium ui keeps driver bottom tab bar');
must(has(premium, 'GpsSourceStatusCard'), 'premium ui keeps gps source card');
must(has(premium, 'RouteMiniMapCard'), 'premium ui keeps route preview card');
must(has(premium, 'RouteNavigationCard'), 'premium ui keeps route navigation card');
must(has(premium, 'DriverDiagnosticsCard'), 'premium ui keeps diagnostics card');
mustNot(premium, 'Yakında', 'premium ui keeps the no-ykinda copy removed');

must(has(shell, 'Sürücü ekranı yükleniyor...') || has(shell, 'Sürücü ekranı yükleniyor'), 'driver shell loading screen stays visible');
must(has(shell, 'Oturum açıldı, görev bilgileri hazırlanıyor.'), 'driver shell loading screen explains the wait');

must(has(roleHome, 'RoleLivePremiumCard'), 'role home keeps live premium card bridge');
must(has(roleHome, 'RoleOverviewPremiumCard'), 'role home keeps overview premium card bridge');

const appLines = app.split(/\r?\n/).length;
must(appLines < 1000, `App.js stays below the large-file risk line (${appLines})`);

console.log('M95-E22C driver premium UI shell check passed');

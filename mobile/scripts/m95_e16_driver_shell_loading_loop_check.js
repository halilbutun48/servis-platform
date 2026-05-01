const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`OK ${message}`);
}

const mobileAppContent = read('src/app/MobileAppContent.js');
const lifecycle = read('src/app/useMobileAppLifecycle.js');
const todayScreen = read('src/screens/TodayScreen.js');
const driverShell = read('src/screens/DriverShellLoadingScreen.js');
const pinChange = read('src/screens/PinChangeScreen.js');
const appJs = read('App.js');
const appConfig = read('app.config.js');
const easJson = read('eas.json');
const packageJson = read('package.json');
const release = read('src/lib/release.js');
const networkSecurityPlugin = read('plugins/withLocalEmulatorNetworkSecurity.js');

if (!mobileAppContent.includes('DriverShellLoadingScreen')) fail('DriverShellLoadingScreen render path missing');
if (!mobileAppContent.includes('const postLoginLoading = Boolean(')) fail('postLoginLoading gate missing');
if (!mobileAppContent.includes('state?.loading')) fail('postLoginLoading no longer checks initial loading');
if (mobileAppContent.includes("state?.loading || state?.syncing || !state?.me || (role === 'DRIVER' && !driverUiReady)")) {
  fail('legacy infinite driver shell gate still present');
}
if (mobileAppContent.includes('driverUiReady')) fail('driverUiReady should not gate MobileAppContent anymore');
if (!todayScreen.includes('Görünür vardiya yok')) fail('TodayScreen empty state missing');
if (!todayScreen.includes('Bugün aktif görev yok.') && !todayScreen.includes('Bugün veya yakın zaman için atanmış vardiya görünmüyor.')) {
  fail('TodayScreen no-task empty message missing');
}
if (!driverShell.includes('Sürücü ekranı yükleniyor...')) fail('DriverShellLoadingScreen title missing');
if (!driverShell.includes('onReady?.()')) fail('DriverShellLoadingScreen ready hook missing');
if (!appJs.includes('syncBusyRef.current = false;')) fail('syncSignedIn finally unlock missing');
if (!lifecycle.includes('ensureDeviceId')) fail('ensureDeviceId import missing');
if (!lifecycle.includes("from '../lib/api'")) fail('ensureDeviceId should come from api module');
if (lifecycle.includes('loginDriver(')) fail('useMobileAppLifecycle should not trigger login');
if (!pinChange.includes('submitLockRef')) fail('PinChangeScreen submit lock missing');
if (!pinChange.includes('minHeight: 28')) fail('PinChangeScreen stable error shell missing');
if (!appJs.includes('onDriverShellReady={handleDriverShellReady}')) fail('App.js driver shell fallback hook missing');
if (!appConfig.includes('usesCleartextTraffic: isLocalEmulator')) fail('app.config.js cleartext gating missing');
if (!appConfig.includes('plugins.push(withLocalEmulatorNetworkSecurity)')) fail('app.config.js local network security plugin missing');
if (!easJson.includes('"local-apk"')) fail('eas.json local-apk profile missing');
if (!easJson.includes('http://10.0.2.2:3000')) fail('eas.json local API host missing');
if (!packageJson.includes('"check:m95e16"')) fail('package.json missing check:m95e16');
if (!packageJson.includes('npm run check:m95e16')) fail('check:m1 / acceptance chain missing m95e16');
if (!release.includes('local-emulator')) fail('release guard local-emulator missing');
if (!networkSecurityPlugin.includes('10.0.2.2')) fail('local emulator network security config missing 10.0.2.2');
if (!networkSecurityPlugin.includes('cleartextTrafficPermitted="true"')) fail('network security config should permit cleartext for local emulator domains');

ok('M95-E16 driver shell loading loop check passed');

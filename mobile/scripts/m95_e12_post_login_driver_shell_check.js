const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(mobileRoot, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E12 POST LOGIN DRIVER SHELL CHECK ===');

const app = read('App.js');
const content = read(path.join('src', 'app', 'MobileAppContent.js'));
const shell = read(path.join('src', 'screens', 'DriverShellLoadingScreen.js'));
const today = read(path.join('src', 'screens', 'TodayScreen.js'));
const route = read(path.join('src', 'screens', 'RouteScreen.js'));
const api = read(path.join('src', 'lib', 'api.js'));
const appConfig = read('app.config.js');
const release = read(path.join('src', 'lib', 'release.js'));
const packageJson = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));
const localProfile = eas?.build?.['local-apk'] || null;

must(/DriverShellLoadingScreen/.test(content), 'MobileAppContent imports the driver shell fallback');
must(/driverUiReady:\s*false/.test(read(path.join('src', 'app', 'mobileAppState.js'))), 'driver shell readiness flag exists in initial state');
must(/postLoginLoading = Boolean\(\s*hasSession\s*&&\s*!state\?\.me\?\.requirePinChange\s*&&\s*state\?\.loading\s*\)/.test(content), 'post-login driver fallback condition exists');
must(!/driverUiReady/.test(content), 'MobileAppContent no longer gates driver shell on driverUiReady');
must(/onReady=\{onDriverShellReady\}/.test(content), 'MobileAppContent forwards shell ready callback');
must(/onLayout=\{\(\) => onReady\?\.\(\)\}/.test(shell), 'driver shell notifies when its first layout lands');
must(/onDriverShellReady=\{handleDriverShellReady\}/.test(app), 'App wires driver shell ready handler');
must(/Sürücü ekranı yükleniyor\.\.\./.test(shell), 'driver shell fallback has visible loading title');
must(/Oturum açıldı, görev bilgileri hazırlanıyor\./.test(shell), 'driver shell fallback explains the post-login wait');
must(/Info label="Cihaz" value=\{deviceId \? 'hazır' : 'yok'\}/.test(shell), 'driver shell fallback hides raw device id');
must(!/\[object Object\]/.test(shell), 'driver shell fallback does not keep object-object text');
must(/role && role !== 'DRIVER'/.test(content), 'RoleHomeScreen routes non-driver roles');
must(/RoleHomeScreen/.test(content), 'RoleHomeScreen import remains present for non-driver roles');
must(/EmptyState/.test(today) && /EmptyState/.test(route), 'TodayScreen and RouteScreen keep safe empty states');
must(/resolveDriverGpsShiftContext/.test(today), 'TodayScreen keeps safe visible shift resolution');
must(/resolveDriverGpsShiftContext/.test(route), 'RouteScreen keeps safe visible shift resolution');
must(/buildUrl\('\/api\/auth\/login'\)/.test(api) && /rawRequest\('\/api\/auth\/login'/.test(api), 'login URL still targets /api/auth/login');
must(/withLocalEmulatorNetworkSecurity/.test(appConfig), 'local network security plugin still present');
must(/if \(isLocalEmulator\)/.test(appConfig), 'local-emulator gate still present in app config');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'local cleartext remains stage-gated');
must(/Platform\.OS === 'ios' \? <StatusBar barStyle="dark-content" \/> : null/.test(app), 'Android StatusBar guard remains intact');
must(/SafeAreaView style=\{styles\.safe\}/.test(app), 'safe root shell remains intact');
must(/function handleDriverShellReady\(\)/.test(app), 'App defines a driver shell ready handler');
must(/Local emulator APK \/ 10\.0\.2\.2/.test(release), 'release keeps local emulator root host');
must(/buildUrl\('\/api\/auth\/login'\)/.test(api) || /rawRequest\('\/api\/auth\/login'/.test(api), 'login URL remains rooted at /api/auth/login');
must(Boolean(packageJson?.scripts?.['check:m95e12']), 'package exposes m95e12 check');
must(String(packageJson?.scripts?.['check:m1'] || '').includes('check:m95e12'), 'check:m1 includes m95e12');
must(String(packageJson?.scripts?.['acceptance:mobile'] || '').includes('check:m95e12'), 'acceptance chain includes m95e12');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local apk profile keeps emulator root host');

console.log('M95-E12 post login driver shell check passed');

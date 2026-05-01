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

function blockBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return '';
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

console.log('=== M95-E13 APP EFFECT CRASH CHECK ===');

const app = read('App.js');
const lifecycle = read(path.join('src', 'app', 'useMobileAppLifecycle.js'));
const state = read(path.join('src', 'app', 'mobileAppState.js'));
const storage = read(path.join('src', 'lib', 'storage.js'));
const content = read(path.join('src', 'app', 'MobileAppContent.js'));
const shell = read(path.join('src', 'screens', 'DriverShellLoadingScreen.js'));
const today = read(path.join('src', 'screens', 'TodayScreen.js'));
const route = read(path.join('src', 'screens', 'RouteScreen.js'));
const appConfig = read('app.config.js');
const release = read(path.join('src', 'lib', 'release.js'));
const pkg = JSON.parse(read('package.json'));

const lifecycleBlock = blockBetween(lifecycle, 'export function useMobileAppLifecycle({', '});');
must(/import \{ ensureDeviceId \} from '\.\.\/lib\/api'/.test(lifecycle), 'lifecycle imports ensureDeviceId from api');
must(!/from '\.\.\/lib\/storage'.*ensureDeviceId/.test(lifecycle), 'lifecycle no longer imports ensureDeviceId from storage');
must(/ensureDeviceId\(\)/.test(lifecycle), 'lifecycle still resolves a device id');
must(/useDriverRealtimeResync/.test(lifecycle), 'lifecycle keeps realtime resync wiring');
must(/syncSignedIn\(\{ soft: Boolean\(snapshot\) \}\)/.test(lifecycle), 'lifecycle keeps signed-in sync after hydration');
must(/function compactMobileSnapshot\(/.test(state), 'snapshot compaction helper exists');
must(/SNAPSHOT_MAX_BYTES/.test(state) || /serialized\.length <= 1800/.test(state), 'snapshot size budget exists');
must(/items: compactArray\(snapshot\.notifications\.items, compactNotificationItem, 1\)/.test(state), 'notifications snapshot is compacted');
must(/items: compactArray\(snapshot\.driverAwareness\.items, compactDriverAwarenessItem, 1\)/.test(state), 'driver awareness snapshot is compacted');
must(/items: compactArray\(snapshot\.boardingChange\.items, compactBoardingChangeItem, 1\)/.test(state), 'boarding change snapshot is compacted');
must(/driverUiReady:\s*false/.test(state), 'initial driver UI ready state exists');
must(/DriverShellLoadingScreen/.test(content), 'MobileAppContent keeps the driver shell fallback import');
must(/postLoginLoading = Boolean\(\s*hasSession &&\s*!state\?\.me\?\.requirePinChange &&\s*state\?\.loading\s*\)/.test(content), 'MobileAppContent keeps post-login fallback gate');
must(!/driverUiReady/.test(content), 'MobileAppContent no longer gates driver shell on driverUiReady');
must(/if \(postLoginLoading\)/.test(content), 'MobileAppContent renders the driver shell before driver content');
must(/<DriverShellLoadingScreen[\s\S]*onReady=\{onDriverShellReady\}/.test(content), 'MobileAppContent can hand off driver shell readiness');
must(shell.includes('onLayout={() => onReady?.()}'), 'DriverShellLoadingScreen marks first paint readiness');
must(/EmptyState/.test(today) && /EmptyState/.test(route), 'TodayScreen and RouteScreen still keep safe empty states');
must(/Platform\.OS === 'ios' \? <StatusBar barStyle="dark-content" \/> : null/.test(app), 'App.js keeps the iOS-only StatusBar guard');
must(/SafeAreaView style=\{styles\.safe\}/.test(app), 'App.js keeps the safe root shell');
must(/onDriverShellReady=\{handleDriverShellReady\}/.test(app), 'App.js wires driver shell readiness callback');
must(/withLocalEmulatorNetworkSecurity/.test(appConfig), 'local network security plugin remains in app config');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'local cleartext remains stage-gated');
must(/Local emulator APK \/ 10\.0\.2\.2/.test(release), 'release keeps local emulator root host');
must(!/password/i.test(shell), 'driver shell fallback does not expose password');
must(!/token/i.test(shell), 'driver shell fallback does not expose token');
must(!/\[object Object\]/.test(storage), 'storage source does not keep object-object text');
must(Boolean(pkg?.scripts?.['check:m95e13']), 'package exposes m95e13 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e13'), 'check:m1 includes m95e13');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e13'), 'acceptance chain includes m95e13');

console.log('M95-E13 app effect crash check passed');

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

console.log('=== M95-E10 LOGIN 403 ERROR PARSE CHECK ===');

const api = read(path.join('src', 'lib', 'api.js'));
const login = read(path.join('src', 'screens', 'LoginScreen.js'));
const storage = read(path.join('src', 'lib', 'storage.js'));
const release = read(path.join('src', 'lib', 'release.js'));
const app = read('App.js');
const appConfig = read('app.config.js');
const plugin = read(path.join('plugins', 'withLocalEmulatorNetworkSecurity.js'));
const eas = JSON.parse(read('eas.json'));
const pkg = JSON.parse(read('package.json'));

const localProfile = eas?.build?.['local-apk'] || null;

must(/resolveBackendErrorShape/.test(api), 'api normalizes backend error envelopes');
must(/extractScalarText/.test(api), 'api extracts backend scalar text safely');
must(/collectObjectKeys/.test(api), 'api collects backend detail keys');
must(/HTTP_403/.test(api), 'api maps status 403 to a dedicated login error code');
must(/Giriş yetkisi doğrulanamadı\. Sürücü kodu, PIN veya cihaz eşleşmesini kontrol edin\./.test(api), 'api keeps the 403 Turkish message');
must(/deviceIdPresent/.test(api), 'api includes deviceId presence in diagnostics');
must(/deviceIdMask/.test(api), 'api includes masked device id in diagnostics');
must(/body:\s*\{\s*identifier,\s*password,\s*deviceId\s*\}/.test(api), 'login payload keeps deviceId');
must(!/\[object Object\]/.test(api), 'api source does not keep object-object text');
must(/getDeviceId/.test(storage), 'storage still exposes device id getter');
must(/saveDeviceId/.test(storage), 'storage still exposes device id saver');
must(/buildLoginDebugViewModel\(error,\s*deviceId\s*=\s*''\)/.test(login), 'login debug model accepts device id');
must(/Details:\s*\{loginDebug\.detailKeys\.length/.test(login), 'login screen renders backend details keys');
must(/Cihaz:\s*\{loginDebug\.deviceIdState \|\| '-'\}/.test(login), 'login screen renders safe device state');
must(/Cihaz:\s*\{deviceId \? 'hazır' : 'yok'\}/.test(login), 'login screen hides raw device id in the note box');
must(!/\[object Object\]/.test(login), 'login screen source does not keep object-object text');
must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local profile keeps emulator root host');
must(/local-emulator/.test(release), 'release guard still knows the local emulator stage');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https for non-local stages');
must(/Platform\.OS === 'ios' \? <StatusBar barStyle="dark-content" \/> : null/.test(app), 'App.js keeps the iOS-only StatusBar guard');
must(/SafeAreaView style=\{styles\.safe\}/.test(app), 'App.js keeps the safe root shell');
must(/withLocalEmulatorNetworkSecurity/.test(appConfig), 'app config keeps the local network security plugin');
must(/if \(isLocalEmulator\)/.test(appConfig), 'app config keeps the local-emulator gate');
must(/usesCleartextTraffic:\s*isLocalEmulator/.test(appConfig), 'app config keeps local cleartext only');
must(/createRunOncePlugin/.test(plugin), 'network security plugin remains run-once');
must(/network_security_config\.xml/.test(plugin), 'network security plugin still writes xml');
must(Boolean(pkg?.scripts?.['check:m95e10']), 'package exposes m95e10 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e10'), 'check:m1 includes m95e10');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e10'), 'acceptance chain includes m95e10');

console.log('M95-E10 login 403 error parse check passed');

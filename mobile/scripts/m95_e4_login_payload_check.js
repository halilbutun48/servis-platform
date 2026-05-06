const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel, root = mobileRoot) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E4 LOGIN PAYLOAD CHECK ===');

const api = read(path.join('src', 'lib', 'api.js'));
const screen = read(path.join('src', 'screens', 'LoginScreen.js'));
const handlers = read(path.join('src', 'app', 'MobileAppHandlers.js'));
const pkg = JSON.parse(read('package.json'));

must(/export\s+async\s+function\s+loginDriver\s*\(\s*identifier\s*,\s*password\s*\)/.test(api), 'api keeps loginDriver(identifier, password) signature');
must(/body:\s*\{\s*identifier,\s*password,\s*deviceId\s*\}/.test(api), 'api login payload uses identifier and password');
must(!/body:\s*\{\s*code\s*,\s*pin\b/.test(api), 'api does not send code/pin payload');
must(/fieldErrors\.identifier|fieldErrors\.code|fieldErrors\.email/.test(api), 'api maps identifier validation error');
must(/fieldErrors\.password|fieldErrors\.pin/.test(api), 'api maps password validation error');
must(/Kullanıcı kodu veya PIN\/şifre hatalı\./.test(api), 'api keeps simplified invalid credentials message');

must(/async function handleLogin\s*\(\s*\{\s*identifier\s*,\s*password\s*\}\s*\)/.test(handlers), 'handlers accept identifier/password login payload');
must(/await loginDriver\(loginIdentifier,\s*loginPassword\)/.test(handlers), 'handlers forward identifier/password to loginDriver');
must(/acceptPersonelInvite/.test(handlers), 'handlers can fall back to personel invite accept');

must(/Kullanıcı kodu/.test(screen), 'login screen keeps identifier label');
must(/PIN veya şifre/.test(screen), 'login screen keeps password label');
must(/fieldErrors\.identifier|fieldErrors\.code|fieldErrors\.email/.test(screen), 'login screen maps identifier validation error');
must(/fieldErrors\.password|fieldErrors\.pin/.test(screen), 'login screen maps password validation error');
must(/Kullanıcı kodu veya PIN\/şifre hatalı\./.test(screen), 'login screen keeps simplified invalid credentials message');

must(Boolean(pkg?.scripts?.['check:m95e4']), 'package exposes m95e4 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e4'), 'check:m1 includes m95e4');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e4'), 'acceptance chain includes m95e4');

console.log('M95-E4 login payload check passed');

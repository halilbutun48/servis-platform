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

function blockBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start === -1) return '';
  const end = text.indexOf(endMarker, start + startMarker.length);
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

console.log('=== M95-E5 LOGIN DIAGNOSTICS CHECK ===');

const api = read(path.join('src', 'lib', 'api.js'));
const screen = read(path.join('src', 'screens', 'LoginScreen.js'));
const pkg = JSON.parse(read('package.json'));
const release = read(path.join('src', 'lib', 'release.js'));

const loginDiagBlock = blockBetween(api, 'function buildLoginDiagnostics', 'export async function loginDriver');
must(Boolean(loginDiagBlock), 'api keeps login diagnostics helper');
must(/String\(releaseGuard\?\.stage \|\| ''\)\.trim\(\)\.toLowerCase\(\) !== 'local-emulator'/.test(loginDiagBlock), 'login diagnostics only opens local-emulator');
must(/endpointPath: path/.test(loginDiagBlock), 'login diagnostics keeps endpoint path');
must(/attemptedUrl/.test(loginDiagBlock), 'login diagnostics keeps attempted url');
must(/apiBaseUrl/.test(loginDiagBlock), 'login diagnostics keeps api base');
must(/status:/.test(loginDiagBlock), 'login diagnostics keeps status');
must(/code:/.test(loginDiagBlock), 'login diagnostics keeps backend code');
must(/message:/.test(loginDiagBlock), 'login diagnostics keeps backend message');
must(/fieldErrorKeys/.test(loginDiagBlock), 'login diagnostics keeps validation field keys');
must(/networkErrorName/.test(loginDiagBlock), 'login diagnostics keeps network error name');
must(/networkErrorMessage/.test(loginDiagBlock), 'login diagnostics keeps network error message');
const loginDiagReturn = blockBetween(loginDiagBlock, 'return {', '};');
must(Boolean(loginDiagReturn), 'login diagnostics return object exists');
must(!/password/i.test(loginDiagReturn), 'login diagnostics return omits password');
must(!/token/i.test(loginDiagReturn), 'login diagnostics return omits token');

const screenDebugBlock = blockBetween(screen, 'function buildLoginDebugViewModel', 'export default function LoginScreen');
must(Boolean(screenDebugBlock), 'login screen keeps debug view model helper');
must(/local-emulator/.test(screenDebugBlock), 'login screen debug view model is local-emulator only');
must(/Login debug/.test(screen), 'login screen renders login debug card');
must(/Endpoint:/.test(screen), 'login screen debug card shows endpoint');
must(/Status:/.test(screen), 'login screen debug card shows status');
must(/Code:/.test(screen), 'login screen debug card shows code');
must(/Message:/.test(screen), 'login screen debug card shows message');
must(/Validation:/.test(screen), 'login screen debug card shows validation keys');
must(/Network:/.test(screen), 'login screen debug card shows network error info');
must(/Transport:/.test(screen), 'login screen debug card shows transport');
must(/isLocalEmulator/.test(screen), 'login screen gates debug card to local-emulator');
must(!/password/i.test(screenDebugBlock), 'login screen debug view model omits password');
must(!/token/i.test(screenDebugBlock), 'login screen debug view model omits token');

must(Boolean(pkg?.scripts?.['check:m95e5']), 'package exposes m95e5 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e5'), 'check:m1 includes m95e5');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e5'), 'acceptance chain includes m95e5');
must(/local-emulator/.test(release), 'release guard keeps local-emulator stage');
must(/protocol\s*!==\s*'https:'/.test(release), 'release guard keeps https requirement for non-local stages');

console.log('M95-E5 login diagnostics check passed');

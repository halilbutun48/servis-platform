const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg) { console.log(`OK ${msg}`); }
function must(text, needle, msg) { if (!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }
function mustNot(text, needle, msg) { if (text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M82.6 RELEASE / ENV / ACCEPTANCE CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const api = read('src/lib/api.js');
const release = read('src/lib/release.js');
const login = read('src/screens/LoginScreen.js');
const today = read('src/screens/TodayScreen.js');
const live = read('src/screens/LiveScreen.js');
const eas = read('eas.json');
const envExample = read('.env.example');
const runbook = read('M81_RELEASE_ENV_RUNBOOK.md');

must(pkg, 'check:m82.6', 'package json exposes m82.6 check script');
must(pkg, 'acceptance:mobile', 'package json exposes acceptance mobile script');
must(pkg, 'npm run check:m82.6', 'doctor or acceptance chain references m82.6');
must(api, 'getReleaseGuard', 'api layer reads release guard before network requests');
must(api, 'buildReleaseBlockingError', 'api layer can block release env mistakes early');
must(release, 'EXPO_PUBLIC_RELEASE_STAGE', 'release helper reads release stage env');
must(release, 'EXPO_PUBLIC_API_TIMEOUT_MS', 'release helper reads api timeout env');
must(release, 'placeholder', 'release helper blocks placeholder hosts');
must(login, 'Release / env kabul kontrolu', 'login screen shows release env acceptance card');
must(today, 'Release hazirligi', 'today screen shows release readiness card');
must(today, 'Expo Go', 'today screen still shows expo go guidance');
must(today, 'EAS Build', 'today screen still shows eas build guidance');
must(live, 'Release / env', 'live screen shows release env state');
must(eas, '__SET_PREVIEW_HTTPS_API_BASE_URL__', 'preview eas profile requires explicit https api host replacement');
must(eas, '__SET_PRODUCTION_HTTPS_API_BASE_URL__', 'production eas profile requires explicit https api host replacement');
must(envExample, 'EXPO_PUBLIC_API_TIMEOUT_MS=12000', '.env.example includes api timeout');
must(runbook, 'acceptance:mobile', 'runbook includes acceptance chain');
mustNot(eas, 'https://preview-api.example.com', 'eas preview profile no longer ships example.com placeholder');
mustNot(eas, 'https://api.example.com', 'eas production profile no longer ships example.com placeholder');

console.log('=== M82.6 RELEASE / ENV / ACCEPTANCE CHECK PASS ===');

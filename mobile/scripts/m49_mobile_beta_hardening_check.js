const fs = require('fs');
const path = require('path');

const root = process.cwd();
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
function must(label, cond) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}
function banner(text) {
  console.log(`
=== ${text} ===
`);
}

banner('M49 MOBILE BETA HARDENING CHECK');
const app = read('App.js');
const pkg = JSON.parse(read('package.json'));
const lifecycle = read('src/app/useMobileAppLifecycle.js');
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');

must('m49 script present in package json', pkg.scripts && pkg.scripts['check:m49']);
must('app uses AppState listener', lifecycle.includes('AppState.addEventListener'));
must('app refreshes on foreground active', lifecycle.includes("nextState === 'active'"));
must('app has 30s periodic refresh', lifecycle.includes('30000'));
must('app stores last sync state', app.includes('lastSyncAt'));
must('api exposes fetchHealth', api.includes('fetchHealth'));
must('api exposes logoutDriver', api.includes('logoutDriver'));
must('api exposes api base getter', api.includes('getApiBaseUrl'));
must('today screen has yayin hazirligi card', normalize(today).includes(normalize('Yayın hazırlığı')));
must('today screen shows api base url', normalize(today).includes(normalize('API taban')));
must('today screen shows device id', normalize(today).includes(normalize('Device ID')));
must('today screen shows last sync', normalize(today).includes(normalize('Son basarili senkron')));
must('today screen shows guvenli cikis', normalize(today).includes(normalize('Güvenli çıkış')));

banner('M49 MOBILE BETA HARDENING CHECK PASS');

const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
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
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');

must('m49 script present in package json', pkg.scripts && pkg.scripts['check:m49']);
must('app uses AppState listener', app.includes('AppState'));
must('app refreshes on foreground active', app.includes("nextState === 'active'"));
must('app has 30s periodic refresh', app.includes('30000'));
must('app stores last sync state', app.includes('lastSyncAt'));
must('api exposes fetchHealth', api.includes('fetchHealth'));
must('api exposes logoutDriver', api.includes('logoutDriver'));
must('api exposes api base getter', api.includes('getApiBaseUrl'));
must('today screen has beta durum card', today.includes('Beta durum'));
must('today screen shows api base url', today.includes('API taban'));
must('today screen shows device id', today.includes('Device ID'));
must('today screen shows last sync', today.includes('Son basarili senkron'));
must('today screen shows guvenli cikis', today.includes('Guvenli cikis'));

banner('M49 MOBILE BETA HARDENING CHECK PASS');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M57.3 SESSION FAILURE + KVKK BLOCKING CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');
const login = read('src/screens/LoginScreen.js');

must(pkg, 'check:m57.3', 'm57.3 script present in package json');
must(api, 'fetchKvkkCurrent', 'api exposes kvkk current fetch');
must(api, 'acceptKvkkRequiredMany', 'api exposes kvkk accept-many');
must(api, 'markSessionFailure', 'api marks refresh/session failure');
must(app, 'applySessionFailure', 'app has clean session failure handler');
must(app, 'Oturum kapandi. Yeniden giris yapin.', 'app has session failure user message');
must(app, 'KVKK onayi eksik. Onay tamamlanmadan konum gonderilemez.', 'app blocks gps when kvkk missing');
must(today, 'SectionTitle title="KVKK"', 'today screen has kvkk card');
must(today, 'KVKK onayini tamamla', 'today screen has kvkk accept action');
must(login, 'setError(initialError ||', 'login screen reacts to renewed initial error');

console.log('=== M57.3 SESSION FAILURE + KVKK BLOCKING CHECK PASS ===');

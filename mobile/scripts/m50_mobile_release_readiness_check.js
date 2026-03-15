const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M50 MOBILE RELEASE READINESS CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const appJson = read('app.json');
const eas = read('eas.json');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m50', 'm50 script present in package json');
must(pkg, 'doctor:expo', 'expo doctor script present');
must(pkg, 'build:preview:android', 'preview build script present');
must(pkg, 'build:production:android', 'production build script present');
must(appJson, 'runtimeVersion', 'app config has runtimeVersion');
must(appJson, 'updates', 'app config has updates policy');
must(eas, 'preview', 'eas has preview profile');
must(eas, 'production', 'eas has production profile');
must(app, 'RELEASE_INFO', 'app defines release info');
must(app, 'releaseInfo={RELEASE_INFO}', 'app passes release info to today screen');
must(today, 'Release hazirligi', 'today screen has release readiness card');
must(today, 'Uygulama surumu', 'today screen shows app version');
must(today, 'Release hedefi', 'today screen shows release target');
must(today, 'Build profilleri', 'today screen shows build profiles');
must(today, 'Expo Go', 'today screen shows expo go status');
must(today, 'EAS Build', 'today screen mentions eas build');

console.log('=== M50 MOBILE RELEASE READINESS CHECK PASS ===');

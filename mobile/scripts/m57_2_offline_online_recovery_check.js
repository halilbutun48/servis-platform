const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M57.2 OFFLINE/ONLINE TOPARLAMA CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.2', 'm57.2 script present in package json');
must(app, 'isNetworkError', 'app has network error detector');
must(app, 'Baglanti yok. Veri eski olabilir.', 'app has offline message');
must(app, 'Baglanti geri geldi, bilgiler yenileniyor.', 'app has recovery message');
must(app, 'net:', 'app has net state');
must(today, 'SectionTitle title="Baglanti"', 'today screen has connectivity card');
must(today, 'Baglanti yoksa otomatik denemeler devam eder', 'today screen explains retry behavior');

console.log('=== M57.2 OFFLINE/ONLINE TOPARLAMA CHECK PASS ===');

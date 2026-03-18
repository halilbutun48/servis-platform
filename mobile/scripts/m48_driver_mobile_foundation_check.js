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
  console.log(`\n=== ${text} ===\n`);
}

banner('M48 DRIVER MOBILE FOUNDATION CHECK');
const app = read('App.js');
const pkg = JSON.parse(read('package.json'));
const appJson = read('app.json');
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');
const login = read('src/screens/LoginScreen.js');
const pin = read('src/screens/PinChangeScreen.js');

must('expo package present', pkg.dependencies && pkg.dependencies.expo);
must('expo-location dependency present', pkg.dependencies && pkg.dependencies['expo-location']);
must('expo-secure-store dependency present', pkg.dependencies && pkg.dependencies['expo-secure-store']);
must('sdk 54 scaffold selected', String(pkg.dependencies.expo).includes('54'));
must('app config has secure-store plugin', appJson.includes('expo-secure-store'));
must('app config has location plugin', appJson.includes('expo-location'));
must('login screen exists', login.includes('Surucu Kodu veya e-posta'));
must('pin change screen exists', pin.includes('Yeni PIN belirle'));
must('today screen has GPS section', today.includes('GPS hazirligi') || today.includes("Surucunun telefon GPS'i"));
must('today screen has haritada ac action', today.includes('Haritada ac'));
must('api uses auth refresh', api.includes('/api/auth/refresh'));
must('api sends driver device id', api.includes('deviceId'));
must('app uses fetchMe', app.includes('fetchMe'));
must('app routes require pin change', app.includes('requirePinChange'));

banner('M48 DRIVER MOBILE FOUNDATION CHECK PASS');

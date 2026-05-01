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
  console.log(`\n=== ${text} ===\n`);
}

banner('M48 DRIVER MOBILE FOUNDATION CHECK');
const app = read('App.js');
const pkg = JSON.parse(read('package.json'));
const appJson = read('app.json');
const api = read('src/lib/api.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const login = read('src/screens/LoginScreen.js');
const pin = read('src/screens/PinChangeScreen.js');

must('expo package present', pkg.dependencies && pkg.dependencies.expo);
must('expo-location dependency present', pkg.dependencies && pkg.dependencies['expo-location']);
must('expo-secure-store dependency present', pkg.dependencies && pkg.dependencies['expo-secure-store']);
must('sdk 54 scaffold selected', String(pkg.dependencies.expo).includes('54'));
must('app config has secure-store plugin', appJson.includes('expo-secure-store'));
must('app config has location plugin', appJson.includes('expo-location'));
must('login screen exists', normalize(login).includes(normalize('Surucu Kodu veya e-posta')));
must('pin change screen exists', pin.includes('Yeni PIN belirle'));
must('today screen has GPS section', normalize(today).includes(normalize('Sürüş ve GPS yardımı')) || normalize(today).includes(normalize('Konumu şimdi gönder')));
must('today screen has navigation action', normalize(route).includes(normalize('Navigasyonu aç')) || normalize(route).includes(normalize('Tam rotayı aç')));
must('api uses auth refresh', api.includes('/api/auth/refresh'));
must('api sends driver device id', api.includes('deviceId'));
must('app uses fetchMe', app.includes('fetchMe'));
must('app wires pin change handler', app.includes('onPinChange={mobileHandlers.handlePinChange}'));

banner('M48 DRIVER MOBILE FOUNDATION CHECK PASS');

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

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

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

console.log('=== M95-B DRIVER TASK ROUTE ETA CHECK ===');

const pkg = JSON.parse(read('package.json'));
const app = read('App.js');
const content = read('src/app/MobileAppContent.js');
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m95b'), 'package exposes m95b entrypoint');
must(has(app, 'routeOpsBusy'), 'app passes route ops busy state');
must(has(app, 'routeOpsText'), 'app passes route ops message');
must(has(app, 'handleSpeakNextStop'), 'app wires speak next stop handler');
must(has(app, 'handleSpeakEta'), 'app wires speak eta handler');
must(has(app, 'handleStartShift'), 'app wires start shift handler');
must(has(app, 'handleCompleteShift'), 'app wires complete shift handler');
must(has(app, 'handleMarkReached'), 'app wires mark reached handler');

must(has(content, 'routeOpsBusy'), 'mobile content accepts route ops busy state');
must(has(content, 'routeOpsText'), 'mobile content accepts route ops message');
must(has(content, 'onSpeakNextStop'), 'mobile content forwards speak next stop');
must(has(content, 'onSpeakEta'), 'mobile content forwards speak eta');
must(has(content, 'onStartShift'), 'mobile content forwards start shift');
must(has(content, 'onCompleteShift'), 'mobile content forwards complete shift');
must(has(content, 'onMarkReached'), 'mobile content forwards mark reached');

must(has(today, 'DriverTaskSummaryCard'), 'today screen renders shared task summary card');
must(has(route, 'DriverTaskSummaryCard'), 'route screen renders shared task summary card');
must(has(taskCard, 'Bugünkü görev'), 'task card exposes today task title');
must(has(taskCard, 'Kalan rota süresi'), 'task card shows remaining route duration');
must(has(taskCard, 'Kalan km'), 'task card shows remaining distance');
must(has(taskCard, 'Kalan durak'), 'task card shows remaining stops');
must(has(taskCard, 'Son ulaşılan sıra'), 'task card shows last reached order');
must(has(taskCard, 'Vardiyayı başlat'), 'task card exposes start shift action');
must(has(taskCard, 'Durak ulaşıldı'), 'task card exposes reached stop action');
must(has(taskCard, 'Vardiyayı tamamla'), 'task card exposes complete shift action');
must(has(taskCard, 'Rota ekranını aç'), 'task card exposes route screen action');
must(has(taskCard, 'Canlı ekranını aç'), 'task card exposes live screen action');
must(has(taskCard, 'Yenile'), 'task card exposes refresh action');
must(has(today, 'Sıradaki durağı oku'), 'today screen exposes voice next stop action');
must(has(today, 'ETA oku'), 'today screen exposes voice eta action');

must(has(route, 'Rota özeti'), 'route screen exposes route summary card');
must(has(route, 'Kalan rota süresi'), 'route screen shows remaining route duration');
must(has(route, 'Kalan km'), 'route screen shows remaining distance');
must(has(route, 'Kalan durak'), 'route screen shows remaining stops');
must(has(route, 'Son ulaşılan sıra'), 'route screen shows last reached order');

console.log('M95-B driver task route ETA check passed');

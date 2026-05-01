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

console.log('=== M96-B DRIVER TASK ROUTE ETA SURFACE CHECK ===');

const pkg = JSON.parse(read('package.json'));
const today = read('src/screens/TodayScreen.js');
const route = read('src/screens/RouteScreen.js');
const taskCard = read('src/screens/DriverTaskSummaryCard.js');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m96b'), 'package exposes m96b entrypoint');
must(has(today, 'DriverTaskSummaryCard'), 'today screen renders task summary card');
must(has(route, 'DriverTaskSummaryCard'), 'route screen renders task summary card');
must(has(today, 'title="Bugünkü Vardiya"'), 'today screen keeps premium today hero title');
must(has(today, 'showWorkflowActions'), 'today screen keeps workflow actions visible');
must(has(route, 'title="Bugünkü rota"'), 'route screen keeps premium route hero title');
must(has(route, 'Navigasyonu aç'), 'route screen keeps navigation action');
must(has(taskCard, 'Kalan rota süresi'), 'task card shows remaining route duration');
must(has(taskCard, 'Kalan km'), 'task card shows remaining distance');
must(has(taskCard, 'Kalan durak'), 'task card shows remaining stops');
must(has(taskCard, 'Sıradaki durak'), 'task card shows next stop');
must(has(taskCard, 'RoutePreviewList'), 'task card shows route preview list');
must(has(taskCard, 'Rota ekranını aç'), 'task card exposes route screen action');
must(has(taskCard, 'Canlı ekranını aç'), 'task card exposes live screen action');
must(has(taskCard, 'Yenile'), 'task card exposes refresh action');

console.log('M96-B driver task route ETA surface check passed');

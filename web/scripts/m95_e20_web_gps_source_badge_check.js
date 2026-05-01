import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function ok(msg) {
  console.log(`OK ${msg}`);
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
function must(text, needle, msg) {
  if (!normalize(text).includes(normalize(needle))) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M95-E20 WEB GPS SOURCE BADGE CHECK ===');
const pkg = read('package.json');
const helper = read('src/utils/gpsSource.js');
const mapView = read('src/components/map/MapView.jsx');
const vehiclesRoute = read('../backend/src/routes/vehicles.js');

must(pkg, 'check:m95e20', 'web package exposes m95e20 check');
must(helper, "Sürücünün telefon GPS'i", 'web helper labels driver phone gps');
must(helper, 'Araç GPS’i', 'web helper labels vehicle gps');
must(helper, 'GPS yok', 'web helper labels offline gps');
must(helper, 'gpsFreshnessLabelFromUiStatus', 'web helper maps freshness labels');
must(mapView, 'gpsSourceLabelFromKey', 'map view imports gps source helper');
must(mapView, 'GPS kaynağı:', 'map view shows gps source badge');
must(mapView, 'GPS durumu:', 'map view shows gps freshness badge');
must(mapView, 'Rota kaynağı:', 'map view keeps route source badge');
must(mapView, 'selectedVehicle?.gpsState?.lastSource', 'map view reads gps state source');
must(vehiclesRoute, 'gpsState: true', 'vehicles route provides gps state to map');

console.log('=== M95-E20 WEB GPS SOURCE BADGE CHECK PASS ===');

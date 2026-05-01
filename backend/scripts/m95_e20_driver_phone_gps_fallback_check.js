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

console.log('=== M95-E20 BACKEND DRIVER PHONE GPS FALLBACK CHECK ===');
const pkg = read('package.json');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260501143000_add_vehicle_gps_state_source/migration.sql');
const gate = read('src/gps/gpsStateGate.js');
const gpsRoute = read('src/routes/gps.js');
const telematics = read('src/telematics/service.js');
const driver = read('src/routes/driver.js');
const sourceLabel = read('src/gps/sourceLabel.js');
const chain = read('scripts/run_repo_check_chain.js');

must(pkg, 'm95e20check', 'backend package exposes m95e20 check');
must(schema, 'lastSource    String?', 'vehicle gps state stores source');
must(migration, 'ALTER TABLE "VehicleGpsState" ADD COLUMN "lastSource" TEXT;', 'migration adds source column');
must(gate, 'newSource = null', 'gps state gate accepts source input');
must(gate, 'lastSource', 'gps state gate persists source');
must(gate, 'cur.lastSource', 'gps state gate compares previous source');
must(gate, 'nextSource', 'gps state gate normalizes next source');
must(sourceLabel, "Sürücünün telefon GPS'i", 'backend source label keeps driver phone wording');
must(gpsRoute, 'gpsSource = "DRIVER_PHONE"', 'gps route marks driver phone source');
must(gpsRoute, 'newSource: gpsSource', 'gps route stores driver phone source');
must(gpsRoute, 'sourceLabel: gpsSourceLabel', 'gps route emits source label');
must(telematics, 'gateVehicleGpsState', 'telematics service updates gps state gate');
must(telematics, 'newSource: normalized.source || "DEVICE"', 'telematics service keeps device source');
must(telematics, 'sourceLabel: gpsSourceLabelFromKey(normalized.source || "DEVICE")', 'telematics service emits source label');
must(driver, 'gpsState: true', 'driver route includes gps state relation');
must(driver, "vehicleGpsSource", 'driver route reads source from gps state');
must(driver, 'sourceLabel: backendGpsLabel', 'driver route exposes source label via helper');
must(driver, 'DRIVER_PHONE', 'driver route source priority includes driver phone');
must(chain, 'm95e20-gps-fallback', 'repo check chain references gps fallback check');

console.log('=== M95-E20 BACKEND DRIVER PHONE GPS FALLBACK CHECK PASS ===');

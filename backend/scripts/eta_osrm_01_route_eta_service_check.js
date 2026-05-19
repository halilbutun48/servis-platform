import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  ok(label);
}

function assert(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function finiteNumber(value) {
  return Number.isFinite(Number(value));
}

async function main() {
  console.log('=== ETA-OSRM-01 ROUTE ETA SERVICE CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const route = read('backend/src/routes/eta.js');
  const helperText = read('backend/src/services/routeEtaService.js');
  const webEtaSanity = read('web/src/utils/etaSanity.js');
  const backendEtaSanity = read('backend/src/ai/chat/etaSanity.js');

  must(pkg, '"check:etaosrm01": "node backend/scripts/eta_osrm_01_route_eta_service_check.js"', 'package.json exposes check:etaosrm01');
  must(runner, 'check:etaosrm01', 'product extensions runner exposes check:etaosrm01');
  must(verify, 'check:etaosrm01', 'verify chain exposes check:etaosrm01');
  must(guide, 'ETA-OSRM-01', 'script guide mentions ETA-OSRM-01');
  must(guide, 'check:etaosrm01', 'script guide exposes check:etaosrm01');
  must(audit, 'ETA-OSRM-01 readonly OSRM ETA helper note', 'audit doc mentions ETA-OSRM-01');

  must(helperText, 'export function normalizeCoordinate', 'routeEtaService exposes normalizeCoordinate');
  must(helperText, 'export function hasUsableCoordinate', 'routeEtaService exposes hasUsableCoordinate');
  must(helperText, 'export async function safeOsrmRouteDuration', 'routeEtaService exposes safeOsrmRouteDuration');
  must(helperText, 'export function getFallbackEta', 'routeEtaService exposes getFallbackEta');
  must(helperText, 'export async function getLegEta', 'routeEtaService exposes getLegEta');
  must(helperText, 'export async function getNextStopEta', 'routeEtaService exposes getNextStopEta');
  must(helperText, 'osrmRoute(', 'routeEtaService wraps osrmRoute');
  must(helperText, '1500', 'routeEtaService keeps lower timeout bound');
  must(helperText, '2500', 'routeEtaService keeps upper timeout bound');
  must(helperText, 'HAVERSINE_FALLBACK', 'routeEtaService exposes haversine fallback');
  must(helperText, 'displayMode', 'routeEtaService returns displayMode');
  must(helperText, 'SUSPICIOUS_ETA_LIMIT_MIN', 'routeEtaService guards suspicious ETA');
  mustNot(helperText, 'runtime-data', 'routeEtaService does not touch runtime-data');
  mustNot(helperText, 'schema.prisma', 'routeEtaService does not touch prisma schema');
  mustNot(helperText, 'migration', 'routeEtaService does not touch migrations');

  mustNot(route, 'routeEtaService', 'eta route stays on deferred integration path');
  mustNot(route, 'etaSource:', 'eta route keeps original contract without extra source field');
  mustNot(route, 'etaReliability:', 'eta route keeps original contract without reliability field');
  mustNot(route, 'etaDisplayMode:', 'eta route keeps original contract without display mode field');
  mustNot(route, 'etaRoute:', 'eta route keeps original contract without route meta field');
  must(route, 'etaMode: "ROUTE_CHAIN_HAVERSINE"', 'eta route keeps route mode contract');
  mustNot(route, 'OperationProof', 'eta route visible code stays free of OperationProof');
  mustNot(route, 'JOB_TYPE_ENTITY_MISMATCH', 'eta route visible code stays free of JOB_TYPE_ENTITY_MISMATCH');
  ok('eta route helper integration deferred safely');

  must(webEtaSanity, 'güncel değil', 'web etaSanity keeps güncel değil wording');
  must(webEtaSanity, 'hesaplanamıyor', 'web etaSanity keeps hesaplanamıyor wording');
  must(webEtaSanity, 'ETA ${etaText}', 'web etaSanity summary keeps ETA prefix wording');
  must(webEtaSanity, 'olağan dışı yüksek', 'web etaSanity still guards suspicious ETA wording');
  must(backendEtaSanity, 'güncel değil', 'backend etaSanity keeps güncel değil wording');
  must(backendEtaSanity, 'hesaplanamıyor', 'backend etaSanity keeps hesaplanamıyor wording');
  must(backendEtaSanity, 'ETA ${etaText}', 'backend etaSanity summary keeps ETA prefix wording');

  const prevOsrm = process.env.OSRM_URL;
  process.env.OSRM_URL = '';
  const helperUrl = pathToFileURL(path.join(root, 'backend/src/services/routeEtaService.js')).href;
  const helper = await import(`${helperUrl}?v=${Date.now()}`);

  try {
    assert(typeof helper.normalizeCoordinate === 'function', 'normalizeCoordinate function available');
    assert(typeof helper.hasUsableCoordinate === 'function', 'hasUsableCoordinate function available');
    assert(typeof helper.safeOsrmRouteDuration === 'function', 'safeOsrmRouteDuration function available');
    assert(typeof helper.getFallbackEta === 'function', 'getFallbackEta function available');
    assert(typeof helper.getLegEta === 'function', 'getLegEta function available');
    assert(typeof helper.getNextStopEta === 'function', 'getNextStopEta function available');

    const normalized = helper.normalizeCoordinate({ lat: '41.0123', lng: '29.1234' });
    assert(!!normalized && finiteNumber(normalized.lat) && finiteNumber(normalized.lng), 'normalizeCoordinate parses valid coords');
    assert(helper.hasUsableCoordinate({ lat: 41.0123, lng: 29.1234 }) === true, 'hasUsableCoordinate accepts valid coords');
    assert(helper.hasUsableCoordinate({ lat: null, lng: null }) === false, 'hasUsableCoordinate rejects invalid coords');

    const fallback = helper.getFallbackEta({
      from: { lat: 41.0, lng: 29.0 },
      to: { lat: 41.01, lng: 29.02 },
      speedKmh: 30,
    });
    assert(fallback.ok === true, 'fallback ETA available');
    assert(fallback.source === 'HAVERSINE_FALLBACK', 'fallback ETA uses haversine fallback source');
    assert(fallback.displayMode === 'exact', 'fallback ETA is exact for fresh short leg');
    assert(finiteNumber(fallback.etaMinutes), 'fallback ETA minutes numeric');

    const freshExact = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'fresh-exact',
      timeoutMs: 1500,
    });
    assert(freshExact.ok === true, 'fresh ETA available');
    assert(freshExact.displayMode === 'exact', 'fresh ETA exact on short route');
    assert(freshExact.source === 'HAVERSINE_FALLBACK' || freshExact.source === 'OSRM', 'fresh ETA uses allowed source');
    assert(finiteNumber(freshExact.etaMinutes), 'fresh ETA minutes numeric');

    const staleEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'STALE', ageSec: 20 * 60 },
      requestId: 'stale-eta',
      timeoutMs: 1500,
    });
    assert(staleEta.ok === true, 'stale ETA still returns safe fallback');
    assert(staleEta.displayMode === 'not-current', 'stale ETA not exact');

    const offlineEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'OFFLINE', ageSec: 60 * 60 },
      requestId: 'offline-eta',
      timeoutMs: 1500,
    });
    assert(offlineEta.ok === true, 'offline ETA still returns safe fallback');
    assert(offlineEta.displayMode === 'not-current', 'offline ETA not exact');

    const suspiciousEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 50.0, lng: 40.0, name: 'Far Stop' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'suspicious-eta',
      timeoutMs: 1500,
    });
    assert(suspiciousEta.ok === true, 'suspicious ETA still returns estimate');
    assert(suspiciousEta.displayMode === 'not-current', 'suspicious ETA is not exact');
    assert(Number(suspiciousEta.etaMinutes) > 90, 'suspicious ETA exceeds threshold');

    const missingOsrm = await helper.safeOsrmRouteDuration({
      from: { lat: 41.0, lng: 29.0 },
      to: { lat: 41.01, lng: 29.02 },
      requestId: 'missing-osrm',
      timeoutMs: 1500,
    });
    assert(missingOsrm.ok === false, 'OSRM missing is safe');
    assert(missingOsrm.source === 'UNAVAILABLE', 'OSRM missing degrades to unavailable');
    assert(missingOsrm.displayMode === 'unavailable', 'OSRM missing displayMode unavailable');
  } finally {
    process.env.OSRM_URL = prevOsrm;
  }

  console.log('=== ETA-OSRM-01 ROUTE ETA SERVICE CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

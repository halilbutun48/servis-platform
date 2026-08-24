import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertProductExtensionsIncludes, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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
  console.log('=== ETA-OSRM-02 API ETA BRIDGE CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const route = read('backend/src/routes/eta.js');
  const helperText = read('backend/src/services/routeEtaService.js');
  const webEtaSanity = read('web/src/utils/etaSanity.js');
  const backendEtaSanity = read('backend/src/ai/chat/etaSanity.js');

  must(pkg, '"check:etaosrm02": "node backend/scripts/eta_osrm_02_api_eta_bridge_check.js"', 'package.json exposes check:etaosrm02');
  assertProductExtensionsIncludes(
    'check:etaosrm02',
    'product extensions registry includes eta osrm bridge',
    registryScripts
  );
  must(guide, 'ETA-OSRM-02', 'script guide mentions ETA-OSRM-02');
  must(guide, 'check:etaosrm02', 'script guide exposes check:etaosrm02');
  must(audit, 'ETA-OSRM-02 /api/eta routeEtaService bridge', 'audit doc mentions ETA-OSRM-02');

  must(route, 'import { getNextStopEta } from "../services/routeEtaService.js";', 'eta route imports routeEtaService');
  must(route, 'etaMode: "ROUTE_CHAIN_HAVERSINE"', 'eta route keeps route mode contract');
  must(route, 'etaSource:', 'eta route exposes etaSource');
  must(route, 'etaReliability:', 'eta route exposes etaReliability');
  must(route, 'etaDisplayMode:', 'eta route exposes etaDisplayMode');
  must(route, 'etaReason:', 'eta route exposes etaReason');
  must(route, 'etaRoute:', 'eta route exposes etaRoute');
  must(route, 'etaMin:', 'eta route keeps nextStop eta minute compatibility');
  must(route, 'etaSource', 'eta route keeps source bridge metadata visible');
  must(route, 'etaReliability', 'eta route keeps reliability bridge metadata visible');
  must(route, 'etaDisplayMode', 'eta route keeps display mode bridge metadata visible');
  must(route, 'remainingRouteEtaMin', 'eta route keeps route chain eta contract');
  must(route, 'remainingRouteKm', 'eta route keeps route chain km contract');
  must(route, 'getNextStopEta({', 'eta route bridges helper call');
  must(route, 'timeoutMs: 2000', 'eta route keeps safe timeout on helper call');
  mustNot(route, 'OperationProof', 'eta route visible code stays free of OperationProof');
  mustNot(route, 'JOB_TYPE_ENTITY_MISMATCH', 'eta route visible code stays free of JOB_TYPE_ENTITY_MISMATCH');

  must(helperText, 'export async function getNextStopEta', 'routeEtaService keeps bridge helper export');
  must(helperText, 'export async function getLegEta', 'routeEtaService keeps leg helper export');
  must(helperText, 'export async function safeOsrmRouteDuration', 'routeEtaService keeps osrm helper export');
  must(helperText, 'displayMode', 'routeEtaService keeps displayMode field');
  must(helperText, 'OSRM_TIMEOUT', 'routeEtaService keeps timeout safety text');

  must(webEtaSanity, 'güncel değil', 'web etaSanity keeps güncel değil wording');
  must(webEtaSanity, 'hesaplanamıyor', 'web etaSanity keeps hesaplanamıyor wording');
  must(webEtaSanity, 'Tahmini varış süresi ${etaText}', 'web etaSanity summary keeps Turkish wording');
  must(backendEtaSanity, 'güncel değil', 'backend etaSanity keeps güncel değil wording');
  must(backendEtaSanity, 'hesaplanamıyor', 'backend etaSanity keeps hesaplanamıyor wording');
  must(backendEtaSanity, 'Tahmini varış süresi ${etaText}', 'backend etaSanity summary keeps Turkish wording');

  const prevOsrm = process.env.OSRM_URL;
  process.env.OSRM_URL = '';
  const helperUrl = pathToFileURL(path.join(root, 'backend/src/services/routeEtaService.js')).href;
  const helper = await import(`${helperUrl}?v=${Date.now()}`);

  try {
    assert(typeof helper.getNextStopEta === 'function', 'getNextStopEta function available');

    const freshExact = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'bridge-fresh',
      timeoutMs: 1500,
    });
    assert(freshExact.ok === true, 'fresh helper ETA available');
    assert(freshExact.displayMode === 'exact', 'fresh helper ETA exact on short route');
    assert(finiteNumber(freshExact.etaMinutes), 'fresh helper ETA minutes numeric');

    const staleEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'STALE', ageSec: 20 * 60 },
      requestId: 'bridge-stale',
      timeoutMs: 1500,
    });
    assert(staleEta.ok === true, 'stale helper ETA still returns safe fallback');
    assert(staleEta.displayMode === 'not-current', 'stale helper ETA not exact');

    const offlineEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'OFFLINE', ageSec: 60 * 60 },
      requestId: 'bridge-offline',
      timeoutMs: 1500,
    });
    assert(offlineEta.ok === true, 'offline helper ETA still returns safe fallback');
    assert(offlineEta.displayMode === 'not-current', 'offline helper ETA not exact');

    const suspiciousEta = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 50.0, lng: 40.0, name: 'Far Stop' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'bridge-suspicious',
      timeoutMs: 1500,
    });
    assert(suspiciousEta.ok === true, 'suspicious helper ETA still returns estimate');
    assert(suspiciousEta.displayMode === 'not-current', 'suspicious helper ETA is not exact');
    assert(Number(suspiciousEta.etaMinutes) > 90, 'suspicious helper ETA exceeds threshold');

    const missingOsrm = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'bridge-missing',
      timeoutMs: 1500,
    });
    assert(missingOsrm.ok === true, 'OSRM missing remains safe in bridge helper');
    assert(['HAVERSINE_FALLBACK', 'UNAVAILABLE'].includes(missingOsrm.source), 'OSRM missing uses allowed source family');
  } finally {
    process.env.OSRM_URL = prevOsrm;
  }

  console.log('=== ETA-OSRM-02 API ETA BRIDGE CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

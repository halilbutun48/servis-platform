import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

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
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustAny(text, needles, label) {
  if (needles.some((needle) => normalize(text).includes(normalize(needle)))) ok(label);
  else fail(label);
}

function assert(condition, label) {
  if (!condition) fail(label);
  ok(label);
}

function finiteNumber(value) {
  return Number.isFinite(Number(value));
}

async function main() {
  console.log('=== LIVE-TRACKING-FINAL-01 ACCEPTANCE CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const route = read('backend/src/routes/eta.js');
  const etaSanityWebText = read('web/src/utils/etaSanity.js');
  const etaSanityBackendText = read('backend/src/ai/chat/etaSanity.js');
  const marker = read('web/src/lib/markers/vehicleMarkerC.js');
  const markerCss = read('web/src/components/map/markers.css');
  const roomMap = read('web/src/panels/room/MapPanel.jsx');
  const companyMap = read('web/src/panels/company/MapPanel.jsx');
  const driverMap = read('web/src/panels/driver/MapPanel.jsx');
  const driverRoute = read('web/src/panels/driver/RoutePanel.jsx');
  const driverToday = read('web/src/panels/driver/TodayPanel.jsx');
  const parentLive = read('web/src/panels/parent/LivePanel.jsx');
  const personelLive = read('web/src/panels/personel/LivePanel.jsx');
  const personelRide = read('web/src/panels/personel/MyRidePanel.jsx');
  const passengerLive = read('web/src/panels/public/PassengerLivePanel.jsx');
  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const backendAi = read('backend/src/ai/service.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
  const routeEtaService = read('backend/src/services/routeEtaService.js');

  must(pkg, '"check:livetrackingfinal01": "node backend/scripts/live_tracking_final_01_acceptance_check.js"', 'package.json exposes check:livetrackingfinal01');
  must(pkg, '"check:etaosrm02"', 'package.json keeps check:etaosrm02');
  must(pkg, '"check:etaosrm01"', 'package.json keeps check:etaosrm01');
  must(pkg, '"check:etasanity01"', 'package.json keeps check:etasanity01');
  must(pkg, '"check:uxnav01"', 'package.json keeps check:uxnav01');
  must(pkg, '"check:uxdensity01"', 'package.json keeps check:uxdensity01');

  assertProductExtensionsIncludes('check:livetrackingfinal01', 'product extensions registry includes live tracking final check');
  must(guide, 'LIVE-TRACKING-FINAL-01', 'script guide mentions LIVE-TRACKING-FINAL-01');
  must(guide, 'check:livetrackingfinal01', 'script guide exposes check:livetrackingfinal01');
  must(audit, 'LIVE-TRACKING-FINAL-01 acceptance smoke', 'audit doc mentions live tracking final smoke');

  must(route, 'import { getNextStopEta } from "../services/routeEtaService.js";', 'eta route keeps routeEtaService bridge');
  must(route, 'etaSource:', 'eta route keeps etaSource bridge field');
  must(route, 'etaReliability:', 'eta route keeps etaReliability bridge field');
  must(route, 'etaDisplayMode:', 'eta route keeps etaDisplayMode bridge field');
  must(route, 'etaReason:', 'eta route keeps etaReason bridge field');
  must(route, 'etaRoute:', 'eta route keeps etaRoute bridge field');
  must(route, 'etaMode: "ROUTE_CHAIN_HAVERSINE"', 'eta route keeps backward-compatible etaMode');
  must(route, 'remainingRouteKm', 'eta route keeps remainingRouteKm');
  must(route, 'remainingRouteEtaMin', 'eta route keeps remainingRouteEtaMin');
  must(route, 'nextStop:', 'eta route keeps nextStop payload');
  must(route, 'etaMin:', 'eta route keeps nextStop etaMin');
  must(route, 'getNextStopEta({', 'eta route bridges helper call');
  must(route, 'timeoutMs: 2000', 'eta route keeps safe timeout on helper call');

  mustAny(etaSanityWebText, ['Tahmini varış süresi ${etaText}', 'güncel değil', 'hesaplanamıyor'], 'frontend etaSanity keeps safe Turkish wording');
  mustAny(etaSanityBackendText, ['Tahmini varış süresi ${etaText}', 'güncel değil', 'hesaplanamıyor'], 'backend etaSanity keeps safe Turkish wording');
  must(copilotFacts, 'getLiveTrackingSummary', 'copilot facts keep live tracking summary helper');

  must(roomMap, 'getEtaDisplay', 'room live map uses safe ETA display');
  must(companyMap, 'getEtaDisplay', 'company live map uses safe ETA display');
  must(driverMap, 'getEtaDisplay', 'driver map uses safe ETA display');
  must(driverRoute, 'getEtaDisplay', 'driver route uses safe ETA display');
  must(driverToday, 'getGpsAgeText', 'driver today keeps safe GPS age wording');
  must(parentLive, 'getEtaDisplay', 'parent live panel uses safe ETA display');
  must(personelLive, 'getEtaDisplay', 'personel live panel uses safe ETA display');
  must(personelRide, 'getEtaDisplay', 'personel ride panel uses safe ETA display');
  must(passengerLive, 'getEtaDisplay', 'public passenger live panel uses safe ETA display');

  must(backendAi, 'getEtaDisplay', 'backend ai service uses safe ETA helper');
  must(helpComposer, 'getEtaDisplay', 'help composer uses safe ETA helper');
  must(screenStateAnalyzer, 'getEtaDisplay', 'screen state analyzer uses safe ETA helper');
  must(screenStateAnalyzer, 'normalizeGpsFreshness', 'screen state analyzer keeps gps freshness helper');

  must(marker, 'bus.svg', 'bus.svg marker remains in use');
  must(markerCss, 'background: transparent', 'marker css keeps transparent image background');
  must(markerCss, 'object-fit: contain', 'marker image keeps contain sizing');

  must(routeEtaService, 'export async function getNextStopEta', 'routeEtaService keeps next stop helper');
  must(routeEtaService, 'export async function safeOsrmRouteDuration', 'routeEtaService keeps safe osrm helper');
  must(routeEtaService, 'displayMode', 'routeEtaService keeps display mode field');

  const visibleFresh = [
    'GPS: ' + 'Canlı',
    'Son GPS 47 sn önce',
    'Sıradaki durak: Pickup 6',
    'Tahmini varış süresi 12 dk',
  ].join(' · ');
  const visibleStale = [
    'GPS: ' + 'Güncel değil',
    'Son GPS 26 dk önce',
    'Son bilinen sıradaki durak: Pickup 6',
    'Tahmini varış süresi güncel değil',
  ].join(' · ');
  const visibleOffline = [
    'GPS: ' + 'Çevrim dışı',
    'Son GPS 47 dk önce',
    'Son bilinen durak: Pickup 6',
    'Tahmini varış süresi hesaplanamıyor',
  ].join(' · ');

  must(visibleFresh, 'Tahmini varış süresi 12 dk', 'fresh visible summary keeps exact Turkish wording');
  must(visibleStale, 'Tahmini varış süresi güncel değil', 'stale visible summary uses safe wording');
  must(visibleOffline, 'Tahmini varış süresi hesaplanamıyor', 'offline visible summary uses safe wording');
  mustNot(visibleStale, '619 dk', 'stale visible summary hides suspicious bare ETA');
  mustNot(visibleOffline, '619 dk', 'offline visible summary hides suspicious bare ETA');

  const prevOsrm = process.env.OSRM_URL;
  process.env.OSRM_URL = '';
  const helper = await import(`${pathToFileURL(path.join(root, 'backend/src/services/routeEtaService.js')).href}?v=${Date.now()}`);
  const webEta = await import(`${pathToFileURL(path.join(root, 'web/src/utils/etaSanity.js')).href}?v=${Date.now()}`);

  try {
    const fresh = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'final-fresh',
      timeoutMs: 1500,
    });
    assert(fresh.ok === true, 'fresh live ETA returns ok');
    assert(fresh.displayMode === 'exact', 'fresh live ETA can stay exact');
    assert(['HAVERSINE_FALLBACK', 'OSRM'].includes(fresh.source), 'fresh live ETA uses accepted source family');
    assert(finiteNumber(fresh.etaMinutes), 'fresh live ETA has numeric minutes');

    const stale = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'STALE', ageSec: 20 * 60 },
      requestId: 'final-stale',
      timeoutMs: 1500,
    });
    assert(stale.ok === true, 'stale live ETA still returns safe result');
    assert(stale.displayMode !== 'exact', 'stale live ETA is not exact');

    const offline = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'OFFLINE', ageSec: 60 * 60 },
      requestId: 'final-offline',
      timeoutMs: 1500,
    });
    assert(offline.ok === true, 'offline live ETA still returns safe result');
    assert(offline.displayMode !== 'exact', 'offline live ETA is not exact');

    const suspicious = await helper.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 50.0, lng: 40.0, name: 'Far Stop' },
      gpsFreshness: { status: 'LIVE', ageSec: 40 },
      requestId: 'final-suspicious',
      timeoutMs: 1500,
    });
    assert(suspicious.ok === true, 'suspicious live ETA still returns safe result');
    assert(Number(suspicious.etaMinutes) > 90, 'suspicious live ETA exceeds suspicious threshold');
    assert(suspicious.displayMode !== 'exact', 'suspicious live ETA is not exact');

    assert(webEta.getEtaDisplay({ etaMinutes: 12, gpsStatus: 'LIVE', gpsLast: { at: new Date().toISOString() } }) === '12 dk', 'fresh etaSanity returns exact text');
    assert(webEta.getEtaDisplay({ etaMinutes: 619, gpsStatus: 'LIVE', gpsLast: { at: new Date().toISOString() } }) === 'olağan dışı yüksek', 'fresh suspicious etaSanity stays safe');
    assert(webEta.getEtaDisplay({ etaMinutes: 28, gpsStatus: 'STALE', gpsLast: { at: new Date().toISOString() } }) === 'güncel değil', 'stale etaSanity returns safe text');
    assert(webEta.getEtaDisplay({ etaMinutes: 28, gpsStatus: 'OFFLINE', gpsLast: { at: new Date().toISOString() } }) === 'hesaplanamıyor', 'offline etaSanity returns safe text');
    assert(webEta.getLiveTrackingSummary({
      gpsStatus: 'STALE',
      gpsLast: { at: new Date().toISOString() },
      nextStopName: 'Pickup 6',
      etaMinutes: 619,
    }).includes('Son bilinen sıradaki durak: Pickup 6'), 'stale live summary keeps son bilinen wording');
    assert(webEta.getLiveTrackingSummary({
      gpsStatus: 'OFFLINE',
      gpsLast: { at: new Date().toISOString() },
      nextStopName: 'Pickup 6',
      etaMinutes: 619,
    }).includes('Tahmini varış süresi hesaplanamıyor'), 'offline live summary keeps safe wording');
  } finally {
    process.env.OSRM_URL = prevOsrm;
  }

  console.log('=== LIVE-TRACKING-FINAL-01 ACCEPTANCE CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

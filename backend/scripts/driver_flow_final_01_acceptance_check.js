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

function finite(value) {
  return Number.isFinite(Number(value));
}

async function main() {
  console.log('=== DRIVER-FLOW-FINAL-01 ACCEPTANCE CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const app = read('web/src/App.jsx');
  const navDock = read('web/src/layout/NavDock.jsx');
  const driverToday = read('web/src/panels/driver/TodayPanel.jsx');
  const driverRoute = read('web/src/panels/driver/RoutePanel.jsx');
  const driverMap = read('web/src/panels/driver/MapPanel.jsx');
  const driverCheckin = read('web/src/panels/driver/CheckinPanel.jsx');
  const vehicleMarker = read('web/src/lib/markers/vehicleMarkerC.js');
  const markerCss = read('web/src/components/map/markers.css');
  const routeEtaRoute = read('backend/src/routes/eta.js');
  const webEtaSanity = read('web/src/utils/etaSanity.js');
  const backendEtaSanity = read('backend/src/ai/chat/etaSanity.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const golden = read('backend/src/ai/chat/goldenQuestionPack.js');

  must(pkg, '"check:driverflowfinal01": "node backend/scripts/driver_flow_final_01_acceptance_check.js"', 'package.json exposes check:driverflowfinal01');
  must(runner, 'check:driverflowfinal01', 'product extensions runner exposes check:driverflowfinal01');
  must(verify, 'check:driverflowfinal01', 'verify chain exposes check:driverflowfinal01');
  must(guide, 'DRIVER-FLOW-FINAL-01', 'script guide mentions DRIVER-FLOW-FINAL-01');
  must(guide, 'check:driverflowfinal01', 'script guide exposes check:driverflowfinal01');
  must(audit, 'DRIVER-FLOW-FINAL-01 acceptance smoke note', 'audit doc mentions DRIVER-FLOW-FINAL-01');

  must(app, '/driver/today', 'app exposes driver today route');
  must(app, '/driver/route', 'app exposes driver route route');
  must(app, '/driver/map', 'app exposes driver map route');
  must(app, '/driver/checkin', 'app exposes driver check-in route');

  must(navDock, 'Bugün', 'NavDock keeps driver Bugün label');
  must(navDock, 'Rota', 'NavDock keeps driver Rota label');
  must(navDock, 'Harita', 'NavDock keeps driver Harita label');
  must(navDock, 'Check-in', 'NavDock keeps driver Check-in label');
  must(navDock, 'Sefer Abi Terminali', 'NavDock keeps Sefer Abi Terminali label');

  must(driverToday, 'Henüz başlatılmış aktif görev yok', 'driver today distinguishes accepted-but-not-started state');
  must(driverToday, 'approvedTodayCount', 'driver today counts accepted-but-not-started shifts');
  must(driverToday, 'kabul edilmiş vardiya var', 'driver today explains accepted shift count');
  must(driverToday, 'Göreve başlamak için listeden', 'driver today guides to start action');
  must(driverToday, 'Bugün için atanmış veya kabul edilmiş vardiya yok.', 'driver today keeps no-shift wording');
  must(driverToday, 'Göreve Başla', 'driver today keeps start action');
  must(driverToday, 'Rota, görev başladıktan sonra açılır.', 'driver today keeps route-disabled reason');
  mustNot(driverToday, 'Bugün için atanmış aktif / kabul edilmiş vardiya yok.', 'driver today removed misleading no-shift wording');

  must(driverMap, 'getEtaDisplay', 'driver map uses safe ETA display helper');
  must(driverMap, 'getGpsReliabilityLabel', 'driver map uses GPS reliability helper');
  must(driverMap, 'GPS bekleniyor', 'driver map keeps GPS waiting wording');
  must(driverMap, 'Sıradaki durak', 'driver map keeps next stop wording');

  must(driverRoute, 'getEtaDisplay', 'driver route uses safe ETA display helper');
  must(driverRoute, 'etaDisplayText(selectedVehicle, Number(s.etaMin), s)', 'driver route wraps stop ETA in safe helper');
  must(driverRoute, 'ETA', 'driver route keeps ETA label');
  mustNot(driverRoute, '<td>{s.etaMin}</td>', 'driver route does not show naked etaMin cell');

  must(driverCheckin, 'Driver Check-in', 'driver check-in surface exists');
  must(driverCheckin, 'Shift ACTIVE değilse önce Bugün ekranından görevi başlat.', 'driver check-in keeps driver-start guidance');
  must(driverCheckin, 'Opsiyonel check-in', 'driver check-in keeps optional wording');

  must(vehicleMarker, 'busSvgUrl', 'bus svg marker import remains active');
  must(vehicleMarker, 'bus.svg', 'bus svg marker asset remains referenced');
  must(markerCss, 'object-fit: contain', 'marker css keeps contain fit');
  must(markerCss, 'background: transparent', 'marker css keeps transparent background');

  must(routeEtaRoute, 'etaSource:', 'eta bridge keeps etaSource');
  must(routeEtaRoute, 'etaReliability:', 'eta bridge keeps etaReliability');
  must(routeEtaRoute, 'etaDisplayMode:', 'eta bridge keeps etaDisplayMode');
  must(routeEtaRoute, 'etaReason:', 'eta bridge keeps etaReason');
  must(routeEtaRoute, 'etaRoute:', 'eta bridge keeps etaRoute');
  must(routeEtaRoute, 'ROUTE_CHAIN_HAVERSINE', 'eta bridge keeps route mode');

  must(webEtaSanity, 'güncel değil', 'web etaSanity keeps not-current wording');
  must(webEtaSanity, 'Tahmini varış süresi ', 'web etaSanity keeps Turkish summary prefix');
  must(webEtaSanity, 'hesaplanamıyor', 'web etaSanity keeps unavailable wording');
  must(webEtaSanity, 'bekleniyor', 'web etaSanity keeps waiting wording');
  must(backendEtaSanity, 'güncel değil', 'backend etaSanity keeps not-current wording');
  must(backendEtaSanity, 'Tahmini varış süresi ', 'backend etaSanity keeps Turkish summary prefix');
  must(backendEtaSanity, 'hesaplanamıyor', 'backend etaSanity keeps unavailable wording');
  must(backendEtaSanity, 'bekleniyor', 'backend etaSanity keeps waiting wording');

  must(golden, 'Görev neden başlamıyor?', 'golden pack keeps driver start question');
  must(golden, 'Rota neden görünmüyor?', 'golden pack keeps route visible question');
  must(golden, 'Konum neden görünmüyor?', 'golden pack keeps location visible question');
  must(helpComposer, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.', 'help composer keeps driver safe live-start guidance');
  must(helpComposer, 'Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.', 'help composer keeps driver blocked-start guidance');

  const prevOsrm = process.env.OSRM_URL;
  process.env.OSRM_URL = '';
  const routeEtaServiceUrl = pathToFileURL(path.join(root, 'backend/src/services/routeEtaService.js')).href;
  const etaSanityUrl = pathToFileURL(path.join(root, 'web/src/utils/etaSanity.js')).href;
  const routeEta = await import(`${routeEtaServiceUrl}?v=${Date.now()}`);
  const webEta = await import(`${etaSanityUrl}?v=${Date.now()}`);
  try {
    assert(typeof routeEta.getNextStopEta === 'function', 'routeEtaService getNextStopEta available');
    assert(typeof routeEta.safeOsrmRouteDuration === 'function', 'routeEtaService safeOsrmRouteDuration available');

    const fresh = await routeEta.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'LIVE', ageSec: 35 },
      requestId: 'driver-flow-fresh',
      timeoutMs: 1500,
    });
    assert(fresh.ok === true, 'fresh routeEta helper returns ok');
    assert(fresh.displayMode === 'exact', 'fresh routeEta helper returns exact display');
    assert(finite(fresh.etaMinutes), 'fresh routeEta helper returns numeric ETA');

    const stale = await routeEta.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'STALE', ageSec: 18 * 60 },
      requestId: 'driver-flow-stale',
      timeoutMs: 1500,
    });
    assert(stale.ok === true, 'stale routeEta helper stays safe');
    assert(stale.displayMode !== 'exact', 'stale routeEta helper avoids exact display');

    const offline = await routeEta.getNextStopEta({
      vehicle: { gpsLast: { lat: 41.0, lng: 29.0, speed: 32, at: new Date().toISOString() } },
      nextStop: { lat: 41.01, lng: 29.02, name: 'Pickup 6' },
      gpsFreshness: { status: 'OFFLINE', ageSec: 50 * 60 },
      requestId: 'driver-flow-offline',
      timeoutMs: 1500,
    });
    assert(offline.ok === true, 'offline routeEta helper stays safe');
    assert(offline.displayMode !== 'exact', 'offline routeEta helper avoids exact display');

    const freshEtaText = webEta.getEtaDisplay({ etaMinutes: 12, gpsStatus: 'LIVE', gpsAge: { at: new Date().toISOString() }, nextStopName: 'Pickup 6' });
    assert(/12/.test(freshEtaText) && /dk/.test(freshEtaText), 'web etaSanity keeps fresh exact wording');

    const staleEtaText = webEta.getEtaDisplay({ etaMinutes: 12, gpsStatus: 'STALE', gpsAge: { at: new Date(Date.now() - 18 * 60 * 1000).toISOString() }, nextStopName: 'Pickup 6' });
    assert(/güncel değil/.test(staleEtaText), 'web etaSanity keeps stale not-current wording');

    const offlineEtaText = webEta.getEtaDisplay({ etaMinutes: 12, gpsStatus: 'OFFLINE', gpsAge: { at: new Date(Date.now() - 50 * 60 * 1000).toISOString() }, nextStopName: 'Pickup 6' });
    assert(/hesaplanamıyor/.test(offlineEtaText), 'web etaSanity keeps offline unavailable wording');

    const staleSummary = webEta.getLiveTrackingSummary({
      etaMinutes: 12,
      gpsStatus: 'STALE',
      gpsAge: { at: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
      nextStopName: 'Pickup 6',
    });
    assert(/Tahmini varış süresi .*güncel değil/.test(staleSummary), 'web etaSanity summary keeps stale Turkish wording');

    const suspiciousEtaText = webEta.getEtaDisplay({ etaMinutes: 619, gpsStatus: 'LIVE', gpsAge: { at: new Date().toISOString() }, nextStopName: 'Pickup 6' });
    assert(/olağan dışı yüksek/.test(suspiciousEtaText), 'web etaSanity keeps suspicious ETA safe');

    const waitingGpsLabel = webEta.getGpsReliabilityLabel('GPS bekleniyor');
    assert(/bekleniyor/i.test(waitingGpsLabel), 'web etaSanity keeps waiting GPS label');
  } finally {
    process.env.OSRM_URL = prevOsrm;
  }

  console.log('=== DRIVER-FLOW-FINAL-01 ACCEPTANCE CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

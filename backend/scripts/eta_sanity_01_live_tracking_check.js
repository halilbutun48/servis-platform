import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function must(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  ok(label);
}

function includes(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function mustInclude(text, needle, label) {
  must(includes(text, needle), label);
}

function mustAny(text, needles, label) {
  must(needles.some((needle) => includes(text, needle)), label);
}

function mustFile(rel, label) {
  must(fs.existsSync(path.join(root, rel)), label);
}

function main() {
  console.log('=== ETA-SANITY-01 LIVE TRACKING CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');

  mustInclude(pkg, '"check:etasanity01": "node backend/scripts/eta_sanity_01_live_tracking_check.js"', 'package.json exposes check:etasanity01');
  assertProductExtensionsIncludes(
    'check:etasanity01',
    'product extensions registry includes eta sanity',
    registryScripts
  );
  mustInclude(guide, 'ETA-SANITY-01', 'script guide mentions ETA-SANITY-01');
  mustInclude(guide, 'check:etasanity01', 'script guide mentions check:etasanity01');
  mustInclude(audit, 'ETA-SANITY-01', 'audit mentions ETA-SANITY-01');

  mustFile('web/src/utils/etaSanity.js', 'frontend etaSanity helper exists');
  mustFile('backend/src/ai/chat/etaSanity.js', 'backend etaSanity helper exists');
  mustInclude(read('web/src/utils/etaSanity.js'), 'getEtaDisplay', 'frontend etaSanity helper exports ETA display');
  mustInclude(read('web/src/utils/etaSanity.js'), 'güncel değil', 'frontend etaSanity helper has safe stale wording');
  mustInclude(read('web/src/utils/etaSanity.js'), 'hesaplanamıyor', 'frontend etaSanity helper has safe offline wording');
  mustInclude(read('backend/src/ai/chat/etaSanity.js'), 'getEtaDisplay', 'backend etaSanity helper exports ETA display');

  mustInclude(read('web/src/utils/copilotFacts.js'), 'getLiveTrackingSummary', 'copilot facts use live tracking summary helper');
  mustAny(read('web/src/panels/room/MapPanel.jsx'), ['getEtaDisplay', 'etaDisplayText'], 'Room live map uses safe ETA helper');
  mustAny(read('web/src/panels/company/MapPanel.jsx'), ['getEtaDisplay', 'etaDisplayText'], 'Company live map uses safe ETA helper');
  mustInclude(read('web/src/panels/parent/LivePanel.jsx'), 'getEtaDisplay', 'Parent live panel uses safe ETA helper');
  mustInclude(read('web/src/panels/personel/LivePanel.jsx'), 'getEtaDisplay', 'Personel live panel uses safe ETA helper');
  mustInclude(read('web/src/panels/personel/MyRidePanel.jsx'), 'getEtaDisplay', 'Personel my-ride panel uses safe ETA helper');
  mustInclude(read('web/src/panels/driver/TodayPanel.jsx'), 'getGpsAgeText', 'Driver today panel uses safe GPS age helper');
  mustInclude(read('web/src/panels/driver/RoutePanel.jsx'), 'getEtaDisplay', 'Driver route panel uses safe ETA helper');
  mustInclude(read('web/src/panels/driver/MapPanel.jsx'), 'getEtaDisplay', 'Driver map panel uses safe ETA helper');
  mustInclude(read('web/src/panels/public/PassengerLivePanel.jsx'), 'getEtaDisplay', 'Passenger live panel uses safe ETA helper');

  mustInclude(read('backend/src/ai/service.js'), 'getEtaDisplay', 'backend live selection snapshot uses safe ETA helper');
  mustInclude(read('backend/src/ai/service.js'), 'getGpsReliabilityLabel', 'backend live selection snapshot uses safe GPS label helper');
  mustInclude(read('backend/src/ai/chat/helpComposer.js'), 'getEtaDisplay', 'helpComposer uses safe ETA helper');
  mustInclude(read('backend/src/ai/chat/helpComposer.js'), 'liveLocationSignals', 'helpComposer keeps live location wording centralized');
  mustInclude(read('backend/src/ai/chat/screenStateAnalyzer.js'), 'getEtaDisplay', 'screen state analyzer uses safe ETA helper');
  mustInclude(read('backend/src/ai/chat/screenStateAnalyzer.js'), 'normalizeGpsFreshness', 'screen state analyzer uses GPS freshness helper');

  mustInclude(read('web/src/lib/markers/vehicleMarkerC.js'), 'bus.svg', 'bus.svg marker asset remains in use');

  mustAny(read('backend/src/ai/chat/etaSanity.js'), ['güncel değil', 'hesaplanamıyor'], 'backend helper has safe ETA wording');
  mustAny(read('web/src/utils/etaSanity.js'), ['güncel değil', 'hesaplanamıyor'], 'frontend helper has safe ETA wording');

  console.log('=== ETA-SANITY-01 LIVE TRACKING CHECK PASS ===');
}

main();

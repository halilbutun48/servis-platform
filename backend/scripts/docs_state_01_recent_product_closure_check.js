import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function file(rel) {
  return path.join(root, rel.replace(/\\/g, '/'));
}

function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
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

function mustIncludeAll(text, needles, labelPrefix) {
  for (const needle of needles) must(text, needle, `${labelPrefix}: ${needle}`);
}

function mustEqual(actual, expected, label) {
  if (actual === expected) ok(label);
  else fail(label);
}

function main() {
  console.log('=== DOCS-STATE-01 RECENT PRODUCT CLOSURE CHECK ===');

  const pkg = read('package.json');
  const primer = read('docs/PRIMER_SSOT.md');
  const registry = read('docs/MILESTONE_REGISTRY_V1.md');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');
  const stateText = read('tools/repo_contract_state.json');
  const state = JSON.parse(stateText);

  must(pkg, '"check:docsstate01": "node backend/scripts/docs_state_01_recent_product_closure_check.js"', 'package.json exposes check:docsstate01');
  must(pkg, '"check:web01a": "node backend/scripts/web_01a_flow_summary_polish_check.js"', 'package.json preserves check:web01a');
  must(pkg, '"check:web01b": "node backend/scripts/web_01b_superadmin_system_mode_summary_check.js"', 'package.json preserves check:web01b');
  must(pkg, '"check:paysafe01": "node backend/scripts/pay_safe_01_payment_write_gate_check.js"', 'package.json preserves check:paysafe01');
  must(pkg, '"check:pay01e": "node backend/scripts/pay_01e_payment_readonly_closure_check.js"', 'package.json preserves check:pay01e');
  must(pkg, '"check:cop02a": "node backend/scripts/cop_02a_program_ici_genel_rehber_check.js"', 'package.json preserves check:cop02a');
  must(pkg, '"check:uxkvkk01": "node backend/scripts/ux_kvkk_01_compact_boundary_check.js"', 'package.json preserves check:uxkvkk01');
  must(pkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', 'package.json preserves check:web-mobile');
  must(pkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', 'package.json preserves lint:web');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json preserves verify:final');

  mustIncludeAll(primer, [
    'WEB-01-FIX',
    'PAY-SAFE-01',
    'PAY-01E',
    'QLT-04B',
    'COP-01E',
    'COP-02A',
  ], 'primer includes recent closures');
  must(primer, 'WEB-01A', 'primer includes WEB-01A');
  must(primer, 'WEB-01B', 'primer includes WEB-01B');
  must(primer, 'OP-04', 'primer includes OP-04');
  must(primer, 'UX-KVKK-01', 'primer includes UX-KVKK-01');

  mustIncludeAll(registry, [
    'WEB-01A - green/closed',
    'WEB-01B - green/closed',
    'WEB-01-FIX - green/closed',
    'QLT-04B - green/closed',
    'PAY-01A-E - green/closed',
    'PAY-SAFE-01 - green/closed',
    'COP-01A-E - green/closed',
    'COP-02A - green/closed',
  ], 'registry includes closed product statuses');
  must(registry, 'PAY-01E', 'registry includes PAY-01E closure');
  must(registry, 'COP-01E', 'registry includes COP-01E closure');
  must(registry, 'OP-04 - green/closed', 'registry includes OP-04 closed status');
  must(registry, 'UX-KVKK-01 - green/closed', 'registry includes UX-KVKK-01 closed status');
  must(registry, 'DOCS-STATE-01 - active/next', 'registry includes DOCS-STATE-01 next status');
  must(registry, 'VERIFY-CHAIN-01 - active/next', 'registry includes VERIFY-CHAIN-01 next status');
  mustIncludeAll(registry, [
    'M95-EXPORT-01',
    'MOBILE-TEXT-01',
    'COP-02B',
    'WEB-01C',
    'M44-T1/T5',
    'FIELD-LAUNCH-PACK-01',
  ], 'registry includes upcoming products');

  mustIncludeAll(guide, [
    'check:web01a',
    'check:web01b',
    'check:qlt04b',
    'check:pay01e',
    'check:paysafe01',
    'check:cop02a',
    'check:docsstate01',
  ], 'script guide exposes check commands');

  must(backlog, 'VERIFY-CHAIN-01', 'backlog includes VERIFY-CHAIN-01');
  must(backlog, 'M95-EXPORT-01', 'backlog includes M95-EXPORT-01');
  must(backlog, 'MOBILE-TEXT-01', 'backlog includes MOBILE-TEXT-01');
  must(backlog, 'COP-02B', 'backlog includes COP-02B');
  must(backlog, 'UX-TEXT-02', 'backlog includes UX-TEXT-02');
  must(backlog, 'E2E-SMOKE-01', 'backlog includes E2E-SMOKE-01');
  must(backlog, 'UX-QA-01', 'backlog includes UX-QA-01');
  must(backlog, 'WEB-01C', 'backlog includes WEB-01C');
  must(backlog, 'M44-T1/T5', 'backlog includes M44-T1/T5');
  must(backlog, 'BRAND-FINAL-01', 'backlog includes BRAND-FINAL-01');
  must(backlog, 'CLEANUP-01', 'backlog includes CLEANUP-01');
  must(backlog, 'FIELD-LAUNCH-PACK-01', 'backlog includes FIELD-LAUNCH-PACK-01');
  must(backlog, 'PERF-REGRESSION-01', 'backlog includes PERF-REGRESSION-01');

  mustEqual(state.nextMilestone, 'M90', 'state keeps M90 canonical next milestone');
  mustEqual(state.historicalNextMilestone, 'M80', 'state keeps M80 historical next milestone');
  mustEqual(state.latestMasterPack, 89, 'state keeps latest master pack 89');
  mustEqual(state.stableTo, 78, 'state keeps stableTo 78');
  mustIncludeAll(state.activeMilestones.join(' '), ['M89', 'M90', 'M90C.9'], 'state keeps canonical active milestones');
  must(stateText, '"recentProductClosures"', 'state exposes recent product closures');
  must(stateText, '"WEB-01-FIX"', 'state includes WEB-01-FIX closure');
  must(stateText, '"PAY-SAFE-01"', 'state includes PAY-SAFE-01 closure');
  must(stateText, '"PAY-01E"', 'state includes PAY-01E closure');
  must(stateText, '"QLT-04B"', 'state includes QLT-04B closure');
  must(stateText, '"COP-01E"', 'state includes COP-01E closure');
  must(stateText, '"COP-02A"', 'state includes COP-02A closure');
  mustEqual(state.nextProductMilestone, 'VERIFY-CHAIN-01', 'state exposes VERIFY-CHAIN-01 next milestone');
  must(stateText, '"upcomingProductMilestones"', 'state exposes upcoming product milestones');

  console.log('=== DOCS-STATE-01 RECENT PRODUCT CLOSURE CHECK PASS ===');
}

main();

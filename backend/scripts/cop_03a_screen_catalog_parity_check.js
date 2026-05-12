#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function collectPaths(text, regex) {
  const list = [];
  const seen = new Set();
  let match;
  while ((match = regex.exec(text))) {
    const value = String(match[1] || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    list.push(value);
  }
  return list;
}

function addDerivedFamilyPaths(paths, fromPrefix, toPrefix) {
  const out = new Set(paths);
  for (const value of paths) {
    if (!value.startsWith(fromPrefix)) continue;
    out.add(value.replace(fromPrefix, toPrefix));
  }
  return out;
}

function main() {
  console.log('=== COP-03A SCREEN CATALOG PARITY CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const registry = read('docs/MILESTONE_REGISTRY_V1.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');
  const parityDoc = read('docs/COPILOT_SCREEN_KNOWLEDGE_PARITY_V1.md');
  const screenRegistry = read('web/src/copilot/screenRegistry.js');
  const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');
  const roomCompanyCatalog = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const aiRoute = read('backend/src/routes/ai.js');
  const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
  const goldenPack = read('backend/src/ai/chat/goldenQuestionPack.js');
  const backendCatalog = `${screenCatalog}\n${roomCompanyCatalog}`;

  must(pkg, '"check:cop03a": "node backend/scripts/cop_03a_screen_catalog_parity_check.js"', 'package.json exposes check:cop03a');
  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json keeps check:product-extensions');
  must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json keeps check:verifychain01');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json keeps verify:final');

  must(runner, 'check:cop03a', 'product extensions runner includes check:cop03a');
  must(verifyChain, 'check:cop03a', 'verify chain expects check:cop03a');
  must(guide, 'check:cop03a', 'script guide exposes check:cop03a');
  must(parityDoc, 'COPILOT SCREEN KNOWLEDGE PARITY V1', 'parity doc exists');
  must(parityDoc, 'Geri Bildirim', 'parity doc covers feedback');
  must(parityDoc, 'Unknown screen safe fallback standardı', 'parity doc covers safe fallback');
  must(parityDoc, 'Path/id mismatch kuralı', 'parity doc covers path/id mismatch');
  must(parityDoc, 'Screen analyzer sınıfları', 'parity doc covers analyzer classes');
  must(parityDoc, 'Önce Önce', 'parity doc covers double prefix rule');
  must(parityDoc, 'COP-03B sonraki plan', 'parity doc covers next plan');

  const requiredPaths = [
    '/shared/feedback',
    '/shared/kvkk',
    '/shared/notifications',
    '/shared/logs',
    '/room/commercial-flow',
    '/room/reports',
    '/company/operations',
    '/school/operations',
    '/organization/operations',
    '/driver/change-pin',
    '/superadmin/operations',
    '/superadmin/commercial-core',
    '/superadmin/logexport',
    '/superadmin/natural-copilot',
    '/superadmin/pilot-launch-gate',
    '/superadmin/regions',
    '/superadmin/ssot-alignment',
    '/superadmin/copilot',
    '/superadmin/audit',
    '/superadmin/observability',
    '/superadmin/acceptance',
    '/superadmin/operation-verification',
    '/room/map',
    '/company',
    '/school',
    '/organization',
    '/driver/today',
    '/personel/live',
    '/parent/live',
  ];

  const frontendPaths = collectPaths(screenRegistry, /\{\s*id:\s*\d+\s*,\s*path:\s*["']([^"']+)["']/g);
  let backendPaths = new Set(collectPaths(backendCatalog, /screen\(\s*\d+\s*,\s*["']([^"']+)["']/g));
  if (backendCatalog.includes("replace('/company', '/school')") || backendCatalog.includes('replace("/company", "/school")')) {
    backendPaths = addDerivedFamilyPaths(backendPaths, '/company', '/school');
  }
  if (backendCatalog.includes("replace('/company', '/organization')") || backendCatalog.includes('replace("/company", "/organization")')) {
    backendPaths = addDerivedFamilyPaths(backendPaths, '/company', '/organization');
  }
  const missing = frontendPaths.filter((p) => !backendPaths.has(p));
  if (missing.length) fail(`frontend screenRegistry paths missing in backend catalog: ${missing.join(', ')}`);
  ok('frontend screenRegistry paths covered by backend screen catalog');

  for (const pathName of requiredPaths) {
    if (!backendPaths.has(pathName)) fail(`backend catalog includes ${pathName}`);
    ok(`backend catalog includes ${pathName}`);
  }

  const screenDefinitionBlock = screenCatalog.slice(
    screenCatalog.indexOf('export function getScreenDefinitionForUser'),
    screenCatalog.indexOf('export function buildRoleHelpSummary'),
  );
  const safeUnknownBlock = screenCatalog.slice(
    screenCatalog.indexOf('function buildSafeUnknownScreenDefinition'),
    screenCatalog.indexOf('export function getScreenDefinitionForUser'),
  );
  must(screenDefinitionBlock, 'if (foundByPath)', 'path lookup is canonical first');
  must(screenDefinitionBlock, 'if (!rawPath && entityId != null)', 'id lookup only runs when path is absent');
  must(screenDefinitionBlock, 'return buildSafeUnknownScreenDefinition(user, screenContext, entityId);', 'safe unknown fallback is used');
  must(safeUnknownBlock, "label: firstNonEmpty(screenContext?.label, 'Bu ekran')", 'safe fallback keeps screen label');
  must(safeUnknownBlock, 'menuPurpose: \'Bu ekran için detaylı rehber henüz katalogda yok; görünen başlık ve panel bilgisine göre yardımcı olabilirim.\'', 'safe fallback menu purpose present');
  must(safeUnknownBlock, 'path: rawPath', 'safe fallback path preserved');
  mustNot(screenDefinitionBlock, 'return list[0]', 'getScreenDefinitionForUser does not fall back to first role screen');
  mustNot(screenDefinitionBlock, 'return rows[0]', 'getScreenDefinitionForUser does not fall back to first role screen by rows');

  must(screenCatalog, "Saha geri bildirimlerini, kullanıcı yorumlarını ve değerlendirme kayıtlarını toplar", 'shared feedback explanation exists');
  must(screenCatalog, 'Bu ekran harita veya araç seçme ekranı değildir.', 'shared feedback forbidden map explanation exists');
  must(screenCatalog, 'Açık/kritik/tekrarlayan/çözüldü/kapandı durumları kontrol edilir.', 'shared feedback status explanation exists');
  must(screenCatalog, 'personel, veli, sürücü, firma/okul/organizasyon ve oda geri bildirimleri', 'shared feedback role scope exists');
  must(screenCatalog, 'Geri Bildirim', 'shared feedback label exists');

  const analyzerTypes = [
    'FEEDBACK',
    'KVKK',
    'NOTIFICATIONS',
    'LOG_EXPORT',
    'OPERATIONS',
    'COMMERCIAL_CORE',
    'ROOM_COMMERCIAL_FLOW',
    'REPORTS',
    'DRIVER_PIN',
    'PILOT_LAUNCH_GATE',
    'REGIONS',
    'SSOT_ALIGNMENT',
    'NATURAL_COPILOT',
  ];
  for (const type of analyzerTypes) {
    must(screenStateAnalyzer, `return '${type}'`, `screen analyzer covers ${type}`);
  }
  must(screenStateAnalyzer, 'analyzeFeedback(screenContext, screenDefinition, _conversationState)', 'feedback analyzer exists');
  must(screenStateAnalyzer, 'analyzeConfiguredSurface(type, screenContext, screenDefinition, conversationState, rule)', 'configured surface analyzer exists');
  must(screenStateAnalyzer, "['export', 'dışa', 'disa']", 'export needles stay safe in analyzer');

  must(helpComposer, 'normalizeActionStepText(', 'helpComposer keeps action normalization helper');
  must(helpComposer, 'openingActionForQuestionType(questionType, screenDefinition)', 'helpComposer keeps opening action helper');
  must(helpComposer, 'normalizeActionStepText(screenDefinition?.firstStep)', 'helpComposer normalizes first step');
  must(helpComposer, 'normalizeActionStepText(guide?.whatToDoNow)', 'helpComposer normalizes guide now text');
  must(helpComposer, 'normalizeActionStepText(screenDefinition?.nextStep)', 'helpComposer normalizes next step');
  must(helpComposer, 'normalizeActionStepText(sourceScreenDefinition?.firstStep)', 'helpComposer normalizes source first step');
  must(helpComposer, 'normalizeActionStepText(sourceScreenDefinition?.nextStep)', 'helpComposer normalizes source next step');
  mustNot(helpComposer, 'Önce Önce', 'helpComposer avoids double prefix');
  must(aiRoute, 'Bunu anlayamadım. Kısaca ne yapmak istediğini yazabilir misin?', 'ai route keeps safe validation fallback');
  mustNot(aiRoute, 'Validation failed', 'ai route does not expose raw validation failure');

  must(goldenPack, 'cop03a-feedback-purpose', 'golden pack includes feedback live bug example');
  must(goldenPack, 'cop03a-kvkk-purpose', 'golden pack includes KVKK example');
  must(goldenPack, 'cop03a-notifications-purpose', 'golden pack includes notifications example');
  must(goldenPack, 'cop03a-company-operations-purpose', 'golden pack includes company operations example');
  must(goldenPack, 'cop03a-school-operations-missing', 'golden pack includes school operations example');
  must(goldenPack, 'cop03a-organization-operations-purpose', 'golden pack includes organization operations example');
  must(goldenPack, 'cop03a-driver-change-pin-purpose', 'golden pack includes driver change pin example');
  must(goldenPack, 'cop03a-superadmin-commercial-core-purpose', 'golden pack includes commercial core example');
  must(goldenPack, 'cop03a-pilot-launch-gate-next', 'golden pack includes pilot gate example');
  must(goldenPack, 'cop03a-ssot-alignment-purpose', 'golden pack includes SSOT example');
  must(goldenPack, 'cop03a-room-commercial-flow-purpose', 'golden pack includes room commercial flow example');
  must(goldenPack, 'cop03a-room-reports-purpose', 'golden pack includes room reports example');
  must(goldenPack, 'cop03a-superadmin-logexport-purpose', 'golden pack includes log export example');
  must(goldenPack, 'cop03a-superadmin-natural-copilot-purpose', 'golden pack includes natural copilot example');
  must(goldenPack, 'COP02B_CONTEXTUAL_FOLLOW_UPS', 'golden pack keeps COP-02B follow-up export');

  must(backlog, 'COP-03A', 'backlog keeps COP-03A visible');
  must(backlog, 'green/closed', 'backlog keeps closure wording for recent product lines');
  must(primer, 'COP-03A', 'primer keeps COP-03A visible');
  must(registry, 'COP-03A', 'milestone registry keeps COP-03A visible');

  console.log('=== COP-03A SCREEN CATALOG PARITY CHECK PASS ===');
}

main();

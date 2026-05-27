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

function ordered(text, needles, label) {
  let cursor = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(cursor + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const index = cursor + 1 + (match.index || 0);
    if (index <= cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = index;
  }
  ok(label);
}

function main() {
  console.log('=== ROADMAP-LOCK-AI-MARKETPLACE-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const harness = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const projectSpec = read('docs/PROJECT_SPEC_V1.md');
  const roadmapDoc = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');
  const roleMatrix = read('docs/COPILOT_ROLE_TASK_MATRIX_01.md');
  const aiStrategy = read('docs/COPILOT_AI_ACTION_STRATEGY_01.md');
  const demandRoadmap = read('docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md');
  const voiceDoc = read('docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md');
  const proactiveDoc = read('docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md');

  must(pkg, '"check:roadmaplockaimarketplace01": "node backend/scripts/roadmap_lock_ai_marketplace_01_check.js"', 'package.json exposes roadmap lock check');
  must(runner, 'check:roadmaplockaimarketplace01', 'product extensions runner includes roadmap lock check');
  must(verifyChain, 'check:roadmaplockaimarketplace01', 'verify chain exposes roadmap lock check');
  ordered(runner, [
    'check:seferscore01',
    'check:roadmaplockaimarketplace01',
    'check:agreementsourceshiftlineage01',
    'check:marketplacefreetooperate01',
  ], 'roadmap lock order before agreement lineage and marketplace');

  must(guide, 'ROADMAP-LOCK-AI-MARKETPLACE-01', 'script guide mentions roadmap lock milestone');
  must(guide, 'check:roadmaplockaimarketplace01', 'script guide exposes roadmap lock check');
  must(guide, 'COPILOT-ROLE-TASK-MATRIX-01', 'script guide references role task matrix doc');
  must(guide, 'COPILOT-AI-ACTION-STRATEGY-01', 'script guide references ai action strategy doc');
  must(guide, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'script guide references demand-to-agreement roadmap doc');
  must(guide, 'VOICE-COPILOT-ROLE-ASSISTANT-01', 'script guide references voice assistant doc');
  must(guide, 'PROACTIVE-COPILOT-NEXT-BEST-ACTION-01', 'script guide references proactive nba doc');
  must(guide, 'PUBLIC-LANDING-01', 'script guide contains locked roadmap sequence');
  must(guide, 'RELEASE-CANDIDATE-01', 'script guide contains locked roadmap sequence end');

  must(harness, 'root:check:roadmaplockaimarketplace01', 'harness lists roadmap lock root check');
  must(harness, 'roadmap_lock_ai_marketplace_01_check.js', 'harness lists roadmap lock check file');

  must(primer, 'ROADMAP-LOCK-AI-MARKETPLACE-01', 'primer locks roadmap milestone');
  must(primer, 'Sefer Abi ürünün ana farkıdır', 'primer states Sefer Abi differentiator');

  must(projectSpec, 'Sefer Abi', 'project spec mentions Sefer Abi');
  must(projectSpec, 'kritik işlemler kullanıcı onayı olmadan yapılmaz', 'project spec keeps human approval boundary');
  must(projectSpec, 'Demand-to-Agreement', 'project spec mentions demand-to-agreement direction');

  must(roadmapDoc, 'ROADMAP-LOCK-AI-MARKETPLACE-01', 'roadmap doc exists');
  must(roadmapDoc, 'Sefer Abi ürünün ana farkıdır', 'roadmap doc states product differentiator');
  must(roadmapDoc, 'Completed milestones', 'roadmap doc lists completed milestones');
  must(roadmapDoc, 'Locked roadmap order', 'roadmap doc lists locked roadmap order');
  must(roadmapDoc, 'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01', 'roadmap doc includes demand-to-agreement roadmap');
  must(roadmapDoc, 'PROACTIVE-COPILOT-NEXT-BEST-ACTION-01', 'roadmap doc includes proactive next best action');

  must(roleMatrix, 'kritik işlemler kullanıcı onayı olmadan yapılmaz', 'role matrix keeps approval boundary');
  must(roleMatrix, 'Sefer Abi rol bazlı çalışır', 'role matrix states role-based copilot');
  must(roleMatrix, 'PARENT', 'role matrix includes parent role');
  must(roleMatrix, 'PERSONEL', 'role matrix includes personel role');

  must(aiStrategy, 'aksiyon kartı', 'ai action strategy uses action card');
  must(aiStrategy, 'onay kartı', 'ai action strategy uses confirmation card');
  must(aiStrategy, 'kullanıcı onayı iste', 'ai action strategy requires confirmation');
  must(aiStrategy, 'kritik işlemi doğrudan yapmaz', 'ai action strategy forbids direct critical writes');

  must(demandRoadmap, 'Personel / öğrenci listesi', 'demand roadmap starts from person/student list');
  must(demandRoadmap, 'Bu teklifi sözleşmeye dönüştürmek ister misiniz?', 'demand roadmap requires contract conversion confirmation');
  must(demandRoadmap, 'Source lineage korunur', 'demand roadmap preserves lineage');
  must(demandRoadmap, 'Agreement aktif olunca 7 günlük rolling vardiyalar üretilir', 'demand roadmap includes rolling shifts');

  must(voiceDoc, 'Sesli komut kritik işlemi doğrudan uygulamaz', 'voice doc keeps no direct execute boundary');
  must(voiceDoc, 'aksiyon kartı', 'voice doc uses action card');
  must(voiceDoc, 'onay kartı', 'voice doc uses confirmation card');

  must(proactiveDoc, 'Durum / risk nedir?', 'proactive doc uses standard warning format');
  must(proactiveDoc, 'Hangi aksiyon hazırlanabilir?', 'proactive doc uses prepared action question');
  must(proactiveDoc, 'Gelen teklif en ucuz ama kalite riski yüksek.', 'proactive doc includes risk example');

  console.log('=== ROADMAP-LOCK-AI-MARKETPLACE-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}

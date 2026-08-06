#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
  if (normalize(text).includes(normalize(needle))) {
    ok(label);
  } else {
    fail(label);
  }
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) fail(`${label}: missing ${needle}`);
    cursor = index + target.length;
  }
  ok(label);
}

function gitDiffNames(paths) {
  const args = ['diff', '--name-only', '--', ...paths];
  const out = execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) {
    fail(`${label}: ${files.join(', ')}`);
  }
  ok(label);
}

function mustDiffExactly(paths, expectedNames, label) {
  const files = gitDiffNames(paths);
  const expected = new Set(expectedNames);
  const actual = new Set(files);
  const unexpected = files.filter((name) => !expected.has(name));
  const missing = expectedNames.filter((name) => !actual.has(name));
  if (unexpected.length > 0 || missing.length > 0) {
    fail(`${label}: ${[...unexpected, ...missing.map((name) => `missing:${name}`)].join(', ')}`);
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
  const roadmap = read('docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md');

  must(pkg, '"check:roadmaplockaimarketplace01": "node backend/scripts/roadmap_lock_ai_marketplace_01_check.js"', 'package.json exposes check:roadmaplockaimarketplace01');
  must(runner, 'check:roadmaplockaimarketplace01', 'product extensions runner includes roadmap lock check');
  must(verifyChain, 'check:roadmaplockaimarketplace01', 'verify chain includes roadmap lock check');
  ordered(runner, [
    'check:seferscore01',
    'check:roadmaplockaimarketplace01',
    'check:publiclanding01',
    'check:publiclandingplatformfirst01',
    'check:leadcapture01',
    'check:onboardingreview01',
    'check:productflowbuttonaudit01',
    'check:agreementsourceshiftlineage01',
    'check:marketplacefreetooperate01',
  ], 'roadmap lock stays before public / onboarding / marketplace final sequence');

  must(guide, 'ROADMAP-LOCK-AI-MARKETPLACE-01', 'script guide mentions roadmap lock milestone');
  must(guide, 'check:roadmaplockaimarketplace01', 'script guide exposes roadmap lock check');
  must(guide, 'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md', 'script guide references roadmap lock doc');

  must(harness, 'root:check:roadmaplockaimarketplace01', 'harness lists roadmap lock root check');
  must(harness, 'roadmap_lock_ai_marketplace_01_check.js', 'harness lists roadmap lock check file');

  must(primer, 'ROADMAP-LOCK-AI-MARKETPLACE-01', 'primer mentions roadmap lock milestone');
  must(primer, 'docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md', 'primer links roadmap lock doc');

  must(roadmap, 'QUALITY-GATE-FINAL-01B sonrası karar', 'roadmap doc contains final gate decision section');
  must(roadmap, 'Final kalite kapısı başarıyla kapandı', 'roadmap doc states final gate closed');
  must(roadmap, 'Runtime-data/browser-smoke commit dışı kalacak', 'roadmap doc keeps runtime-data/browser-smoke out of scope');
  must(roadmap, 'Backend route/service/schema veya Prisma değişikliği yalnızca açık scope varsa yapılacak', 'roadmap doc keeps backend/prisma write boundary');
  must(roadmap, 'SeferPakt, servis tedarikini buluşturan, sözleşmeden vardiyaya otomatik operasyon kuran, canlı GPS ve kanıtla servisi denetleyen, kaliteye göre hakedişi güvenli önizleyen ve yapay zekâ ile maliyet/saha risklerini önceden yakalayan kurumsal servis operasyon platformudur.', 'roadmap doc contains product promise');
  must(roadmap, 'Sefer Abi\'nin nihai hedefi', 'roadmap doc contains Sefer Abi final vision');
  must(roadmap, 'Maksimum güçlü AI hedefi', 'roadmap doc contains maximum strong AI target section');
  must(roadmap, 'Hedef, kullanıcının sadece denetleyen/onaylayan kişi konumuna gelmesi', 'roadmap doc contains user approver target');
  must(roadmap, 'Her panel / her rol hedefi', 'roadmap doc contains per-role target section');
  must(roadmap, 'Maksimum AI yetenek hedefleri', 'roadmap doc contains AI capability target section');
  must(roadmap, 'ChatGPT benzeri doğal Türkçe konuşur', 'roadmap doc contains natural Turkish conversation target');
  must(roadmap, 'Sesli komut alır', 'roadmap doc contains voice command target');
  must(roadmap, 'Driver Voice Copilot / Sürücü Sesli Sefer Abi', 'roadmap doc contains driver voice copilot heading');
  must(roadmap, 'Excel\'den OSRM rota taslağı', 'roadmap doc contains excel to OSRM route draft heading');
  must(roadmap, 'Adresleri geocode eder', 'roadmap doc contains geocoding target');
  must(roadmap, 'OSRM ile mesafe/süre matrisi çıkarır', 'roadmap doc contains OSRM target');
  must(roadmap, 'Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard\'lı uygula -> Audit log yaz', 'roadmap doc contains safe action model');
  must(roadmap, 'Public marketing guard özeti', 'roadmap doc contains public marketing guard summary');
  must(roadmap, 'AI Promise Strategy / Güven Stratejisi', 'roadmap doc contains AI promise strategy section');
  must(roadmap, 'Underpromise, overdeliver', 'roadmap doc contains underpromise overdeliver principle');
  must(roadmap, 'testle kanıtlanmış', 'roadmap doc contains test-proven capability wording');
  must(roadmap, 'Vaat edilen kabiliyet testle kanıtlanmış olmalı; Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.', 'roadmap doc contains explicit trust principle sentence');
  must(roadmap, 'güven stratejisi', 'roadmap doc contains trust strategy wording');
  must(roadmap, 'kanıtlanmış kabiliyet', 'roadmap doc contains proven capability wording');
  must(roadmap, 'public vaat', 'roadmap doc contains public promise wording');
  must(roadmap, 'maksimum güçlü operasyon AI', 'roadmap doc contains maximum strong operations AI wording');
  must(roadmap, 'human approval', 'roadmap doc contains human approval wording');
  must(roadmap, 'guard', 'roadmap doc contains guard wording');
  must(roadmap, 'audit log', 'roadmap doc contains audit log wording');
  must(roadmap, 'Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.', 'roadmap doc contains overdeliver trust sentence');
  must(roadmap, 'Sefer Abi, SeferPakt içindeki tüm operasyonu anlayan, öneren, hazırlayan, sesli/yazılı komut alan, Excel/OSRM/teklif/kalite/risk/saha verilerini analiz eden maksimum güçlü operasyon AI katmanıdır.', 'roadmap doc contains public marketing guard promise');
  must(roadmap, 'Public marketing claim guard', 'roadmap doc contains marketing claim guard');
  must(roadmap, 'Invite-based membership guard', 'roadmap doc contains invite-based membership guard section');
  must(roadmap, 'Public lead\'ler otomatik olarak kullanıcı hesabına dönüşmez', 'roadmap doc keeps public lead account boundary');
  must(roadmap, 'İnsan onayı olmadan kullanıcı oluşturma yok', 'roadmap doc excludes user creation without human approval');
  must(roadmap, 'invite draft', 'roadmap doc keeps invite draft wording');
  must(roadmap, 'pending invite', 'roadmap doc keeps pending invite wording');
  must(roadmap, 'human approval', 'roadmap doc keeps human approval wording for invite membership');
  must(roadmap, 'guard', 'roadmap doc keeps guard wording for invite membership');
  must(roadmap, 'audit log', 'roadmap doc keeps audit log wording for invite membership');
  must(roadmap, 'Self-service signup', 'roadmap doc excludes self-service signup');
  must(roadmap, 'automatic membership', 'roadmap doc excludes automatic membership');
  must(roadmap, 'Automatic company / room membership açılmaz', 'roadmap doc excludes automatic company and room membership');
  must(roadmap, 'Payment, billing, collection, settlement ve contract execute açılmaz', 'roadmap doc excludes payment and contract execute');
  must(roadmap, 'Verified supplier veya supplier verification auto akışı açılmaz', 'roadmap doc excludes supplier verification auto');
  must(roadmap, 'Email, SMS ve push açılmaz', 'roadmap doc excludes email sms and push');
  must(roadmap, 'Verified supplier guard', 'roadmap doc contains verified supplier guard section');
  must(roadmap, 'VERIFIED-SUPPLIER-01', 'roadmap doc keeps verified supplier milestone');
  must(roadmap, 'docs/VERIFIED_SUPPLIER_01.md', 'roadmap doc links verified supplier doc');
  must(roadmap, 'public lead veya supplier application verisini insan onaylı ve kanıt-temelli doğrulama hazırlığına taşır; otomatik verified supplier iddiası kurmaz', 'roadmap doc keeps human-approved verified supplier wording');
  must(roadmap, 'Doğrulama checklisti ticari unvan, yetkili kişi, araç kapasitesi, araç tipi uygunluğu, sürücü uygunluğu, hizmet bölgesi, KVKK / sözleşme / operasyon taahhüdü, geçmiş kalite / saha kanıtı ve eksik bilgi notu etrafında toplanır.', 'roadmap doc keeps verification checklist wording');
  must(roadmap, 'insan onaylı ve kanıt-temelli tedarikçi doğrulama hazırlığı', 'roadmap doc keeps evidence-based supplier verification wording');
  must(roadmap, 'public/self-service bir otomasyon olarak açılmaz', 'roadmap doc excludes public self-service supplier verification');
  must(roadmap, 'human approval', 'roadmap doc keeps human approval wording for verified supplier');
  must(roadmap, 'guard', 'roadmap doc keeps guard wording for verified supplier');
  must(roadmap, 'audit log', 'roadmap doc keeps audit log wording for verified supplier');
  must(roadmap, 'Prisma/migration, backend route/service/schema veya UI feature genişlemesi açılmaz.', 'roadmap doc excludes runtime and UI expansions');
  must(roadmap, 'Payment, billing, collection, settlement, contract execute, offer ranking, marketplace auto-selection, email, SMS ve push açılmaz.', 'roadmap doc excludes payment and notification actions');
  must(roadmap, 'Marketplace write boundary', 'roadmap doc contains marketplace write boundary');
  must(roadmap, 'Her yeni milestone acceptance standardı', 'roadmap doc contains milestone acceptance standard');
  must(roadmap, 'Final hardening / release - en son', 'roadmap doc keeps final hardening as last line of roadmap order');
  must(roadmap, 'Lead capture var ama self-service membership yoksa açık yaz', 'roadmap doc contains lead capture boundary');
  must(roadmap, 'Invite-based membership ayrı milestone olmadan üyelik açılmayacak', 'roadmap doc contains invite boundary');
  must(roadmap, 'Offer ranking quality ayrı milestone olmadan otomatik tedarikçi sıralama iddiası yok', 'roadmap doc contains offer ranking boundary');
  must(roadmap, 'Payment/settlement execute yok', 'roadmap doc contains payment boundary');
  must(roadmap, 'Contract/agreement execute yok', 'roadmap doc contains contract boundary');
  must(roadmap, 'Route apply yok', 'roadmap doc contains route apply boundary');
  must(roadmap, 'SMS/push yok', 'roadmap doc contains sms/push boundary');
  must(roadmap, 'F) FINANSAL OPERASYON VE MALİYET YÖNETİMİ', 'roadmap doc contains financial block heading');
  must(roadmap, 'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01', 'roadmap doc contains first financial milestone');

  ordered(roadmap, [
    'QUALITY-GATE-FINAL-01B sonrası karar',
    'SeferPakt ürün vaadi',
    'Sefer Abi nihai AI vizyonu',
    'Sefer Abi\'nin nihai hedefi',
    'Maksimum güçlü AI hedefi',
    'Kullanıcının hedef deneyimi',
    'Her panel / her rol hedefi',
    'Maksimum AI yetenek hedefleri',
    'A) Doğal konuşma',
    'B) Sesli komut',
    'C) Sesli uyarı / bildirim',
    'D) Excel / dosya analizi',
    'E) Adres / geocode / OSRM rota zekâsı',
    'F) Marketplace ve teklif zekâsı',
    'G) Sözleşme / vardiya / dispatch zekâsı',
    'H) Proaktif risk zekâsı',
    'Güvenli aksiyon modeli',
    'Public marketing guard özeti',
    'AI Promise Strategy / Güven Stratejisi',
    'ChatGPT benzeri doğal konuşma hedefi',
    'Driver Voice Copilot / Sürücü Sesli Sefer Abi',
    'Excel\'den OSRM rota taslağı',
    'Sefer Abi güvenli aksiyon modeli',
    'Anla -> Analiz et -> En iyi seçenekleri sun -> Riskleri açıkla -> İnsan onayı al -> Guard\'lı uygula -> Audit log yaz',
    'Public marketing claim guard',
    'Invite-based membership guard',
    'Verified supplier guard',
    'Roadmap sırası',
    'A) MARKETPLACE TEMELİ',
    'PUBLIC-LANDING-01 final promise check',
    'ONBOARDING-REVIEW-01 final audit',
    'INVITE-BASED-MEMBERSHIP-01',
    'VERIFIED-SUPPLIER-01',
    'UX-MARKETPLACE-PANELS-01',
    'B) SAHA / KALİTE / TEKLİF MOTORU',
    'M44-TELEMATICS-T1-T5',
    'SAFE-DRIVE-01',
    'OFFER-RANKING-QUALITY-01',
    'C) COPILOT STRATEJİ VE GUARDRAIL',
    'COPILOT-ROLE-TASK-MATRIX-01',
    'COPILOT-AI-ACTION-ROADMAP-01',
    'COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01',
    'COPILOT-HUMAN-APPROVAL-01',
    'D) EXCEL / ADRES / OSRM ROTA TASLAĞI HATTI',
    'COPILOT-EXCEL-DEMAND-IMPORT-01',
    'ADDRESS-GEOCODING-CONFIDENCE-01',
    'COPILOT-STOP-ROUTE-DRAFT-01',
    'OSRM-ROUTE-DRAFT-FROM-EXCEL-01',
    'COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01',
    'E) COPILOT OPERASYON AKIŞI',
    'COPILOT-DEMAND-INTAKE-01',
    'COPILOT-RFQ-PREP-01',
    'SUPPLIER-MATCHING-01',
    'SUPPLIER-OFFER-COLLECT-01',
    'COPILOT-OFFER-ANALYSIS-01',
    'COPILOT-NEGOTIATION-ASSIST-01',
    'COPILOT-OFFER-RECOMMENDATION-01',
    'COPILOT-SHIFT-TO-AGREEMENT-PREP-01',
    'COPILOT-DISPATCH-ACTION-PREP-01',
    'COPILOT-ACTION-PREP-01',
    'F) FINANSAL OPERASYON VE MALİYET YÖNETİMİ',
    'FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01',
    'OPERATIONAL-COST-MODEL-01',
    'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
    'COMPANY-BUDGET-AND-SERVICE-COST-01',
    'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
    'COST-SCENARIO-FORECAST-AND-SAVINGS-01',
    'SEFER-ABI-COST-ANALYSIS-ASSISTANT-01',
    'ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01',
    'G) VOICE / PROACTIVE / AUTOPILOT',
    'VOICE-COPILOT-ROLE-ASSISTANT-01',
    'VOICE-COPILOT-COMMANDS-01',
    'VOICE-COPILOT-CONFIRMATION-01',
    'DRIVER-VOICE-COPILOT-01',
    'DRIVER-VOICE-ROUTE-ASSIST-01',
    'DRIVER-VOICE-CHECKIN-ASSIST-01',
    'DRIVER-VOICE-RISK-ALERTS-01',
    'PROACTIVE-COPILOT-01',
    'PROACTIVE-COPILOT-NEXT-BEST-ACTION-01',
    'COPILOT-NEXT-BEST-ACTION-01',
    'COPILOT-ALERT-TO-ACTION-CARD-01',
    'COPILOT-SAFE-AUTOPILOT-01',
    'H) FINAL HARDENING / RELEASE - EN SON',
    'PERF-REGRESSION-01',
    'SECURITY-KVKK-FINAL-01',
    'PROD-HARDENING-01',
    'FIELD-ACCEPTANCE-01',
    'RELEASE-CANDIDATE-01',
  ], 'roadmap order is locked');

  must(read('backend/src/routes/companyOverview.js'), 'Route ownership anchor for company overview.', 'companyOverview route keeps ownership anchor');
  mustNoDiff(['backend/src/routes', 'backend/src/services', 'prisma'], 'backend route/service/schema and Prisma diff is empty');

  console.log('=== ROADMAP-LOCK-AI-MARKETPLACE-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}

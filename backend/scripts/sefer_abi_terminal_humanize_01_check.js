#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertProductExtensionsIncludes, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
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
    .toLocaleLowerCase('tr-TR');
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(`${label} (missing: ${needle})`);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(`${label} (unexpected: ${needle})`);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

async function importModule(relPath) {
  return import(pathToFileURL(path.join(repoRoot, relPath)).href);
}

function dirtyRuntimeDataPaths(statusText) {
  return String(statusText || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((relPath) => relPath.startsWith('backend/artifacts/runtime-data/'));
}

async function main() {
  console.log('=== SEFER ABI TERMINAL HUMANIZE 01 CHECK ===');

  const gitStatus = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' });
  if (gitStatus.error) throw gitStatus.error;
  const statusText = String(gitStatus.stdout || '');

  const allowedRuntimeData = [
    'backend/artifacts/runtime-data/password-change-requirements.json',
    'backend/artifacts/runtime-data/username-directory.json',
    'backend/artifacts/runtime-data/agreement-route-refresh-requests.json',
    'backend/artifacts/runtime-data/public-leads.json',
    'backend/artifacts/runtime-data/quality-review-decisions.json',
    'backend/artifacts/runtime-data/region-failover-drill-state.json',
  ];
  const dirtyRuntimeData = dirtyRuntimeDataPaths(statusText);
  const dirtyRuntimeDataSet = new Set(dirtyRuntimeData);
  for (const relPath of allowedRuntimeData) {
    must(statusText, relPath, `git status keeps ${path.basename(relPath)} dirty`);
  }
  for (const relPath of dirtyRuntimeDataSet) {
    if (!allowedRuntimeData.includes(relPath)) fail(`Unexpected runtime-data dirty file: ${relPath}`);
  }
  if (dirtyRuntimeData.length !== allowedRuntimeData.length) {
    fail(`Runtime-data dirty file count must stay at ${allowedRuntimeData.length}, found ${dirtyRuntimeData.length}`);
  }

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const harness = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const milestoneDoc = read('docs/SEFER_ABI_TERMINAL_HUMANIZE_01.md');

  const panel = read('web/src/panels/shared/CopilotPanel.jsx');
  const drawer = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
  const quickActions = read('web/src/components/copilot/ChatQuickActions.jsx');
  const diagSignals = read('web/src/components/copilot/ChatDiagnosticSignals.jsx');
  const card = read('web/src/components/copilot/CopilotAdvancedResultCard.jsx');

  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerQualityPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const screenStateAnalyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
  const roomCompany = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
  const goldenPack = read('backend/src/ai/chat/goldenQuestionPack.js');
  const copilotFactsSource = read('web/src/utils/copilotFacts.js');
  const agreementFactsSource = read('web/src/utils/agreementCopilotFacts.js');

  must(pkg, '"check:seferabiterminalhumanize01": "node backend/scripts/sefer_abi_terminal_humanize_01_check.js"', 'package.json exposes Sefer Abi terminal humanize check');
  assertProductExtensionsIncludes('check:seferabiterminalhumanize01', 'product extensions registry includes Sefer Abi terminal humanize check', registryScripts);
  assertProductExtensionsIncludes('check:seferabiterminalhumanize01', 'verify chain registry includes Sefer Abi terminal humanize check', registryScripts);
  must(verifyChain, 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'verify chain mentions milestone id');
  must(guide, 'SEFER-ABI-TERMINAL-HUMANIZE-01', 'milestone guide mentions milestone id');
  must(guide, 'check:seferabiterminalhumanize01', 'milestone guide exposes new check');
  must(guide, 'node backend\\scripts\\sefer_abi_terminal_humanize_01_check.js', 'milestone guide includes command');
  must(harness, 'root:check:seferabiterminalhumanize01', 'harness registry includes new root check');
  must(harness, 'check:seferabiterminalhumanize01', 'harness coverage includes new check');
  ordered(guide, ['### UX-SEFER-ABI-LAUNCHER-01 [CHECK]', '### SEFER-ABI-TERMINAL-HUMANIZE-01 [CHECK]'], 'milestone guide section order');
  must(milestoneDoc, '## Teknik Ayrıntı Standardı', 'milestone doc includes technical detail standard');

  must(drawer, 'Sefer Abi’ye Sor', 'drawer title is Turkish');
  must(drawer, 'Operasyon yardımcısı', 'drawer subtitle is Turkish');
  must(panel, 'Sefer Abi', 'panel assistant title is Turkish');
  must(panel, 'Sadece önizleme analizi için kısa bir başlangıç seçebilirsin.', 'panel starter copy is Turkish');
  must(panel, 'Sistem salt okunur ve öneri odaklı kalır; denetim günlüğüne copilot sorgusu yazar.', 'panel advanced note is Turkish');
  must(copilotFactsSource, "subtitle: 'Operasyon, kalite ve ticari sinyalleri aynı konuşmada yorumlayan sade analiz alanı.'", 'copilot facts source includes humanized subtitle');
  must(quickActions, 'Sonraki adımlar', 'quick actions summary is Turkish');
  mustNot(quickActions, 'Hedef yol', 'quick actions no longer expose routeKey label');
  mustNot(quickActions, 'Yol:', 'quick actions no longer expose routeKey field');
  must(card, 'Teknik ayrıntılar', 'advanced card groups technical details behind details section');
  must(card, 'Sağlayıcı', 'advanced card uses Turkish provider label');
  must(card, 'Çalışma modu', 'advanced card uses Turkish mode label');
  must(card, 'Kapsam', 'advanced card uses Turkish scope label');
  must(diagSignals, 'Tahsilat kapalı', 'diagnostic signals use Turkish settlement wording');
  must(agreementFactsSource, 'Başarı payı / lisans', 'agreement facts source humanizes marketplace summary label');

  must(helpComposer, 'Bu sadece SeferPuanı önizlemesidir.', 'helpComposer humanizes score preview');
  must(helpComposer, 'Başarı payı önizlemesini aç.', 'helpComposer humanizes marketplace action label');
  must(helpComposer, 'Organizasyon planı tek başına başarı payı kanıtı değildir.', 'helpComposer humanizes organization plan copy');
  must(helpComposer, 'konum sinyali güncel değil / çevrim dışı satırını aç', 'helpComposer humanizes operation-health chip');
  must(helpComposer, 'SeferPuanı önizlemesini sadeleştir.', 'helpComposer humanizes linked guide copy');
  must(helpComposer, 'Başarı payı önizlemesini netleştirmek için', 'helpComposer humanizes quick help copy');
  must(helpComposer, 'ödeme ve mutabakat başlatılmaz', 'helpComposer replaces settlement with mutabakat');
  must(helpComposer, 'Bu ekrandaki veriye göre başarı payı önizlemesi hesaplanabilir.', 'helpComposer humanizes selected diagnostic result');
  must(helpComposer, 'Kaynak vardiya sinyali ve SeferPuanı', 'helpComposer humanizes source label');
  must(helpComposer, 'SeferPuanı önizlemesini tekrar sorar.', 'helpComposer humanizes score follow-up');
  must(helpComposer, 'Başarı payı önizlemesini tekrar sorar.', 'helpComposer humanizes marketplace follow-up');

  must(intentRouter, 'konum sinyali güncel değil / çevrim dışı satırını aç', 'intent router humanizes operation-health chip');
  must(intentRouter, 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?', 'intent router humanizes marketplace chip');
  must(answerQualityPolicy, 'konum sinyali güncel değil / çevrim dışı satırını aç', 'answer quality policy humanizes starter chip');
  must(screenStateAnalyzer, 'GPS güncel değil / çevrim dışı', 'screen state analyzer uses Turkish operation-health wording');
  must(roomCompany, 'Konum bilgisi güncel değil / çevrim dışı', 'room/company screen catalog uses Turkish operation-health wording');
  must(goldenPack, 'Sadece önizleme • Bekliyor', 'golden pack humanizes summary text');
  must(goldenPack, 'Konum bilgisi güncel değil / çevrim dışı', 'golden pack humanizes stale/offline label');
  must(goldenPack, 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?', 'golden pack humanizes marketplace question');
  must(goldenPack, 'Hakediş hazırlığı ve sadece önizleme ödeme anlatımı', 'golden pack humanizes focus text');
  mustNot(goldenPack, 'Readonly', 'golden pack no longer surfaces raw Readonly text');
  mustNot(goldenPack, 'Stale/offline', 'golden pack no longer surfaces raw stale/offline text');
  mustNot(goldenPack, 'GPS eski', 'golden pack no longer surfaces raw old GPS wording');

  const { buildOperationHealthCopilotFacts, buildCommercialCoreCopilotFacts, buildCopilotStarterChips } = await importModule('web/src/utils/copilotFacts.js');
  const { buildAgreementCopilotFacts } = await importModule('web/src/utils/agreementCopilotFacts.js');
  const { buildSuggestedChips } = await importModule('backend/src/ai/chat/intentRouter.js');

  const operationHealth = buildOperationHealthCopilotFacts({
    summary: {
      status: 'ROOM_VIEW',
      cards: {
        activeDrivers: 5,
        riskyDevices: 2,
        staleOrOffline: 1,
        openIssues: 3,
      },
    },
    copilotDriver: { driverName: '34ABC123', liveState: 'Canlı' },
    copilotIssue: { title: 'Kapı sensörü', severity: 'Orta' },
  });
  const operationHealthSummary = operationHealth.copilotSummary || operationHealth.summary || '';
  must(operationHealthSummary, 'GPS güncel değil / çevrim dışı', 'operation health summary humanizes stale/offline signal');
  must(operationHealth.selectedRecordStatus, 'GPS güncel değil / çevrim dışı', 'operation health selected status humanizes stale/offline signal');
  must(operationHealth.nextBestAction, 'GPS güncel değil / çevrim dışı satırını aç', 'operation health next action humanizes chip');
  must(operationHealth.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'GPS güncel değil / çevrim dışı:1', 'operation health signal row uses Turkish label');
  mustNot(operationHealthSummary, 'stale', 'operation health summary hides raw stale wording');

  const commercialCore = buildCommercialCoreCopilotFacts({
    paymentPreviewSummary: {
      title: 'Hakediş önizlemesi',
      statusText: 'Taslak',
      detailReason: 'Sadece önizleme',
      paymentAccountStatus: 'Kapalı',
      contractOrShiftSummary: 'Sözleşme / vardiya üretimi ayrıca kontrol edilmeli.',
      missingCount: 2,
      reviewCount: 4,
      nonFinalText: 'Sadece önizleme — ödeme başlatılmaz.',
      nextAction: 'Önce hakediş önizleme kartını aç.',
      totalDraftCount: 3,
      readyCount: 1,
    },
    paymentBackbone: { activeRule: { paymentMode: 'OFF', commissionBps: 0 } },
    settings: { globalRule: { paymentMode: 'OFF' } },
    settlementStatus: { summaryText: 'Tahsilat kapalı' },
    accountStatus: { summaryText: 'Şu anda ödeme başlatılamaz' },
    operationProofSummary: { summaryText: 'Servis kanıtı kontrol gerekli', statusText: 'Bekliyor' },
    paymentSourcesMeta: { summary: 'Kaynak özeti', total: 2 },
    lifecycle: { summary: 'Sözleşme köprüsü açık' },
  });
  const commercialCoreSummary = commercialCore.copilotSummary || commercialCore.summary || '';
  must(commercialCoreSummary, 'Hakediş önizleme: Taslak', 'commercial core summary is Turkish');
  must(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Hakediş önizleme:Taslak', 'commercial core exposes preview status');
  must(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Tahsilat durumu:Tahsilat kapalı', 'commercial core exposes settlement status');
  must(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Sözleşme / vardiya:Sözleşme / vardiya üretimi ayrıca kontrol edilmeli.', 'commercial core exposes contract-shift copy');
  must(commercialCore.copilotBoundary.join(' | '), 'Ödeme başlatılmaz.', 'commercial core keeps safe boundary');
  must(commercialCore.copilotBoundary.join(' | '), 'Sadece önizleme verisi indirilir.', 'commercial core keeps preview-only boundary');
  mustNot(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'previewOnly', 'commercial core output hides previewOnly raw field');
  mustNot(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'payableNow', 'commercial core output hides payableNow raw field');
  mustNot(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'canInvoice', 'commercial core output hides canInvoice raw field');
  mustNot(commercialCore.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'canCollect', 'commercial core output hides canCollect raw field');

  const agreementFactsMissing = buildAgreementCopilotFacts(
    { id: 913, label: 'Sözleşme #913', status: 'AKTİF', type: 'agreement', roomName: 'Oda A' },
    {
      screenPath: '/company/agreements',
      screenTitle: 'Sözleşmeler',
      selectedRecordType: 'agreement',
      selectedRecordLabel: 'Sözleşme #913',
      selectedRecordStatus: 'AKTİF',
      platformFeePreview: {
        previewOnly: true,
        sourceConfidence: 'HIGH',
        licenseFeeText: '0 TL',
        agreementAmountText: '0 TL',
        successShareRateLabel: '%0',
        estimatedSuccessShareText: '0 TL',
        agreementSourceLabel: 'EXISTING_IMPORTED',
        agreementSource: 'INSUFFICIENT_LINEAGE',
        lineageSummary: 'Kaynak zinciri eksik',
        safeExplanation: 'Sadece önizleme — tahsilat/fatura oluşturulmaz.',
        sourceLineage: {
          lineageSummary: 'Kaynak zinciri eksik',
          sourceType: 'INSUFFICIENT_LINEAGE',
          billableByMarketplacePolicy: false,
          missingSignals: ['kaynak vardiya'],
          marketShiftId: 12,
          organizationPlanId: 8,
          selectedOfferId: 4,
          roomId: 3,
        },
        sourceEvidence: ['Kaynak vardiya #12'],
        missingSignals: ['kaynak vardiya'],
      },
      platformFeeSummaryText: 'Sadece önizleme',
      platformFeeReason: 'Kaynak vardiya eksik',
      platformFeeMarketShiftId: 12,
      platformFeeOrganizationPlanId: 8,
      platformFeeSelectedOfferId: 4,
      platformFeeRoomId: 3,
    },
  );
  must(agreementFactsMissing.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Başarı payı:Sadece önizleme', 'agreement facts expose preview-only success share');
  must(agreementFactsMissing.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Kaynak zinciri:Kaynak zinciri eksik', 'agreement facts humanize insufficient lineage');
  must(agreementFactsMissing.copilotSummary, 'Sadece önizleme', 'agreement facts summary stays Turkish');
  must(agreementFactsMissing.copilotBoundary.join(' | '), 'Lisans ücreti / başarı payı', 'agreement facts boundary remains Turkish');
  mustNot(agreementFactsMissing.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'INSUFFICIENT_LINEAGE', 'agreement facts hide raw insufficient lineage enum');
  mustNot(agreementFactsMissing.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'EXISTING_IMPORTED', 'agreement facts hide raw imported enum');

  const agreementFactsPositive = buildAgreementCopilotFacts(
    { id: 914, label: 'Sözleşme #914', status: 'AKTİF', type: 'agreement', roomName: 'Oda B' },
    {
      screenPath: '/company/agreements',
      screenTitle: 'Sözleşmeler',
      selectedRecordType: 'agreement',
      selectedRecordLabel: 'Sözleşme #914',
      selectedRecordStatus: 'AKTİF',
      platformFeePreview: {
        previewOnly: true,
        sourceConfidence: 'HIGH',
        licenseFeeText: '0 TL',
        agreementAmountText: '0 TL',
        successShareRateLabel: '%2',
        estimatedSuccessShareText: '12 TL',
        agreementSourceLabel: 'SEFERPAKT_NEW',
        agreementSource: 'SEFERPAKT_NEW',
        lineageSummary: 'Kaynak vardiya var',
        safeExplanation: 'Sadece önizleme — tahsilat/fatura oluşturulmaz.',
        sourceLineage: {
          lineageSummary: 'Kaynak vardiya var',
          sourceType: 'SEFERPAKT_NEW',
          billableByMarketplacePolicy: true,
          missingSignals: [],
          marketShiftId: 21,
          organizationPlanId: 9,
          selectedOfferId: 7,
          roomId: 4,
        },
        sourceEvidence: ['Kaynak vardiya #21'],
        missingSignals: [],
        billableByMarketplacePolicy: true,
      },
      platformFeeBillableByMarketplacePolicy: true,
      platformFeeSummaryText: 'Sadece önizleme',
      platformFeeReason: 'Kaynak vardiya var',
    },
  );
  must(agreementFactsPositive.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Başarı payı için uygun görünür', 'agreement facts expose positive lineage verdict');
  must(agreementFactsPositive.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'Sadece önizleme', 'agreement facts keep preview wording on positive case');
  mustNot(agreementFactsPositive.copilotSignals.map((row) => `${row.label}:${row.value}`).join(' | '), 'SEFERPAKT_NEW', 'agreement facts hide raw new-contract enum in visible text');

  const starterHealth = buildCopilotStarterChips({ screenPath: '/room/operation-health', selection: { facts: { screenType: 'OPERATION_HEALTH' } } });
  must(starterHealth.join(' | '), 'GPS güncel değil / çevrim dışı satırını aç', 'starter chips humanize operation health');

  const suggestedAgreement = buildSuggestedChips({
    entityType: 'screen',
    questionType: 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW',
    roleMode: 'OPERATIONS',
    screenPath: '/company/agreements',
    context: { screenType: 'COMMERCIAL_CORE' },
  });
  must(suggestedAgreement.join(' | '), 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?', 'suggested chips humanize marketplace wording');
  must(suggestedAgreement.join(' | '), 'Başarı payı neden 0 görünüyor?', 'suggested chips keep Turkish marketplace diagnostic');

  console.log('=== SEFER ABI TERMINAL HUMANIZE 01 CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

#!/usr/bin/env node

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

function ordered(text, needles, label) {
  let cursor = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(cursor + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = cursor + 1 + (match.index || 0);
    if (idx <= cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = idx;
  }
  ok(label);
}

function expectPreview(result, expectations, label) {
  for (const [key, expected] of Object.entries(expectations)) {
    const actual = result?.[key];
    if (typeof expected === 'function') {
      if (!expected(actual, result)) fail(`${label}: ${key}`);
      continue;
    }
    if (actual !== expected) fail(`${label}: ${key} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
  ok(label);
}

async function main() {
  console.log('=== AGREEMENT-SOURCE-SHIFT-LINEAGE-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const docs = read('docs/AGREEMENT_SOURCE_SHIFT_LINEAGE_01.md');
  const harness = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const serviceFile = read('backend/src/services/agreementSourceLineageService.js');
  const marketplaceService = read('backend/src/services/platformFeePreviewService.js');
  const routeFile = read('backend/src/routes/agreements.js');
  const cardFile = read('web/src/panels/shared/PlatformFeePreviewCard.jsx');
  const companyPanel = read('web/src/panels/company/AgreementsPanel.jsx');
  const roomPanel = read('web/src/panels/room/AgreementsPanel.jsx');
  const copilotFacts = read('web/src/utils/agreementCopilotFacts.js');
  const starterFacts = read('web/src/utils/copilotFacts.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const goldenPack = read('backend/src/ai/chat/goldenQuestionPack.js');

  must(pkg, '"check:agreementsourceshiftlineage01": "node backend/scripts/agreement_source_shift_lineage_01_check.js"', 'package.json exposes source-lineage check');
  must(runner, 'check:agreementsourceshiftlineage01', 'product extensions runner includes source-lineage check');
  ordered(runner, ['check:seferscore01', 'check:agreementsourceshiftlineage01', 'check:marketplacefreetooperate01'], 'product extensions order keeps source-lineage before marketplace');

  must(guide, 'AGREEMENT-SOURCE-SHIFT-LINEAGE-01', 'script guide mentions source-lineage milestone');
  must(guide, 'check:agreementsourceshiftlineage01', 'script guide exposes source-lineage check');
  must(docs, 'Agreement doğrudan ana ticari kaynak değildir', 'source-lineage doc states agreement is not primary source');
  must(docs, 'sourceShiftId / marketShift / commercialSource', 'source-lineage doc lists source signals');
  must(docs, 'Organization plan özel notu', 'source-lineage doc covers organization plan note');
  must(docs, 'EXISTING_IMPORTED', 'source-lineage doc covers existing imported fallback');
  must(docs, 'MANUAL_INTERNAL', 'source-lineage doc covers manual fallback');
  must(docs, 'LEGACY', 'source-lineage doc covers legacy fallback');
  must(harness, 'root:check:agreementsourceshiftlineage01', 'harness lists root source-lineage check');
  must(harness, 'agreement_source_shift_lineage_01_check.js', 'harness lists source-lineage file');

  must(serviceFile, 'export function inferAgreementSourceLineage', 'source-lineage service exposes inference helper');
  must(serviceFile, 'export function classifyAgreementSource', 'source-lineage service exposes classifier');
  must(serviceFile, 'export function buildAgreementLineageSummary', 'source-lineage service exposes summary helper');
  must(serviceFile, 'export function hasBillableSeferPaktLineage', 'source-lineage service exposes billable gate');
  must(serviceFile, 'export function hasBillableLineageSignal', 'source-lineage service exposes billable signal gate');
  must(serviceFile, 'INSUFFICIENT_LINEAGE', 'source-lineage service handles insufficient fallback');
  must(serviceFile, 'LEGACY', 'source-lineage service preserves legacy fallback');
  must(marketplaceService, 'agreementSourceLineageService.js', 'platform fee service imports source-lineage helper');

  must(marketplaceService, 'sourceLineage', 'marketplace service returns lineage payload');
  must(marketplaceService, 'lineageSummary', 'marketplace service returns lineage summary');
  must(marketplaceService, 'billableByMarketplacePolicy', 'marketplace service keeps billable gate');
  must(marketplaceService, 'Mevcut / taşınmış kayıt', 'marketplace service keeps imported fallback wording');
  must(routeFile, '/:id/platform-fee-preview', 'agreements route exposes readonly platform fee preview endpoint');
  must(routeFile, 'return res.json({ platformFeePreview })', 'agreements route returns platformFeePreview JSON');
  mustNot(routeFile, 'r.post("/:id/platform-fee-preview"', 'platform fee preview stays read-only');

  must(cardFile, 'Kaynak zinciri', 'platform fee card shows source chain section');
  must(cardFile, 'Mevcut sözleşmeden pay alınmaz', 'platform fee card states no pay on current contract');
  must(cardFile, 'Readonly önizleme — tahsilat/fatura oluşturulmaz.', 'platform fee card keeps readonly boundary text');
  must(cardFile, 'SeferPakt kaynaklı', 'platform fee card includes source verdict');
  must(cardFile, 'Başarı payı doğar mı', 'platform fee card includes success share verdict');

  must(companyPanel, 'PlatformFeePreviewCard', 'company agreements panel renders platform fee card');
  must(companyPanel, 'getAgreementPlatformFeePreview', 'company agreements panel wires platform fee preview api');
  must(roomPanel, 'PlatformFeePreviewCard', 'room agreements panel renders platform fee card');
  must(roomPanel, 'getAgreementPlatformFeePreview', 'room agreements panel wires platform fee preview api');

  must(copilotFacts, 'platformFeeSourceLineage', 'agreement copilot facts carry source lineage');
  must(copilotFacts, 'platformFeeMarketShiftId', 'agreement copilot facts carry market shift id');
  must(copilotFacts, 'platformFeeOrganizationPlanId', 'agreement copilot facts carry organization plan id');
  must(copilotFacts, 'platformFeeSelectedOfferId', 'agreement copilot facts carry selected offer id');
  must(starterFacts, 'isMarketplaceFreeToOperatePreview', 'starter chips detect marketplace lineage preview');
  must(starterFacts, 'Kaynak zinciri ne?', 'starter chips ask source-chain question');
  must(starterFacts, 'Organization plan’dan gelen sözleşme kaynaklı sayılır mı?', 'starter chips ask organization plan question');
  must(intentRouter, 'source lineage', 'intent router sees source lineage questions');
  must(intentRouter, 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'intent router routes marketplace/source-lineage topic');
  must(answerPolicy, 'marketplaceFreeToOperateChips', 'answer policy exposes marketplace chips');
  must(helpComposer, 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'help composer knows marketplace preview topic');
  must(helpComposer, 'Kaynak vardiyası var mı?', 'help composer includes lineage question');
  must(helpComposer, 'Bu sözleşme hangi vardiyadan geldi?', 'help composer includes source shift question');
  must(goldenPack, 'Organization plan’dan gelen sözleşme kaynaklı sayılır mı?', 'golden question pack includes organization plan question');

  const serviceUrl = pathToFileURL(path.join(root, 'backend/src/services/agreementSourceLineageService.js')).href;
  const platformFeeUrl = pathToFileURL(path.join(root, 'backend/src/services/platformFeePreviewService.js')).href;
  const {
    inferAgreementSourceLineage,
    classifyAgreementSource,
    buildAgreementLineageSummary,
    hasBillableSeferPaktLineage,
    hasBillableLineageSignal,
  } = await import(serviceUrl);
  const {
    computePlatformFeePreview,
    buildMarketplaceFreeToOperateSummary,
    computeSuccessShareRateBySeferScore,
  } = await import(platformFeeUrl);

  const legacyLineage = inferAgreementSourceLineage({ id: 1, status: 'APPROVED' }, { legacy: true, agreementStatus: 'APPROVED' });
  expectPreview(legacyLineage, {
    sourceType: 'LEGACY',
    billableByMarketplacePolicy: false,
  }, 'legacy lineage stays non-billable');
  must(legacyLineage.lineageSummary, 'Legacy kayıt', 'legacy lineage summary names legacy source');

  const manualLineage = inferAgreementSourceLineage({ id: 2, status: 'APPROVED' }, { manualInternal: true, agreementStatus: 'APPROVED' });
  expectPreview(manualLineage, {
    sourceType: 'MANUAL_INTERNAL',
    billableByMarketplacePolicy: false,
  }, 'manual lineage stays non-billable');

  const pilotLineage = inferAgreementSourceLineage({ id: 3, status: 'APPROVED' }, { pilotFree: true, agreementStatus: 'APPROVED' });
  expectPreview(pilotLineage, {
    sourceType: 'PILOT_FREE',
    billableByMarketplacePolicy: false,
  }, 'pilot lineage stays non-billable');

  const orgPlanDraftLineage = inferAgreementSourceLineage(
    { id: 4, status: 'DRAFT', organizationPlanId: 91 },
    { agreementStatus: 'DRAFT', organizationPlanId: 91, sourceSummary: 'Plan #91' },
  );
  expectPreview(orgPlanDraftLineage, {
    sourceType: 'INSUFFICIENT_LINEAGE',
    billableByMarketplacePolicy: false,
  }, 'organization plan draft stays insufficient');

  const orgPlanApprovedLineage = inferAgreementSourceLineage(
    { id: 5, status: 'APPROVED', organizationPlanId: 92 },
    { agreementStatus: 'APPROVED', organizationPlanId: 92, sourceSummary: 'Plan #92' },
  );
  expectPreview(orgPlanApprovedLineage, {
    sourceType: 'EXISTING_IMPORTED',
    billableByMarketplacePolicy: false,
  }, 'organization plan approved stays imported');

  const sourceShiftLineage = inferAgreementSourceLineage(
    { id: 6, status: 'APPROVED', companyOfferAmount: 10000 },
    {
      agreementStatus: 'APPROVED',
      sourceType: 'SEFERPAKT_NEW',
      sourceShiftId: 52,
      sourceSummary: 'Kaynak vardiya #52',
      commercialSources: [{ id: 11, sourceType: 'SHIFT_SERIES', shiftRootId: 52 }],
      seferScoreValue: 4.8,
    },
  );
  expectPreview(sourceShiftLineage, {
    sourceType: 'SEFERPAKT_NEW',
    billableByMarketplacePolicy: true,
  }, 'source shift lineage is billable');
  must(sourceShiftLineage.lineageSummary, 'Kaynak vardiya #52', 'source shift lineage summary names origin');
  if (!hasBillableLineageSignal({
    sourceShiftId: 52,
    commercialSources: [{ id: 11, sourceType: 'SHIFT_SERIES', shiftRootId: 52 }],
  })) fail('source shift lineage helper should detect billable signal');
  ok('source shift lineage helper detects billable signal');
  if (!hasBillableSeferPaktLineage({
    sourceShiftId: 52,
    sourceType: 'SEFERPAKT_NEW',
    commercialSources: [{ id: 11, sourceType: 'SHIFT_SERIES', shiftRootId: 52 }],
  })) fail('source shift lineage helper should classify billable seferpakt lineage');
  ok('source shift lineage helper classifies billable seferpakt lineage');

  const selectedOfferLineage = inferAgreementSourceLineage(
    { id: 7, status: 'APPROVED', companyOfferAmount: 10000 },
    {
      agreementStatus: 'APPROVED',
      sourceType: 'SEFERPAKT_NEW',
      selectedOfferId: 88,
      sourceSummary: 'Seçili teklif #88',
      seferScoreValue: 4.4,
    },
  );
  expectPreview(selectedOfferLineage, {
    sourceType: 'SEFERPAKT_NEW',
    billableByMarketplacePolicy: true,
  }, 'selected offer lineage is billable');
  must(selectedOfferLineage.lineageSummary, 'Seçili teklif #88', 'selected offer lineage summary names offer');

  const marketShiftLineage = inferAgreementSourceLineage(
    { id: 8, status: 'APPROVED', companyOfferAmount: 10000 },
    {
      agreementStatus: 'APPROVED',
      sourceType: 'SEFERPAKT_NEW',
      marketShiftId: 77,
      sourceSummary: 'Market shift #77',
      commercialSources: [{ id: 12, sourceType: 'SHIFT_SERIES', shiftRootId: 77 }],
      seferScoreValue: 4.0,
    },
  );
  expectPreview(marketShiftLineage, {
    sourceType: 'SEFERPAKT_NEW',
    billableByMarketplacePolicy: true,
  }, 'market shift lineage is billable');

  const renewalLineage = inferAgreementSourceLineage(
    { id: 9, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    {
      agreementStatus: 'APPROVED',
      sourceType: 'SEFERPAKT_RENEWAL',
      sourceShiftId: 53,
      sourceSummary: 'Kaynak vardiya #53',
      commercialSources: [{ id: 13, sourceType: 'SHIFT_SERIES', shiftRootId: 53 }],
      seferScoreValue: 4.4,
      isRenewal: true,
    },
  );
  expectPreview(renewalLineage, {
    sourceType: 'SEFERPAKT_RENEWAL',
    billableByMarketplacePolicy: true,
  }, 'renewal lineage is billable');
  must(renewalLineage.lineageSummary, 'Kaynak vardiya #53', 'renewal lineage summary names origin');

  const directLineage = computePlatformFeePreview({
    agreement: { id: 10, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 54,
    sourceSummary: 'Kaynak vardiya #54',
    commercialSources: [{ id: 14, sourceType: 'SHIFT_SERIES', shiftRootId: 54 }],
    seferScoreValue: 4.8,
  });
  expectPreview(directLineage, {
    agreementSource: 'SEFERPAKT_NEW',
    previewOnly: true,
    licenseFee: 0,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
    successShareRate: 1,
    estimatedSuccessShare: 100,
  }, 'direct lineage preview remains billable readonly');
  must(directLineage.lineageSummary, 'Kaynak vardiya #54', 'direct lineage preview summary names origin');
  must(directLineage.sourceLineage?.lineageSummary || '', 'Kaynak vardiya #54', 'direct lineage preview carries source lineage');

  must(classifyAgreementSource({ sourceType: 'LEGACY', agreementStatus: 'APPROVED' }), 'LEGACY', 'classifier keeps legacy source type');
  must(classifyAgreementSource({ agreementStatus: 'APPROVED', organizationPlanId: 91 }), 'EXISTING_IMPORTED', 'classifier keeps org plan approved as imported');
  must(classifyAgreementSource({ agreementStatus: 'DRAFT', organizationPlanId: 91 }), 'INSUFFICIENT_LINEAGE', 'classifier keeps org plan draft as insufficient');
  must(buildAgreementLineageSummary({ sourceType: 'LEGACY' }), 'Legacy kayıt', 'summary helper names legacy source');
  must(buildMarketplaceFreeToOperateSummary(directLineage), 'Readonly önizleme', 'marketplace summary remains readonly');
  must(buildMarketplaceFreeToOperateSummary(orgPlanApprovedLineage), 'Readonly önizleme', 'marketplace summary keeps fallback readonly');

  const previewSummary = computePlatformFeePreview({
    agreement: { id: 11, status: 'APPROVED', companyOfferAmount: 1000, organizationPlanId: 92 },
    agreementStatus: 'APPROVED',
    organizationPlanId: 92,
  });
  expectPreview(previewSummary, {
    agreementSource: 'EXISTING_IMPORTED',
    licenseFee: 0,
    successShareRate: 0,
    estimatedSuccessShare: 0,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
  }, 'approved org plan stays non-billable');
  must(previewSummary.lineageSummary, 'mevcut/taşınmış kabul edilir', 'org plan preview summary explains fallback');

  const draftSummary = computePlatformFeePreview({
    agreement: { id: 12, status: 'DRAFT', companyOfferAmount: 1000, organizationPlanId: 91 },
    agreementStatus: 'DRAFT',
    organizationPlanId: 91,
  });
  expectPreview(draftSummary, {
    agreementSource: 'INSUFFICIENT_LINEAGE',
    licenseFee: 0,
    successShareRate: 0,
    estimatedSuccessShare: 0,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
  }, 'draft org plan stays insufficient');
  must(draftSummary.lineageSummary, 'Kaynak vardiya zinciri kanıtlanamadı', 'draft org plan summary explains insufficient lineage');

  const scoreChecks = [
    computeSuccessShareRateBySeferScore(4.8).rate,
    computeSuccessShareRateBySeferScore(4.4).rate,
    computeSuccessShareRateBySeferScore(4.0).rate,
    computeSuccessShareRateBySeferScore(3.5).rate,
    computeSuccessShareRateBySeferScore(3.0).rate,
  ];
  const renewalChecks = [
    computeSuccessShareRateBySeferScore(4.8, { renewal: true }).rate,
    computeSuccessShareRateBySeferScore(4.4, { renewal: true }).rate,
    computeSuccessShareRateBySeferScore(4.0, { renewal: true }).rate,
    computeSuccessShareRateBySeferScore(3.5, { renewal: true }).rate,
    computeSuccessShareRateBySeferScore(3.0, { renewal: true }).rate,
  ];
  if (!(scoreChecks[0] <= scoreChecks[1] && scoreChecks[1] <= scoreChecks[2] && scoreChecks[2] <= scoreChecks[3] && scoreChecks[3] <= scoreChecks[4])) {
    fail('new agreement rates stay monotonic by score');
  }
  if (!(renewalChecks[0] <= renewalChecks[1] && renewalChecks[1] <= renewalChecks[2] && renewalChecks[2] <= renewalChecks[3] && renewalChecks[3] <= renewalChecks[4])) {
    fail('renewal agreement rates stay monotonic by score');
  }
  ok('score bands stay monotonic');

  console.log('=== AGREEMENT-SOURCE-SHIFT-LINEAGE-01 CHECK PASS ===');
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

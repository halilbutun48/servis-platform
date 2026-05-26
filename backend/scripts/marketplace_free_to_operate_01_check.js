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
    const index = cursor + 1 + (match.index || 0);
    if (index <= cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = index;
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
  console.log('=== MARKETPLACE-FREE-TO-OPERATE-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const docs = read('docs/MARKETPLACE_FREE_TO_OPERATE_01.md');
  const serviceFile = read('backend/src/services/platformFeePreviewService.js');
  const routeFile = read('backend/src/routes/agreements.js');
  const cardFile = read('web/src/panels/shared/PlatformFeePreviewCard.jsx');
  const companyPanel = read('web/src/panels/company/AgreementsPanel.jsx');
  const roomPanel = read('web/src/panels/room/AgreementsPanel.jsx');
  const apiFile = read('web/src/api.js');
  const copilotFacts = read('web/src/utils/agreementCopilotFacts.js');
  const starterFacts = read('web/src/utils/copilotFacts.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');

  must(pkg, '"check:marketplacefreetooperate01": "node backend/scripts/marketplace_free_to_operate_01_check.js"', 'package.json exposes marketplace check');
  must(runner, 'check:marketplacefreetooperate01', 'product extensions runner includes marketplace check');
  ordered(runner, ['check:qltpaybridge01', 'check:seferscore01', 'check:marketplacefreetooperate01', 'check:pay01e'], 'product extensions order keeps marketplace between SeferScore and payment preview');
  must(guide, 'MARKETPLACE-FREE-TO-OPERATE-01', 'script guide mentions marketplace milestone');
  must(guide, 'check:marketplacefreetooperate01', 'script guide exposes marketplace check');
  must(docs, 'Lisanssız free-to-operate ticari model önizlemesi', 'marketplace doc explains readonly model');
  must(docs, 'Lisans ücreti', 'marketplace doc covers license fee');
  must(docs, 'Out of scope', 'marketplace doc lists out-of-scope boundaries');

  must(serviceFile, 'export function inferAgreementSourcePreview', 'platform fee service exposes lineage inference');
  must(serviceFile, 'export function computePlatformFeePreview', 'platform fee service exposes preview compute');
  must(serviceFile, 'licenseFee: 0', 'platform fee service keeps license fee at zero');
  must(serviceFile, 'previewOnly: true', 'platform fee service marks preview only');
  must(serviceFile, 'payableNow: false', 'platform fee service keeps payableNow false');
  must(serviceFile, 'canInvoice: false', 'platform fee service keeps canInvoice false');
  must(serviceFile, 'canCollect: false', 'platform fee service keeps canCollect false');
  must(serviceFile, 'Readonly önizleme — tahsilat/fatura oluşturulmaz.', 'platform fee service uses readonly boundary text');
  must(serviceFile, 'mevcut/taşınmış kayıt için başarı payı doğmaz', 'platform fee service blocks imported/manual/pilot share');
  must(serviceFile, 'SeferPakt kaynaklı', 'platform fee service explains seferpakt sources');

  must(routeFile, '/:id/platform-fee-preview', 'agreements route exposes readonly platform fee preview endpoint');
  must(routeFile, 'return res.json({ platformFeePreview })', 'agreements route returns platformFeePreview JSON');
  mustNot(routeFile, 'r.post("/:id/platform-fee-preview"', 'platform fee preview stays read-only');

  must(cardFile, 'Lisanssız free-to-operate ticari model önizlemesi', 'platform fee card headline present');
  must(cardFile, 'Readonly önizleme — tahsilat/fatura oluşturulmaz.', 'platform fee card readonly boundary present');
  must(cardFile, 'Mevcut sözleşmeden pay alınmaz', 'platform fee card states no pay on current contract');
  must(cardFile, 'Kaynak vardiya zinciri kanıtlanmıyorsa başarı payı doğmaz', 'platform fee card explains lineage fallback');

  must(companyPanel, 'getAgreementPlatformFeePreview', 'company agreements panel wires platform fee API');
  must(companyPanel, 'PlatformFeePreviewCard', 'company agreements panel renders platform fee card');
  must(roomPanel, 'getAgreementPlatformFeePreview', 'room agreements panel wires platform fee API');
  must(roomPanel, 'PlatformFeePreviewCard', 'room agreements panel renders platform fee card');
  must(apiFile, 'getAgreementPlatformFeePreview', 'web api exposes platform fee helper');
  must(copilotFacts, 'platformFeePreview', 'agreement copilot facts carry platform fee preview');
  must(starterFacts, 'isMarketplaceFreeToOperatePreview', 'starter chips detect marketplace preview');
  must(starterFacts, 'Lisans ücreti var mı?', 'starter chips ask license fee question');
  must(intentRouter, 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'intent router classifies marketplace preview');
  must(intentRouter, 'Lisans ücreti var mı?', 'intent router marketplace chips visible');
  must(answerPolicy, 'marketplaceFreeToOperateChips', 'answer policy exposes marketplace chips');
  must(answerPolicy, 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'answer policy routes marketplace topic');
  must(helpComposer, 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'help composer knows marketplace preview question type');
  must(helpComposer, 'Lisans ücreti 0 TL readonly önizlenir', 'help composer provides marketplace safety text');
  must(helpComposer, 'Readonly free-to-operate önizlemesini', 'help composer provides marketplace verification hint');

  const serviceUrl = pathToFileURL(path.join(root, 'backend/src/services/platformFeePreviewService.js')).href;
  const {
    computePlatformFeePreview,
    computeSuccessShareRateBySeferScore,
    buildMarketplaceFreeToOperateSummary,
  } = await import(serviceUrl);

  const existingImported = computePlatformFeePreview({
    agreement: { id: 1, status: 'APPROVED', companyOfferAmount: 1000 },
    agreementStatus: 'APPROVED',
  });
  expectPreview(existingImported, {
    previewOnly: true,
    licenseFee: 0,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
    successShareRate: 0,
    estimatedSuccessShare: 0,
  }, 'existing/imported stays zero share');

  const manual = computePlatformFeePreview({
    agreement: { id: 2, status: 'APPROVED', companyOfferAmount: 1000 },
    agreementStatus: 'APPROVED',
    manualInternal: true,
  });
  expectPreview(manual, { successShareRate: 0, estimatedSuccessShare: 0 }, 'manual internal stays zero share');

  const pilot = computePlatformFeePreview({
    agreement: { id: 3, status: 'APPROVED', companyOfferAmount: 1000 },
    agreementStatus: 'APPROVED',
    pilotFree: true,
  });
  expectPreview(pilot, { successShareRate: 0, estimatedSuccessShare: 0 }, 'pilot free stays zero share');

  const insufficient = computePlatformFeePreview({
    agreement: { id: 4, status: 'DRAFT', companyOfferAmount: 1000 },
    agreementStatus: 'DRAFT',
  });
  expectPreview(insufficient, { successShareRate: 0, estimatedSuccessShare: 0 }, 'insufficient lineage stays zero share');

  const newElite = computePlatformFeePreview({
    agreement: { id: 5, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 42,
    sourceSummary: 'Kaynak vardiya #42',
    commercialSources: [{ id: 1, sourceType: 'SHIFT_SERIES', shiftRootId: 42 }],
    seferScoreValue: 4.8,
  });
  expectPreview(newElite, {
    agreementSource: 'SEFERPAKT_NEW',
    previewOnly: true,
    licenseFee: 0,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
    successShareRate: 1,
    estimatedSuccessShare: 100,
  }, 'new agreement elite score => 1%');

  const newGood = computePlatformFeePreview({
    agreement: { id: 6, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 43,
    sourceSummary: 'Kaynak vardiya #43',
    commercialSources: [{ id: 2, sourceType: 'SHIFT_SERIES', shiftRootId: 43 }],
    seferScoreValue: 4.4,
  });
  expectPreview(newGood, {
    successShareRate: 1.5,
    estimatedSuccessShare: 150,
  }, 'new agreement good score => 1.5%');

  const newStandard = computePlatformFeePreview({
    agreement: { id: 7, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 44,
    sourceSummary: 'Kaynak vardiya #44',
    commercialSources: [{ id: 3, sourceType: 'SHIFT_SERIES', shiftRootId: 44 }],
    seferScoreValue: 4.0,
  });
  expectPreview(newStandard, {
    successShareRate: 2,
    estimatedSuccessShare: 200,
  }, 'new agreement standard score => 2%');

  const newRisky = computePlatformFeePreview({
    agreement: { id: 8, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 45,
    sourceSummary: 'Kaynak vardiya #45',
    commercialSources: [{ id: 4, sourceType: 'SHIFT_SERIES', shiftRootId: 45 }],
    seferScoreValue: 3.5,
  });
  expectPreview(newRisky, {
    successShareRate: 2.5,
    estimatedSuccessShare: 250,
  }, 'new agreement risky score => 2.5%');

  const newCritical = computePlatformFeePreview({
    agreement: { id: 9, status: 'APPROVED', companyOfferAmount: 10000 },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_NEW',
    sourceShiftId: 46,
    sourceSummary: 'Kaynak vardiya #46',
    commercialSources: [{ id: 5, sourceType: 'SHIFT_SERIES', shiftRootId: 46 }],
    seferScoreValue: 3.0,
  });
  expectPreview(newCritical, {
    successShareRate: 3,
    estimatedSuccessShare: 300,
    reviewRequired: true,
  }, 'new agreement critical score => 3% review');

  const renewalElite = computePlatformFeePreview({
    agreement: { id: 10, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_RENEWAL',
    sourceShiftId: 47,
    sourceSummary: 'Kaynak vardiya #47',
    commercialSources: [{ id: 6, sourceType: 'SHIFT_SERIES', shiftRootId: 47 }],
    seferScoreValue: 4.8,
    isRenewal: true,
  });
  expectPreview(renewalElite, {
    successShareRate: 1,
    estimatedSuccessShare: 100,
  }, 'renewal elite score => 1%');

  const renewalGood = computePlatformFeePreview({
    agreement: { id: 11, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_RENEWAL',
    sourceShiftId: 48,
    sourceSummary: 'Kaynak vardiya #48',
    commercialSources: [{ id: 7, sourceType: 'SHIFT_SERIES', shiftRootId: 48 }],
    seferScoreValue: 4.4,
    isRenewal: true,
  });
  expectPreview(renewalGood, {
    successShareRate: 1.25,
    estimatedSuccessShare: 125,
  }, 'renewal good score => 1.25%');

  const renewalStandard = computePlatformFeePreview({
    agreement: { id: 12, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_RENEWAL',
    sourceShiftId: 49,
    sourceSummary: 'Kaynak vardiya #49',
    commercialSources: [{ id: 8, sourceType: 'SHIFT_SERIES', shiftRootId: 49 }],
    seferScoreValue: 4.0,
    isRenewal: true,
  });
  expectPreview(renewalStandard, {
    successShareRate: 1.5,
    estimatedSuccessShare: 150,
  }, 'renewal standard score => 1.5%');

  const renewalRisky = computePlatformFeePreview({
    agreement: { id: 13, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_RENEWAL',
    sourceShiftId: 50,
    sourceSummary: 'Kaynak vardiya #50',
    commercialSources: [{ id: 9, sourceType: 'SHIFT_SERIES', shiftRootId: 50 }],
    seferScoreValue: 3.5,
    isRenewal: true,
  });
  expectPreview(renewalRisky, {
    successShareRate: 1.75,
    estimatedSuccessShare: 175,
  }, 'renewal risky score => 1.75%');

  const renewalCritical = computePlatformFeePreview({
    agreement: { id: 14, status: 'APPROVED', companyOfferAmount: 10000, extendStatus: 'PENDING' },
    agreementStatus: 'APPROVED',
    sourceType: 'SEFERPAKT_RENEWAL',
    sourceShiftId: 51,
    sourceSummary: 'Kaynak vardiya #51',
    commercialSources: [{ id: 10, sourceType: 'SHIFT_SERIES', shiftRootId: 51 }],
    seferScoreValue: 3.0,
    isRenewal: true,
  });
  expectPreview(renewalCritical, {
    successShareRate: 2,
    estimatedSuccessShare: 200,
    reviewRequired: true,
  }, 'renewal critical score => 2% review');

  must(buildMarketplaceFreeToOperateSummary(newElite), 'Readonly önizleme', 'summary helper keeps readonly wording');
  must(buildMarketplaceFreeToOperateSummary(existingImported), 'Readonly önizleme', 'summary helper keeps fallback wording');

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

  console.log('=== MARKETPLACE-FREE-TO-OPERATE-01 CHECK PASS ===');
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

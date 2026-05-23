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

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  if (needles.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNotAny(text, needles, label) {
  const haystack = normalize(text);
  if (needles.every((needle) => !haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function sectionBetween(text, startNeedle, endNeedle) {
  const haystack = String(text || '');
  const start = haystack.indexOf(startNeedle);
  if (start === -1) return '';
  const end = endNeedle ? haystack.indexOf(endNeedle, start + startNeedle.length) : -1;
  return end === -1 ? haystack.slice(start) : haystack.slice(start, end);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, last + 1);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== BOARDING-OPS-01A ROUTE IMPACT PREVIEW CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const docs = read('docs/BOARDING_OPS_01A_ROUTE_IMPACT_PREVIEW.md');

  const boardingUi = read('web/src/panels/shared/boardingChangeUi.js');
  const previewCard = read('web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx');
  const boardingHelper = read('backend/src/services/boardingRouteImpactPreview.js');
  const requestsRoute = read('backend/src/routes/requests.js');
  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const boardingFactsSection = sectionBetween(copilotFacts, 'export function buildBoardingRouteImpactCopilotFacts', 'export function buildMapFacts');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerQualityPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
  const drawer = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
  const companyOps = read('web/src/panels/company/OperationsPanel.jsx');
  const schoolOps = read('web/src/panels/school/OperationsPanel.jsx');
  const roomOps = read('web/src/panels/room/roomOperationsBoard.jsx');

  must(pkg, '"check:boardingops01a": "node backend/scripts/boarding_ops_01a_route_impact_preview_check.js"', 'package.json exposes check:boardingops01a');
  must(guide, 'BOARDING-OPS-01A', 'script guide mentions BOARDING-OPS-01A');
  must(guide, 'check:boardingops01a', 'script guide exposes check:boardingops01a');
  must(guide, 'BOARDING-OPS-01B', 'script guide mentions BOARDING-OPS-01B');
  must(guide, 'BOARDING-OPS-01C', 'script guide mentions BOARDING-OPS-01C');
  must(verifyChain, 'BOARDING-OPS-01A', 'verify chain mentions BOARDING-OPS-01A');
  must(verifyChain, 'check:boardingops01a', 'verify chain exposes check:boardingops01a');
  must(audit, 'BOARDING-OPS-01A', 'copilot audit mentions BOARDING-OPS-01A');
  must(audit, 'readonly önizleme', 'copilot audit keeps readonly preview wording');
  ordered(runner, ['check:copliveaccept01', 'check:boardingops01a', 'check:etasanity01'], 'product extensions runner keeps boarding ops order');
  must(docs, 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'boarding ops doc keeps readonly boundary');
  must(docs, 'StopAssignment', 'boarding ops doc mentions stop assignment boundary');
  must(docs, 'BOARDING-OPS-01B', 'boarding ops doc mentions BOARDING-OPS-01B');
  must(docs, 'BOARDING-OPS-01C', 'boarding ops doc mentions BOARDING-OPS-01C');

  must(boardingUi, 'NO_SERVICE_TODAY', 'boarding kind labels support NO_SERVICE_TODAY');
  must(boardingUi, 'ALTERNATE_STOP_TODAY', 'boarding kind labels support ALTERNATE_STOP_TODAY');
  must(boardingUi, 'TEMPORARY_BOARDING_NOTE', 'boarding kind labels support TEMPORARY_BOARDING_NOTE');

  must(boardingHelper, 'previewBoardingChangeRouteImpact', 'preview helper exists');
  must(boardingHelper, 'currentPeopleCount', 'preview helper returns currentPeopleCount');
  must(boardingHelper, 'previewPeopleCount', 'preview helper returns previewPeopleCount');
  must(boardingHelper, 'currentStopCount', 'preview helper returns currentStopCount');
  must(boardingHelper, 'previewStopCount', 'preview helper returns previewStopCount');
  must(boardingHelper, 'currentDistanceKm', 'preview helper returns currentDistanceKm');
  must(boardingHelper, 'previewDistanceKm', 'preview helper returns previewDistanceKm');
  must(boardingHelper, 'distanceDeltaKm', 'preview helper returns distanceDeltaKm');
  must(boardingHelper, 'currentDurationMin', 'preview helper returns currentDurationMin');
  must(boardingHelper, 'previewDurationMin', 'preview helper returns previewDurationMin');
  must(boardingHelper, 'durationDeltaMin', 'preview helper returns durationDeltaMin');
  must(boardingHelper, 'capacityImpact', 'preview helper returns capacityImpact');
  must(boardingHelper, 'reliability', 'preview helper returns reliability');
  must(boardingHelper, 'previewOnlyNote', 'preview helper returns previewOnlyNote');
  must(boardingHelper, 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'preview helper keeps readonly boundary');
  mustAny(boardingHelper, ['NO_SERVICE_TODAY', 'ALTERNATE_STOP_TODAY', 'TEMPORARY_BOARDING_NOTE'], 'preview helper supports boarding change types');
  mustAny(boardingHelper, ['ETA hesaplanamıyor', 'ETA güncel değil'], 'preview helper keeps safe ETA wording');
  mustNotAny(boardingHelper, ['OperationProof', 'raw technical', 'internal code'], 'preview helper blocks raw/internal language');

  must(previewCard, 'BoardingRouteImpactPreviewCard', 'preview card component exists');
  must(previewCard, 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'preview card keeps readonly boundary');
  must(previewCard, 'Km etkisi', 'preview card shows km effect');
  must(previewCard, 'Süre etkisi', 'preview card shows duration effect');
  must(previewCard, 'Kapasite', 'preview card shows capacity effect');
  must(previewCard, 'Güvenilirlik', 'preview card shows reliability');
  must(previewCard, 'Sıradaki önerilen işlem', 'preview card shows next action');
  mustNotAny(previewCard, ['OperationProof', 'raw technical', 'internal code'], 'preview card blocks raw/internal language');

  must(requestsRoute, 'REQUEST_SHIFT_PREVIEW_INCLUDE', 'requests route enriches shift preview include');
  must(requestsRoute, 'previewBoardingChangeRouteImpact', 'requests route calls preview helper');
  must(requestsRoute, 'routeImpactPreview', 'requests route returns routeImpactPreview');
  mustNotAny(requestsRoute, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'requests route blocks write actions and runtime-data');
  mustNotAny(requestsRoute, ['OperationProof', 'raw technical', 'internal code'], 'requests route blocks raw/internal language');

  must(copilotFacts, 'buildBoardingRouteImpactCopilotFacts', 'copilot facts exposes boarding preview builder');
  must(copilotFacts, 'BOARDING_ROUTE_IMPACT_PREVIEW', 'copilot facts declares boarding preview screen type');
  must(copilotFacts, 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'copilot facts keeps readonly boundary');
  mustAny(copilotFacts, ['ETA hesaplanamıyor', 'ETA güncel değil'], 'copilot facts keeps safe ETA wording');
  must(copilotFacts, 'Rota etkisini önizle', 'copilot facts exposes preview starter chips');
  mustNotAny(boardingFactsSection, ['OperationProof', 'raw technical', 'internal code'], 'copilot facts boarding preview blocks raw/internal language');

  must(helpComposer, 'BOARDING_ROUTE_IMPACT_PREVIEW', 'help composer knows boarding preview topic');
  must(helpComposer, 'Biniş değişikliği önizlemesi', 'help composer labels boarding preview topic');
  must(helpComposer, 'Bu sadece önizlemedir. Rota/atama uygulanmadı.', 'help composer keeps readonly boundary');
  must(helpComposer, 'Rota etkisini önizle', 'help composer keeps preview chips');
  mustNot(helpComposer, 'Bunu anlayamadım', 'help composer preview path avoids generic fallback');
  mustNotAny(helpComposer, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'help composer preview scope blocks write actions and runtime-data');
  mustNotAny(helpComposer, ['OperationProof', 'raw technical', 'internal code'], 'help composer blocks raw/internal language');

  must(intentRouter, 'BOARDING_ROUTE_IMPACT_PREVIEW', 'intent router knows boarding preview intent');
  must(intentRouter, 'Rota etkisini önizle', 'intent router exposes preview chips');
  must(intentRouter, 'Bu sadece önizleme mi?', 'intent router keeps preview confirmation chip');
  must(intentRouter, 'ASSIGNMENT_READINESS_GUIDE', 'intent router routes preview to readiness guide');
  mustNot(intentRouter, 'Bunu anlayamadım', 'intent router preview path avoids generic fallback');
  mustNotAny(intentRouter, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'intent router preview scope blocks write actions and runtime-data');
  mustNotAny(intentRouter, ['OperationProof', 'raw technical', 'internal code'], 'intent router blocks raw/internal language');

  must(answerQualityPolicy, 'BOARDING_ROUTE_IMPACT_PREVIEW', 'answer quality policy knows boarding preview topic');
  must(answerQualityPolicy, 'Rota etkisini önizle', 'answer quality policy keeps preview chips');
  mustNot(answerQualityPolicy, 'Bunu anlayamadım', 'answer quality policy preview path avoids generic fallback');
  mustNotAny(answerQualityPolicy, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'answer quality policy preview scope blocks write actions and runtime-data');
  mustNotAny(answerQualityPolicy, ['OperationProof', 'raw technical', 'internal code'], 'answer quality policy blocks raw/internal language');

  must(copilotPanel, 'selectedRecord', 'copilot panel keeps selectedRecord bridge');
  must(copilotPanel, 'contextSummary', 'copilot panel keeps contextSummary bridge');
  must(copilotPanel, 'liveFacts', 'copilot panel keeps liveFacts bridge');
  must(copilotPanel, 'selectedSummary', 'copilot panel keeps selectedSummary bridge');
  must(copilotPanel, 'selectedFields', 'copilot panel keeps selectedFields bridge');
  must(copilotPanel, 'selectedBadges', 'copilot panel keeps selectedBadges bridge');

  must(drawer, 'selectedRecord', 'drawer keeps selectedRecord bridge');
  must(drawer, 'contextSummary', 'drawer keeps contextSummary bridge');
  must(drawer, 'liveFacts', 'drawer keeps liveFacts bridge');
  must(drawer, 'selectedSummary', 'drawer keeps selectedSummary bridge');
  must(drawer, 'selectedFields', 'drawer keeps selectedFields bridge');
  must(drawer, 'selectedBadges', 'drawer keeps selectedBadges bridge');
  must(drawer, 'screenPath', 'drawer keeps screenPath bridge');

  must(companyOps, 'BoardingRouteImpactPreviewCard', 'company operations renders boarding preview card');
  must(companyOps, 'Rota etkisini önizle', 'company operations keeps preview button');
  must(companyOps, 'selectedPreviewSelection', 'company operations keeps preview selection bridge');
  must(companyOps, 'setCopilotSelection', 'company operations syncs Copilot selection');
  must(companyOps, 'screenPath', 'company operations carries screenPath');
  must(companyOps, 'selectedRecord', 'company operations carries selectedRecord');
  must(companyOps, 'liveFacts', 'company operations carries liveFacts');
  must(companyOps, 'contextSummary', 'company operations carries contextSummary');
  mustAny(companyOps, ['previewOnlyNote', 'Bu sadece önizlemedir.'], 'company operations keeps readonly preview boundary');
  mustNotAny(companyOps, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'company operations preview UI blocks write actions and runtime-data');

  must(schoolOps, 'BoardingRouteImpactPreviewCard', 'school operations renders boarding preview card');
  must(schoolOps, 'Rota etkisini önizle', 'school operations keeps preview button');
  must(schoolOps, 'selectedPreviewSelection', 'school operations keeps preview selection bridge');
  must(schoolOps, 'setCopilotSelection', 'school operations syncs Copilot selection');
  must(schoolOps, 'screenPath', 'school operations carries screenPath');
  must(schoolOps, 'selectedRecord', 'school operations carries selectedRecord');
  must(schoolOps, 'liveFacts', 'school operations carries liveFacts');
  must(schoolOps, 'contextSummary', 'school operations carries contextSummary');
  mustAny(schoolOps, ['previewOnlyNote', 'Bu sadece önizlemedir.'], 'school operations keeps readonly preview boundary');
  mustNotAny(schoolOps, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'school operations preview UI blocks write actions and runtime-data');

  must(roomOps, 'BoardingRouteImpactPreviewCard', 'room operations renders boarding preview card');
  must(roomOps, 'Rota etkisini önizle', 'room operations keeps preview button');
  mustNotAny(roomOps, ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'settlement execute', 'payment execute', 'prisma migration', 'runtime-data'], 'room operations preview UI blocks write actions and runtime-data');

  console.log('=== BOARDING-OPS-01A ROUTE IMPACT PREVIEW CHECK PASS ===');
}

main();

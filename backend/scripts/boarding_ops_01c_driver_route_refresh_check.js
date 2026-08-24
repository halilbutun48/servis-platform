#!/usr/bin/env node

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

function mustNotAny(text, needles, label) {
  const haystack = normalize(text);
  if ((Array.isArray(needles) ? needles : []).every((needle) => !haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function sectionBetween(text, startNeedle, endNeedle = '') {
  const haystack = String(text || '');
  const start = haystack.indexOf(startNeedle);
  if (start === -1) return '';
  if (!endNeedle) return haystack.slice(start);
  const end = haystack.indexOf(endNeedle, start + startNeedle.length);
  return end === -1 ? haystack.slice(start) : haystack.slice(start, end);
}

function main() {
  console.log('=== BOARDING-OPS-01C DRIVER ROUTE REFRESH CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const docs = read('docs/BOARDING_OPS_01C_DRIVER_ROUTE_REFRESH.md');

  const driverRoute = read('backend/src/routes/driver.js');
  const requestsRoute = read('backend/src/routes/requests.js');
  const boardingRouteRefresh = read('backend/src/services/boardingChangeRouteRefresh.js');
  const boardingApplication = read('backend/src/services/boardingChangeApplication.js');

  const todayPanel = read('web/src/panels/driver/TodayPanel.jsx');
  const routePanel = read('web/src/panels/driver/RoutePanel.jsx');

  const companyOps = read('web/src/panels/company/OperationsPanel.jsx');
  const schoolOps = read('web/src/panels/school/OperationsPanel.jsx');
  const roomBoard = read('web/src/panels/room/roomOperationsBoard.jsx');

  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const shiftFactsSection = sectionBetween(copilotFacts, 'export function buildShiftFacts', 'export function buildBoardingRouteImpactCopilotFacts');
  const boardingPreviewSection = sectionBetween(copilotFacts, 'export function buildBoardingRouteImpactCopilotFacts', 'export function buildMapFacts');
  const mapFactsSection = sectionBetween(copilotFacts, 'export function buildMapFacts', 'export function buildParentLiveNoVehicleFacts');
  const starterChipsSection = sectionBetween(copilotFacts, 'export function buildCopilotStarterChips', '');

  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const helpLeadSection = sectionBetween(helpComposer, 'const boardingRouteVisibilityLead', 'const topicAdvice = {');
  const helpAdviceSection = sectionBetween(helpComposer, 'const topicAdvice = {', 'const topicLabel = topicLabelForContext(activeTopic);');
  const helpSwitchSection = sectionBetween(helpComposer, "case 'BOARDING_CHANGE_APPLICATION':\n        result = hasNegative", "case 'PAYMENT_READINESS':");

  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');

  must(pkg, '"check:boardingops01c": "node backend/scripts/boarding_ops_01c_driver_route_refresh_check.js"', 'package.json exposes check:boardingops01c');
  assertProductExtensionsIncludes(
    'check:boardingops01c',
    'product extensions registry includes BOARDING-OPS-01C',
    registryScripts
  );
  must(guide, 'BOARDING-OPS-01C', 'script guide mentions BOARDING-OPS-01C');
  must(guide, 'check:boardingops01c', 'script guide exposes check:boardingops01c');
  must(audit, 'BOARDING-OPS-01C kapsam notu', 'copilot context audit keeps BOARDING-OPS-01C note');
  must(docs, 'BOARDING-OPS-01C - Applied boarding change → driver route refresh + mobile route update', 'boarding ops 01C doc title');
  must(docs, 'Driver / Bugün', 'boarding ops 01C doc keeps driver today scope');
  must(docs, 'Driver / Rota', 'boarding ops 01C doc keeps driver route scope');
  mustNotAny(docs, ['Driver / Harita'], 'boarding ops 01C doc does not require driver map scope');
  must(docs, 'SMS yok.', 'boarding ops 01C doc keeps SMS boundary');
  must(docs, 'Push notification yok.', 'boarding ops 01C doc keeps push boundary');
  must(docs, 'Runtime-data write yok.', 'boarding ops 01C doc keeps runtime-data boundary');
  must(docs, 'Kalıcı rota / durak / personel ataması değişmez.', 'boarding ops 01C doc keeps permanent assignment boundary');

  must(boardingRouteRefresh, 'VISIBLE', 'route refresh helper keeps visible state');
  must(boardingRouteRefresh, 'Sürücü rota ekranında görünür; SMS/push yok; kalıcı rota değişmez.', 'route refresh helper keeps safe visible wording');
  must(boardingRouteRefresh, 'Bu kayıt not olarak görünür; StopAssignment yazımı yok.', 'route refresh helper keeps note-only wording');

  must(boardingApplication, 'routeRefreshState', 'boarding application keeps route refresh state');
  must(boardingApplication, 'routeRefreshLabel', 'boarding application keeps route refresh label');
  must(boardingApplication, 'routeRefreshNote', 'boarding application keeps route refresh note');
  must(boardingApplication, 'BOARDING_CHANGE_APPLIED', 'boarding application keeps applied audit');
  must(boardingApplication, 'nextBestAction', 'boarding application keeps next best action');
  mustNotAny(boardingApplication, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration', 'createStopAssignment', 'updateStopAssignment'], 'boarding application blocks write actions and migration');

  must(driverRoute, 'boardingChangeEffects', 'driver route response exposes boardingChangeEffects');
  must(driverRoute, 'boardingChangeSummary', 'driver route response exposes boardingChangeSummary');
  must(driverRoute, 'routeRefresh', 'driver route response exposes routeRefresh');
  must(driverRoute, 'routeNotice', 'driver route response exposes routeNotice');
  must(driverRoute, 'routeRefreshState: "VISIBLE"', 'driver route response can mark visible route refresh');
  mustNotAny(driverRoute, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration', 'createStopAssignment', 'updateStopAssignment', 'permanent stop update'], 'driver route blocks write actions');

  must(requestsRoute, 'boardingChangeRouteRefreshState', 'requests route returns route refresh state');
  must(requestsRoute, 'boardingChangeRouteRefreshLabel', 'requests route returns route refresh label');
  must(requestsRoute, 'boardingChangeRouteRefreshNote', 'requests route returns route refresh note');
  must(requestsRoute, 'boarding-change-applied', 'requests route keeps boarding change applied signal');
  mustNotAny(requestsRoute, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration', 'createStopAssignment', 'updateStopAssignment'], 'requests route blocks write actions');

  must(todayPanel, 'Günlük Biniş Değişiklikleri', 'driver today panel shows boarding change card');
  must(todayPanel, 'Bu sadece günlük atama etkisidir. Kalıcı rota değişmez.', 'driver today panel keeps daily-only boundary');
  must(todayPanel, 'boardingChangeEffects', 'driver today panel reads boardingChangeEffects');
  must(todayPanel, 'routeRefreshState', 'driver today panel reads routeRefreshState');
  must(todayPanel, 'routeRefreshNote', 'driver today panel reads routeRefreshNote');
  mustNotAny(todayPanel, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration'], 'driver today panel blocks write actions');

  must(routePanel, 'Günlük Biniş Değişiklikleri', 'driver route panel shows boarding change card');
  must(routePanel, 'Bu sadece günlük atama etkisidir. Sürücü rotası henüz kalıcı olarak değişmez.', 'driver route panel keeps daily-only boundary');
  must(routePanel, 'boardingChangeEffects', 'driver route panel reads boardingChangeEffects');
  must(routePanel, 'routeRefreshState', 'driver route panel reads routeRefreshState');
  must(routePanel, 'routeRefreshNote', 'driver route panel reads routeRefreshNote');
  mustNotAny(routePanel, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration'], 'driver route panel blocks write actions');

  must(shiftFactsSection, 'Günlük değişiklik:', 'shift facts keeps boarding change status');
  must(shiftFactsSection, 'Rota güncellemesi:', 'shift facts keeps route refresh status');
  must(shiftFactsSection, 'Sürücü rota ekranında görünürlüğü doğrula.', 'shift facts keeps route visibility next action');
  must(shiftFactsSection, 'boardingRouteRefresh', 'shift facts keeps route refresh signal');
  mustNotAny(shiftFactsSection, ['Bunu anlayamadım', 'raw technical', 'internal code'], 'shift facts blocks generic fallback and raw/internal language');

  must(boardingPreviewSection, 'Sürücü rota ekranında görünürlüğü doğrula.', 'boarding preview keeps route visibility next action');
  must(boardingPreviewSection, 'Rota güncellemesi', 'boarding preview keeps route refresh signal');
  must(boardingPreviewSection, 'Sürücü rotası henüz yenilenmedi.', 'boarding preview keeps route boundary');
  must(boardingPreviewSection, 'Bu işlem sadece günlük atama etkisi uygular. Sürücü rotası yenilenmez.', 'boarding preview keeps daily-only boundary');
  mustNotAny(boardingPreviewSection, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code'], 'boarding preview blocks generic fallback and raw/internal language');

  must(mapFactsSection, 'Günlük değişiklik:', 'map facts keeps boarding change status');
  must(mapFactsSection, 'Rota güncellemesi:', 'map facts keeps route refresh status');
  must(mapFactsSection, 'Sürücü rota ekranında görünürlüğü doğrula.', 'map facts keeps route visibility next action');
  must(mapFactsSection, 'boardingRouteRefresh', 'map facts keeps route refresh signal');
  mustNotAny(mapFactsSection, ['Bunu anlayamadım', 'raw technical', 'internal code'], 'map facts blocks generic fallback and raw/internal language');

  must(starterChipsSection, 'Sürücü rota ekranında görünür mü?', 'starter chips expose route visibility question');
  must(starterChipsSection, 'Rota güncellemesi bekliyor mu?', 'starter chips expose refresh pending question');
  must(starterChipsSection, 'Sürücüye gönderildi mi?', 'starter chips expose send-status question');
  must(starterChipsSection, 'Bu sadece günlük atama mı?', 'starter chips keep daily-only boundary');
  mustNotAny(starterChipsSection, ['OperationProof', 'raw technical', 'internal code'], 'starter chips block raw/internal language');

  must(helpLeadSection, 'Bu değişiklik günlük atamaya işlendiğinde sürücü rota ekranında görünür.', 'help composer keeps driver route visibility lead');
  must(helpLeadSection, 'Rota güncellemesi bekliyor olabilir', 'help composer keeps route update pending wording');
  must(helpLeadSection, 'kalıcı rota değişmez', 'help composer keeps permanent-route boundary');
  mustNotAny(helpLeadSection, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code'], 'help composer lead section blocks generic fallback and raw/internal language');

  must(helpAdviceSection, 'Bu değişiklik kabul edilmişse günlük atamaya işlenebilir; sürücü rotası yenilenmez.', 'help composer keeps route visibility next action');
  must(helpAdviceSection, 'BOARDING_CHANGE_APPLICATION', 'help composer keeps boarding application topic advice');
  mustNotAny(helpAdviceSection, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code'], 'help composer advice section blocks generic fallback and raw/internal language');

  must(helpSwitchSection, 'sürücü rota ekranında görünmesi için uygulama bekliyor olabilir', 'help composer switch keeps route visibility wording');
  must(helpSwitchSection, 'kalıcı rota değişmez', 'help composer switch keeps permanent-route boundary');
  must(helpSwitchSection, 'Kabul durumu, günlük atama etkisi ve sürücü rota görünürlüğü', 'help composer switch keeps 01C control text');
  mustNotAny(helpSwitchSection, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code'], 'help composer switch blocks generic fallback and raw/internal language');

  must(intentRouter, 'sürücü rota ekranında görünür', 'intent router keeps driver route visibility wording');
  must(intentRouter, 'rota güncellemesi bekliyor', 'intent router keeps route update pending wording');
  must(intentRouter, 'günlük değişiklik rotada görünüyor', 'intent router keeps route visible wording');
  must(intentRouter, 'driver route refresh', 'intent router keeps driver route refresh wording');
  must(intentRouter, 'mobile route update', 'intent router keeps mobile route update wording');
  must(intentRouter, 'sürücüye gönderildi mi', 'intent router keeps send-status wording');
  must(intentRouter, 'ASSIGNMENT_READINESS_GUIDE', 'intent router keeps assignment readiness guide routing');
  mustNotAny(intentRouter, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code', 'sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration'], 'intent router blocks generic fallback, raw/internal language and write actions');

  must(answerPolicy, 'Sürücü rota ekranında görünür mü?', 'answer policy keeps driver route visibility chip');
  must(answerPolicy, 'Rota güncellemesi bekliyor mu?', 'answer policy keeps route refresh pending chip');
  must(answerPolicy, 'Sürücüye gönderildi mi?', 'answer policy keeps send-status chip');
  must(answerPolicy, 'Bu sadece günlük atama mı?', 'answer policy keeps daily-only boundary chip');
  must(answerPolicy, 'BOARDING_CHANGE_APPLICATION', 'answer policy keeps boarding application topic');
  mustNotAny(answerPolicy, ['Bunu anlayamadım', 'OperationProof', 'raw technical', 'internal code', 'sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration'], 'answer policy blocks generic fallback, raw/internal language and write actions');

  must(companyOps, 'boardingChangeRouteRefreshLabel', 'company operations keeps route refresh label support');
  must(companyOps, 'boardingChangeRouteRefreshNote', 'company operations keeps route refresh note support');
  must(schoolOps, 'boardingChangeRouteRefreshLabel', 'school operations keeps route refresh label support');
  must(schoolOps, 'boardingChangeRouteRefreshNote', 'school operations keeps route refresh note support');
  must(roomBoard, 'boardingChangeRouteRefreshLabel', 'room board keeps route refresh label support');
  must(roomBoard, 'boardingChangeRouteRefreshNote', 'room board keeps route refresh note support');

  mustNotAny(
    [
      todayPanel,
      routePanel,
      routePanel,
      driverRoute,
      requestsRoute,
      boardingRouteRefresh,
      boardingApplication,
    ].join('\n'),
    ['createStopAssignment', 'updateStopAssignment', 'route.apply', 'sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data'],
    '01C scope blocks write actions and runtime-data',
  );

  console.log('Checked driver surfaces: Bugün / Rota + status bridges in Company / School / Room.');
  console.log('Route-refresh boundary checked: visible for applied daily changes, not permanent, no SMS/push.');
  console.log('=== BOARDING-OPS-01C DRIVER ROUTE REFRESH CHECK PASS ===');
}

main();

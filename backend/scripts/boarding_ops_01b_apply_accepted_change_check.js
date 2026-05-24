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

function mustNotAny(text, needles, label) {
  const haystack = normalize(text);
  const values = Array.isArray(needles) ? needles : [];
  if (values.every((needle) => !haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function main() {
  console.log('=== BOARDING-OPS-01B APPLY ACCEPTED CHANGE CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const doc = read('docs/BOARDING_OPS_01B_ACCEPTED_CHANGE_APPLICATION.md');

  const service = read('backend/src/services/boardingChangeApplication.js');
  const requestsRoute = read('backend/src/routes/requests.js');
  const previewHelper = read('backend/src/services/boardingRouteImpactPreview.js');

  const uiHelper = read('web/src/panels/shared/boardingChangeUi.js');
  const companyOps = read('web/src/panels/company/OperationsPanel.jsx');
  const schoolOps = read('web/src/panels/school/OperationsPanel.jsx');
  const roomBoard = read('web/src/panels/room/roomOperationsBoard.jsx');
  const roomHealth = read('web/src/panels/room/OperationHealthPanel.jsx');

  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');

  must(pkg, '"check:boardingops01b": "node backend/scripts/boarding_ops_01b_apply_accepted_change_check.js"', 'package.json exposes check:boardingops01b');
  must(runner, 'check:boardingops01b', 'product extensions runner includes BOARDING-OPS-01B');
  must(verifyChain, 'check:boardingops01b', 'verify chain includes BOARDING-OPS-01B');
  must(guide, 'BOARDING-OPS-01B', 'script guide mentions BOARDING-OPS-01B');
  must(guide, 'check:boardingops01b', 'script guide exposes check:boardingops01b');
  must(auditDoc, 'BOARDING-OPS-01B kapsam notu', 'copilot context audit keeps BOARDING-OPS-01B note');
  must(doc, 'BOARDING-OPS-01B - Accepted boarding change → StopAssignment güvenli uygulama taslağı', 'boarding ops 01B doc title');
  must(doc, 'POST /api/requests/:id/apply-boarding-change', 'boarding ops 01B doc keeps explicit apply endpoint');
  must(doc, 'NO_SERVICE_TODAY', 'boarding ops 01B doc keeps NO_SERVICE_TODAY');
  must(doc, 'ALTERNATE_STOP_TODAY', 'boarding ops 01B doc keeps ALTERNATE_STOP_TODAY');
  must(doc, 'TEMPORARY_BOARDING_NOTE', 'boarding ops 01B doc keeps TEMPORARY_BOARDING_NOTE');
  must(doc, 'Idempotent', 'boarding ops 01B doc keeps idempotency note');
  must(doc, 'Audit', 'boarding ops 01B doc keeps audit note');
  must(doc, 'BOARDING-OPS-01C', 'boarding ops 01B doc references BOARDING-OPS-01C');
  must(doc, 'StopAssignment', 'boarding ops 01B doc mentions StopAssignment');
  must(doc, 'Driver route refresh yok.', 'boarding ops 01B doc keeps driver refresh boundary');
  must(doc, 'SMS / notification yok.', 'boarding ops 01B doc keeps sms/notification boundary');
  must(doc, 'Payment / settlement execute yok.', 'boarding ops 01B doc keeps payment/settlement boundary');
  must(doc, 'Schema / migration yok.', 'boarding ops 01B doc keeps schema/migration boundary');
  must(doc, 'Runtime-data dosyalarına dokunulmaz.', 'boarding ops 01B doc keeps runtime-data boundary');

  must(service, 'applyAcceptedBoardingChange', 'boarding change application service exists');
  must(service, 'REQUEST_NOT_ACCEPTED', 'application service accepts only accepted requests');
  must(service, 'previewBoardingChangeRouteImpact', 'application service reuses 01A preview helper');
  must(service, 'NO_SERVICE_TODAY', 'application service supports NO_SERVICE_TODAY');
  must(service, 'ALTERNATE_STOP_TODAY', 'application service supports ALTERNATE_STOP_TODAY');
  must(service, 'TEMPORARY_BOARDING_NOTE', 'application service supports TEMPORARY_BOARDING_NOTE');
  must(service, 'NOTE_ONLY', 'application service keeps note-only state');
  must(service, 'BOARDING_CHANGE_APPLIED', 'application service writes boarding change applied audit');
  must(service, 'auditLog.create', 'application service writes audit event');
  must(service, 'applyAudit?.meta', 'application service keeps idempotency guard');
  must(service, 'nextBestAction', 'application service returns next best action');
  must(service, 'applicationBoundaryNote', 'application service returns boundary note');
  mustNotAny(service, ['sendSms', 'sendNotification', 'driverRouteRefresh', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data', 'deleteMany('], 'application service blocks notifications, payment and bulk delete paths');
  mustNotAny(service, ['OperationProof', 'raw technical', 'internal code'], 'application service blocks raw/internal language');

  must(requestsRoute, 'POST /:id/apply-boarding-change', 'requests route exposes explicit apply endpoint');
  must(requestsRoute, 'applyAcceptedBoardingChange', 'requests route calls application service');
  must(requestsRoute, 'requireStepUpWrite', 'requests route keeps step-up write gate');
  must(requestsRoute, 'requireRole("COMPANY", "ROOM", "SUPER_ADMIN")', 'requests route keeps role gate');
  must(requestsRoute, 'boardingChangeApplicationStatus', 'requests route returns application status');
  must(requestsRoute, 'boardingChangeApplicationBoundaryNote', 'requests route returns application boundary note');
  must(requestsRoute, 'previewBoardingChangeRouteImpact', 'requests route keeps preview helper');
  mustNotAny(requestsRoute, ['sendSms', 'sendNotification', 'driverRouteRefresh', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data'], 'requests route blocks notifications, payment and runtime-data');

  must(previewHelper, 'previewBoardingChangeRouteImpact', 'preview helper remains available');
  must(previewHelper, 'NO_SERVICE_TODAY', 'preview helper still supports NO_SERVICE_TODAY');
  must(previewHelper, 'ALTERNATE_STOP_TODAY', 'preview helper still supports ALTERNATE_STOP_TODAY');
  must(previewHelper, 'TEMPORARY_BOARDING_NOTE', 'preview helper still supports TEMPORARY_BOARDING_NOTE');

  must(uiHelper, 'boardingChangeApplyButtonLabel', 'UI helper keeps apply button label');
  must(uiHelper, 'boardingChangeApplyBoundaryNote', 'UI helper keeps boundary note label');
  must(uiHelper, 'boardingChangeApplySuccessNote', 'UI helper keeps success note label');
  must(uiHelper, 'boardingChangeApplicationStatusLabel', 'UI helper keeps application status label');
  must(uiHelper, 'NOTE_ONLY', 'UI helper maps note-only status');

  must(companyOps, 'Kabul edilen değişiklikler', 'company operations keeps accepted changes section');
  must(companyOps, 'boardingChangeApplyButtonLabel', 'company operations keeps apply button label');
  must(companyOps, 'boardingChangeApplyBoundaryNote', 'company operations keeps boundary note');
  must(companyOps, 'boardingChangeApplySuccessNote', 'company operations keeps success note fallback');
  must(companyOps, 'boardingChangeApplicationStatusLabel', 'company operations keeps application status label');
  must(companyOps, 'apply-boarding-change', 'company operations can apply accepted change');
  must(companyOps, 'result?.applicationBoundaryNote || result?.applicationText', 'company operations reads result text for notice');

  must(schoolOps, 'Kabul edilen değişiklikler', 'school operations keeps accepted changes section');
  must(schoolOps, 'boardingChangeApplyButtonLabel', 'school operations keeps apply button label');
  must(schoolOps, 'boardingChangeApplyBoundaryNote', 'school operations keeps boundary note');
  must(schoolOps, 'boardingChangeApplySuccessNote', 'school operations keeps success note fallback');
  must(schoolOps, 'boardingChangeApplicationStatusLabel', 'school operations keeps application status label');
  must(schoolOps, 'apply-boarding-change', 'school operations can apply accepted change');
  must(schoolOps, 'result?.applicationBoundaryNote || result?.applicationText', 'school operations reads result text for notice');

  must(roomBoard, 'Kabul edilen değişiklikler', 'room board keeps accepted changes section');
  must(roomBoard, 'boardingChangeApplyButtonLabel', 'room board keeps apply button label');
  must(roomBoard, 'boardingChangeApplyBoundaryNote', 'room board keeps boundary note');
  must(roomBoard, 'boardingChangeApplicationStatusLabel', 'room board keeps application status label');
  must(roomBoard, 'onApplyAcceptedRequest', 'room board can delegate application action');

  must(roomHealth, 'apply-boarding-change', 'room health can trigger accepted change application');
  must(roomHealth, 'result?.applicationBoundaryNote || result?.applicationText', 'room health reads result text for notice');
  must(roomHealth, 'boardingChangeApplySuccessNote', 'room health keeps success note fallback');

  must(copilotFacts, 'BOARDING_CHANGE_APPLICATION', 'copilot facts exposes boarding application screen type');
  must(copilotFacts, 'BOARDING_APPLICATION_STATUS_LABELS', 'copilot facts keeps boarding application status labels');
  must(copilotFacts, 'NOTE_ONLY', 'copilot facts keeps note-only label');
  must(copilotFacts, 'Bu değişiklik uygulamaya hazır mı?', 'copilot facts keeps application starter chip');
  must(copilotFacts, 'Günlük atamaya işlenir mi?', 'copilot facts keeps application starter chip');
  must(copilotFacts, 'Sürücü rotası yenilenir mi?', 'copilot facts keeps application starter chip');
  must(copilotFacts, 'Bu sadece günlük atama mı?', 'copilot facts keeps application starter chip');
  must(copilotFacts, 'ETA hesaplanamıyor', 'copilot facts keeps safe ETA wording');
  must(copilotFacts, 'ETA güncel değil', 'copilot facts keeps safe ETA wording');
  mustNotAny(copilotFacts, ['raw technical', 'internal code'], 'copilot facts blocks raw/internal language');

  must(helpComposer, 'BOARDING_CHANGE_APPLICATION', 'help composer understands boarding application topic');
  must(helpComposer, 'Kabul edilen değişiklik / günlük atama', 'help composer labels boarding application topic');
  must(helpComposer, 'Bu değişiklik kabul edilmişse günlük atamaya işlenebilir; sürücü rotası yenilenmez.', 'help composer keeps application boundary text');
  must(helpComposer, 'Sürücü rotası yenilenmez.', 'help composer keeps route refresh boundary');
  mustNotAny(helpComposer, ['OperationProof', 'raw technical', 'internal code', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data'], 'help composer blocks raw/internal and write actions');

  must(intentRouter, 'BOARDING_CHANGE_APPLICATION', 'intent router routes boarding application questions');
  must(intentRouter, 'kabul edilen değişikliği uygula', 'intent router keeps application phrase');
  must(intentRouter, 'günlük atamaya işlenebilir', 'intent router keeps daily-attribution wording');
  must(intentRouter, 'Sürücü rotası yenilenmez', 'intent router keeps route refresh boundary wording');
  must(intentRouter, 'ASSIGNMENT_READINESS_GUIDE', 'intent router routes to assignment readiness guide');
  mustNotAny(intentRouter, ['sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data', 'OperationProof'], 'intent router blocks write actions and raw/internal language');

  must(answerPolicy, 'BOARDING_CHANGE_APPLICATION', 'answer policy understands boarding application topic');
  must(answerPolicy, 'Bu değişiklik uygulamaya hazır mı?', 'answer policy keeps application chips');
  must(answerPolicy, 'Günlük atamaya işlenir mi?', 'answer policy keeps daily-attribution chip');
  must(answerPolicy, 'Sürücü rotası yenilenir mi?', 'answer policy keeps route refresh chip');
  must(answerPolicy, 'Bu sadece günlük atama mı?', 'answer policy keeps note-only chip');
  mustNotAny(answerPolicy, ['OperationProof', 'raw technical', 'internal code', 'sendSms', 'sendNotification', 'payment execute', 'settlement execute', 'prisma migration', 'runtime-data'], 'answer policy blocks raw/internal and write actions');

  console.log('Accepted boarding-change application scope: 1 explicit route, 1 service, 3 UI surfaces, 4 Copilot context files, 1 doc, and chain registrations.');
  console.log('Forbidden signals checked: SMS / notification / driver refresh / route refresh / payment execute / settlement execute / runtime-data / migration / raw internal codes.');
  console.log('=== BOARDING-OPS-01B APPLY ACCEPTED CHANGE CHECK PASS ===');
}

main();

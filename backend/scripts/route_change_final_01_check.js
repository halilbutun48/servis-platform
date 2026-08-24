#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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
  const list = Array.isArray(needles) ? needles : [];
  if (list.some((needle) => haystack.includes(normalize(needle)))) {
    fail(label);
  }
  ok(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of (Array.isArray(needles) ? needles : [])) {
    const idx = haystack.indexOf(normalize(needle), cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + normalize(needle).length;
  }
  ok(label);
}

function main() {
  console.log('=== ROUTE-CHANGE-FINAL-01 CHECK ===');

  const pkg = read('package.json');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const audit = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const doc = read('docs/ROUTE_CHANGE_FINAL_01.md');
  const companySection = read('web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx');
  const companyPanel = read('web/src/panels/company/AgreementsPanel.jsx');
  const roomPanel = read('web/src/panels/room/AgreementsPanel.jsx');
  const roomSections = read('web/src/panels/room/roomAgreementsPanelSections.jsx');
  const sharedCard = read('web/src/panels/shared/AgreementRouteChangePreviewCard.jsx');
  const agreementFacts = read('web/src/utils/agreementCopilotFacts.js');
  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerQualityPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const goldenPack = read('backend/src/ai/chat/goldenQuestionPack.js');

  must(pkg, '"check:routechangefinal01": "node backend/scripts/route_change_final_01_check.js"', 'package.json exposes check:routechangefinal01');
  must(guide, 'ROUTE-CHANGE-FINAL-01', 'script guide mentions ROUTE-CHANGE-FINAL-01');
  must(guide, 'check:routechangefinal01', 'script guide exposes check:routechangefinal01');
  must(guide, 'Company / Sözleşmeler', 'script guide mentions company agreements route change final');
  must(guide, 'Room / Sözleşmeler', 'script guide mentions room agreements route change final');
  must(guide, 'driver route refresh bu milestone kapsamı dışındadır', 'script guide keeps driver refresh out of scope');
  must(audit, 'ROUTE-CHANGE-FINAL-01 kapsam notu', 'copilot audit mentions route final scope');
  must(audit, 'Company / Sözleşmeler', 'copilot audit mentions company agreements');
  must(audit, 'Room / Sözleşmeler', 'copilot audit mentions room agreements');
  must(audit, 'driver route refresh bu milestone kapsamında değildir', 'copilot audit keeps driver refresh out of scope');
  assertProductExtensionsOrder([
    'check:boardingops01c',
    'check:routechangefinal01',
    'check:etasanity01',
  ], 'product extensions registry order around route final', registryScripts);
  must(verify, 'check:routechangefinal01', 'verify chain exposes route final gate');
  must(verify, 'ROUTE-CHANGE-FINAL-01', 'verify chain mentions route final milestone');
  must(companySection, 'AgreementRouteChangePreviewCard', 'company route refresh section uses shared preview card');
  must(companySection, 'Bu sadece teklif / önizleme; rota uygulanmadı.', 'company route refresh section keeps readonly boundary');
  must(companySection, 'Eski rota', 'company route refresh section labels old route');
  must(companySection, 'Yeni rota', 'company route refresh section labels new route');
  must(companySection, 'Kişi / durak / km / süre farkı', 'company route refresh section shows person/stop/km/duration diff');
  must(companyPanel, 'routeRefreshState', 'company agreements panel passes routeRefreshState');
  must(companyPanel, 'routeRefreshRequestId', 'company agreements panel passes routeRefreshRequestId');
  must(companyPanel, 'routeRefreshLabel', 'company agreements panel passes routeRefreshLabel');
  must(companyPanel, 'routeRefreshNote', 'company agreements panel passes routeRefreshNote');
  must(companyPanel, 'routeRefreshCurrentText', 'company agreements panel passes routeRefreshCurrentText');
  must(companyPanel, 'routeRefreshProposedText', 'company agreements panel passes routeRefreshProposedText');
  must(companyPanel, 'routeRefreshDiffText', 'company agreements panel passes routeRefreshDiffText');
  must(companyPanel, 'routeRefreshPriceImpactText', 'company agreements panel passes routeRefreshPriceImpactText');
  must(companyPanel, 'routeRefreshRoomCounterText', 'company agreements panel passes routeRefreshRoomCounterText');
  must(companyPanel, 'routeRefreshSummaryText', 'company agreements panel passes routeRefreshSummaryText');
  must(roomPanel, 'routeRefreshState', 'room agreements panel passes routeRefreshState');
  must(roomPanel, 'routeRefreshRequestId', 'room agreements panel passes routeRefreshRequestId');
  must(roomPanel, 'routeRefreshLabel', 'room agreements panel passes routeRefreshLabel');
  must(roomPanel, 'routeRefreshNote', 'room agreements panel passes routeRefreshNote');
  must(roomPanel, 'routeRefreshCurrentText', 'room agreements panel passes routeRefreshCurrentText');
  must(roomPanel, 'routeRefreshProposedText', 'room agreements panel passes routeRefreshProposedText');
  must(roomPanel, 'routeRefreshDiffText', 'room agreements panel passes routeRefreshDiffText');
  must(roomPanel, 'routeRefreshPriceImpactText', 'room agreements panel passes routeRefreshPriceImpactText');
  must(roomPanel, 'routeRefreshRoomCounterText', 'room agreements panel passes routeRefreshRoomCounterText');
  must(roomPanel, 'routeRefreshSummaryText', 'room agreements panel passes routeRefreshSummaryText');
  must(roomSections, 'AgreementRouteChangePreviewCard', 'room route refresh sections use shared preview card');
  must(roomSections, 'Tekrar Kontrol', 'room route refresh pending card shows recheck action');
  must(roomSections, 'Reddet', 'room route refresh pending card shows reject action');
  must(roomSections, 'Karşı Teklifi Kabul Et', 'room route refresh pending card shows accept counter action');
  must(roomSections, 'Önceki rota', 'room route refresh accepted card labels previous route');
  must(roomSections, 'Uygulanan yeni rota', 'room route refresh accepted card labels applied route');
  mustNotAny(roomSections, ['RouteRefreshCommercialBox'], 'room route refresh sections removed duplicate commercial box');
  must(sharedCard, 'diffLabel', 'shared route change card supports diff label');
  must(sharedCard, 'priceLabel', 'shared route change card supports price label');
  must(sharedCard, 'boundaryNote', 'shared route change card supports boundary note');
  must(sharedCard, 'currentPreviewButtonLabel', 'shared route change card supports current preview label');
  must(sharedCard, 'proposedPreviewButtonLabel', 'shared route change card supports proposed preview label');
  must(sharedCard, 'actions = null', 'shared route change card supports action slot');
  must(agreementFacts, 'routeRefreshState', 'agreement copilot facts expose routeRefreshState');
  must(agreementFacts, 'routeRefreshLabel', 'agreement copilot facts expose routeRefreshLabel');
  must(agreementFacts, 'routeRefreshNote', 'agreement copilot facts expose routeRefreshNote');
  must(agreementFacts, 'routeRefreshSummaryText', 'agreement copilot facts expose routeRefreshSummaryText');
  must(agreementFacts, 'routeRefreshCurrentText', 'agreement copilot facts expose routeRefreshCurrentText');
  must(agreementFacts, 'routeRefreshProposedText', 'agreement copilot facts expose routeRefreshProposedText');
  must(agreementFacts, 'routeRefreshDiffText', 'agreement copilot facts expose routeRefreshDiffText');
  must(agreementFacts, 'routeRefreshPriceImpactText', 'agreement copilot facts expose routeRefreshPriceImpactText');
  must(agreementFacts, 'routeRefreshRoomCounterText', 'agreement copilot facts expose routeRefreshRoomCounterText');
  must(copilotFacts, 'Bu sözleşmede rota değişikliği var mı?', 'copilot starter chips include route final prompt');
  must(copilotFacts, 'Room’a rota güncelleme talebi gitti mi?', 'copilot starter chips include room route request prompt');
  must(helpComposer, 'AGREEMENT_ROUTE_REFRESH', 'help composer knows route final intent');
  must(helpComposer, 'Bu sözleşmedeki rota değişikliği talebi eski rota, yeni rota ve teklif/kabul durumuyla birlikte okunur.', 'help composer topic why covers route final');
  must(helpComposer, 'Önce şirket teklifini, oda karşı teklifini, eski rota ile yeni rota farkını ve kabul durumunu kontrol et; bu yalnızca teklif/önizleme akışıdır.', 'help composer topic advice covers route final');
  must(helpComposer, 'Sözleşmeli rota değişikliği', 'help composer labels route final question type');
  must(helpComposer, 'Rota değişikliği teklifini işleme almadan önce', 'help composer verification hint covers route final');
  must(helpComposer, 'Sözleşmeli rota değişikliği', 'help composer opening action / label supports route final');
  must(helpComposer, 'rota değişikliği teklifini, farkını ve kabul durumunu birlikte okudum', 'help composer response why text covers route final');
  must(intentRouter, 'AGREEMENT_ROUTE_REFRESH', 'intent router knows route final intent');
  must(answerQualityPolicy, 'AGREEMENT_ROUTE_REFRESH', 'answer quality policy knows route final intent');
  must(answerQualityPolicy, 'Bu sözleşmede rota değişikliği var mı?', 'answer quality policy route final chip prompt');
  must(goldenPack, 'room-agreements-route-refresh-offer', 'golden pack includes room route refresh offer question');
  must(goldenPack, 'room-agreements-route-refresh-history', 'golden pack includes room route refresh history question');
  must(goldenPack, 'company-agreements-route-refresh-offer', 'golden pack includes company route refresh offer question');
  must(goldenPack, 'company-agreements-route-refresh-diff', 'golden pack includes company route refresh diff question');
  must(doc, 'Driver route refresh yoktur.', 'route final doc keeps driver refresh out of scope');
  must(doc, 'SMS veya push notification yoktur.', 'route final doc keeps SMS/push out of scope');
  must(doc, 'Ödeme / hakediş işlemi yoktur.', 'route final doc keeps payment/settlement out of scope');
  must(doc, 'Schema / migration yoktur.', 'route final doc keeps schema/migration out of scope');
  must(doc, 'Harici kayıt yazımı yoktur.', 'route final doc keeps runtime-data out of scope');
  mustNotAny(doc, ['sendSms', 'sendNotification', 'pushNotification', 'payment execute', 'settlement execute', 'prisma migration', 'automatic permanent route apply', 'OperationProof', 'raw internal/debug payload'], 'route final doc stays free of forbidden visible terms');

  console.log('=== ROUTE-CHANGE-FINAL-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}

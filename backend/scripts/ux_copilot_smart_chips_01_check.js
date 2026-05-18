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
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function chipTextList(chips) {
  return Array.isArray(chips) ? chips.map((chip) => String(chip || '').trim()).filter(Boolean) : [];
}

function assertExactChips(actual, expected, label) {
  const got = chipTextList(actual);
  const want = chipTextList(expected);
  if (got.length !== want.length) {
    fail(`${label}: length ${got.length} !== ${want.length}`);
  }
  for (let i = 0; i < want.length; i += 1) {
    if (normalize(got[i]) !== normalize(want[i])) {
      fail(`${label}: chip ${i + 1} mismatch (${got[i]} !== ${want[i]})`);
    }
  }
  ok(label);
}

function assertNone(actual, needles, label) {
  const got = chipTextList(actual);
  const list = Array.isArray(needles) ? needles : [];
  if (got.every((chip) => list.every((needle) => normalize(chip) !== normalize(needle)))) ok(label);
  else fail(label);
}

function assertNoForbiddenVisibleTerms(actual, label) {
  const forbidden = [
    'FORBIDDEN',
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'contractShiftGeneration',
    'agreement',
    'raw',
    'payload',
    'token',
    'hash',
    'debug',
    'write',
    'execute',
    'settlement execute',
    'stack',
    'exception',
    'Validation failed',
    'Bu aksiyonu simüle et',
    'Bunu sor:',
    'Aynı kayıt için devam et',
  ];
  const text = chipTextList(actual).join(' • ');
  for (const term of forbidden) {
    mustNot(text, term, `${label} avoids ${term}`);
  }
}

console.log('=== UX-COPILOT-SMART-CHIPS-01 CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const helperSource = read('web/src/utils/copilotFacts.js');

must(pkg, '"check:uxcopilotsmartchips01": "node backend/scripts/ux_copilot_smart_chips_01_check.js"', 'package.json exposes check:uxcopilotsmartchips01');
must(pkg, '"check:cop04bfix08"', 'package.json keeps check:cop04bfix08');
must(pkg, '"check:cop04bfix07"', 'package.json keeps check:cop04bfix07');
must(pkg, '"check:cop04bfix06"', 'package.json keeps check:cop04bfix06');
must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:product-extensions"', 'package.json keeps check:product-extensions');

must(runner, 'check:uxcopilotsmartchips01', 'product extensions runner keeps uxcopilotsmartchips01');
must(verifyChain, 'check:uxcopilotsmartchips01', 'verify chain waits for check:uxcopilotsmartchips01');
must(guide, 'UX-COPILOT-SMART-CHIPS-01', 'script guide mentions UX-COPILOT-SMART-CHIPS-01');
must(guide, 'check:uxcopilotsmartchips01', 'script guide exposes check:uxcopilotsmartchips01');
must(auditDoc, 'UX-COPILOT-SMART-CHIPS-01 starter chip polish', 'audit doc keeps smart chips note');
must(drawerSource, 'buildCopilotStarterChips', 'drawer uses starter chip helper');
must(drawerSource, 'copilotSuggestionWrap', 'drawer renders starter chip wrap');
must(drawerSource, 'messages.length === 0', 'drawer shows starter chips in empty state');
must(drawerSource, 'showSuggestions && messages.length > 0', 'drawer keeps optional suggestions separate');
mustNot(drawerSource, 'askRef.current("");', 'drawer does not auto-ask on empty open');
mustNot(drawerSource, 'if (!messages.length) askRef.current("");', 'drawer does not auto-ask on empty open');
must(helperSource, 'export function buildCopilotStarterChips', 'copilot facts exports starter chip helper');

const { buildCopilotStarterChips } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

const generic = buildCopilotStarterChips({ screenPath: '/unknown', selection: null });
assertExactChips(generic, ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?'], 'generic fallback starter chips');
assertNoForbiddenVisibleTerms(generic, 'generic fallback starter chips');

const roomMapSignal = buildCopilotStarterChips({
  screenPath: '/room/map',
  selection: {
    selectedRecord: null,
    label: 'Vardiya #3',
    helpContextSummary: 'Seçili kayıt: Vardiya #3 • Araç 34ABC123 • GPS STALE • Sıradaki Pickup 6',
    contextSummary: 'Canlı Takip • Vardiya #3 • Araç 34ABC123 • GPS Zayıf • Son GPS: 1 dk • Sıradaki: Pickup 6 • ETA: 619dk',
    selectedRecordType: 'shift',
    selectedRecordStatus: 'Vardiya #3 • Araç 34ABC123 • GPS Zayıf / STALE • Son GPS 1 dk • Sıradaki Pickup 6 • ETA 619 dk',
    selectedRecordSummary: 'Vardiya #3 • Araç 34ABC123 • GPS Zayıf / STALE • Son GPS 1 dk • Sıradaki Pickup 6 • ETA 619 dk',
    facts: { vehicleCount: 1 },
  },
});
assertExactChips(roomMapSignal, [
  'Bu araç neden görünmüyor?',
  'Son GPS ne zaman geldi?',
  'Sürücünün telefon GPS’i devrede mi?',
  'Araç bağlantısı var mı?',
], 'room map GPS starter chips');
assertNoForbiddenVisibleTerms(roomMapSignal, 'room map GPS starter chips');
assertNone(roomMapSignal, ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?'], 'room map chips outrank generic fallback');

const roomOperationHealth = buildCopilotStarterChips({
  screenPath: '/room/operation-health',
  selection: { facts: { activeDrivers: 0, riskyDevices: 1, staleOrOffline: 1, openIssues: 2 } },
});
assertExactChips(roomOperationHealth, [
  'Riskli cihazları göster',
  'Stale/offline satırını aç',
  'Açık sorunları sırala',
  'Aktif sürücü durumunu sor',
], 'room operation health starter chips');
assertNoForbiddenVisibleTerms(roomOperationHealth, 'room operation health starter chips');

const superAdminOps = buildCopilotStarterChips({
  screenPath: '/superadmin/observability',
  selection: { summary: 'Canlı İzleme • Riskler • Açık sorunlar' },
});
assertExactChips(superAdminOps, [
  'Riskleri sırala',
  'GPS görünürlüğünü kontrol et',
  'Açık sorunları göster',
  'Sıradaki doğru işlem ne?',
], 'super admin live ops starter chips');
assertNoForbiddenVisibleTerms(superAdminOps, 'super admin live ops starter chips');

const companyAgreements = buildCopilotStarterChips({
  screenPath: '/company/agreements',
  selection: {
    helpContextSummary: 'Üretilen vardiya: 3 • Son üretilen vardiya #7 • Bugün üretim: Var',
    contextSummary: 'Sözleşmeler - Sözleşme #1 • Kaynak vardiya #4 • Bugün üretim: Var',
    facts: { generatedShiftCount: 3, lastGeneratedShiftId: 7, todayGenerated: true, sourceShiftId: 4 },
  },
});
assertExactChips(companyAgreements, [
  'Bugün vardiya üretildi mi?',
  'Üretilen vardiyaları göster',
  'Sözleşme üretim durumunu açıkla',
  'Son üretilen vardiya hangisi?',
], 'company agreements starter chips');
assertNoForbiddenVisibleTerms(companyAgreements, 'company agreements starter chips');

const companyCommercial = buildCopilotStarterChips({
  screenPath: '/superadmin/commercial-core',
  selection: {
    helpContextSummary: 'Hakediş önizleme • readonly • Eksik bilgi 0 • Komisyon needsReview',
    contextSummary: 'Ödeme hesabı unknown • Komisyon needsReview • Servis kanıtı needsReview',
    facts: { missingInfoCount: 0, paymentAccountStatus: 'unknown', commissionStatus: 'needsReview', serviceProofStatus: 'needsReview' },
  },
});
assertExactChips(companyCommercial, [
  'Bu hakediş neden hazır değil?',
  'Ödeme hesabı eksik mi?',
  'Komisyon durumu ne?',
  'Hakediş önizlemesini açıkla',
], 'commercial core starter chips');
assertNoForbiddenVisibleTerms(companyCommercial, 'commercial core starter chips');

const personelLiveSelected = buildCopilotStarterChips({
  screenPath: '/personel/live',
  selection: {
    selectedRecordType: 'serviceRide',
    selectedRecordLabel: 'Bugünkü servis',
    helpContextSummary: 'Bugünkü servis 34ABC123 • Shift #1 • Son GPS 11dk • Sıradaki Durak A • ETA 3 dk',
    contextSummary: 'Personel canlı takip • Shift #1 • Araç 34ABC123 • GPS Çevrim Dışı • Son GPS: 11dk • Sıradaki: Durak A • ETA: 3dk • Rota km: 1.6km',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    facts: { vehicleCount: 1 },
  },
});
assertExactChips(personelLiveSelected, [
  'Servis neden görünmüyor?',
  'Son GPS ne zaman geldi?',
  'Araç nerede?',
  'Sürücünün telefon GPS’i devrede mi?',
], 'personel live selected service starter chips');
assertNoForbiddenVisibleTerms(personelLiveSelected, 'personel live selected service starter chips');

const personelLiveNoService = buildCopilotStarterChips({
  screenPath: '/personel/live',
  selection: null,
});
assertExactChips(personelLiveNoService, [
  'Servis saati uygun mu?',
  'Araç ataması var mı?',
  'Canlı konum neden yok?',
], 'personel live no-service starter chips');
assertNoForbiddenVisibleTerms(personelLiveNoService, 'personel live no-service starter chips');

const parentLiveNoVehicle = buildCopilotStarterChips({
  screenPath: '/parent/live',
  selection: {
    selectedRecord: null,
    helpContextSummary: 'Şu an: Canlı • Çocuk: #2 Student One • Araç: 0 • Okul/Şirket: DemoOkul • Bölge: #1 • Bu çocuk için şu an canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür.',
    contextSummary: 'Veli canlı takip • Student One • Araç yok • Canlı araç görünmüyor • Aktif vardiya saat aralığı ve araç ataması gerekir.',
    facts: { noLiveVehicle: true, liveVehicleVisible: false, vehicleCount: 0 },
  },
});
assertExactChips(parentLiveNoVehicle, [
  'Servis saati uygun mu?',
  'Araç ataması var mı?',
  'Canlı konum neden yok?',
  'Bildirimleri kontrol et',
], 'parent live no-vehicle starter chips');
assertNoForbiddenVisibleTerms(parentLiveNoVehicle, 'parent live no-vehicle starter chips');
assertNone(parentLiveNoVehicle, ['Canlı ekranını aç', 'Copilot', 'Ekran rehberini aç', 'Geri Bildirim ekranını aç'], 'parent live no-vehicle chips avoid nav chips');
assertNone(parentLiveNoVehicle, ['Geri Bildirim ekranını aç', 'Bildirimler', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala'], 'parent live no-vehicle chips avoid feedback chips');

const parentLiveSelected = buildCopilotStarterChips({
  screenPath: '/parent/live',
  selection: {
    selectedRecordType: 'studentRide',
    selectedRecordLabel: 'Student One servisi',
    helpContextSummary: 'Öğrencimin servisi • 34ABC123 • Son GPS 2dk • Durak B • ETA 8dk',
    contextSummary: 'Öğrencimin servisi • 34ABC123 • Zayıf GPS • Son GPS 2dk • Durak B • ETA 8dk',
    selectedRecordStatus: 'Yolda',
    facts: { vehicleCount: 1 },
  },
});
assertExactChips(parentLiveSelected, [
  'Servis neden görünmüyor?',
  'ETA nedir?',
  'Son GPS ne zaman geldi?',
  'Araç bağlantısı var mı?',
], 'parent live selected service starter chips');
assertNoForbiddenVisibleTerms(parentLiveSelected, 'parent live selected service starter chips');

const driverToday = buildCopilotStarterChips({
  screenPath: '/driver/today',
  selection: {
    selectedRecordType: 'shift',
    selectedRecordLabel: 'Vardiya #3',
    helpContextSummary: 'Vardiya #3 • Araç 34ABC123 • Durum Kabul Edildi • Son GPS 22dk • Durak A',
    contextSummary: 'Bugünkü görev • Vardiya #3 • Araç 34ABC123 • Son GPS 22dk • Sıradaki Durak A • ETA 3dk',
    selectedRecordStatus: 'Kabul Edildi',
  },
});
assertExactChips(driverToday, [
  'Görev neden başlamıyor?',
  'Başlatma zamanı uygun mu?',
  'Araç ve rota hazır mı?',
  'GPS ve başlatma kanıtını kontrol et',
], 'driver today starter chips');
assertNoForbiddenVisibleTerms(driverToday, 'driver today starter chips');
assertNone(driverToday, ['Bugün ekranını aç', 'Rota', 'Copilot', 'Ekran rehberini aç'], 'driver today chips avoid nav chips');

const driverRoute = buildCopilotStarterChips({
  screenPath: '/driver/route',
  selection: {
    selectedRecordType: 'shift',
    selectedRecordLabel: 'Vardiya #3',
    helpContextSummary: 'Sıradaki durak Pickup 6 • GPS LIVE • Başlatma kanıtı eksik',
    contextSummary: 'Rota • Durak 6 • GPS LIVE • Sonraki Pickup 6 • Başlatma adımı bekliyor',
  },
});
assertExactChips(driverRoute, [
  'Sıradaki durak ne?',
  'Rota neden görünmüyor?',
  'GPS durumu ne?',
  'Başlatma adımı ne?',
], 'driver route/map starter chips');
assertNoForbiddenVisibleTerms(driverRoute, 'driver route/map starter chips');
assertNone(driverRoute, ['Bugün ekranını aç', 'Copilot', 'Ekran rehberini aç'], 'driver route/map chips avoid nav chips');

const driverMap = buildCopilotStarterChips({
  screenPath: '/driver/map',
  selection: {
    selectedRecordType: 'shift',
    selectedRecordLabel: 'Vardiya #3',
    helpContextSummary: 'Sıradaki durak Pickup 6 • GPS LIVE • Başlatma kanıtı eksik',
    contextSummary: 'Rota • Durak 6 • GPS LIVE • Sonraki Pickup 6 • Başlatma adımı bekliyor',
  },
});
assertExactChips(driverMap, [
  'Sıradaki durak ne?',
  'Rota neden görünmüyor?',
  'GPS durumu ne?',
  'Başlatma adımı ne?',
], 'driver map starter chips');
assertNoForbiddenVisibleTerms(driverMap, 'driver map starter chips');

console.log('=== UX-COPILOT-SMART-CHIPS-01 CHECK PASS ===');

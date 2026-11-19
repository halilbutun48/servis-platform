#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

const suggestionsRegionPattern = /<section\b[^>]*\bclassName="copilotContextSuggestions"[^>]*>[\s\S]*?<\/section>/;

function hasAccessibleSuggestionsContract(source) {
  const region = String(source || '').match(suggestionsRegionPattern)?.[0] || '';
  const functionalToggle = /const\s+next\s*=\s*!previous/.test(region)
    || /setSuggestionsOpen\(\(previous\) => !previous\)/.test(region);
  const toggleHandler = /onClick=\{\(\) => \{[\s\S]*?setSuggestionsOpen\(\(previous\) => \{[\s\S]*?(?:const\s+next\s*=\s*!previous|return\s+!previous)[\s\S]*?(?:return\s+next|setSuggestionsOpen\(\(previous\) => !previous\))[\s\S]*?\}\);[\s\S]*?\}\}/.test(region)
    || /onClick=\{\(\) => setSuggestionsOpen\(\(previous\) => !previous\)\}/.test(region);
  return Boolean(region)
    && /suggestions\.length\s*\?\s*\(/.test(source)
    && /className="copilotContextSuggestionsToggle"/.test(region)
    && /aria-expanded=\{suggestionsOpen\}/.test(region)
    && /aria-controls=\{suggestionPanelId\}/.test(region)
    && toggleHandler
    && functionalToggle
    && /className="copilotSuggestionWrap" hidden=\{!suggestionsOpen\}/.test(region)
    && /suggestions\.map\(\(chip, index\) =>[\s\S]*?onClick=\{\(\) => ask\(chip\)\}/.test(region);
}

function hasStarterHelperWiring(drawer, helper) {
  return /import\s*\{\s*buildCopilotStarterChips\b/.test(drawer)
    && /function buildSuggestions\([\s\S]*?return buildCopilotStarterChips\(/.test(drawer)
    && /const suggestions = useMemo\(\(\) => buildSuggestions\(currentPath, selection, screenContext, me\)/.test(drawer)
    && /export function buildCopilotStarterChips\s*\(/.test(helper);
}

function hasApprovedPersonelChipCopy(chips) {
  const normalized = chipTextList(chips).map(normalize);
  return normalized.includes(normalize('Son konum bilgisi ne zaman geldi?'))
    && !normalized.includes(normalize('Son GPS ne zaman geldi?'));
}

console.log('=== UX-COPILOT-SMART-CHIPS-01 CHECK ===');

const pkg = read('package.json');
const registryScripts = productExtensionsChecks.map((step) => step.script);
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

assertProductExtensionsIncludes('check:uxcopilotsmartchips01', 'product extensions registry includes uxcopilotsmartchips01', registryScripts);
assertProductExtensionsIncludes('check:uxcopilotsmartchips01', 'verify chain registry includes uxcopilotsmartchips01', registryScripts);
must(guide, 'UX-COPILOT-SMART-CHIPS-01', 'script guide mentions UX-COPILOT-SMART-CHIPS-01');
must(guide, 'check:uxcopilotsmartchips01', 'script guide exposes check:uxcopilotsmartchips01');
must(auditDoc, 'UX-COPILOT-SMART-CHIPS-01 starter chip polish', 'audit doc keeps smart chips note');
must(drawerSource, 'buildCopilotStarterChips', 'drawer uses starter chip helper');
must(drawerSource, 'copilotSuggestionWrap', 'drawer renders starter chip wrap');
if (hasAccessibleSuggestionsContract(drawerSource)) ok('drawer exposes an accessible collapsible suggestion region');
else fail('drawer exposes an accessible collapsible suggestion region');
if (hasStarterHelperWiring(drawerSource, helperSource)) ok('current starter helper feeds route-aware drawer suggestions');
else fail('current starter helper feeds route-aware drawer suggestions');
mustNot(drawerSource, 'askRef.current("");', 'drawer does not auto-ask on empty open');
mustNot(drawerSource, 'if (!messages.length) askRef.current("");', 'drawer does not auto-ask on empty open');
must(helperSource, 'export function buildCopilotStarterChips', 'copilot facts exports starter chip helper');

const suggestionsRegionRemoved = drawerSource.replace(suggestionsRegionPattern, '');
if (!hasAccessibleSuggestionsContract(suggestionsRegionRemoved)) ok('negative control rejects a missing suggestions region');
else fail('negative control rejects a missing suggestions region');
const starterHelperDisconnected = drawerSource.replace('return buildCopilotStarterChips({', 'return [];');
if (!hasStarterHelperWiring(starterHelperDisconnected, helperSource)) ok('negative control rejects a disconnected starter helper');
else fail('negative control rejects a disconnected starter helper');
const suggestionsCannotOpen = drawerSource.replace(
  /(className="copilotContextSuggestions"[\s\S]*?const\s+next\s*=\s*)!previous/,
  '$1previous',
);
if (!hasAccessibleSuggestionsContract(suggestionsCannotOpen)) ok('negative control rejects permanently inaccessible suggestions');
else fail('negative control rejects permanently inaccessible suggestions');

const { buildCopilotStarterChips } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);
const { buildAgreementCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/agreementCopilotFacts.js')).href);

const generic = buildCopilotStarterChips({ screenPath: '/unknown', selection: null });
assertExactChips(generic, ['Bu ekranda neye bakmalıyım?', 'Riskleri sırala', 'Sıradaki doğru işlem ne?'], 'generic fallback starter chips');
assertNoForbiddenVisibleTerms(generic, 'generic fallback starter chips');

const sharedKvkk = buildCopilotStarterChips({ screenPath: '/shared/kvkk', role: 'ROOM', selection: null });
assertExactChips(sharedKvkk, [
  'KVKK sınırını açıkla',
  'Bu rolde ne görünür?',
  'Erişim neden kapalı?',
  'Yetkili ekrana yönlendir',
], 'shared KVKK starter chips stay within privacy/access capability');
assertNone(sharedKvkk, ['Riskleri sırala'], 'shared KVKK does not expose an operational risk chip');
assertNoForbiddenVisibleTerms(sharedKvkk, 'shared KVKK starter chips');

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
  'GPS güncel değil / çevrim dışı satırını aç',
  'Açık sorunları sırala',
  'Aktif sürücü durumunu sor',
], 'room operation health starter chips');
assertNoForbiddenVisibleTerms(roomOperationHealth, 'room operation health starter chips');

const roomOperationProofTab = buildCopilotStarterChips({
  screenPath: '/room/operation-health',
  role: 'ROOM',
  selection: { facts: { screenType: 'OPERATION_HEALTH', activeTab: 'proof' } },
});
assertExactChips(roomOperationProofTab, [
  'Operasyon kanıtını açıkla',
  'Kanıt eksiklerini göster',
  'Sıradaki güvenli işlem ne?',
], 'room operation proof tab starter chips');
assertNoForbiddenVisibleTerms(roomOperationProofTab, 'room operation proof tab starter chips');

const roomShiftsSelected = buildCopilotStarterChips({
  screenPath: '/room/shifts',
  role: 'ROOM',
  selection: {
    scopeKey: '/room/shifts',
    entityType: 'shift',
    entityId: 168,
    selectedRecordStatus: 'Durum: APPROVED • Araç: 34 ABC 124 • Sürücü: Driver One • Durak: 18',
    facts: { screenType: 'SHIFTS', stage: 'APPROVED', hasShift: true, hasVehicle: true, hasDriver: true, counters: { stops: 18 } },
  },
});
assertExactChips(roomShiftsSelected, [
  'Rotasını göster',
  'İşlem kaydını göster',
  'Atama değişikliğini göster',
  'Bu vardiyanın güvenli sonraki adımı ne?',
], 'room selected shift starter chips');
assertNoForbiddenVisibleTerms(roomShiftsSelected, 'room selected shift starter chips');

const roomShiftsUnavailableTarget = buildCopilotStarterChips({
  screenPath: '/room/shifts',
  role: 'ROOM',
  selection: {
    scopeKey: '/room/shifts',
    entityType: 'shift',
    entityId: 211,
    facts: { screenType: 'SHIFTS', stage: 'REQUESTED', counters: { stops: 0 }, hasShift: true },
  },
});
assertExactChips(roomShiftsUnavailableTarget, [
  'Teklif durumunu açıkla',
  'Eksik vardiya bilgilerini göster',
  'Sıradaki güvenli işlem ne?',
], 'negative control rejects unavailable shift target chips');

const roomShiftsNoSelection = buildCopilotStarterChips({
  screenPath: '/room/shifts',
  role: 'ROOM',
  selection: null,
});
assertExactChips(roomShiftsNoSelection, [
  'Bekleyen vardiyaları açıkla',
  'Sözleşmeden üretilen vardiyaları göster',
  'Sıradaki güvenli işlem ne?',
], 'room shifts no-selection starter chips');
assertNoForbiddenVisibleTerms(roomShiftsNoSelection, 'room shifts no-selection starter chips');

const roomDriversSelected = buildCopilotStarterChips({
  screenPath: '/room/drivers',
  role: 'ROOM',
  selection: {
    scopeKey: '/room/drivers',
    entityType: 'driver',
    entityId: 4,
    facts: { screenType: 'DRIVERS', assignmentState: 'ASSIGNED' },
  },
});
assertExactChips(roomDriversSelected, [
  'Bu sürücünün atama durumunu göster',
  'GPS durumunu açıkla',
  'Bağlı aracı göster',
  'Sıradaki güvenli işlem ne?',
], 'room selected driver starter chips');
assertNoForbiddenVisibleTerms(roomDriversSelected, 'room selected driver starter chips');

const roomVehiclesSelected = buildCopilotStarterChips({
  screenPath: '/room/vehicles',
  role: 'ROOM',
  selection: {
    scopeKey: '/room/vehicles',
    entityType: 'vehicle',
    entityId: 1,
    facts: { screenType: 'VEHICLES', stage: 'CRITICAL' },
  },
});
assertExactChips(roomVehiclesSelected, [
  'Bu aracın GPS durumunu açıkla',
  'Bağlı sürücüyü göster',
  'Vardiya bağını göster',
  'Sıradaki güvenli işlem ne?',
], 'room selected vehicle starter chips');
assertNoForbiddenVisibleTerms(roomVehiclesSelected, 'room selected vehicle starter chips');

const roomChipsWrongRole = buildCopilotStarterChips({
  screenPath: '/room/shifts',
  role: 'COMPANY',
  selection: {
    scopeKey: '/room/shifts',
    entityType: 'shift',
    entityId: 168,
    facts: { screenType: 'SHIFTS', hasShift: true },
  },
});
assertExactChips(roomChipsWrongRole, [
  'Bu ekranda neye bakmalıyım?',
  'Riskleri sırala',
  'Sıradaki doğru işlem ne?',
], 'negative control rejects ROOM chips for wrong role');

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
  'Sözleşme ödeme modeli nedir?',
  'Ödeme hazırlığı hangi aşamada?',
  'Bu sözleşmenin kaynak durumu ne?',
  'Ödeme hesabı hazır mı?',
], 'company agreements starter chips');
assertNoForbiddenVisibleTerms(companyAgreements, 'company agreements starter chips');

const roomAgreementUnavailableSavings = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: {
    entityType: 'agreement',
    entityId: 184,
    selectedRecordLabel: 'Sözleşme #184',
    selectedRecordStatus: 'REQUESTED',
    facts: buildAgreementCopilotFacts(
      { id: 184, status: 'REQUESTED', roomId: 1 },
      { dynamicSavingsPreview: { ok: false, summaryText: 'Tasarruf hesabı için yeterli veri yok' } },
    ),
  },
});
assertNone(roomAgreementUnavailableSavings, [
  'Tasarruf hesabını göster',
  'Km / süre farkını açıkla',
  'Kapasite etkisini göster',
], 'negative control rejects unavailable savings chips on ROOM agreement');

const roomAgreementPending = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: {
    entityType: 'agreement',
    entityId: 184,
    selectedRecordStatus: 'REQUESTED',
    facts: { screenType: 'AGREEMENTS', selectedRecordStatus: 'REQUESTED' },
  },
});
assertExactChips(roomAgreementPending, [
  'Bu sözleşmenin durumu ne?',
  'Bu sözleşmenin detaylarını anlat.',
  'İnceleme bekleyen sözleşmem var mı?',
  'Bunun operasyon köprüsünü göster.',
], 'ROOM pending agreement contextual starter chips');

const roomAgreementActive = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: {
    entityType: 'agreement',
    entityId: 187,
    selectedRecordStatus: 'ACTIVE',
    facts: { screenType: 'AGREEMENTS', selectedRecordStatus: 'ACTIVE' },
  },
});
assertExactChips(roomAgreementActive, [
  'Bu sözleşmenin durumu ne?',
  'Bu sözleşmenin detaylarını anlat.',
  'Bunun operasyon köprüsünü göster.',
  'Sözleşmeleri nereden inceleyebilirim?',
], 'ROOM active agreement contextual starter chips');
assertNone(roomAgreementActive, ['İnceleme bekleyen sözleşmem var mı?'], 'active agreement chips avoid pending-only wording');

const roomAgreementBridgeDisclosure = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: {
    entityType: 'agreement',
    entityId: 187,
    selectedRecordStatus: 'ACTIVE',
    facts: {
      screenType: 'AGREEMENTS',
      selectedRecordStatus: 'ACTIVE',
      activeTab: 'operation-bridge',
      expandedDisclosure: 'operation bridge',
    },
  },
});
assertExactChips(roomAgreementBridgeDisclosure, [
  'Bu operasyon köprüsünü açıkla',
  'Bu sözleşmenin durumu ne?',
  'Bu sözleşmenin detaylarını anlat.',
  'Sözleşmeleri nereden inceleyebilirim?',
], 'ROOM agreement operation-bridge disclosure starter chips');

const roomAgreementWrongRole = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'COMPANY',
  selection: {
    entityType: 'agreement',
    entityId: 184,
    selectedRecordStatus: 'REQUESTED',
    facts: { screenType: 'AGREEMENTS', selectedRecordStatus: 'REQUESTED' },
  },
});
assertExactChips(roomAgreementWrongRole, [
  'Bu ekranda neye bakmalıyım?',
  'Riskleri sırala',
  'Sıradaki doğru işlem ne?',
], 'negative control rejects ROOM agreement chips for wrong role');

const roomAgreementList = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: null,
});
assertExactChips(roomAgreementList, [
  'Mevcut sözleşmelerim neler?',
  'İnceleme bekleyen sözleşmem var mı?',
  'Sözleşmeleri nereden inceleyebilirim?',
  'Sözleşme durumları ne anlama geliyor?',
], 'ROOM agreement list contextual starter chips');

const roomAgreementNoRefreshPlaceholder = buildCopilotStarterChips({
  screenPath: '/room/agreements',
  role: 'ROOM',
  selection: {
    entityType: 'agreement',
    entityId: 184,
    facts: buildAgreementCopilotFacts(
      { id: 184, status: 'REQUESTED', roomId: 1 },
      {
        routeRefreshCurrentText: '0 personel · 0 durak · - · -',
        routeRefreshProposedText: '0 personel · 0 durak · - · -',
        routeRefreshDiffText: 'Personel / durak değişikliği yok',
        routeRefreshPriceImpactText: '₺0 → ₺0 (₺0)',
      },
    ),
  },
});
assertNone(roomAgreementNoRefreshPlaceholder, [
  'Bu sözleşmede rota değişikliği var mı?',
  'Taşımacılık Firması tarafına rota güncelleme talebi gitti mi?',
  'Eski rota ile yeni rota farkı ne?',
  'Teklif mi, kabul mü?',
], 'negative control rejects route chips without an authorized refresh context');

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
  'Ödeme hazırlığı hangi aşamada?',
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
  'Son konum bilgisi ne zaman geldi?',
  'Sürücünün telefonundan konum sinyali devrede mi?',
  'Araç nerede?',
], 'personel live selected service starter chips');
assertNoForbiddenVisibleTerms(personelLiveSelected, 'personel live selected service starter chips');
if (hasApprovedPersonelChipCopy(personelLiveSelected)) ok('personel starter chips use the approved location wording');
else fail('personel starter chips use the approved location wording');
const stalePersonelChipCopy = personelLiveSelected.map((chip) => chip === 'Son konum bilgisi ne zaman geldi?' ? 'Son GPS ne zaman geldi?' : chip);
if (!hasApprovedPersonelChipCopy(stalePersonelChipCopy)) ok('negative control rejects the stale PERSONEL GPS chip copy');
else fail('negative control rejects the stale PERSONEL GPS chip copy');

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
    entityId: 3,
    selectedRecordId: 3,
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

const driverTodayNoSelection = buildCopilotStarterChips({
  screenPath: '/driver/today',
  role: 'DRIVER',
  selection: null,
});
assertExactChips(driverTodayNoSelection, [
  'Bu ekranı detaylı anlat',
  'Ne yapayım?',
  'Konum sinyali bekleniyor',
], 'driver today no-selection chips stay capability-grounded');
assertNone(driverTodayNoSelection, ['Görev neden başlamıyor?', 'Başlatma zamanı uygun mu?', 'Araç ve rota hazır mı?'], 'driver today no-selection chips avoid active-task questions');

const driverRoute = buildCopilotStarterChips({
  screenPath: '/driver/route',
  selection: {
    entityId: 3,
    selectedRecordId: 3,
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

const driverRouteNoSelection = buildCopilotStarterChips({
  screenPath: '/driver/route',
  role: 'DRIVER',
  selection: { entityType: 'shift', entityId: 0, selectedRecordId: 0 },
});
assertExactChips(driverRouteNoSelection, [
  'Bu ekranı detaylı anlat',
  'Sonraki adımı göster',
  'Bu ne demek?',
], 'driver route no-selection chips stay capability-grounded');
assertNone(driverRouteNoSelection, ['Sıradaki durak ne?', 'Rota neden görünmüyor?', 'GPS durumu ne?'], 'driver route no-selection chips avoid record questions');

const driverMap = buildCopilotStarterChips({
  screenPath: '/driver/map',
  selection: {
    entityId: 3,
    selectedRecordId: 3,
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

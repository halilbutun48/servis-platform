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

console.log('=== UX-COPILOT-PERSONA-01 CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const personaDoc = read('docs/COPILOT_PERSONA_SEFER_ABI_V1.md');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const panelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const navDockSource = read('web/src/layout/NavDock.jsx');
const bubbleSource = read('web/src/components/copilot/ChatMessageBubble.jsx');
const helperSource = read('web/src/utils/copilotFacts.js');
const screenRegistrySource = read('web/src/copilot/screenRegistry.js');
const smartChipsCheck = read('backend/scripts/ux_copilot_smart_chips_01_check.js');

must(pkg, '"check:uxcopilotpersona01": "node backend/scripts/ux_copilot_persona_01_check.js"', 'package.json exposes check:uxcopilotpersona01');
must(pkg, '"check:uxcopilotsmartchips01"', 'package.json keeps check:uxcopilotsmartchips01');
must(runner, 'check:uxcopilotpersona01', 'product extensions runner includes persona check');
must(verifyChain, 'check:uxcopilotpersona01', 'verify chain includes persona check');
must(guide, 'UX-COPILOT-PERSONA-01', 'script guide mentions UX-COPILOT-PERSONA-01');
must(guide, 'check:uxcopilotpersona01', 'script guide exposes check:uxcopilotpersona01');
must(auditDoc, 'UX-COPILOT-PERSONA-01 brand voice note', 'audit doc keeps persona note');
must(personaDoc, 'Sefer Abi', 'persona doc mentions Sefer Abi');
must(personaDoc, 'Operasyon yardımcısı', 'persona doc mentions Operasyon yardımcısı');
must(personaDoc, 'sakin', 'persona doc mentions sakin tone');
must(personaDoc, 'net', 'persona doc mentions net tone');
must(personaDoc, 'kurumsal', 'persona doc mentions kurumsal tone');
must(personaDoc, 'saha dili', 'persona doc mentions saha dili');
must(personaDoc, 'Sefer Abi’ye Sor', 'persona doc mentions drawer title');
must(personaDoc, 'Sefer Abi Terminali', 'persona doc keeps terminal milestone label');
must(personaDoc, 'pitch: 0.82', 'persona doc keeps voice pitch target');
must(personaDoc, 'rate: 0.92', 'persona doc keeps voice rate target');
must(personaDoc, 'Browser TTS sınırlamaları', 'persona doc mentions browser TTS limitations');
must(personaDoc, 'VOICE-PERSONA-01', 'persona doc keeps mobile voice milestone marker');
must(personaDoc, 'mobil canlı kabul', 'persona doc keeps mobile voice milestone note');
must(personaDoc, 'Proactive AI dispatcher bu milestone kapsamı dışındadır.', 'persona doc keeps dispatcher boundary');
must(personaDoc, 'Web Copilot ve sürücü sesli yardımcı', 'persona doc keeps shared voice-family marker');
must(personaDoc, 'aynı marka sesi ailesi', 'persona doc keeps shared voice-family note');
must(helperSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'persona constant uses Sefer Abi’ye Sor drawer title');
must(helperSource, "menuLabel: 'Sefer Abi'", 'persona constant exposes Sefer Abi menu label');
must(helperSource, "voiceReadoutConfig: Object.freeze({", 'persona constant exposes voice readout config');
must(helperSource, "lang: 'tr-TR'", 'voice readout config keeps tr-TR language');
must(helperSource, 'pitch: 0.82', 'voice readout config keeps lower pitch');
must(helperSource, 'rate: 0.92', 'voice readout config keeps slower rate');
must(helperSource, 'volume: 1', 'voice readout config keeps full volume');
mustNot(helperSource, "drawerTitle: 'Hızlı Yardım'", 'persona constant no longer uses Hızlı Yardım drawer title');
must(screenRegistrySource, 'COPILOT_MENU_LABEL', 'screen registry centralizes copilot menu label');
must(screenRegistrySource, "label: COPILOT_MENU_LABEL", 'screen registry uses Sefer Abi menu label');
mustNot(screenRegistrySource, "label: 'Copilot'", 'screen registry no longer exposes Copilot fallback label');
mustNot(screenRegistrySource, 'label: "Copilot"', 'screen registry no longer exposes Copilot fallback label');
must(drawerSource, 'COPILOT_PERSONA.drawerTitle', 'drawer uses persona drawer title');
must(drawerSource, 'COPILOT_PERSONA.assistantDisplayName', 'drawer uses persona assistant name');
must(drawerSource, 'COPILOT_PERSONA.assistantSubtitle', 'drawer uses persona assistant subtitle');
must(drawerSource, 'COPILOT_PERSONA.emptyStateLead', 'drawer uses persona empty state lead');
must(drawerSource, 'COPILOT_PERSONA.emptyStateBody', 'drawer uses persona empty state body');
must(drawerSource, 'pickPreferredSpeechVoice', 'drawer prefers Turkish voice when available');
must(drawerSource, 'voiceReadoutConfig', 'drawer reads shared voice config');
must(drawerSource, 'u.pitch = Number.isFinite(voiceConfig.pitch) ? voiceConfig.pitch : 0.82', 'drawer uses calmer pitch');
must(drawerSource, 'u.rate = Number.isFinite(voiceConfig.rate) ? voiceConfig.rate : 0.92', 'drawer uses slower readout rate');
must(drawerSource, 'u.volume = Number.isFinite(voiceConfig.volume) ? voiceConfig.volume : 1', 'drawer keeps full volume');
must(drawerSource, 'u.lang = voiceConfig.lang || "tr-TR"', 'drawer keeps tr-TR language');
must(panelSource, 'COPILOT_PERSONA.assistantDisplayName', 'panel uses persona assistant name');
must(panelSource, 'COPILOT_PERSONA.assistantSubtitle', 'panel uses persona assistant subtitle');
must(panelSource, 'COPILOT_TERMINAL.title', 'panel uses terminal title');
must(panelSource, 'COPILOT_TERMINAL.subtitle', 'panel uses terminal subtitle');
must(panelSource, 'COPILOT_TERMINAL.readonlyBoundary', 'panel uses terminal readonly boundary');
must(panelSource, 'COPILOT_TERMINAL.drawerSeparationNote', 'panel uses terminal drawer separation note');
must(navDockSource, 'copilotEntry.label || "Sefer Abi Terminali"', 'nav dock uses Sefer Abi Terminali as copilot section title');
mustNot(navDockSource, 'title: "Copilot"', 'nav dock no longer exposes Copilot section title');
must(bubbleSource, 'COPILOT_PERSONA.assistantDisplayName', 'bubble uses persona assistant name');
must(helperSource, 'export const COPILOT_PERSONA', 'copilot facts exports persona constant');
must(helperSource, 'assistantDisplayName: \'Sefer Abi\'', 'persona constant uses Sefer Abi');
must(helperSource, 'assistantSubtitle: \'Operasyon yardımcısı\'', 'persona constant uses Operasyon yardımcısı');
must(helperSource, "menuLabel: 'Sefer Abi'", 'persona constant keeps Sefer Abi menu label');
must(helperSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'persona constant keeps new drawer title');
must(helperSource, 'emptyStateLead: \'Bulunduğun ekranda soru sorabilirsin.\'', 'persona constant keeps empty state lead');
must(helperSource, 'emptyStateBody: \'Yazı alanı altta. Hazır öneriler istersen açılır. Seçili kayıt varsa onu da konuşmaya katmaya çalışırım.\'', 'persona constant keeps empty state body');
must(helperSource, 'toneLead', 'persona constant includes tone lead');
must(helperSource, 'voiceReadoutConfig', 'persona constant includes voice readout config');
must(helperSource, 'mobileAcceptanceNote', 'persona constant includes mobile acceptance note');
must(helperSource, 'dispatcherNote', 'persona constant includes dispatcher note');
must(helperSource, 'buildCopilotStarterChips', 'persona milestone keeps starter chip helper present');
must(smartChipsCheck, 'check:uxcopilotsmartchips01', 'smart chips check remains present');

const { buildCopilotStarterChips } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

const roomMap = buildCopilotStarterChips({ screenPath: '/room/map', selection: null });
assertExactChips(roomMap, [
  'Bu araç neden görünmüyor?',
  'Son GPS ne zaman geldi?',
  'Sürücünün telefon GPS’i devrede mi?',
  'Araç bağlantısı var mı?',
], 'room map starter chips remain intact');
assertNoForbiddenVisibleTerms(roomMap, 'room map starter chips remain intact');

const companyAgreements = buildCopilotStarterChips({ screenPath: '/company/agreements', selection: null });
assertExactChips(companyAgreements, [
  'Bugün vardiya üretildi mi?',
  'Üretilen vardiyaları göster',
  'Sözleşme üretim durumunu açıkla',
  'Son üretilen vardiya hangisi?',
], 'company agreements starter chips remain intact');
assertNoForbiddenVisibleTerms(companyAgreements, 'company agreements starter chips remain intact');

const parentLiveNoVehicle = buildCopilotStarterChips({
  screenPath: '/parent/live',
  selection: {
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
], 'parent live no-vehicle starter chips remain intact');
assertNoForbiddenVisibleTerms(parentLiveNoVehicle, 'parent live no-vehicle starter chips remain intact');

const driverToday = buildCopilotStarterChips({
  screenPath: '/driver/today',
  selection: {
    selectedRecordType: 'shift',
    selectedRecordLabel: 'Vardiya #5',
    helpContextSummary: 'Aktif görev yok • Bugün vardiyalar var • Seçili kayıt: Vardiya #5 • Durum: Kabul Edildi • Araç: 34ABC123 • Son GPS: GPS bekleniyor',
    contextSummary: 'Bugünkü görev • Vardiya #5 • Araç 34ABC123 • Son GPS bekleniyor • Sıradaki durak: -',
  },
});
assertExactChips(driverToday, [
  'Görev neden başlamıyor?',
  'Başlatma zamanı uygun mu?',
  'Araç ve rota hazır mı?',
  'GPS ve başlatma kanıtını kontrol et',
], 'driver today starter chips remain intact');
assertNoForbiddenVisibleTerms(driverToday, 'driver today starter chips remain intact');

console.log('=== UX-COPILOT-PERSONA-01 CHECK PASS ===');

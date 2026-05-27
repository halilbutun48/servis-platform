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

console.log('=== UX-COPILOT-TERMINAL-01 CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const personaDoc = read('docs/COPILOT_PERSONA_SEFER_ABI_V1.md');
const factsSource = read('web/src/utils/copilotFacts.js');
const screenRegistrySource = read('web/src/copilot/screenRegistry.js');
const navDockSource = read('web/src/layout/NavDock.jsx');
const panelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const appSource = read('web/src/App.jsx');

must(pkg, '"check:uxcopilotterminal01": "node backend/scripts/ux_copilot_terminal_01_check.js"', 'package.json exposes check:uxcopilotterminal01');
must(pkg, '"check:uxcopilotpersona01"', 'package.json keeps check:uxcopilotpersona01');
must(pkg, '"check:uxcopilotsmartchips01"', 'package.json keeps check:uxcopilotsmartchips01');
must(pkg, '"check:product-extensions"', 'package.json keeps check:product-extensions');

must(runner, 'check:uxcopilotterminal01', 'product extensions runner includes terminal check');
must(runner, 'check:uxcopilotpersona01', 'product extensions runner keeps persona check');
must(runner, 'check:uxcopilotsmartchips01', 'product extensions runner keeps smart chips check');

must(verifyChain, 'check:uxcopilotterminal01', 'verify chain includes terminal check');
must(verifyChain, 'check:uxcopilotpersona01', 'verify chain keeps persona check');
must(verifyChain, 'check:uxcopilotsmartchips01', 'verify chain keeps smart chips check');

must(guide, 'UX-COPILOT-TERMINAL-01', 'script guide mentions UX-COPILOT-TERMINAL-01');
must(guide, 'check:uxcopilotterminal01', 'script guide exposes check:uxcopilotterminal01');
must(guide, 'UX-COPILOT-PERSONA-01', 'script guide keeps UX-COPILOT-PERSONA-01');
must(guide, 'check:uxcopilotpersona01', 'script guide keeps check:uxcopilotpersona01');
must(guide, 'check:uxcopilotsmartchips01', 'script guide keeps check:uxcopilotsmartchips01');

must(auditDoc, 'UX-COPILOT-TERMINAL-01 existing CopilotPanel terminal label/readiness polish', 'audit doc keeps terminal note');
must(personaDoc, 'Sefer Abi Terminali', 'persona doc mentions Sefer Abi Terminali');
must(personaDoc, 'Sefer Abi’ye Sor', 'persona doc keeps drawer title');
must(personaDoc, 'readonly analiz alanı', 'persona doc keeps terminal readonly analysis area');
must(personaDoc, 'Bu ekran işlem başlatmaz; yalnızca görünür sinyalleri yorumlar.', 'persona doc keeps terminal readonly boundary');
must(personaDoc, 'Bu milestone yeni terminal component yazmaz', 'persona doc keeps no-new-component note');

must(factsSource, "terminalLabel: 'Sefer Abi Terminali'", 'persona constant exposes terminal label');
must(factsSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'persona constant keeps drawer title');
must(factsSource, "export const COPILOT_TERMINAL = Object.freeze({", 'copilot facts exports terminal shell constant');
must(factsSource, "title: 'Sefer Abi Terminali'", 'terminal shell exposes visible title');
must(factsSource, "subtitle: 'Operasyon, kalite ve ticari sinyalleri tek ekranda yorumlayan sade analiz alanı.'", 'terminal shell exposes subtitle');
must(factsSource, "readonlyBoundary: 'Bu ekran işlem başlatmaz; yalnızca görünür sinyalleri yorumlar.'", 'terminal shell exposes readonly boundary');
must(factsSource, "drawerSeparationNote: 'Sağ alttaki Sefer Abi’ye Sor hızlı destek içindir; terminal daha derin analiz yüzeyidir.'", 'terminal shell exposes drawer separation note');

const { COPILOT_PERSONA, COPILOT_TERMINAL } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

must(COPILOT_PERSONA.terminalLabel, 'Sefer Abi Terminali', 'persona constant terminal label value');
must(COPILOT_PERSONA.drawerTitle, 'Sefer Abi’ye Sor', 'persona constant drawer title value');
must(COPILOT_PERSONA.menuLabel, 'Sefer Abi', 'persona constant legacy menu label stays branded');
must(COPILOT_TERMINAL.title, 'Sefer Abi Terminali', 'terminal constant title value');
must(COPILOT_TERMINAL.subtitle, 'sade analiz alanı', 'terminal constant subtitle value');
must(COPILOT_TERMINAL.readonlyBoundary, 'işlem başlatmaz', 'terminal constant readonly boundary value');

assertExactChips(COPILOT_TERMINAL.starterChips, [
  'Bugünkü operasyon risklerini özetle',
  'Ticari akışta eksik var mı?',
  'Kalite sinyallerini açıkla',
  'Sıradaki doğru kontrol ne?',
], 'terminal starter chips');
assertNoForbiddenVisibleTerms(COPILOT_TERMINAL.starterChips, 'terminal starter chips');

must(screenRegistrySource, 'COPILOT_PERSONA.terminalLabel', 'screen registry reads terminal label from persona');
must(screenRegistrySource, 'COPILOT_MENU_LABEL', 'screen registry centralizes copilot menu label');
must(screenRegistrySource, 'label: COPILOT_MENU_LABEL', 'screen registry uses centralized copilot label');

must(navDockSource, 'copilotEntry.label', 'nav dock renders dynamic copilot label');
mustNot(navDockSource, 'TerminalPanel', 'nav dock does not mount a new terminal component');

must(panelSource, 'COPILOT_TERMINAL.title', 'copilot panel renders terminal title');
must(panelSource, 'COPILOT_TERMINAL.subtitle', 'copilot panel renders terminal subtitle');
must(panelSource, 'COPILOT_TERMINAL.readonlyBoundary', 'copilot panel renders terminal readonly boundary');
must(panelSource, 'COPILOT_TERMINAL.starterChips', 'copilot panel renders terminal starter chips');
must(panelSource, 'Terminal başlangıç soruları', 'copilot panel shows terminal starter chips heading');
mustNot(panelSource, 'Operasyon Copilot', 'copilot panel no longer exposes old shell title');

must(drawerSource, 'COPILOT_PERSONA.drawerTitle', 'drawer keeps quick-help title source');
must(drawerSource, 'COPILOT_PERSONA.assistantDisplayName', 'drawer keeps assistant name source');
must(drawerSource, 'COPILOT_PERSONA.assistantSubtitle', 'drawer keeps assistant subtitle source');
must(drawerSource, 'buildCopilotStarterChips', 'drawer keeps quick-help starter chips helper');
mustNot(drawerSource, 'Sefer Abi Terminali', 'drawer does not become the terminal shell');

must(appSource, '"/room/copilot"', 'existing room copilot route remains');
must(appSource, '"/company/copilot"', 'existing company copilot route remains');
must(appSource, '"/driver/copilot"', 'existing driver copilot route remains');
must(appSource, '"/personel/copilot"', 'existing personel copilot route remains');
must(appSource, '"/parent/copilot"', 'existing parent copilot route remains');
must(appSource, '"/superadmin/copilot"', 'existing superadmin copilot route remains');
must(appSource, '<CopilotPanel />', 'existing route still mounts CopilotPanel');
mustNot(appSource, '/room/terminal', 'no new room terminal route was added');
mustNot(appSource, 'TerminalPanel', 'no new terminal component route was added');

console.log('=== UX-COPILOT-TERMINAL-01 CHECK PASS ===');

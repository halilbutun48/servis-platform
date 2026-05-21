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

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'FORBIDDEN',
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'contractShiftGeneration',
    'agreement',
    'raw',
    'payload',
    'debug',
    'write',
    'execute',
    'settlement execute',
    'Validation failed',
  ];
  for (const term of forbidden) {
    mustNot(text, term, `${label} avoids ${term}`);
  }
}

async function main() {
  console.log('=== UX-NAV-01 PREMIUM NAVDOCK CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const navDockSource = read('web/src/layout/NavDock.jsx');
const cssSource = read('web/src/index.css');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const helperSource = read('web/src/utils/copilotFacts.js');
const labelsSource = read('web/src/utils/labels.js');
const screenRegistrySource = read('web/src/copilot/screenRegistry.js');
const panelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const appSource = read('web/src/App.jsx');

  must(pkg, '"check:uxnav01": "node backend/scripts/ux_nav_01_premium_navdock_check.js"', 'package.json exposes check:uxnav01');
  must(pkg, '"check:uxcopilotterminal01"', 'package.json keeps check:uxcopilotterminal01');
  must(pkg, '"check:uxcopilotpersona01"', 'package.json keeps check:uxcopilotpersona01');
  must(pkg, '"check:uxcopilotsmartchips01"', 'package.json keeps check:uxcopilotsmartchips01');

  must(runner, 'check:uxnav01', 'product extensions runner includes UX-NAV-01');
  must(verifyChain, 'check:uxnav01', 'verify chain includes UX-NAV-01');

  must(guide, 'UX-NAV-01', 'script guide mentions UX-NAV-01');
  must(guide, 'check:uxnav01', 'script guide exposes check:uxnav01');
  must(auditDoc, 'UX-NAV-01 premium NavDock polish', 'audit doc keeps UX-NAV-01 note');

  must(navDockSource, 'role="navigation"', 'nav dock exposes navigation landmark');
  must(navDockSource, 'aria-label="Sol menü"', 'nav dock keeps screen-reader label');
  must(navDockSource, 'aria-current={active ? "page" : undefined}', 'nav dock marks active item as current page');
  must(navDockSource, 'aria-label={label}', 'nav dock labels items for assistive tech');
  must(navDockSource, 'GÜNLÜK AKIŞ', 'nav dock keeps daily flow title visible');
  must(navDockSource, 'PLANLAMA VE SÖZLEŞME', 'nav dock keeps planning and contract title visible');
  must(navDockSource, 'OPERASYON KONTROL', 'nav dock keeps operation control title visible');
  must(navDockSource, 'GÜNLÜK TAKİP', 'nav dock keeps company daily tracking title visible');
  must(navDockSource, 'TİCARİ VE KALİTE', 'nav dock keeps company commercial and quality title visible');
  must(navDockSource, 'const kind = String(me?.companyKind || "").toUpperCase();', 'nav dock keeps companyKind discriminator');
  must(navDockSource, 'const isSchool = kind === "SCHOOL";', 'nav dock keeps school discriminator');
  must(navDockSource, 'const isOrganization = kind === "ORGANIZATION";', 'nav dock keeps organization discriminator');
  must(navDockSource, 'const isCompany = !isSchool && !isOrganization;', 'nav dock keeps company discriminator');
  must(navDockSource, 'companyOpsLabel', 'nav dock keeps company ops label helper');
  must(navDockSource, 'companyPlanningHomeLabel', 'nav dock keeps company planning home label helper');
  must(navDockSource, 'companyPeopleTitle', 'nav dock keeps company people title helper');
  must(navDockSource, 'companyPeopleLinkLabel', 'nav dock keeps company people link label helper');
  must(navDockSource, 'companyPeopleAccessLabel', 'nav dock keeps company people access label helper');
  must(navDockSource, 'companyPeopleGeoLabel', 'nav dock keeps company people georeview label helper');
  must(navDockSource, 'PERSONEL', 'nav dock keeps company personnel title visible');
  must(navDockSource, 'advancedTitle = "SİSTEM"', 'nav dock uses system title for room advanced section');
  mustNot(navDockSource, 'GELİŞMİŞ ▾', 'nav dock room advanced title no longer says advanced');
  must(navDockSource, 'title={null}', 'nav dock removes repeated advanced title inside expanded section');
  must(navDockSource, 'advanced.push({ label: "Oda Konumu", path: "/room/hub" });', 'room konum item stays in advanced section');
  must(navDockSource, 'const companyHubLabel = hubLabelForKind(me?.companyKind);', 'nav dock derives role-aware hub label');
  must(navDockSource, 'advanced.push({ label: companyHubLabel, path: base + "/hub" });', 'company konum item stays in advanced section');
  must(navDockSource, 'advanced.push({ label: "Geri Bildirim", path: "/shared/feedback" });', 'company feedback item moves into advanced section');
  mustNot(navDockSource, 'title: "SİSTEM"', 'company system section no longer appears as a fixed section');
  must(navDockSource, 'Geri Bildirim', 'nav dock keeps feedback item visible');
  must(navDockSource, 'SEFER ABİ', 'nav dock keeps sefer abi group visible');
  must(navDockSource, 'Harita', 'nav dock keeps company map item visible');
  must(navDockSource, 'Okul Operasyon Paneli', 'nav dock keeps school operations item visible');
  must(navDockSource, 'Kurum Operasyon Paneli', 'nav dock keeps organization operations item visible');
  must(navDockSource, 'Operasyon Paneli', 'nav dock keeps company operations item visible');
  must(navDockSource, 'Okul Merkezi', 'nav dock keeps school planning home item visible');
  must(navDockSource, 'Gezi / Planlama Merkezi', 'nav dock keeps organization planning home item visible');
  must(navDockSource, 'Planlama Merkezi', 'nav dock keeps company planning center item visible');
  must(navDockSource, 'Ticari Akış', 'nav dock keeps company commercial item visible');
  must(navDockSource, 'Hizmet Değerlendirme', 'nav dock keeps service evaluation item visible');
  must(navDockSource, 'Öğrenci Link', 'nav dock keeps school access links item visible');
  must(navDockSource, 'Veli Erişimi', 'nav dock keeps school parent access item visible');
  must(navDockSource, 'Öğrenci Konum Seçici', 'nav dock keeps school georeview item visible');
  must(navDockSource, 'Personel Link', 'nav dock keeps company personnel link item visible');
  must(navDockSource, 'Personel Erişimi', 'nav dock keeps company personnel access item visible');
  must(navDockSource, 'Personel Konum Seçici', 'nav dock keeps company personnel georeview item visible');
  must(navDockSource, 'Kurum Planları', 'nav dock keeps organization planning item visible');
  must(navDockSource, 'Konum İncele', 'nav dock keeps organization location item visible');
  mustNot(navDockSource, 'label: "Hub"', 'nav dock removes raw hub label');
  must(navDockSource, 'copilotEntry.label || "Sefer Abi Terminali"', 'nav dock falls back to terminal label');
  must(navDockSource, 'Sefer Abi Terminali', 'nav dock keeps terminal label visible');
  must(navDockSource, 'navDockBrand', 'nav dock keeps brand block');
  must(navDockSource, 'navDockTitle', 'nav dock keeps title block');
  must(navDockSource, 'navItem active', 'nav dock keeps active item styling hook');
  mustNot(navDockSource, 'Yeni', 'nav dock removes visible new badges');

  must(cssSource, 'radial-gradient', 'nav dock keeps premium gradient background');
  must(cssSource, '.navDockBrand,', 'nav dock brand surface styling remains');
  must(cssSource, '.navDockTitle {', 'nav dock title surface styling remains');
  must(cssSource, '.navSection {', 'nav dock section cards remain');
  must(cssSource, '.navAdvanced {', 'nav advanced card remains');
  must(cssSource, '.navItem:hover', 'nav item hover polish remains');
  must(cssSource, '.navItem.active', 'nav item active style remains');
  must(cssSource, '.navItem:focus-visible', 'nav item focus polish remains');
  must(cssSource, '.navToggle:focus-visible', 'nav toggle focus polish remains');
  must(cssSource, '.navBadge {', 'nav badge pill polish remains');
  must(cssSource, '.navLabel {', 'nav label truncation polish remains');
  must(cssSource, 'border-radius: 18px', 'nav dock premium radius remains');
  must(cssSource, 'box-shadow', 'nav dock premium shadow remains');

  must(drawerSource, 'COPILOT_PERSONA.drawerTitle', 'drawer keeps quick-help title source');
  mustNot(drawerSource, 'Sefer Abi Terminali', 'drawer does not become the terminal shell');

  must(helperSource, "terminalLabel: 'Sefer Abi Terminali'", 'persona constant exposes terminal label');
  must(helperSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'persona constant keeps drawer title');
  must(helperSource, 'voiceReadoutConfig', 'persona constant keeps voice config');
  must(labelsSource, 'if (normalized === "SCHOOL") return "Okul Konumu";', 'labels helper keeps school konum label');
  must(labelsSource, 'if (normalized === "ORGANIZATION") return "Toplanma Konumu";', 'labels helper keeps organization konum label');
  must(labelsSource, 'return "Şirket Konumu";', 'labels helper keeps company konum label');

  must(screenRegistrySource, 'COPILOT_MENU_LABEL', 'screen registry keeps centralized copilot label');
  must(screenRegistrySource, 'COPILOT_PERSONA.terminalLabel', 'screen registry reads terminal label from persona');
  must(screenRegistrySource, 'label: COPILOT_MENU_LABEL', 'screen registry uses centralized copilot label');
  must(screenRegistrySource, 'label: "Oda Konumu"', 'screen registry uses room konum label');
  must(screenRegistrySource, 'label: hubLabelForKind("COMPANY")', 'screen registry uses company konum label');
  must(screenRegistrySource, 'label: hubLabelForKind("SCHOOL")', 'screen registry uses school konum label');
  must(screenRegistrySource, 'label: hubLabelForKind("ORGANIZATION")', 'screen registry uses organization konum label');
  must(screenRegistrySource, 'label: "Kurum Planları"', 'screen registry uses organization planning label');

  must(panelSource, 'COPILOT_TERMINAL.title', 'copilot panel keeps terminal title');
  must(panelSource, 'COPILOT_TERMINAL.readonlyBoundary', 'copilot panel keeps readonly boundary');

  mustNot(appSource, '/room/terminal', 'no new room terminal route was added');
  mustNot(appSource, 'TerminalPanel', 'no new terminal component route was added');

  const { COPILOT_PERSONA, COPILOT_TERMINAL } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

  assertNoForbiddenVisibleTerms([
    COPILOT_PERSONA.terminalLabel,
    COPILOT_PERSONA.drawerTitle,
    COPILOT_TERMINAL.title,
    COPILOT_TERMINAL.subtitle,
    COPILOT_TERMINAL.readonlyBoundary,
    'Sefer Abi Terminali',
    'Sefer Abi’ye Sor',
  ].join('\n'), 'nav dock related visible text');

  console.log('=== UX-NAV-01 PREMIUM NAVDOCK CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

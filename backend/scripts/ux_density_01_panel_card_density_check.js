#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
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

function extractQuotedStrings(source) {
  const rows = [];
  const pattern = /(["'])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = pattern.exec(String(source || "")))) {
    const value = String(match[2] || "").trim();
    if (value) rows.push(value);
  }
  return rows;
}

function containsVisibleTerm(text, term) {
  const haystack = normalize(text);
  const target = normalize(term);
  if (!target) return false;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu');
  return pattern.test(haystack);
}

function changedFiles() {
  try {
    return execSync('git diff --name-only', { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function assertNoRestrictedBackendPaths(paths) {
  const allowed = new Set([
    'backend/src/routes/eta.js',
    'backend/src/routes/requests.js',
    'backend/src/routes/driver.js',
    'backend/src/routes/agreements.js',
    'backend/src/routes/boardingChangeRequestOps.js',
    'backend/src/routes/parent.js',
    'backend/src/routes/auth.js',
  ]);
  const forbidden = paths.filter((file) => /^backend\/(src\/routes|prisma|migrations)\//.test(file) && !allowed.has(file));
  if (forbidden.length) {
    fail(`backend route/schema/migration paths changed: ${forbidden.join(', ')}`);
  }
  ok('backend route/schema/migration paths untouched outside approved readonly bridge routes');
}

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'FORBIDDEN',
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'raw',
    'payload',
    'debug',
    'write',
    'execute',
    'settlement execute',
    'Validation failed',
    'Bu aksiyonu simüle et',
    'abi ya',
    'kardeşim',
    'kaptanım',
    'reis',
    'şefim',
  ];
  for (const term of forbidden) {
    if (containsVisibleTerm(text, term)) fail(`${label} avoids ${term}`);
    ok(`${label} avoids ${term}`);
  }
}

function main() {
  console.log('=== UX-DENSITY-01 PANEL/CARD DENSITY CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const cssSource = read('web/src/index.css');
  const helperSource = read('web/src/utils/copilotFacts.js');
  const navDockSource = read('web/src/layout/NavDock.jsx');
  const panelChromeSource = read('web/src/components/PanelChrome.jsx');
  const suggestedChipsSource = read('web/src/components/copilot/SuggestedChips.jsx');
  const chatQuickActionsSource = read('web/src/components/copilot/ChatQuickActions.jsx');
  const chatMessageBubbleSource = read('web/src/components/copilot/ChatMessageBubble.jsx');
  const chatInputBoxSource = read('web/src/components/copilot/ChatInputBox.jsx');
  const copilotPanelSource = read('web/src/panels/shared/CopilotPanel.jsx');
  const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');

  must(pkg, '"check:uxdensity01": "node backend/scripts/ux_density_01_panel_card_density_check.js"', 'package.json exposes check:uxdensity01');
  must(runner, 'check:uxdensity01', 'product extensions runner includes UX-DENSITY-01');
  must(verifyChain, 'check:uxdensity01', 'verify chain includes UX-DENSITY-01');

  must(guide, 'UX-DENSITY-01', 'script guide mentions UX-DENSITY-01');
  must(guide, 'check:uxdensity01', 'script guide exposes check:uxdensity01');
  must(auditDoc, 'UX-DENSITY-01 panel/card density polish', 'audit doc keeps density note');
  must(auditDoc, 'behavior unchanged', 'audit doc keeps behavior unchanged note');

  must(cssSource, 'UX-DENSITY-01 — premium panel/card density standard', 'index.css keeps density marker');
  must(cssSource, 'max-width: 1180px', 'index.css keeps wider wrap width');
  must(cssSource, '.panelChrome { display: grid; gap: 10px; min-width: 0; }', 'index.css keeps panelChrome density standard');
  must(cssSource, '.panelChromeCard { border-radius: var(--ui-surface-radius-lg); }', 'index.css keeps panelChrome radius standard');
  must(cssSource, '.panelChromeHead {', 'index.css keeps panelChrome header styling');
  must(cssSource, 'gap: 10px;', 'index.css keeps tighter premium gaps');
  must(cssSource, '.quality-chip { display: inline-flex; align-items: center; min-height: 30px;', 'index.css keeps quality chip density');
  must(cssSource, '.system-mode-summary-chip {', 'index.css keeps system summary chip styling');
  must(cssSource, '.flow-summary-chip {', 'index.css keeps flow summary chip styling');
  must(cssSource, '.tbl th, .tbl td {', 'index.css keeps table density styling');
  must(cssSource, 'min-height: 40px;', 'index.css keeps compact button baseline');
  must(cssSource, '.copilotChip {', 'index.css keeps copilot chip styling');
  must(cssSource, '.copilotDrawerHeader {', 'index.css keeps drawer header density');
  must(cssSource, '.copilotComposer textarea {', 'index.css keeps drawer composer density');

  must(panelChromeSource, 'gap: 10', 'PanelChrome keeps compact gap');
  must(panelChromeSource, 'marginTop: 4', 'PanelChrome keeps compact subtitle spacing');
  must(panelChromeSource, 'marginTop: 10', 'PanelChrome keeps compact content spacing');

  must(suggestedChipsSource, 'className="copilotChip"', 'SuggestedChips uses shared copilot chip style');
  must(chatQuickActionsSource, 'className="btn sm copilotToolBtn"', 'ChatQuickActions uses compact action buttons');
  must(chatMessageBubbleSource, 'className="btn sm copilotToolBtn"', 'ChatMessageBubble uses compact feedback buttons');
  must(chatInputBoxSource, 'className="btn sm copilotToolBtn"', 'ChatInputBox uses compact send button');
  must(copilotPanelSource, 'wrap wrap--fluid', 'CopilotPanel root remains fluid');
  must(copilotPanelSource, 'gap: 10', 'CopilotPanel uses denser spacing');

  must(navDockSource, 'const kind = String(me?.companyKind || "").toUpperCase();', 'NavDock keeps companyKind discriminator');
  must(navDockSource, 'const isSchool = kind === "SCHOOL";', 'NavDock keeps school discriminator');
  must(navDockSource, 'const isOrganization = kind === "ORGANIZATION";', 'NavDock keeps organization discriminator');
  must(navDockSource, 'const isCompany = !isSchool && !isOrganization;', 'NavDock keeps company discriminator');
  must(navDockSource, 'GÜNLÜK AKIŞ', 'NavDock keeps daily flow group');
  must(navDockSource, 'PLANLAMA VE SÖZLEŞME', 'NavDock keeps planning and contract group');
  must(navDockSource, 'TİCARİ VE KALİTE', 'NavDock keeps commercial and quality group');
  must(navDockSource, 'ÖĞRENCİ VE VELİ', 'NavDock keeps school people group');
  must(navDockSource, 'KATILIMCI VE KONUM', 'NavDock keeps organization people group');
  must(navDockSource, 'PERSONEL', 'NavDock keeps company people group');
  must(navDockSource, 'SEFER ABİ', 'NavDock keeps Sefer Abi group');
  must(navDockSource, 'Sefer Abi Terminali', 'NavDock keeps terminal label');
  must(navDockSource, 'Geri Bildirim', 'NavDock keeps feedback entry visibility');

  must(helperSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'drawer quick-help label remains intact');
  must(drawerSource, 'buildCopilotStarterChips', 'drawer keeps starter chips helper');

  const changed = changedFiles();
  assertNoRestrictedBackendPaths(changed);

  const visibleText = [
    cssSource,
    ...extractQuotedStrings(navDockSource),
    ...extractQuotedStrings(panelChromeSource),
    ...extractQuotedStrings(suggestedChipsSource),
    ...extractQuotedStrings(chatQuickActionsSource),
    ...extractQuotedStrings(chatMessageBubbleSource),
    ...extractQuotedStrings(chatInputBoxSource),
    ...extractQuotedStrings(copilotPanelSource),
    ...extractQuotedStrings(drawerSource),
  ].join('\n');
  assertNoForbiddenVisibleTerms(visibleText, 'density UI surface text');

  console.log('=== UX-DENSITY-01 PANEL/CARD DENSITY CHECK PASS ===');
}

main();

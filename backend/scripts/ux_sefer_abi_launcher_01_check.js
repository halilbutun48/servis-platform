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

function assertDrawerDefaultSize(drawerSource) {
  must(drawerSource, 'DEFAULT_DRAWER_SIZE = "S"', 'drawer defaults to compact size');
  must(drawerSource, 'const [size, setSize] = useState(normalizeDrawerSize(initial.size));', 'drawer uses normalized initial size');
  must(drawerSource, 'function normalizeDrawerSize(size)', 'drawer has size normalizer');
  must(drawerSource, 'return size === "S" || size === "M" ? size : DEFAULT_DRAWER_SIZE;', 'drawer clamps persisted size to small/medium');
  must(drawerSource, 'setSize("S")', 'drawer keeps small size control');
  must(drawerSource, 'setSize("M")', 'drawer keeps medium size control');
  must(drawerSource, 'setSize("L")', 'drawer keeps large size control');
}

console.log('=== UX-SEFER-ABI-LAUNCHER-01 CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/UX_PANEL_STRUCTURE_02_AUDIT.md');
const contextDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const helperSource = read('web/src/utils/copilotFacts.js');
const navDockSource = read('web/src/layout/NavDock.jsx');
const appShellSource = read('web/src/layout/AppShell.jsx');

must(pkg, '"check:uxseferabilauncher01": "node backend/scripts/ux_sefer_abi_launcher_01_check.js"', 'package.json exposes check:uxseferabilauncher01');
must(runner, 'check:uxseferabilauncher01', 'product extensions runner includes launcher check');
must(guide, 'UX-SEFER-ABI-LAUNCHER-01', 'script guide mentions UX-SEFER-ABI-LAUNCHER-01');
must(guide, 'check:uxseferabilauncher01', 'script guide exposes launcher check');
must(auditDoc, 'UX-SEFER-ABI-LAUNCHER-01', 'audit doc keeps launcher note');
must(contextDoc, 'UX-SEFER-ABI-LAUNCHER-01 note', 'copilot context doc keeps launcher note');

must(drawerSource, 'Sefer Abi’ye Sor', 'launcher uses Sefer Abi’ye Sor title');
must(drawerSource, 'Operasyon yardımcısı', 'launcher keeps Operasyon yardımcısı persona text');
must(drawerSource, 'copilotFabBadge', 'launcher includes compact branded badge');
must(drawerSource, 'copilotFabTitle', 'launcher includes compact title');
must(drawerSource, 'copilotFabSubtitle', 'launcher includes compact subtitle');
must(drawerSource, 'copilotFabStatus', 'launcher includes compact status pill');
must(drawerSource, 'aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"', 'launcher exposes clear aria label');
must(drawerSource, 'setOpen(false)', 'drawer still closes back to launcher');
must(drawerSource, 'normalizeDrawerSize(initial.size)', 'drawer normalizes persisted size before init');
assertDrawerDefaultSize(drawerSource);
mustNot(drawerSource, 'Yardım ve copilot', 'launcher no longer says Yardım');
mustNot(drawerSource, '>Yardım<', 'launcher no longer uses bare Yardım label');

must(navDockSource, 'Sefer Abi Terminali', 'nav dock keeps Sefer Abi Terminali label');
must(navDockSource, 'getCopilotMenuEntry', 'nav dock still uses shared copilot menu entry');
must(appShellSource, 'FloatingCopilotDrawer', 'app shell still mounts floating drawer');

must(helperSource, "drawerTitle: 'Sefer Abi’ye Sor'", 'persona constant keeps drawer title');
must(helperSource, "assistantSubtitle: 'Operasyon yardımcısı'", 'persona constant keeps assistant subtitle');
must(helperSource, 'isCompanyShifts', 'starter chip helper recognizes company shifts');
must(helperSource, 'isCompanyQuality', 'starter chip helper recognizes company quality');
must(helperSource, 'Bu vardiya neden başlayamıyor?', 'starter chip helper includes company shifts prompt');
must(helperSource, 'Sözleşmeye bağlı mı?', 'starter chip helper includes company shifts contract prompt');
must(helperSource, 'Değerlendirme bekleyen var mı?', 'starter chip helper includes company quality prompt');

const { buildCopilotStarterChips } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);

assertExactChips(
  buildCopilotStarterChips({ screenPath: '/company/shifts', selection: null }),
  [
    'Bu vardiya neden başlayamıyor?',
    'Atama eksik mi?',
    'Sıradaki doğru işlem ne?',
    'Sözleşmeye bağlı mı?',
  ],
  'company shifts starter chips match launcher context',
);

assertExactChips(
  buildCopilotStarterChips({ screenPath: '/company/agreements', selection: null }),
  [
    'Bugün vardiya üretildi mi?',
    'Üretilen vardiyaları göster',
    'Sözleşme üretim durumunu açıkla',
    'Son üretilen vardiya hangisi?',
  ],
  'company agreements starter chips remain intact',
);

assertExactChips(
  buildCopilotStarterChips({ screenPath: '/company/map', selection: null }),
  [
    'Bu araç neden görünmüyor?',
    'Son GPS ne zaman geldi?',
    'Sürücünün telefon GPS’i devrede mi?',
    'Araç bağlantısı var mı?',
  ],
  'company map starter chips remain intact',
);

console.log('=== UX-SEFER-ABI-LAUNCHER-01 CHECK PASS ===');

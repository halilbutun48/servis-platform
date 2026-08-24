import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertProductExtensionsIncludes,
  assertProductExtensionsOrder,
  productExtensionsChecks,
} from './lib/productExtensionsRegistry.js';

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

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== UX-SUPERADMIN-OVERVIEW-CLEANUP-01 CHECK ===');

  const panel = read('web/src/panels/superadmin/SuperAdminPanel.jsx');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(panel, 'Süper Yönetici', 'superadmin title present');
  must(panel, 'SystemModeSummaryBand', 'system status band present');
  must(panel, 'Kritik geri bildirim', 'critical feedback band present');
  must(panel, 'Geri Bildirimleri aç', 'feedback CTA present');
  must(panel, 'Hızlı erişim', 'quick access retained');
  must(panel, 'Özet', 'summary retained');
  must(panel, 'Bölüm rehberi', 'section guide retained');
  must(panel, 'Alt detay alanları', 'detail area header present');
  must(panel, 'PanelSegmentTabs', 'detail tabs present');
  must(panel, 'Sistem Detayları', 'system details tab present');
  must(panel, 'Geri Bildirimler', 'feedback tab present');
  must(panel, 'Demo Hesapları', 'demo accounts tab present');
  mustNot(panel, 'Demo / Debug', 'demo/debug wording removed from visible tab copy');
  must(panel, 'FeedbackLoopSection', 'feedback section still mounted');
  must(panel, 'activeDetailTab === "system"', 'system detail branch present');
  must(panel, 'activeDetailTab === "feedbacks"', 'feedback detail branch present');
  must(panel, 'activeDetailTab === "demo"', 'demo detail branch present');

  const tabBranchIndex = panel.indexOf('activeDetailTab === "feedbacks"');
  const feedbackRenderIndex = panel.indexOf('<FeedbackLoopSection');
  if (tabBranchIndex < 0 || feedbackRenderIndex < 0 || feedbackRenderIndex < tabBranchIndex) {
    fail('feedback section stays inside detail tab branch');
  }
  ok('feedback section stays inside detail tab branch');

  ordered(panel, [
    'SystemModeSummaryBand',
    'Kritik geri bildirim',
    'Alt detay alanları',
    'PanelSegmentTabs',
    'Hızlı erişim',
    'Bölüm rehberi',
  ], 'overview dashboard order');

  must(pkg, '"check:uxsuperadminoverviewcleanup01"', 'package.json exposes check:uxsuperadminoverviewcleanup01');
  must(guide, 'UX-SUPERADMIN-OVERVIEW-CLEANUP-01', 'script guide mentions UX-SUPERADMIN-OVERVIEW-CLEANUP-01');
  must(guide, 'check:uxsuperadminoverviewcleanup01', 'script guide exposes check:uxsuperadminoverviewcleanup01');
  assertProductExtensionsIncludes('check:uxsuperadminoverviewcleanup01', 'product extensions registry includes superadmin overview cleanup check', registryScripts);
  assertProductExtensionsOrder(['check:web01a', 'check:web01b', 'check:uxsuperadminoverviewcleanup01', 'check:cop01e'], 'product extensions registry order keeps superadmin overview near web01b', registryScripts);

  console.log('=== UX-SUPERADMIN-OVERVIEW-CLEANUP-01 CHECK PASS ===');
}

main();

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

function ordered(text, needles, label) {
  let last = -1;
  for (const needle of needles) {
    const idx = normalize(text).indexOf(normalize(needle));
    if (idx < 0) fail(`${label}: missing ${needle}`);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const backlog = read('docs/NEXT_BACKLOG_V1.md');

  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json exposes check:product-extensions');
  must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json exposes check:verifychain01');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json keeps verify:final product extension step');
  must(pkg, '"check:web01a"', 'package.json keeps check:web01a');
  must(pkg, '"check:web01b"', 'package.json keeps check:web01b');
  must(pkg, '"check:paysafe01"', 'package.json keeps check:paysafe01');
  must(pkg, '"check:pay01e"', 'package.json keeps check:pay01e');
  must(pkg, '"check:cop02a"', 'package.json keeps check:cop02a');
  must(pkg, '"check:docsstate01"', 'package.json keeps check:docsstate01');
  must(pkg, '"check:op04"', 'package.json keeps check:op04');
  must(pkg, '"check:qlt04b"', 'package.json keeps check:qlt04b');
  must(pkg, '"check:cop01e"', 'package.json keeps check:cop01e');
  must(pkg, '"check:uxkvkk01"', 'package.json keeps check:uxkvkk01');
  must(pkg, '"check:cop02b"', 'package.json keeps check:cop02b');
  must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
  must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');
  must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
  must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');
  must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');
  must(pkg, '"check:cop03cfix01"', 'package.json keeps check:cop03cfix01');
  must(pkg, '"check:cop03cfix02"', 'package.json keeps check:cop03cfix02');

  ordered(runner, [
    'check:op04',
    'check:qlt04b',
    'check:pay01e',
    'check:paysafe01',
    'check:web01a',
    'check:web01b',
    'check:cop01e',
    'check:cop02a',
    'check:cop02b',
    'check:cop03a',
    'check:cop03afix01',
    'check:cop03afix02',
    'check:cop03b',
    'check:cop03c',
    'check:cop03cfix01',
    'check:uxkvkk01',
    'check:docsstate01',
    'check:cop03cfix02',
  ], 'product extensions runner order');

  must(guide, 'check:product-extensions', 'script guide exposes check:product-extensions');
  must(guide, 'check:verifychain01', 'script guide exposes check:verifychain01');
  must(guide, 'check:cop03a', 'script guide exposes check:cop03a');
  must(guide, 'check:cop03afix01', 'script guide exposes check:cop03afix01');
  must(guide, 'check:cop03afix02', 'script guide exposes check:cop03afix02');
  must(guide, 'check:cop03b', 'script guide exposes check:cop03b');
  must(guide, 'check:cop03c', 'script guide exposes check:cop03c');
  must(guide, 'check:cop03cfix01', 'script guide exposes check:cop03cfix01');
  must(guide, 'check:cop03cfix02', 'script guide exposes check:cop03cfix02');
  must(guide, 'VERIFY-CHAIN-01', 'script guide mentions VERIFY-CHAIN-01');
  must(backlog, 'VERIFY-CHAIN-01', 'backlog keeps VERIFY-CHAIN-01 visible');
  must(backlog, 'P0:', 'backlog keeps P0 section');
  must(backlog, 'DOCS-STATE-01 sonrası resmi sonraki ürün sırası', 'backlog keeps next-product wording');

  console.log('=== VERIFY-CHAIN-01 PRODUCT EXTENSIONS CHECK PASS ===');
}

main();

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) {
    throw new Error(`FAIL ${msg}`);
  }
  console.log(`OK ${msg}`);
}

function mustNot(text, needle, msg) {
  if (String(text || '').includes(needle)) {
    throw new Error(`FAIL ${msg}`);
  }
  console.log(`OK ${msg}`);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

console.log('=== BRAND CHECK ===');

const pkg = JSON.parse(read('package.json'));
const webBrand = 'web/src/config/brand.js';
const mobileBrand = 'mobile/src/lib/brand.js';
const appShell = read('web/src/layout/AppShell.jsx');
const navDock = read('web/src/layout/NavDock.jsx');
const brandMark = read('web/src/components/BrandMark.jsx');
const webBrandFile = read(webBrand);
const mobileBrandFile = read(mobileBrand);

must(pkg.scripts?.['check:brand'] === 'node tools/check_brand.js', 'root package exposes check:brand script');
must(exists(webBrand), 'web central brand config exists');
must(exists(mobileBrand), 'mobile central brand config exists');
must(/export\s+const\s+BRAND_NAME\s*=\s*["']SeferPakt["']/.test(webBrandFile), 'web brand config keeps SeferPakt');
must(/export\s+const\s+BRAND_NAME\s*=\s*["']SeferPakt["']/.test(mobileBrandFile), 'mobile brand config keeps SeferPakt');
must(/from\s+["']\.\.\/config\/brand\.js["']/.test(appShell), 'AppShell imports brand config with explicit extension');
must(/from\s+["']\.\.\/config\/brand\.js["']/.test(navDock), 'NavDock imports brand config with explicit extension');
must(/from\s+["']\.\.\/config\/brand\.js["']/.test(brandMark), 'BrandMark imports brand config with explicit extension');
must(/BRAND_NAME/.test(appShell), 'AppShell renders shared brand name');
must(/BRAND_NAME/.test(navDock), 'NavDock renders shared brand name');
must(/BRAND_NAME/.test(brandMark), 'BrandMark renders shared brand name');
mustNot(appShell, 'const BRAND_NAME = "Vardis"', 'AppShell removes local Vardis brand hardcode');
mustNot(navDock, 'const BRAND_NAME = "Vardis"', 'NavDock removes local Vardis brand hardcode');
mustNot(brandMark, 'Vardis', 'BrandMark removes visible Vardis hardcode');

console.log('Brand check passed');

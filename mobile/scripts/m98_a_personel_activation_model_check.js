const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function normalize(text) {
  return String(text || '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function includes(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(cond, label) {
  if (!cond) {
    fail(label);
    return;
  }
  ok(label);
}

console.log('=== M98-A PERSONEL ACTIVATION MODEL CHECK ===');

const pkg = JSON.parse(read('mobile/package.json'));
const roleHome = read('mobile/src/screens/RoleHomeScreen.js');
const activationState = read('mobile/src/app/personelActivationState.js');
const card = read('mobile/src/screens/PersonelActivationCard.js');
const primer = read('docs/PRIMER_SSOT.md');
const registry = read('docs/MILESTONE_REGISTRY_V1.md');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const state = read('tools/repo_contract_state.json');

must(includes(JSON.stringify(pkg.scripts || {}), 'check:m98a'), 'package exposes m98a check');
must(includes(pkg.scripts?.['acceptance:mobile'] || '', 'check:m98a'), 'acceptance chain includes m98a');
must(includes(activationState, 'buildPersonelActivationState'), 'personel activation helper exists');
must(includes(activationState, 'activationPending'), 'personel activation helper keeps activation state');
must(includes(card, 'Personel aktivasyon modeli'), 'personel activation card keeps title');
must(includes(card, 'Kurum daveti'), 'personel activation card keeps invite model');
must(includes(card, 'İlk girişte PIN/şifre değişimi gerekli'), 'personel activation card keeps first login guidance');
must(includes(card, 'Hesap pasife alınırsa canlı takip kapanır'), 'personel activation card keeps closure note');
must(includes(card, 'mobil model seviyesindedir') || includes(card, 'Tam aktivasyon entegrasyonu'), 'personel activation card keeps model-only scope');
must(includes(roleHome, 'PersonelActivationCard'), 'role home renders personel activation card');
must(includes(roleHome, "key === 'PERSONEL'"), 'role home keeps personel activation scope');
must(includes(primer, 'M98-A personel activation model'), 'primer mentions M98-A');
must(includes(registry, 'M98-A - personel activation model - active'), 'registry mentions M98-A');
must(includes(guide, 'M98-A — personel activation model [CHECK]'), 'script guide mentions M98-A');
must(includes(state, '"M98-A"'), 'repo state keeps M98-A visible');

if (process.exitCode) {
  console.error('=== M98-A PERSONEL ACTIVATION MODEL CHECK FAIL ===');
  process.exit(process.exitCode);
}

console.log('M98-A personel activation model check passed');

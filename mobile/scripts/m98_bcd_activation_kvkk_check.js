const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(mobileRoot, rel), 'utf8');
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

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log('=== M98-B/C/D PARENT ACTIVATION + LINK ACCESS + KVKK MATRIX CHECK ===');

const pkg = JSON.parse(read('package.json'));
const roleHome = read('src/screens/RoleHomeScreen.js');
const parentActivationState = read('src/app/parentActivationState.js');
const linkAccessState = read('src/app/linkAccessState.js');
const kvkkVisibilityMatrixState = read('src/app/kvkkVisibilityMatrixState.js');
const parentActivationCard = read('src/screens/ParentActivationCard.js');
const linkAccessCard = read('src/screens/LinkAccessCard.js');
const kvkkVisibilityMatrixCard = read('src/screens/KvkkVisibilityMatrixCard.js');
const primer = read('../docs/PRIMER_SSOT.md');
const registry = read('../docs/MILESTONE_REGISTRY_V1.md');
const guide = read('../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const state = read('../tools/repo_contract_state.json');

must(has(JSON.stringify(pkg.scripts || {}), 'check:m98bcd'), 'package exposes m98bcd check');
must(has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m98bcd'), 'acceptance chain includes m98bcd');
must(has(pkg.scripts?.['check:m1'] || '', 'check:m98bcd'), 'check:m1 includes m98bcd');

must(has(parentActivationState, 'Veli aktivasyon modeli'), 'parent activation state keeps title');
must(has(parentActivationState, 'Davet bağlantısı ilk aktivasyon içindir'), 'parent activation state keeps invite policy');
must(has(parentActivationState, 'İlk girişte PIN/şifre değişimi gerekli'), 'parent activation state keeps first login guidance');
must(has(parentActivationState, 'İlişki kaldırılırsa takip kapanır'), 'parent activation state keeps closure rule');

must(has(linkAccessState, 'Davet bağlantısı 7 gün geçerlidir'), 'link access state keeps link lifetime');
must(has(linkAccessState, 'Takip yalnız bağlı öğrenci için görünür') || has(linkAccessState, 'Takip yalnız bağlı servis için görünür'), 'link access state keeps tracking scope');
must(has(linkAccessState, 'KVKK kapalıysa takip görünmez'), 'link access state keeps kvkk guard');

must(has(kvkkVisibilityMatrixState, 'KVKK görünürlük matrisi'), 'kvkk matrix state keeps title');
must(has(kvkkVisibilityMatrixState, 'Sürücünün telefon GPS\'i'), 'kvkk matrix state keeps driver gps wording');
must(has(kvkkVisibilityMatrixState, 'Atama yoksa takip yok'), 'kvkk matrix state keeps no-assignment rule');
must(has(kvkkVisibilityMatrixState, 'Aktif servis yoksa takip yok'), 'kvkk matrix state keeps no-service rule');
must(has(kvkkVisibilityMatrixState, 'KVKK kapalıysa GPS yok'), 'kvkk matrix state keeps kvkk block rule');

must(has(parentActivationCard, 'ParentActivationCard'), 'parent activation card exists');
must(has(parentActivationCard, 'Info label="Bağlantı"'), 'parent activation card keeps invite row');
must(has(parentActivationCard, 'Hesap pasife alınırsa canlı takip kapanır'), 'parent activation card keeps closure text');

must(has(linkAccessCard, 'LinkAccessCard'), 'link access card exists');
must(has(linkAccessCard, 'Info label="Bağlantı süresi"'), 'link access card keeps lifetime text');
must(has(linkAccessCard, 'Takip yalnız aktif servis ve yetkili ilişki varsa görünür'), 'link access card keeps visibility note');

must(has(kvkkVisibilityMatrixCard, 'KvkkVisibilityMatrixCard'), 'kvkk matrix card exists');
must(has(kvkkVisibilityMatrixCard, 'Şu an bu rol'), 'kvkk matrix card highlights current role');
must(has(kvkkVisibilityMatrixCard, 'Atama yoksa takip yok'), 'kvkk matrix card keeps policy slogan');

must(has(roleHome, 'ParentActivationCard'), 'role home imports parent activation card');
must(has(roleHome, 'LinkAccessCard'), 'role home imports link access card');
must(has(roleHome, 'KvkkVisibilityMatrixCard'), 'role home imports kvkk matrix card');
must(has(roleHome, "key === 'PARENT'"), 'role home keeps parent branch');
must(has(roleHome, "key === 'PERSONEL'"), 'role home keeps personel branch');
must(has(roleHome, 'roleLive={roleLive}'), 'role home passes roleLive to policy cards');

must(has(primer, 'Parent activation and link access: `M98-B parent activation and link access`'), 'primer mentions M98-B');
must(has(primer, 'Link lifetime and tracking authority: `M98-C link lifetime and tracking authority`'), 'primer mentions M98-C');
must(has(primer, 'KVKK visibility matrix: `M98-D kvkk visibility matrix`'), 'primer mentions M98-D');

must(has(registry, 'M98-B - parent activation and link access - active'), 'registry mentions M98-B');
must(has(registry, 'M98-C - link lifetime and tracking authority - active'), 'registry mentions M98-C');
must(has(registry, 'M98-D - kvkk visibility matrix - active'), 'registry mentions M98-D');

must(has(guide, 'M98-B — parent activation and link access [CHECK]'), 'script guide mentions M98-B');
must(has(guide, 'M98-C — link lifetime and tracking authority [CHECK]'), 'script guide mentions M98-C');
must(has(guide, 'M98-D — kvkk visibility matrix [CHECK]'), 'script guide mentions M98-D');

must(has(state, '"M98-B"'), 'repo state keeps M98-B visible');
must(has(state, '"M98-C"'), 'repo state keeps M98-C visible');
must(has(state, '"M98-D"'), 'repo state keeps M98-D visible');

console.log('M98-B/C/D parent activation + link access + KVKK matrix check passed');

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
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

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E24B PERSONEL + PARENT PREMIUM CHECK ===');

const pkg = JSON.parse(read('package.json'));
const roleHome = read('src/screens/RoleHomeScreen.js');
const roleLivePremiumCard = read('src/screens/RoleLivePremiumCard.js');
const roleSurface = read('src/lib/roleSurface.js');
const roleLiveState = read('src/app/roleLiveState.js');

must(Boolean(pkg?.scripts?.['check:m95e24b']), 'package exposes m95e24b check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e24b'), 'check:m1 includes m95e24b');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e24b'), 'acceptance chain includes m95e24b');

must(has(roleSurface, 'export function resolveMobileRolePremiumSurface'), 'role surface exports premium surface helper');
must(has(roleSurface, 'Bugünkü servis'), 'role surface keeps personel premium title');
must(has(roleSurface, 'Öğrencimin servisi'), 'role surface keeps parent premium title');
must(has(roleSurface, 'Servis akışı ve kritik bilgiler tek yerde.'), 'role surface keeps premium subtitle');
must(has(roleSurface, 'Servis seçimi'), 'role surface keeps service chooser title');
must(has(roleSurface, 'Çocuk seçimi'), 'role surface keeps child chooser title');
must(has(roleSurface, 'Kısa operasyon özeti'), 'role surface keeps advanced summary copy');

must(has(roleLiveState, 'export function buildRoleLivePremiumSurface'), 'role live state exports premium view helper');
must(has(roleLiveState, 'GPS bekleniyor'), 'role live state keeps waiting GPS copy');
must(has(roleLiveState, 'GPS eski'), 'role live state keeps stale GPS copy');
must(has(roleLiveState, 'Servisim '), 'role live state keeps personel hero copy');
must(has(roleLiveState, 'Servis '), 'role live state keeps parent hero copy');

must(has(roleLivePremiumCard, 'Bugünkü servis'), 'premium card renders personel hero title');
must(has(roleLivePremiumCard, 'Öğrencimin servisi'), 'premium card renders parent hero title');
must(has(roleLivePremiumCard, 'Canlı takip'), 'premium card renders live action');
must(has(roleLivePremiumCard, 'Bildirimler'), 'premium card renders notifications section');
must(has(roleLivePremiumCard, 'Servis detayları'), 'premium card renders personel details section');
must(has(roleLivePremiumCard, 'Öğrenci / servis detayları'), 'premium card renders parent details section');
must(has(roleLivePremiumCard, 'Gelişmiş durum'), 'premium card renders advanced section');
must(has(roleLivePremiumCard, 'Farklı duraktan bineceğim'), 'premium card renders personel secondary boarding action');
must(has(roleLivePremiumCard, 'Bugün öğrencim servise binmeyecek'), 'premium card renders parent no-show action');
must(has(roleLivePremiumCard, 'Servis seçimi'), 'premium card renders service chooser');
must(has(roleLivePremiumCard, 'Çocuk seçimi'), 'premium card renders child chooser');
must(has(roleLivePremiumCard, 'GPS güncelleme'), 'premium card renders GPS freshness row');
must(has(roleLivePremiumCard, 'Kısa operasyon özeti'), 'premium card keeps advanced summary copy');
must(has(roleLivePremiumCard, 'Personel canlı takip'), 'premium card keeps legacy personel label');
must(has(roleLivePremiumCard, 'Veli canlı takip'), 'premium card keeps legacy parent label');
must(has(roleLivePremiumCard, 'Temsilî rota özeti'), 'premium card renders route preview');

must(has(roleHome, 'RoleLivePremiumCard'), 'role home imports premium card');
must(has(roleHome, 'buildRoleLivePremiumSurface'), 'role home uses premium view helper');
must(has(roleHome, 'resolveMobileRolePremiumSurface'), 'role home uses premium surface helper');
must(has(roleHome, 'roleLive={roleLive}'), 'role home forwards roleLive to premium surface');
must(has(roleHome, 'legacyCards'), 'role home keeps legacy cards bridge');
must(has(roleHome, 'legacyLabels'), 'role home keeps legacy labels bridge');
must(has(roleHome, 'PersonelActivationCard'), 'role home keeps personel activation card reference');
must(has(roleHome, 'ParentActivationCard'), 'role home keeps parent activation card reference');
must(has(roleHome, 'LinkAccessCard'), 'role home keeps link access card reference');
must(has(roleHome, 'KvkkVisibilityMatrixCard'), 'role home keeps kvkk matrix card reference');
must(has(roleHome, 'NotificationCenterCard'), 'role home keeps notification card reference');
must(has(roleHome, 'BoardingChangeCard'), 'role home keeps boarding change card reference');
must(has(roleHome, 'isLiveRole ? ('), 'role home keeps live / overview split token');

console.log('M95-E24B personel + parent premium check passed');

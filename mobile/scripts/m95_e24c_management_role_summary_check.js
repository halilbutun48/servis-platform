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

console.log('=== M95-E24C MANAGEMENT ROLE SUMMARY CHECK ===');

const pkg = JSON.parse(read('package.json'));
const roleSurface = read(path.join('src', 'lib', 'roleSurface.js'));
const roleHome = read(path.join('src', 'screens', 'RoleHomeScreen.js'));
const roleOverview = read(path.join('src', 'screens', 'RoleOverviewPremiumCard.js'));
const mobileContent = read(path.join('src', 'app', 'MobileAppContent.js'));

must(Boolean(pkg?.scripts?.['check:m95e24c']), 'package exposes m95e24c check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e24c'), 'check:m1 includes m95e24c');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e24c'), 'acceptance chain includes m95e24c');

must(has(roleSurface, 'export function resolveMobileRolePremiumSurface'), 'role surface exports premium surface resolver');
must(has(roleSurface, 'Firma özeti'), 'role surface keeps company premium title');
must(has(roleSurface, 'Okul özeti'), 'role surface keeps school premium title');
must(has(roleSurface, 'Oda özeti'), 'role surface keeps room premium title');
must(has(roleSurface, 'Operasyon özeti'), 'role surface keeps operation premium title');
must(has(roleSurface, 'Yönetim özeti'), 'role surface keeps super admin premium title');
must(has(roleSurface, 'Bugünkü servislerin genel durumu'), 'role surface keeps company subtitle');
must(has(roleSurface, 'Öğrenci servislerinin genel durumu'), 'role surface keeps school subtitle');
must(has(roleSurface, 'Servis operasyonunun genel görünümü'), 'role surface keeps management subtitle');
must(has(roleSurface, 'Detaylı yönetim için web panelden devam edin.'), 'role surface keeps web panel guidance');
must(has(roleSurface, 'Web paneli aç'), 'role surface keeps web panel action label');

must(has(mobileContent, "role && role !== 'DRIVER'"), 'mobile shell still routes non-driver roles to role home');

must(has(roleHome, 'RoleOverviewPremiumCard'), 'role home imports the management premium card');
must(has(roleHome, 'if (isOverviewRole)'), 'role home uses the management overview branch');
must(has(roleHome, 'RoleLivePremiumCard'), 'role home still keeps live premium card');

must(has(roleOverview, 'resolveMobileRolePremiumSurface'), 'overview card uses the premium surface resolver');
must(has(roleOverview, 'Detaylı yönetim için web panelden devam edin.'), 'overview card renders web panel guidance');
must(has(roleOverview, 'Web paneli aç'), 'overview card renders web panel action');
must(has(roleOverview, 'Bildirimler'), 'overview card keeps notifications section');
must(has(roleOverview, 'Gelişmiş durum'), 'overview card keeps advanced section');
must(has(roleOverview, 'Mobilde yalnızca hafif özet görünür.'), 'overview card keeps light summary note');
must(has(roleOverview, 'NotificationCenterCard'), 'overview card keeps notification center bridge');

console.log('M95-E24C management role summary check passed');

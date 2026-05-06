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

console.log('=== M95-E24A COMMON LOGIN ROLE RESOLVER CHECK ===');

const pkg = JSON.parse(read('package.json'));
const roleSurface = read(path.join('src', 'lib', 'roleSurface.js'));
const appContent = read(path.join('src', 'app', 'MobileAppContent.js'));

must(Boolean(pkg?.scripts?.['check:m95e24a']), 'package exposes m95e24a check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e24a'), 'check:m1 includes m95e24a');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e24a'), 'acceptance chain includes m95e24a');

must(has(roleSurface, 'export function getMobileLoginCopy'), 'role surface exports login copy helper');
must(has(roleSurface, 'Telefon / e-posta / kullanıcı kodu'), 'role surface keeps common login label');
must(has(roleSurface, 'Telefon / e-posta / kullanıcı kodu ile giriş yapın.'), 'role surface keeps common login helper');
must(has(roleSurface, 'export function resolveMobileRoleKey'), 'role surface exports role key resolver');
must(has(roleSurface, "if (key === 'ORGANIZATION') return 'COMPANY';"), 'role surface maps organization to company');
must(has(roleSurface, "if (key === 'COMPANY' && normalizeCompanyKind(companyKind) === 'SCHOOL') return 'SCHOOL';"), 'role surface keeps company/school resolver');
must(has(roleSurface, 'resolveMobileRoleSurface'), 'role surface exports mobile role surface resolver');
must(has(roleSurface, 'resolveMobileRolePremiumSurface'), 'role surface exports premium surface resolver');

must(has(appContent, 'RoleHomeScreen'), 'mobile app content keeps role home screen wiring');
must(has(appContent, "role && role !== 'DRIVER'"), 'mobile app content routes non-driver roles away from driver shell');

console.log('M95-E24A common login role resolver check passed');

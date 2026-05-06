const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
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

function must(cond, message) {
  if (!cond) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`OK ${message}`);
}

console.log('=== M98-E2D MOBILE CODE + PIN LOGIN CHECK ===');

const rootPkg = JSON.parse(read('package.json'));
const mobilePkg = JSON.parse(read('mobile/package.json'));
const apiJs = read('mobile/src/lib/api.js');
const handlersJs = read('mobile/src/app/mobileAppHandlers.js');
const contentJs = read('mobile/src/app/MobileAppContent.js');
const loginScreenJs = read('mobile/src/screens/LoginScreen.js');
const roleSurfaceJs = read('mobile/src/lib/roleSurface.js');
const forcePasswordScreenJs = read('mobile/src/screens/ForcePasswordChangeScreen.js');
const pinChangeScreenJs = read('mobile/src/screens/PinChangeScreen.js');

must(Boolean(rootPkg?.scripts?.['check:m98e2d']), 'root package exposes check:m98e2d');
must(Boolean(mobilePkg?.scripts?.['check:m98e2d']), 'mobile package exposes check:m98e2d');
must(String(mobilePkg?.scripts?.['check:m1'] || '').includes('check:m98e2d'), 'mobile check:m1 includes m98e2d');
must(String(mobilePkg?.scripts?.['acceptance:mobile'] || '').includes('check:m98e2d'), 'mobile acceptance chain includes m98e2d');

must(has(apiJs, 'export async function acceptPersonelInvite'), 'mobile api exports acceptPersonelInvite helper');
must(has(apiJs, '/api/auth/personel-invite/accept'), 'mobile api targets personel invite accept endpoint');
must(has(apiJs, 'export function isCredentialLoginError'), 'mobile api exports credential login error helper');
must(has(apiJs, 'Kullanıcı kodu gerekli.'), 'mobile api uses user-code validation copy');
must(has(apiJs, 'Kullanıcı kodu veya PIN/şifre hatalı.'), 'mobile api uses generic invalid credential copy');

must(has(handlersJs, 'acceptPersonelInvite'), 'mobile handlers import acceptPersonelInvite');
must(has(handlersJs, 'isCredentialLoginError'), 'mobile handlers import credential login error helper');
must(has(handlersJs, '^[A-Z0-9]{8}$'), 'mobile handlers detect personel access code format');
must(has(handlersJs, '^\\d{6}$'), 'mobile handlers detect personel access pin format');
must(has(handlersJs, 'passwordChangeRequired'), 'mobile handlers persist password change flag');
must(has(handlersJs, 'requirePasswordChange: false'), 'mobile handlers clear password change flags after success');
must(has(handlersJs, 'changeDriverPin'), 'mobile handlers keep driver pin change flow');

must(has(contentJs, "state?.session?.passwordChangeRequired"), 'mobile content checks session password change flag');
must(has(contentJs, "state?.session?.requirePasswordChange"), 'mobile content checks legacy session password change flag');
must(has(contentJs, 'PinChangeScreen'), 'mobile content keeps driver pin screen');
must(has(contentJs, 'ForcePasswordChangeScreen'), 'mobile content keeps force password screen');
must(has(contentJs, "role === 'DRIVER' && Boolean(state?.me?.requirePinChange)"), 'mobile content keeps driver pin gate');

must(has(loginScreenJs, 'Kullanıcı kodu'), 'login screen uses user code label');
must(has(loginScreenJs, 'Size verilen sürücü, personel veya veli kodunu girin.'), 'login screen uses new helper subtitle');
must(has(loginScreenJs, 'PIN veya şifre'), 'login screen keeps pin or password field');
must(has(loginScreenJs, 'loginCopy.buttonText'), 'login screen uses login button copy');
must(has(loginScreenJs, 'getMobileLoginCopy'), 'login screen uses shared login copy helper');
must(!has(loginScreenJs, 'Sürücü Kodu veya e-posta'), 'login screen removes old driver-email label');
must(!has(loginScreenJs, 'Telefon / e-posta'), 'login screen removes old phone-email copy');
must(!has(loginScreenJs, 'Sürücü kodunuzu ve PIN bilginizi girin'), 'login screen removes old driver-only helper');

must(has(roleSurfaceJs, 'identifierLabel: \'Kullanıcı kodu\''), 'role surface login copy uses user code label');
must(has(roleSurfaceJs, 'Size verilen sürücü, personel veya veli kodunu girin.'), 'role surface login copy uses new helper text');

must(has(forcePasswordScreenJs, 'İlk şifreni değiştir'), 'force password screen remains present');
must(has(pinChangeScreenJs, 'PIN değiştir'), 'driver pin change screen remains present');

console.log('=== M98-E2D MOBILE CODE + PIN LOGIN CHECK PASS ===');

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function assert(cond, message) {
  if (!cond) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`OK ${message}`);
}

console.log('=== M98-E1 MOBILE FORCE PASSWORD CHANGE CHECK ===');

const packageJson = JSON.parse(read('mobile/package.json'));
const apiJs = read('mobile/src/lib/api.js');
const stateJs = read('mobile/src/app/mobileAppState.js');
const handlersJs = read('mobile/src/app/mobileAppHandlers.js');
const contentJs = read('mobile/src/app/MobileAppContent.js');
const screenJs = read('mobile/src/screens/ForcePasswordChangeScreen.js');
const appJs = read('mobile/App.js');

assert(Boolean(packageJson.scripts?.['check:m98e1']), 'mobile package exposes check:m98e1');
assert(String(packageJson.scripts?.['check:m1'] || '').includes('check:m98e1'), 'mobile check:m1 includes m98e1');
assert(String(packageJson.scripts?.['acceptance:mobile'] || '').includes('check:m98e1'), 'mobile acceptance chain includes m98e1');

assert(/export\s+async\s+function\s+changePassword\s*\(/.test(apiJs), 'mobile api exports changePassword helper');
assert(apiJs.includes('/api/auth/change-password'), 'mobile changePassword helper targets auth change-password endpoint');

assert(stateJs.includes('requirePasswordChange'), 'mobile snapshot keeps requirePasswordChange in me state');

assert(/changePassword/.test(handlersJs), 'mobile handlers import changePassword');
assert(/handlePasswordChange\s*\(/.test(handlersJs), 'mobile handlers define handlePasswordChange');
assert(/refreshToken:\s*''/.test(handlersJs), 'mobile password change handler clears refresh token');
assert(/setScreen\('today'\)/.test(handlersJs), 'mobile password change handler returns to today screen');

assert(contentJs.includes('ForcePasswordChangeScreen'), 'mobile app content imports force password screen');
assert(contentJs.includes('requiresPasswordChange'), 'mobile app content checks password change requirement');
assert(contentJs.includes('PinChangeScreen'), 'mobile app content keeps driver pin screen');
assert(contentJs.includes("role && role !== 'DRIVER'"), 'mobile app content routes non-driver roles to role home');
assert(contentJs.includes('onSubmit={onPasswordChange}'), 'mobile app content wires password change handler');

assert(screenJs.includes('İlk şifreni değiştir'), 'force password screen title is present');
assert(screenJs.includes('Yeni şifre'), 'force password screen has new password field');
assert(screenJs.includes('Yeni şifre tekrar'), 'force password screen has password repeat field');
assert(!screenJs.includes('currentPassword'), 'force password screen does not expose current password field');

assert(appJs.includes('onPasswordChange={mobileHandlers.handlePasswordChange}'), 'mobile App wires password change handler');

console.log('=== M98-E1 MOBILE FORCE PASSWORD CHANGE CHECK PASS ===');

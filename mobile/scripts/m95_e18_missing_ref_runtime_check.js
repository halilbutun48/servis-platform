const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(mobileRoot, rel), 'utf8');
}

function fail(message) {
  throw new Error(`M95-E18 FAIL: ${message}`);
}

function must(cond, msg) {
  if (!cond) fail(msg);
  console.log(`OK ${msg}`);
}

console.log('=== M95-E18 MISSING REF RUNTIME CHECK ===');

const app = read('App.js');
const lifecycle = read(path.join('src', 'app', 'useMobileAppLifecycle.js'));
const pkg = JSON.parse(read('package.json'));

const signature = lifecycle.match(/export function useMobileAppLifecycle\(\{([\s\S]*?)\}\)\s*\{/);
must(Boolean(signature), 'useMobileAppLifecycle signature exists');

const signatureBlock = signature[1];
must(signatureBlock.includes('lastSyncedSessionTokenRef'), 'useMobileAppLifecycle destructures lastSyncedSessionTokenRef');
must(app.includes('lastSyncedSessionTokenRef,'), 'App.js passes lastSyncedSessionTokenRef to the hook');
must(lifecycle.includes('lastSyncedSessionTokenRef?.current === session.token'), 'lifecycle uses lastSyncedSessionTokenRef safely');

const requiredParams = [
  'state',
  'setState',
  'syncSignedIn',
  'refreshGpsStatus',
  'applySessionFailure',
  'appStateRef',
  'lastTodayRefreshAtRef',
  'lastVoiceCueRef',
  'lastVoiceWelcomeRef',
  'lastVoiceCompletionRef',
  'lastDriverAwarenessCueRef',
  'lastSyncedSessionTokenRef',
  'apiBaseUrl',
];

for (const name of requiredParams) {
  must(signatureBlock.includes(name), `useMobileAppLifecycle keeps ${name}`);
}

must(Boolean(pkg?.scripts?.['check:m95e18']), 'package exposes m95e18 check');
must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e18'), 'check:m1 includes m95e18');
must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e18'), 'acceptance chain includes m95e18');

console.log('M95-E18 missing ref runtime check passed');

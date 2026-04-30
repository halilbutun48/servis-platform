const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');

function read(rel, root = mobileRoot) {
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

console.log('=== M95-E0 ANDROID BUILD READINESS CHECK ===');

const pkg = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));
const appJson = JSON.parse(read('app.json'));
const app = appJson?.expo || {};
const runbook = read('../docs/RUNBOOK_M95E0_ANDROID_BUILD.md', mobileRoot);
const primer = read('../docs/PRIMER_SSOT.md', mobileRoot);
const registry = read('../docs/MILESTONE_REGISTRY_V1.md', mobileRoot);
const guide = read('../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md', mobileRoot);
const repoState = read('../tools/repo_contract_state.json', mobileRoot);

const scripts = JSON.stringify(pkg.scripts || {});

must(has(scripts, 'check:m95e0'), 'package exposes m95e0 check');
must(has(scripts, 'build:android:apk'), 'package exposes android apk build alias');
must(has(scripts, 'build:android:aab'), 'package exposes android aab build alias');
must(has(scripts, 'check:m1'), 'package keeps m1 chain');
must(has(scripts, 'acceptance:mobile'), 'package keeps mobile acceptance chain');
must(has(scripts, 'check:m95e0') && has(pkg.scripts?.['check:m1'] || '', 'check:m95e0'), 'check:m1 includes m95e0');
must(has(scripts, 'check:m95e0') && has(pkg.scripts?.['acceptance:mobile'] || '', 'check:m95e0'), 'acceptance chain includes m95e0');

must(Boolean(eas?.build?.preview), 'eas preview profile exists');
must(Boolean(eas?.build?.production), 'eas production profile exists');
must(String(eas?.build?.preview?.android?.buildType || '').trim().toLowerCase() === 'apk', 'preview profile builds apk');
must(String(eas?.build?.production?.android?.buildType || '').trim().toLowerCase() === 'app-bundle', 'production profile builds app-bundle');
must(String(eas?.build?.preview?.distribution || '').trim().toLowerCase() === 'internal', 'preview profile keeps internal distribution');

must(String(app?.android?.package || '').trim() === 'com.personelservis.driver', 'android package is set');
must(has(JSON.stringify(app?.android?.permissions || []), 'ACCESS_COARSE_LOCATION'), 'android permissions keep coarse location');
must(has(JSON.stringify(app?.android?.permissions || []), 'ACCESS_FINE_LOCATION'), 'android permissions keep fine location');
must(has(JSON.stringify(app?.android?.permissions || []), 'ACCESS_BACKGROUND_LOCATION'), 'android permissions keep background location');
must(has(JSON.stringify(app?.android?.permissions || []), 'FOREGROUND_SERVICE'), 'android permissions keep foreground service');
must(has(JSON.stringify(app?.android?.permissions || []), 'FOREGROUND_SERVICE_LOCATION'), 'android permissions keep foreground service location');

must(has(runbook, 'APK nedir?'), 'runbook explains APK');
must(has(runbook, 'AAB nedir?'), 'runbook explains AAB');
must(has(runbook, 'Emülatöre APK nasıl kurulur?'), 'runbook explains emulator install');
must(has(runbook, 'Gerçek Android telefona APK nasıl kurulur?'), 'runbook explains real phone install');
must(has(runbook, '10.0.2.2'), 'runbook keeps emulator api base');
must(has(runbook, 'yerel ağ IP adresi'), 'runbook keeps local network ip guidance');
must(has(runbook, 'HTTPS zorunludur'), 'runbook keeps https production guidance');
must(has(runbook, 'M95-E gerçek saha kanıtı ayrı bir halkadır'), 'runbook keeps field evidence separation');
must(has(runbook, 'npm --prefix mobile run build:android:apk'), 'runbook keeps apk build command');
must(has(runbook, 'npm --prefix mobile run build:android:aab'), 'runbook keeps aab build command');

must(has(primer, 'Android APK/AAB build readiness'), 'primer mentions M95-E0');
must(has(registry, 'M95-E0 - android apk/aab build readiness - active'), 'registry mentions M95-E0');
must(has(guide, 'M95-E0 — android apk/aab build readiness [CHECK]'), 'script guide mentions M95-E0');
must(has(repoState, '"M95-E0"'), 'repo state keeps M95-E0 visible');

console.log('M95-E0 android build readiness check passed');

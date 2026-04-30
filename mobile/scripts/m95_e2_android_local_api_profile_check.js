const fs = require('fs');
const path = require('path');
const mobileRoot = path.resolve(__dirname, '..');

function read(rel, root = mobileRoot) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

function findProfile(eas, profileName) {
  return eas?.build?.[profileName] || null;
}

(async () => {
  console.log('=== M95-E2 ANDROID LOCAL API PROFILE CHECK ===');

  const eas = JSON.parse(read('eas.json'));
  const pkg = JSON.parse(read('package.json'));
  const releaseText = read(path.join('src', 'lib', 'release.js'));
  const runbook = read(path.join('..', 'docs', 'RUNBOOK_M95E0_ANDROID_BUILD.md'));
  const primer = read(path.join('..', 'docs', 'PRIMER_SSOT.md'));
  const registry = read(path.join('..', 'docs', 'MILESTONE_REGISTRY_V1.md'));
  const guide = read(path.join('..', 'docs', 'SCRIPT_KILAVUZU_MILESTONE_HARITASI.md'));
  const repoState = read(path.join('..', 'tools', 'repo_contract_state.json'));

  const localProfile = findProfile(eas, 'local-apk');
  const previewProfile = findProfile(eas, 'preview');
  const productionProfile = findProfile(eas, 'production');

  must(Boolean(localProfile), 'eas local-apk profile exists');
  must(String(localProfile?.android?.buildType || '').trim().toLowerCase() === 'apk', 'local profile builds apk');
  must(String(localProfile?.distribution || '').trim().toLowerCase() === 'internal', 'local profile keeps internal distribution');
  must(String(localProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').trim() === 'http://10.0.2.2:3000', 'local profile keeps emulator root api base');
  must(String(localProfile?.env?.EXPO_PUBLIC_RELEASE_STAGE || '').trim().toLowerCase() === 'local-emulator', 'local profile keeps local-emulator stage');

  must(Boolean(previewProfile), 'preview profile exists');
  must(Boolean(productionProfile), 'production profile exists');
  must(String(previewProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').includes('HTTPS'), 'preview profile keeps https placeholder contract');
  must(String(productionProfile?.env?.EXPO_PUBLIC_API_BASE_URL || '').includes('HTTPS'), 'production profile keeps https placeholder contract');

  must(/local-emulator/.test(releaseText), 'release guard keeps local-emulator stage');
  must(/ALLOWED_STAGES\s*=\s*\[[^\]]*local-emulator[^\]]*production/.test(releaseText), 'release guard allows local-emulator alongside production stages');
  must(/if\s*\(isLocalEmulatorStage\)/.test(releaseText), 'release guard has local-emulator branch');
  must(/protocol\s*!==\s*'http:'/.test(releaseText), 'release guard permits http only through local-emulator branch');
  must(/hostname\s*!==\s*'10\.0\.2\.2'/.test(releaseText), 'release guard pins emulator host to 10.0.2.2');
  must(/pathname\s*!==\s*'\/'/.test(releaseText), 'release guard pins emulator root path');
  must(/protocol\s*!==\s*'https:'/.test(releaseText), 'release guard keeps https requirement for non-local stages');
  must(/isPrivateOrLocalHost\(hostname\)/.test(releaseText), 'release guard keeps private host rejection for non-local stages');
  must(/buildProfiles:\s*'preview \/ local-apk \/ production \/ preview-simulator'/.test(releaseText), 'release info mentions local-apk build profile');
  must(/androidLocalApk:\s*'Local emulator APK \/ 10\.0\.2\.2'/.test(releaseText), 'release info exposes local emulator hint');

  must(Boolean(pkg?.scripts?.['build:android:local-apk']), 'package exposes local apk build alias');
  must(Boolean(pkg?.scripts?.['check:m95e2']), 'package exposes m95e2 check');
  must(String(pkg?.scripts?.['check:m1'] || '').includes('check:m95e2'), 'check:m1 includes m95e2');
  must(String(pkg?.scripts?.['acceptance:mobile'] || '').includes('check:m95e2'), 'acceptance chain includes m95e2');

  must(runbook.includes('Local emulator APK'), 'runbook explains local emulator apk');
  must(runbook.includes('10.0.2.2'), 'runbook keeps emulator api base');
  must(runbook.includes('gerçek telefonda kullanılmaz'), 'runbook separates real phone usage');
  must(runbook.includes('Production hattı için HTTPS zorunludur'), 'runbook keeps https production requirement');
  must(runbook.includes('M95-E gerçek saha kanıtı ayrı bir halkadır'), 'runbook keeps field evidence separation');

  must(primer.includes('Android APK/AAB build readiness'), 'primer keeps M95-E0 visibility');
  must(registry.includes('M95-E0 - android apk/aab build readiness - active'), 'registry keeps M95-E0 visibility');
  must(guide.includes('M95-E0 — android apk/aab build readiness [CHECK]'), 'script guide keeps M95-E0 visibility');
  must(repoState.includes('"M95-E0"'), 'repo state keeps M95-E0 visible');

  console.log('M95-E2 android local api profile check passed');
})().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

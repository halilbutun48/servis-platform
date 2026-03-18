const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function ok(msg){ console.log(`OK ${msg}`); }
function must(text, needle, msg){ if(!text.includes(needle)) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M57.4 ANDROID PREVIEW / INTERNAL BUILD CHECK ===');
const pkg = read('package.json');
const app = read('App.js');
const appJson = read('app.json');
const eas = read('eas.json');
const env = read('.env.example');
const today = read('src/screens/TodayScreen.js');

must(pkg, 'check:m57.4', 'm57.4 script present in package json');
must(pkg, 'build:internal:android', 'package json has internal android build alias');
must(pkg, 'build:preview:android', 'package json has preview android build alias');
must(pkg, 'build:production:android', 'package json has production android build alias');
must(appJson, '"version": "0.2.1"', 'app config version bumped for m57.4');
must(appJson, '"releaseStage": "m57-mobile-hardening"', 'app config marks m57 release stage');
must(appJson, '"androidPreviewTrack": "preview-internal"', 'app config exposes preview track');
must(appJson, '"productionTrack": "production"', 'app config exposes production track');
must(appJson, 'runtimeVersion', 'app config keeps runtimeVersion');
must(eas, '"distribution": "internal"', 'eas preview uses internal distribution');
must(eas, '"buildType": "apk"', 'eas preview uses apk');
must(eas, '"buildType": "app-bundle"', 'eas production uses app bundle');
must(eas, 'EXPO_PUBLIC_RELEASE_STAGE', 'eas profiles define release stage env');
must(env, 'EXPO_PUBLIC_RELEASE_STAGE=preview-internal', 'env example defines preview release stage');
must(app, 'androidPreview:', 'app defines android preview release info');
must(app, 'productionBundle:', 'app defines production bundle release info');
must(app, 'releaseDiscipline:', 'app defines release discipline info');
must(today, 'Android preview', 'today screen shows android preview line');
must(today, 'Production bundle', 'today screen shows production bundle line');
must(today, 'Env asamasi', 'today screen shows env stage line');
must(today, 'Preview APK hazir', 'today screen shows preview apk badge');
must(today, 'Production AAB hazir', 'today screen shows production bundle badge');

console.log('=== M57.4 ANDROID PREVIEW / INTERNAL BUILD CHECK PASS ===');

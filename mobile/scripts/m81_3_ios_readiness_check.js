const fs = require('fs');
const path = require('path');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

console.log('=== M81.3 IOS BUILD READINESS CHECK ===');

const root = path.resolve(__dirname, '..');
const pkg = readJson(path.join(root, 'package.json'));
const app = readJson(path.join(root, 'app.json'));
const eas = readJson(path.join(root, 'eas.json'));

if (pkg.scripts && pkg.scripts['check:m81.3']) ok('check:m81.3 script present in package json');
else fail('check:m81.3 script missing in package json');

if (pkg.scripts && pkg.scripts['build:preview:ios']) ok('build:preview:ios script present');
else fail('build:preview:ios script missing');

if (pkg.scripts && pkg.scripts['build:simulator:ios']) ok('build:simulator:ios script present');
else fail('build:simulator:ios script missing');

if (pkg.scripts && pkg.scripts['build:production:ios']) ok('build:production:ios script present');
else fail('build:production:ios script missing');

if (eas.build && eas.build.preview && eas.build.preview.ios) ok('eas preview ios profile present');
else fail('eas preview ios profile missing');

if (eas.build && eas.build.production && eas.build.production.ios) ok('eas production ios profile present');
else fail('eas production ios profile missing');

if (eas.build && eas.build['preview-simulator'] && eas.build['preview-simulator'].ios && eas.build['preview-simulator'].ios.simulator === true) ok('eas preview-simulator ios profile present');
else fail('eas preview-simulator ios profile missing or invalid');

const ios = app.expo && app.expo.ios;
const infoPlist = ios && ios.infoPlist;

if (ios && ios.bundleIdentifier) ok('ios bundleIdentifier present');
else fail('ios bundleIdentifier missing');

if (Array.isArray(infoPlist?.UIBackgroundModes) && infoPlist.UIBackgroundModes.includes('location')) ok('ios background location mode present');
else fail('ios background location mode missing');

if (typeof infoPlist?.NSLocationWhenInUseUsageDescription === 'string' && infoPlist.NSLocationWhenInUseUsageDescription.trim()) ok('ios when-in-use location usage description present');
else fail('ios when-in-use location usage description missing');

if (typeof infoPlist?.NSLocationAlwaysAndWhenInUseUsageDescription === 'string' && infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription.trim()) ok('ios always-and-when-in-use location usage description present');
else fail('ios always-and-when-in-use location usage description missing');

if (app.expo?.extra?.iosPreviewTrack === 'preview-internal') ok('ios preview track extra present');
else fail('ios preview track extra missing');

if (app.expo?.extra?.iosSimulatorTrack === 'preview-simulator') ok('ios simulator track extra present');
else fail('ios simulator track extra missing');

if (process.exitCode) {
  console.error('=== M81.3 IOS BUILD READINESS CHECK FAIL ===');
  process.exit(process.exitCode);
}

console.log('=== M81.3 IOS BUILD READINESS CHECK PASS ===');

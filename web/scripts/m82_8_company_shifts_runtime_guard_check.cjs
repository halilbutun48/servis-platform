const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

const shiftsPanel = read('web/src/panels/company/ShiftsPanel.jsx');
const utils = read('web/src/panels/company/companyShiftsPanelUtils.js');

if (/computePackageShiftIds/.test(shiftsPanel) && /import\s*\{[^}]*computePackageShiftIds[^}]*\}\s*from\s*['"]\.\/companyShiftsPanelUtils['"]/.test(shiftsPanel)) {
  ok('company shifts panel imports computePackageShiftIds from utils');
} else {
  fail('company shifts panel must import computePackageShiftIds from companyShiftsPanelUtils');
}

if (/export function computePackageShiftIds\(/.test(utils)) {
  ok('company shifts panel utils exports computePackageShiftIds');
} else {
  fail('company shifts panel utils must export computePackageShiftIds');
}

if (/computePackageShiftIds=\{computePackageShiftIds\}/.test(shiftsPanel)) {
  ok('company shifts panel still passes computePackageShiftIds into compose package modal');
} else {
  fail('company shifts panel must pass computePackageShiftIds prop to package compose modal');
}

if (process.exitCode) {
  console.error('=== M82.8 COMPANY SHIFTS RUNTIME GUARD FAIL ===');
  process.exit(process.exitCode);
}

console.log('=== M82.8 COMPANY SHIFTS RUNTIME GUARD PASS ===');

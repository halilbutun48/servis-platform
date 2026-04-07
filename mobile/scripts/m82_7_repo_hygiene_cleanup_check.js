const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const mobileRoot = path.resolve(__dirname, '..');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function expect(condition, okMsg, failMsg) { if (condition) ok(okMsg); else fail(failMsg); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }

const rootFiles = fs.readdirSync(repoRoot, { withFileTypes: true });
const transientPatterns = [
  /^PATCH_NOTES_M82_.*\.txt$/i,
  /^README_M82_.*_PATCH_.*\.txt$/i,
];
const transientRootFiles = rootFiles
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => transientPatterns.some((pattern) => pattern.test(name)));

expect(!exists('apply_overlay.ps1'), 'Root apply_overlay.ps1 cleanup done', 'Root apply_overlay.ps1 still present');
expect(!exists('_m81_ssot_wireup.ps1'), 'Transient root SSOT wireup script removed', 'Transient root SSOT wireup script still present');
expect(transientRootFiles.length === 0, 'Root transient patch/readme files removed', `Root transient patch/readme files still present: ${transientRootFiles.join(', ')}`);
expect(!exists('backend/data/password-change-requirements.json.bak'), 'password-change backup removed', 'backend/data/password-change-requirements.json.bak still present');
expect(!exists('backend/data/username-directory.json.bak'), 'username-directory backup removed', 'backend/data/username-directory.json.bak still present');
expect(!exists('mobile/dist'), 'mobile/dist build output removed', 'mobile/dist build output still present');

const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
const requiredIgnoreRules = [
  'mobile/dist/',
  '*.bak',
  '*.zip',
  'apply_overlay.ps1',
  '_m81_ssot_wireup.ps1',
  'PATCH_NOTES_M82_*.txt',
  'README_M82_*_PATCH_*.txt',
];
for (const rule of requiredIgnoreRules) {
  expect(gitignore.includes(rule), `.gitignore includes ${rule}`, `.gitignore missing ${rule}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'package.json'), 'utf8'));
expect(Boolean(pkg.scripts && pkg.scripts['check:m82.7']), 'mobile package exposes check:m82.7', 'mobile package missing check:m82.7');
expect(Boolean(pkg.scripts && String(pkg.scripts['doctor:mobile'] || '').includes('check:m82.7')), 'doctor:mobile includes check:m82.7', 'doctor:mobile missing check:m82.7');
expect(Boolean(pkg.scripts && String(pkg.scripts['acceptance:mobile'] || '').includes('check:m82.7')), 'acceptance:mobile includes check:m82.7', 'acceptance:mobile missing check:m82.7');

if (process.exitCode) process.exit(process.exitCode);

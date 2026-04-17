import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const file = path.join(repoRoot, 'web', 'src', 'panels', 'company', 'companyShiftsPanelRows.jsx');
const text = fs.readFileSync(file, 'utf8');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }

console.log('=== M91C linked shift disable convert check ===');
if (!text.includes('Sözleşmeye Bağlı')) fail('linked shift badge text');
ok('linked shift badge text');
if (!text.includes('Bu vardiya zaten bir sözleşmeye bağlandı.')) fail('linked shift title');
ok('linked shift title');
if (!text.includes('{hasAgreement ? (')) fail('agreement branch render');
ok('agreement branch render');
if (!text.includes('Sözleşmeye Dönüştür')) fail('convert action still present for unlinked shifts');
ok('convert action still present for unlinked shifts');
console.log('=== M91C LINKED SHIFT DISABLE CONVERT CHECK PASS ===');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}
function ok(cond, label) {
  if (!cond) {
    console.error(`M91D CHECK FAIL: ${label}`);
    process.exit(1);
  }
  console.log(`OK ${label}`);
}

const agreementsRoute = read('backend/src/routes/agreements.js');
const companyAgreements = read('web/src/panels/company/AgreementsPanel.jsx');
const roomAgreements = read('web/src/panels/room/AgreementsPanel.jsx');
const companyShifts = read('web/src/panels/company/ShiftsPanel.jsx');

console.log('=== M91D agreement operations bridge check ===');
ok(agreementsRoute.includes('r.post("/ops-bridge"'), 'ops bridge route');
ok(agreementsRoute.includes('generatedCount'), 'ops bridge generated count');
ok(agreementsRoute.includes('routeSnapshotValidatedAt'), 'ops bridge preview fields');
ok(companyAgreements.includes('AgreementOpsBridgeCard'), 'company ops bridge card');
ok(companyAgreements.includes('/api/agreements/ops-bridge'), 'company ops bridge api call');
ok(companyAgreements.includes('company:previewShiftId'), 'company preview focus stash');
ok(roomAgreements.includes('AgreementOpsBridgeCard'), 'room ops bridge card');
ok(roomAgreements.includes('/api/agreements/ops-bridge'), 'room ops bridge api call');
ok(roomAgreements.includes('room:focusShiftId'), 'room shift focus stash');
ok(companyShifts.includes('company:previewShiftId'), 'company shifts preview focus consume');
ok(companyShifts.includes('company:focusShiftId'), 'company shifts focus consume');
console.log('=== M91D CHECK PASS ===');

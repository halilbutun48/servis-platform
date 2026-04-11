import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

function ok(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  console.log(`OK ${msg}`);
}

console.log('=== GUIDED 7x21 + AGREEMENT 3 SHIFT CONTRACT CHECK ===');

const company = read('backend/src/routes/shifts/company.js');
const people = read('backend/src/routes/shifts/people.js');
const rates = read('backend/src/bootstrap/rateLimits.js');
const guidedModal = read('web/src/panels/company/GuidedPlanModal.jsx');
const guidedSections = read('web/src/panels/company/guidedPlanModalSections.jsx');
const guidedActions = read('web/src/panels/company/guidedPlanModalActions.js');
const shiftPeople = read('web/src/panels/company/ShiftPeopleTab.jsx');
const agreementWizard = read('web/src/panels/company/AgreementWizard.jsx');

ok(company.includes('"/guided-batch"'), 'guided batch create route exists');
ok(company.includes('Guided en fazla 7 gün olabilir.'), 'backend guided day guard exists');
ok(company.includes('Guided en fazla 21 vardiya oluşturabilir.'), 'backend guided shift guard exists');
ok(people.includes('"/stops/generate-batch"'), 'batch stop generate route exists');
ok(rates.includes('/shifts/guided-batch'), 'rate limit recognizes guided batch path');
ok(rates.includes('/shifts/stops/generate-batch'), 'rate limit recognizes stop batch path');
ok(guidedModal.includes('eligibleDaysCount > 7'), 'frontend guided day guard exists');
ok(guidedModal.includes('totalDraftCount > 21'), 'frontend guided 21 shift guard exists');
ok(guidedSections.includes('Bu plan:'), 'guided setup shows plan count summary');
ok(guidedActions.includes('/api/shifts/guided-batch'), 'guided actions use batch create api');
ok(shiftPeople.includes('/api/shifts/stops/generate-batch'), 'shift tools use batch stop generate api');
ok(agreementWizard.includes('WK_THREE_SHIFTS'), 'agreement wizard 3 shift pack exists');

console.log('=== GUIDED 7x21 + AGREEMENT 3 SHIFT CONTRACT PASS ===');

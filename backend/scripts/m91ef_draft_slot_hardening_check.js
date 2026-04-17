import fs from 'fs';
import path from 'path';

function must(label, cond) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    process.exit(1);
  }
  console.log(`OK ${label}`);
}

const root = path.resolve(process.cwd(), '..');
const shiftHelpers = fs.readFileSync(path.join(root, 'backend/src/routes/shifts/helpers.js'), 'utf8');
const agreements = fs.readFileSync(path.join(root, 'backend/src/routes/agreements.js'), 'utf8');
const wizard = fs.readFileSync(path.join(root, 'web/src/panels/company/AgreementWizard.jsx'), 'utf8');
const slotsSvc = fs.readFileSync(path.join(root, 'backend/src/services/agreementSlots.js'), 'utf8');

console.log('=== M91E/F draft + slot hardening check ===');
must('draft only exposed via includeDrafts guard', shiftHelpers.includes('statuses = statuses.filter((s) => s !== "DRAFT")'));
must('draft direct status query collapses to no results', shiftHelpers.includes('where.id = -1'));
must('agreement shift stats excludes draft', agreements.includes('status: { not: "DRAFT" }'));
must('ops bridge excludes draft', agreements.includes('const shiftWhere = { agreementId: { in: allowedIds }, status: { not: "DRAFT" } };'));
must('bundle route exists', agreements.includes('r.post("/bundle"'));
must('slot validation service exists', slotsSvc.includes('Sözleşme tarafı günlük en fazla 3 slot destekler'));
must('slot overlap validation exists', slotsSvc.includes('Slot saatleri çakışamaz.'));
must('slot duplicate validation exists', slotsSvc.includes('Duplicate slot olamaz.'));
must('wizard uses bundle endpoint', wizard.includes('await api("/api/agreements/bundle"'));
must('wizard enforces max 3 slots', wizard.includes('items.length > 3'));
console.log('=== M91E/F CHECK PASS ===');

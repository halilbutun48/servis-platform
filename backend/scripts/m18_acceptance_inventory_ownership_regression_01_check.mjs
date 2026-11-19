import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTINUATION_230_EFFECTIVE_COUNTS,
  CONTINUATION_230_HISTORICAL_COUNTS,
  CONTINUATION_230_OWNERSHIP_RULES,
  CONTINUATION_230_ROUTE_COUNTS,
  CONTINUATION_303_SCHOOL_SHIFTS_OWNERSHIP_RULES,
  CONTINUATION_304_DRIVER_CHANGE_PIN_RULES,
  CONTINUATION_305_SCHOOL_AGREEMENTS_RULES,
  CONTINUATION_234_FINANCE_OWNERSHIP_RULES,
} from "./lib/m18AcceptanceOwnershipRules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const ledger = JSON.parse(read("docs/evidence/m18-dlevel-acceptance-ledger-v1.json"));

function routeFunction(id) {
  for (const route of ledger.routeFunctionInventory || []) {
    for (const fn of route.functions || route.functionUnits || []) {
      if (fn.id === id) return fn;
    }
  }
  return null;
}

function expectIncludes(source, fragment, label) {
  assert.ok(source.includes(fragment), `${label}: missing ${fragment}`);
}

const app = read("web/src/App.jsx");
const myRide = read("web/src/panels/personel/MyRidePanel.jsx");
const plans = read("web/src/panels/organization/PlansPanel.jsx");
const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
const financialPanel = read("web/src/panels/shared/FinancialOperationsPanel.jsx");
const financialBuyerPreview = read("web/src/panels/shared/FinancialOperationsCompanyPreview.jsx");
const invoicePayment = read("web/src/components/CompanyInvoicePaymentPanel.jsx");

// Mounted-route ownership, not JSX marker count, is the acceptance boundary.
expectIncludes(app, 'path === "/personel/live"', "PERSONEL live mount");
expectIncludes(app, 'node: <RoleTaskHome><PersonelLivePanel /></RoleTaskHome>', "PERSONEL live owner");
expectIncludes(app, 'path === "/personel/my"', "PERSONEL summary mount");
expectIncludes(app, 'node: <MyRidePanel />', "PERSONEL summary owner");
expectIncludes(myRide, 'entryMode="summary"', "PERSONEL summary mode");
expectIncludes(myRide, 'onOpenEntry={() => navigate("/personel/live")}', "PERSONEL form handoff");

expectIncludes(app, 'path === "/organization"', "Organization home mount");
expectIncludes(app, 'node: <RoleTaskHome><CompanyWorkflowPanel /></RoleTaskHome>', "Organization Planlama Merkezi owner");
expectIncludes(app, 'path === "/organization/plans"', "Organization legacy plans mount");
expectIncludes(app, 'node: <OrganizationPlansPanel />', "Organization legacy plans owner");
expectIncludes(workflow, "Planlama Merkezi", "Organization Planlama Merkezi label");
expectIncludes(workflow, "GuidedPlanModal", "Organization guided owner component");
expectIncludes(plans, "Yeni plan oluşturma akışı", "Organization legacy boundary copy");
expectIncludes(plans, "Planlama Merkezi", "Organization Planlama Merkezi handoff");
assert.equal(/<form\b|onSubmit\s*=/.test(plans), false, "legacy plans route must not advertise a supported form submit");

for (const [id, rule] of Object.entries(CONTINUATION_230_OWNERSHIP_RULES)) {
  const record = routeFunction(id);
  assert.ok(record, `ledger record missing: ${id}`);
  assert.equal(record.status, "NOT_PROVEN", `${id} must remain historical NOT_PROVEN`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerRoute, rule.canonicalOwnerRoute, `${id} owner route`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerComponent, rule.canonicalOwnerComponent, `${id} owner component`);
  assert.equal(record.ownershipDisposition?.statusPreserved, "NOT_PROVEN", `${id} preservation marker`);
  assert.equal(record.ownershipDisposition?.countedInEffectiveInventory, false, `${id} effective inventory flag`);
}

const reconciliation = ledger.continuation230Reconciliation;
assert.ok(reconciliation, "CONT-230 reconciliation missing");
assert.deepEqual(reconciliation.historicalCounts.sourceFunctions, CONTINUATION_230_HISTORICAL_COUNTS);
assert.deepEqual(reconciliation.effectiveCounts.sourceFunctions, CONTINUATION_230_EFFECTIVE_COUNTS);
assert.deepEqual(reconciliation.historicalCounts.routes, CONTINUATION_230_ROUTE_COUNTS);
assert.deepEqual(reconciliation.effectiveCounts.routes, CONTINUATION_230_ROUTE_COUNTS);
assert.deepEqual(reconciliation.excludedFromEffectiveFunctionInventory.sort(), Object.keys(CONTINUATION_230_OWNERSHIP_RULES).sort());

const schoolShiftsOwnershipReconciliation = ledger.continuation303Reconciliation;
assert.ok(schoolShiftsOwnershipReconciliation, "CONT-303 reconciliation missing");
assert.deepEqual(
  schoolShiftsOwnershipReconciliation.excludedOwnershipIds.sort(),
  Object.keys(CONTINUATION_303_SCHOOL_SHIFTS_OWNERSHIP_RULES).sort(),
  "CONT-303 SCHOOL shifts ownership list",
);
for (const [id, rule] of Object.entries(CONTINUATION_303_SCHOOL_SHIFTS_OWNERSHIP_RULES)) {
  const record = routeFunction(id);
  assert.ok(record, `ledger record missing: ${id}`);
  assert.equal(record.status, "NOT_PROVEN", `${id} must remain historical NOT_PROVEN`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerRoute, rule.canonicalOwnerRoute, `${id} owner route`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerComponent, rule.canonicalOwnerComponent, `${id} owner component`);
  assert.equal(record.ownershipDisposition?.statusPreserved, "NOT_PROVEN", `${id} preservation marker`);
  assert.equal(record.ownershipDisposition?.countedInEffectiveInventory, false, `${id} effective inventory flag`);
}

const driverChangePinOwnershipReconciliation = ledger.continuation304Reconciliation;
assert.ok(driverChangePinOwnershipReconciliation, "CONT-304 reconciliation missing");
assert.deepEqual(
  driverChangePinOwnershipReconciliation.excludedOwnershipIds.sort(),
  Object.keys(CONTINUATION_304_DRIVER_CHANGE_PIN_RULES).sort(),
  "CONT-304 DRIVER change-pin ownership list",
);
for (const [id, rule] of Object.entries(CONTINUATION_304_DRIVER_CHANGE_PIN_RULES)) {
  const record = routeFunction(id);
  assert.ok(record, `ledger record missing: ${id}`);
  assert.equal(record.status, "NOT_PROVEN", `${id} must remain historical NOT_PROVEN`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerRoute, rule.canonicalOwnerRoute, `${id} owner route`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerComponent, rule.canonicalOwnerComponent, `${id} owner component`);
  assert.equal(record.ownershipDisposition?.statusPreserved, "NOT_PROVEN", `${id} preservation marker`);
  assert.equal(record.ownershipDisposition?.countedInEffectiveInventory, false, `${id} effective inventory flag`);
}

const schoolAgreementsOwnershipReconciliation = ledger.continuation305Reconciliation;
assert.ok(schoolAgreementsOwnershipReconciliation, "CONT-305 reconciliation missing");
assert.deepEqual(
  schoolAgreementsOwnershipReconciliation.excludedOwnershipIds.sort(),
  Object.keys(CONTINUATION_305_SCHOOL_AGREEMENTS_RULES).sort(),
  "CONT-305 SCHOOL agreements ownership list",
);
for (const [id, rule] of Object.entries(CONTINUATION_305_SCHOOL_AGREEMENTS_RULES)) {
  const record = routeFunction(id);
  assert.ok(record, `ledger record missing: ${id}`);
  assert.equal(record.status, "NOT_PROVEN", `${id} must remain historical NOT_PROVEN`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerRoute, rule.canonicalOwnerRoute, `${id} owner route`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerComponent, rule.canonicalOwnerComponent, `${id} owner component`);
  assert.equal(record.ownershipDisposition?.statusPreserved, "NOT_PROVEN", `${id} preservation marker`);
  assert.equal(record.ownershipDisposition?.countedInEffectiveInventory, false, `${id} effective inventory flag`);
}

// Route acceptance is owned by surfaceStatus. Older route rows may have no
// closureState even when their direct surface status is PASS; counting only
// closureState would silently under-report the current 95-route result.
const routeSurfaceCounts = (ledger.routeFunctionInventory || []).reduce((counts, route) => {
  const status = String(route.surfaceStatus || "").toUpperCase();
  counts.total += 1;
  if (status === "PASS") counts.fullyAccepted += 1;
  else if (status === "PASS_WITH_SCOPE") counts.passWithScope += 1;
  else if (status === "NOT_PROVEN") counts.notProven += 1;
  else if (status === "FAIL") counts.fail += 1;
  else if (status === "BLOCKED") counts.blocked += 1;
  else if (["N/A", "NA"].includes(status)) counts.na += 1;
  return counts;
}, { total: 0, fullyAccepted: 0, passWithScope: 0, notProven: 0, fail: 0, blocked: 0, na: 0 });
routeSurfaceCounts.open = routeSurfaceCounts.total - routeSurfaceCounts.fullyAccepted;
assert.deepEqual(
  {
    total: ledger.routeSurfaceRules?.total,
    fullyAccepted: ledger.routeSurfaceRules?.fullyAccepted,
    passWithScope: ledger.routeSurfaceRules?.passWithScope,
    fail: ledger.routeSurfaceRules?.fail,
    notProven: ledger.routeSurfaceRules?.notProven,
    blocked: ledger.routeSurfaceRules?.blocked,
    na: ledger.routeSurfaceRules?.na,
    open: ledger.routeSurfaceRules?.open,
  },
  routeSurfaceCounts,
  "routeSurfaceRules must match direct route surfaceStatus counts",
);

// CONT-234: buyer finance marker counts must not grant ROOM write ownership.
// Buyer routes remain in effective inventory because they mount real budget and
// conditional payment-declaration surfaces; complete finance acceptance remains
// NOT_PROVEN until the full contract is proven.
expectIncludes(app, 'path === "/company/financial-operations"', "COMPANY finance mount");
expectIncludes(app, 'path === "/school/financial-operations"', "SCHOOL finance mount");
expectIncludes(app, 'path === "/organization/financial-operations"', "ORGANIZATION finance mount");
expectIncludes(app, '<FinancialOperationsPanel scope="COMPANY" />', "buyer finance shared scope");
expectIncludes(financialPanel, 'const companyView = scope === "COMPANY"', "buyer finance preview owner");
expectIncludes(financialPanel, 'if (scope === "COMPANY") return companyView;', "buyer finance branch boundary");
expectIncludes(financialPanel, 'const canManageRoomCosts = scope === "ROOM" && normalizeText(me?.role) === "ROOM";', "ROOM cost write role gate");
expectIncludes(financialPanel, '<RoomCostLedgerPanel', "ROOM cost ledger owner");
expectIncludes(financialBuyerPreview, "Bütçe yaşam döngüsü", "buyer budget lifecycle surface");
expectIncludes(financialBuyerPreview, "CompanyInvoicePaymentPanel", "buyer payment declaration owner");
expectIncludes(invoicePayment, "Ödeme beyanını kaydet", "buyer payment declaration action");

for (const [id, rule] of Object.entries(CONTINUATION_234_FINANCE_OWNERSHIP_RULES)) {
  const record = routeFunction(id);
  assert.ok(record, `ledger record missing: ${id}`);
  assert.ok(["NOT_PROVEN", "PASS_WITH_SCOPE"].includes(record.status), `${id} must remain open or scoped until its complete finance contract is proven`);
  assert.equal(record.ownershipDisposition?.classification, rule.classification, `${id} finance classification`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerRoute, rule.canonicalOwnerRoute, `${id} finance owner route`);
  assert.equal(record.ownershipDisposition?.canonicalOwnerComponent, rule.canonicalOwnerComponent, `${id} finance owner component`);
  assert.equal(record.ownershipDisposition?.statusPreserved, record.status, `${id} finance preservation marker`);
  assert.equal(record.ownershipDisposition?.countedInEffectiveInventory, true, `${id} remains effective inventory`);
  if (record.status === "PASS_WITH_SCOPE") {
    assert.equal(record.closureState, "SCOPED", `${id} scoped acceptance marker`);
    assert.ok(record.evidenceRef || record.acceptanceEvidence, `${id} scoped acceptance evidence`);
  }
}

console.log("PASS CONT-230/234 ownership regression: mounted route ownership, buyer/ROOM finance boundaries and historical/effective counters are consistent.");

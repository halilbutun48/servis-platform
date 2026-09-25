import assert from "node:assert/strict";
import * as durable from "./lib/pre_18_durable_coverage_completion_inventory.mjs";

const base = {
  role: "SUPER_ADMIN",
  route: "/superadmin/companies",
  viewport: "desktop",
  surface: { id: "company-directory", title: "Firma dizini" },
  state: { activeTab: "companies", detailsOpen: false },
  control: {
    role: "button",
    type: "button",
    accessibleName: "Profili aç",
    visibleText: "Profil",
  },
  owner: { type: "table-row", label: "Firma: Denizli Servis A.Ş." },
  landmark: "Ana içerik",
  sectionHeading: "Firmalar",
  safeClassification: "SAFE",
};

function capture(overrides = {}) {
  return {
    ...base,
    ...overrides,
    surface: { ...base.surface, ...(overrides.surface || {}) },
    state: { ...base.state, ...(overrides.state || {}) },
    control: { ...base.control, ...(overrides.control || {}) },
    owner: { ...base.owner, ...(overrides.owner || {}) },
  };
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

run("A same accessible name on two routes gets distinct durable descriptors", () => {
  const left = durable.captureDurableDescriptor(capture());
  const right = durable.captureDurableDescriptor(capture({ route: "/superadmin/operations" }));
  assert.notEqual(left.DESCRIPTOR_ID, right.DESCRIPTOR_ID);
});

run("B same control name in different owners on one route gets distinct durable descriptors", () => {
  const left = durable.captureDurableDescriptor(capture());
  const right = durable.captureDurableDescriptor(capture({ owner: { type: "table-row", label: "Firma: Pamukkale Ulaşım Ltd." } }));
  assert.notEqual(left.DESCRIPTOR_ID, right.DESCRIPTOR_ID);
});

run("C desktop and mobile variants never collapse", () => {
  const desktop = durable.captureDurableDescriptor(capture());
  const mobile = durable.captureDurableDescriptor(capture({ viewport: "mobile" }));
  assert.notEqual(desktop.DESCRIPTOR_ID, mobile.DESCRIPTOR_ID);
});

run("D materially different rendered state gets a distinct state signature", () => {
  const collapsed = durable.captureDurableDescriptor(capture({ state: { activeTab: "companies", detailsOpen: false } }));
  const expanded = durable.captureDurableDescriptor(capture({ state: { activeTab: "companies", detailsOpen: true } }));
  assert.notEqual(collapsed.STATE_SIGNATURE, expanded.STATE_SIGNATURE);
  assert.notEqual(collapsed.DESCRIPTOR_ID, expanded.DESCRIPTOR_ID);
});

run("E icon-only controls use a bounded structural owner fallback and produce an accessibility candidate", () => {
  const icon = durable.captureDurableDescriptor(capture({
    control: { role: "button", type: "button", accessibleName: "", visibleText: "", iconDescription: "üç nokta" },
    owner: { type: "table-row", label: "Firma: Denizli Servis A.Ş.", boundedOrdinal: 1 },
  }));
  const addressability = durable.classifyAddressability(icon);
  assert.equal(addressability.addressability, "STRUCTURAL_OWNER");
  assert.equal(addressability.accessibilityProductDefectCandidate, true);
  assert.equal(addressability.locatorPlan.strategy, "structural-owner");
});

run("F rerender does not depend on a captured DOM identity", () => {
  const before = durable.captureDurableDescriptor(capture({ control: { domId: "react-17", accessibleName: "Profili aç" } }));
  const after = durable.captureDurableDescriptor(capture({ control: { domId: "react-88", accessibleName: "Profili aç" } }));
  assert.equal(before.DESCRIPTOR_ID, after.DESCRIPTOR_ID);
  assert.equal(before.locatorPlan.strategy, "accessible-with-owner");
});

run("G checkpoint resume retains the durable descriptor and only exact identity stays proven", () => {
  const original = durable.captureDurableDescriptor(capture());
  const checkpoint = durable.buildDurableCheckpoint([{
    ...original,
    executionState: "PROVEN_PASS",
    classification: "PASS",
    visible: true,
    enabled: true,
    actionAttempted: true,
    actionResult: "OPENED",
    expectedEffect: "Profile dialog opens",
    observedEffect: "Dialog title visible",
    evidence: [{ kind: "dialog" }],
  }]);
  const planned = durable.prepareDurableReplay([
    original,
    durable.captureDurableDescriptor(capture({ viewport: "tablet" })),
  ], checkpoint);
  assert.equal(planned[0].executionState, "PROVEN_PASS");
  assert.equal(planned[0].DESCRIPTOR_ID, original.DESCRIPTOR_ID);
  assert.equal(planned[1].executionState, "NOT_YET_TESTED");
});

run("H loop processing metadata alone never becomes proven pass", () => {
  const descriptor = durable.captureDurableDescriptor(capture());
  const checkpoint = durable.buildDurableCheckpoint([{
    ...descriptor,
    executionState: "ATTEMPTED",
    loopProcessed: true,
    classification: "PASS",
  }]);
  const planned = durable.prepareDurableReplay([descriptor], checkpoint);
  assert.equal(planned[0].executionState, "NOT_YET_TESTED");
  assert.notEqual(planned[0].executionState, "PROVEN_PASS");
});

if (!process.exitCode) console.log("PRE_18_DURABLE_COVERAGE_COMPLETION_INVENTORY_CORE_CHECK=PASS");

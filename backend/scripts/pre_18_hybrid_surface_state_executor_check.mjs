import assert from "node:assert/strict";
import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const base = {
  role: "SUPER_ADMIN",
  route: "/superadmin/companies",
  viewport: "desktop",
  surface: { id: "company-directory", title: "Firmalar" },
  materialState: { activeTab: "companies", filterSignature: "" },
  action: {
    role: "button",
    name: "Profili aç",
    userMeaning: "Firma profilini aç",
    expectedEffectClass: "DRAWER_OPEN",
    safetyClass: "SAFE",
  },
  owner: { type: "table-row", label: "Firma: Denizli Servis A.Ş." },
};

function contract(overrides = {}) {
  return {
    ...base,
    ...overrides,
    surface: { ...base.surface, ...(overrides.surface || {}) },
    materialState: { ...base.materialState, ...(overrides.materialState || {}) },
    action: { ...base.action, ...(overrides.action || {}) },
    owner: { ...base.owner, ...(overrides.owner || {}) },
  };
}

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

test("A route identity keeps same action name distinct", () => {
  assert.notEqual(hybrid.captureActionContract(contract()).ACTION_CONTRACT_ID, hybrid.captureActionContract(contract({ route: "/superadmin/operations" })).ACTION_CONTRACT_ID);
});
test("B owner identity keeps repeated action name distinct", () => {
  assert.notEqual(hybrid.captureActionContract(contract()).ACTION_CONTRACT_ID, hybrid.captureActionContract(contract({ owner: { type: "table-row", label: "Firma: Pamukkale Ulaşım Ltd." } })).ACTION_CONTRACT_ID);
});
test("C viewport variants remain distinct", () => {
  assert.notEqual(hybrid.captureActionContract(contract()).ACTION_CONTRACT_ID, hybrid.captureActionContract(contract({ viewport: "mobile" })).ACTION_CONTRACT_ID);
});
test("D material surface states remain distinct", () => {
  assert.notEqual(hybrid.captureActionContract(contract()).ACTION_CONTRACT_ID, hybrid.captureActionContract(contract({ materialState: { activeTab: "companies", filterSignature: "active" } })).ACTION_CONTRACT_ID);
});
test("E equivalent repetitions collapse only inside one material surface state", () => {
  const left = hybrid.captureActionContract(contract({ occurrence: { renderedNode: 1 } }));
  const right = hybrid.captureActionContract(contract({ occurrence: { renderedNode: 2 } }));
  const result = hybrid.deduplicateActionContracts([left, right]);
  assert.equal(result.contracts.length, 1);
  assert.equal(result.contracts[0].EQUIVALENT_RENDERED_OCCURRENCE_COUNT, 2);
});
test("F each action contract has deterministic reset/isolation", () => {
  const plan = hybrid.buildActionExecutionPlan(hybrid.captureActionContract(contract()));
  assert.equal(plan.reset.required, true);
  assert.equal(plan.reset.strategy, "REOPEN_SURFACE_STATE");
});
test("G rerender DOM identity is excluded from contract identity", () => {
  const first = hybrid.captureActionContract(contract({ action: { domId: "react-17" } }));
  const second = hybrid.captureActionContract(contract({ action: { domId: "react-88" } }));
  assert.equal(first.ACTION_CONTRACT_ID, second.ACTION_CONTRACT_ID);
});
test("H loop processing never becomes proven pass", () => {
  const item = hybrid.captureActionContract(contract());
  const resumed = hybrid.prepareActionResume([item], { actions: [{ ...item, executionState: "ATTEMPTED", loopProcessed: true, classification: "PASS" }] });
  assert.equal(resumed[0].executionState, "NOT_YET_TESTED");
});
test("I checkpoint advances only from terminal evidence", () => {
  const item = hybrid.captureActionContract(contract());
  const checkpoint = hybrid.buildActionCheckpoint([{ ...item, executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true }], { runId: "run-a", runKind: "BOUNDED_CANARY" });
  assert.equal(checkpoint.progress.terminalClassified, 0);
});
test("J unsafe actions require safety boundary and no mutation", () => {
  const item = hybrid.captureActionContract(contract({ action: { safetyClass: "UNSAFE", expectedEffectClass: "CONFIRMATION" } }));
  assert.equal(hybrid.isTerminalActionEvidence({ ...item, executionState: "NOT_SAFE_TO_EXECUTE_FULLY", classification: "NOT_SAFE_TO_EXECUTE_FULLY", safetyFlowProven: true, unsafeMutationExecuted: true }), false);
});
test("K accessibility defects stay separate from harness failures", () => {
  const verdict = hybrid.classifyActionAccessibility({ visible: true, actionable: true, role: "", accessibleName: "", userMeaning: "", structuralFallbackRequired: true });
  assert.equal(verdict.classification, "ACCESSIBILITY_PRODUCT_DEFECT");
});
test("L and M run-id artifact paths are immutable and family separated", () => {
  const full = hybrid.createRunArtifactManifest({ root: "artifacts", runId: "run-001", runKind: "FULL_CAPTURE" });
  const canary = hybrid.createRunArtifactManifest({ root: "artifacts", runId: "run-002", runKind: "BOUNDED_CANARY" });
  assert.notEqual(full.runDirectory, canary.runDirectory);
  assert.match(full.failureLedgerPath, /failure-ledger\.json$/u);
  assert.throws(() => hybrid.createRunArtifactManifest({ root: "artifacts", runId: "", runKind: "FULL_CAPTURE" }));
});
test("N failure ledger preserves replay diagnostics", () => {
  const item = hybrid.captureActionContract(contract());
  const entry = hybrid.createFailureLedgerEntry({ runId: "run-001", contract: item, failureStage: "STATE_RECONSTRUCTION", failureReason: "current rendered action unavailable", evidence: [{ kind: "screenshot", path: "x.png" }] });
  for (const key of ["RUN_ID", "ROLE", "ROUTE", "VIEWPORT", "SURFACE", "SURFACE_STATE", "ACTION_CONTRACT", "OWNER", "ACTION_NAME", "FAILURE_STAGE", "FAILURE_REASON", "RETRYABLE", "EVIDENCE"]) assert.ok(Object.hasOwn(entry, key), key);
});

test("O closes an unrelated modal before the next independent action", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: { modalTitle: null, drawerTitle: null },
    observedState: { modalTitle: "Firma düzenle", drawerTitle: null },
    targetOwner: { type: "table-row", label: "Firma: Denizli" },
  });
  assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY");
  assert.equal(plan.retainOverlay, false);
});

test("P closes an unrelated drawer before the next independent action", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: { modalTitle: null, drawerTitle: null },
    observedState: { modalTitle: null, drawerTitle: "Sefer Abi" },
    targetOwner: { type: "section", label: "Firma listesi" },
  });
  assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY");
});

test("Q retains a modal required by the next contract", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: { modalTitle: "Firma düzenle", drawerTitle: null },
    observedState: { modalTitle: "Firma düzenle", drawerTitle: null },
    targetOwner: { type: "modal", label: "Firma düzenle" },
  });
  assert.equal(plan.strategy, "RESET_NONE");
  assert.equal(plan.retainOverlay, true);
});

test("R retains a drawer required by the next contract", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: { modalTitle: null, drawerTitle: "Sefer Abi" },
    observedState: { modalTitle: null, drawerTitle: "Sefer Abi" },
    targetOwner: { type: "drawer", label: "Sefer Abi" },
  });
  assert.equal(plan.strategy, "RESET_NONE");
  assert.equal(plan.retainOverlay, true);
});

test("S a tab rerender invalidates the old locator and owner binding", () => {
  const invalidation = hybrid.invalidateTransientBrowserBinding({ locator: "old-tab-locator", ownerBinding: "old-tab-owner" }, { expectedEffect: "ACTIVE_TAB_CHANGE" });
  assert.deepEqual(invalidation, { invalidated: true, locator: null, ownerBinding: null });
});

test("T a rerendered table row resolves through current business context", () => {
  const candidate = hybrid.resolveCurrentSemanticAction({
    role: "button", name: "Profil", owner: { type: "table-row", label: "1 DemoCompany eski satır" }, businessContext: "DemoCompany",
  }, [
    { action: { role: "button", name: "Profil" }, owner: { type: "table-row", label: "1 DemoCompany güncel satır" } },
    { action: { role: "button", name: "Profil" }, owner: { type: "table-row", label: "2 DemoOkul güncel satır" } },
  ]);
  assert.equal(candidate.owner.label, "1 DemoCompany güncel satır");
});

test("U a rerendered Sefer Abi suggestion resolves from its current suggestion group", () => {
  const candidate = hybrid.resolveCurrentSemanticAction({
    role: "button", name: "Riskleri sırala", owner: { type: "section", label: "Bağlama uygun öneriler" }, businessContext: "Bağlama uygun öneriler",
  }, [{ action: { role: "button", name: "Riskleri sırala" }, owner: { type: "section", label: "Bağlama uygun öneriler" } }]);
  assert.equal(candidate.action.name, "Riskleri sırala");
});

test("V a form rerender resolves the current submit action instead of a stale binding", () => {
  const candidate = hybrid.resolveCurrentSemanticAction({
    role: "button", name: "İptal", owner: { type: "form", label: "Firma düzenle" }, businessContext: "Firma düzenle",
  }, [{ action: { role: "button", name: "İptal" }, owner: { type: "form", label: "Firma düzenle" } }]);
  assert.equal(candidate.owner.type, "form");
});

test("W a filter rerender resolves the current owner instead of an old row label", () => {
  const candidate = hybrid.resolveCurrentSemanticAction({
    role: "button", name: "Sil", owner: { type: "table-row", label: "DemoCompany önceki durum" }, businessContext: "DemoCompany",
  }, [{ action: { role: "button", name: "Sil" }, owner: { type: "table-row", label: "DemoCompany filtrelenmiş güncel durum" } }]);
  assert.equal(candidate.owner.label, "DemoCompany filtrelenmiş güncel durum");
});

test("X pointer interception resets an unrelated overlay and never force-clicks", () => {
  const plan = hybrid.planPointerInterceptionRecovery({
    message: "modal-backdrop intercepts pointer events",
    interceptedOverlay: { type: "modal", title: "Firma düzenle" },
    requiredState: { modalTitle: null, drawerTitle: null },
  });
  assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY_AND_RERESOLVE");
  assert.equal(plan.forceClick, false);
});

test("Y pointer interception retains a required drawer and re-resolves inside it", () => {
  const plan = hybrid.planPointerInterceptionRecovery({
    message: "drawer intercepts pointer events",
    interceptedOverlay: { type: "drawer", title: "Sefer Abi" },
    requiredState: { modalTitle: null, drawerTitle: "Sefer Abi" },
  });
  assert.equal(plan.strategy, "RERESOLVE_INSIDE_REQUIRED_OVERLAY");
});

test("Z an overlay post-state receives the minimum deterministic reset", () => {
  const reset = hybrid.deriveDeterministicResetStrategy({ before: { url: "/superadmin/companies", modalTitle: null }, after: { url: "/superadmin/companies", modalTitle: "Firma düzenle" } });
  assert.equal(reset, "RESET_CLOSE_OVERLAY");
});

test("AA a 329-contract partial update cannot shrink the canonical checkpoint", () => {
  const prior = Array.from({ length: 329 }, (_, index) => ({ ...hybrid.captureActionContract(contract({ materialState: { activeTab: "companies", filterSignature: `state-${index}` } })), executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, observedEffect: "state", evidence: [`${index}.png`] }));
  const merged = hybrid.mergeActionCheckpoints({ actions: prior }, prior.slice(0, 4), { runId: "resume", runKind: "BOUNDED_CANARY" });
  assert.equal(merged.actions.length, 329);
});

test("AB product-defect terminals survive a bounded merge", () => {
  const record = { ...hybrid.captureActionContract(contract({ action: { name: "Özet 3" } })), executionState: "PROVEN_PRODUCT_DEFECT", classification: "PRODUCT_DEFECT", visible: true, enabled: true, actionAttempted: true, observedEffect: "none", evidence: ["defect.png"] };
  assert.equal(hybrid.mergeActionCheckpoints({ actions: [record] }, [], { runId: "resume", runKind: "BOUNDED_CANARY" }).actions[0].executionState, "PROVEN_PRODUCT_DEFECT");
});

test("AC accessibility-defect terminals survive a bounded merge", () => {
  const record = { ...hybrid.captureActionContract(contract({ action: { name: null } })), executionState: "ACCESSIBILITY_PRODUCT_DEFECT", classification: "ACCESSIBILITY_PRODUCT_DEFECT", visible: true, enabled: true, evidence: ["a11y.png"] };
  assert.equal(hybrid.mergeActionCheckpoints({ actions: [record] }, [], { runId: "resume", runKind: "BOUNDED_CANARY" }).actions[0].executionState, "ACCESSIBILITY_PRODUCT_DEFECT");
});

test("AD a root action without current semantic identity is an accessibility defect, never a fake owner pass", () => {
  const result = hybrid.classifyCurrentRootOwner({ action: { role: "button", name: null }, currentPresent: true, globalUnique: false });
  assert.equal(result.classification, "ACCESSIBILITY_PRODUCT_DEFECT");
});

test("AE a rendered but untitled overlay is still reset before an unrelated action", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: {},
    observedState: { modalTitle: null, drawerTitle: null, overlayCount: 1 },
    targetOwner: { type: "table-row", label: "Firma: Denizli" },
  });
  assert.equal(plan.strategy, "RESET_CLOSE_OVERLAY");
});

test("AF an open drawer prefers its semantic Kapat action over route recreation", () => {
  const close = hybrid.chooseSafeOverlayCloseAction([
    { role: "button", name: "Orta" },
    { role: "button", name: "Kapat", accessibleName: "Kapat" },
  ]);
  assert.deepEqual(close, { role: "button", name: "Kapat", source: "EXPLICIT_CLOSE" });
});

test("AG an untitled modal remains stable when the contract explicitly requires its open state", () => {
  const plan = hybrid.planSurfaceStateStability({
    requiredState: { modalOpen: true },
    observedState: { modalTitle: null, drawerTitle: null, modalOpen: true, overlayCount: 1 },
    targetOwner: { type: "modal", label: "root" },
  });
  assert.equal(plan.strategy, "RESET_NONE");
  assert.equal(plan.retainOverlay, true);
});

test("AH an untitled modal transition still receives overlay cleanup", () => {
  assert.equal(hybrid.deriveDeterministicResetStrategy({ before: { modalOpen: false }, after: { modalOpen: true } }), "RESET_CLOSE_OVERLAY");
});

// Final Super Admin residual corrective.  These contracts deliberately model a
// fresh execution binding; the frozen coverage identity remains untouched.
test("AI current execution context makes a unique rerendered row owner optional", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Profil", expectedEffectClass: "DRAWER_OPEN" },
    owner: { type: "table-row", label: "DemoCompany önceki filtre" },
  }, [{
    action: { role: "button", name: "Profil", expectedEffectClass: "DRAWER_OPEN" },
    owner: { type: "table-row", label: "DemoCompany güncel filtre" },
    businessContext: "DemoCompany",
    overlayScope: "NONE",
  }]);
  assert.equal(context.ownerRequirement, "OPTIONAL");
  assert.equal(context.currentOwner.label, "DemoCompany güncel filtre");
  assert.equal(context.locatorRecipe.candidateKey, context.candidateKey);
});

test("AJ current form context wins over historical form text", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "İptal", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "form", label: "Bağlam: Genel Bakış" },
  }, [{
    action: { role: "button", name: "İptal", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "form", label: "Bağlam: Firmalar" },
    businessContext: "Firmalar",
    overlayScope: "NONE",
  }]);
  assert.equal(context.currentOwner.label, "Bağlam: Firmalar");
  assert.equal(context.ownerRequirement, "OPTIONAL");
});

test("AK a unique current navigation successor resolves without a historical root ordinal", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Konum veri sağlayıcıları", expectedEffectClass: "ROUTE_OR_ANCHOR_TRANSITION" },
    owner: { type: "surface", label: "root", boundedOrdinal: 3 },
  }, [{
    action: { role: "button", name: "Konum veri sağlayıcıları", expectedEffectClass: "ROUTE_OR_ANCHOR_TRANSITION" },
    owner: { type: "navigation", label: "SİSTEM" },
    businessContext: "SİSTEM",
    overlayScope: "NONE",
    materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" },
  }]);
  assert.equal(context.ownerRequirement, "OPTIONAL");
  assert.equal(context.requiredSurfaceState.systemNavigationDisclosure, "SİSTEM_OPEN");
});

test("AL same-name row actions require current business context", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Sil", expectedEffectClass: "CONFIRMATION" },
    owner: { type: "table-row", label: "DemoCompany" },
    businessContext: "DemoCompany",
  }, [
    { action: { role: "button", name: "Sil", expectedEffectClass: "CONFIRMATION" }, owner: { type: "table-row", label: "DemoCompany" }, businessContext: "DemoCompany", overlayScope: "NONE" },
    { action: { role: "button", name: "Sil", expectedEffectClass: "CONFIRMATION" }, owner: { type: "table-row", label: "DemoOkul" }, businessContext: "DemoOkul", overlayScope: "NONE" },
  ]);
  assert.equal(context.ownerRequirement, "REQUIRED");
  assert.equal(context.currentOwner.label, "DemoCompany");
});

test("AM candidate-derived locator rejects a stale rerender binding", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({ action: { role: "button", name: "Riskleri sırala" } }, [{
    action: { role: "button", name: "Riskleri sırala" }, owner: { type: "section", label: "Öneriler" }, overlayScope: "DRAWER", candidateKey: "fresh",
  }]);
  assert.equal(hybrid.validateCandidateDerivedLocator(context, { candidateKey: "stale", visible: true, enabled: true, overlayScope: "DRAWER" }).valid, false);
});

test("AN unrelated backdrop requires semantic completion before target retry", () => {
  const completion = hybrid.planSemanticStabilityCompletion({
    targetOverlayScope: "NONE",
    observed: { modalOpen: false, drawerOpen: false, backdropOpen: true, targetHitTest: false },
  });
  assert.equal(completion.complete, false);
  assert.ok(completion.requiredEvidence.includes("BACKDROP_ABSENT"));
});

test("AO a required drawer is retained only when the current target is contained by it", () => {
  const recovery = hybrid.planPointerInterceptionRecovery({
    message: "drawer intercepts pointer events",
    interceptedOverlay: { type: "drawer", title: "Sefer Abi" },
    executionContext: { overlayScope: "DRAWER", targetRequiresOverlay: true },
  });
  assert.equal(recovery.strategy, "RERESOLVE_INSIDE_REQUIRED_OVERLAY");
  assert.equal(recovery.forceClick, false);
});

test("AP checkpoint merge preserves every known contract in a bounded residual replay", () => {
  const known = Array.from({ length: 359 }, (_, index) => ({ ...hybrid.captureActionContract(contract({ materialState: { activeTab: "companies", filterSignature: `contract-${index}` } })), executionState: "PROVEN_PASS", classification: "PASS", visible: true, enabled: true, actionAttempted: true, observedEffect: "state", evidence: [`${index}.png`] }));
  const result = hybrid.assertCheckpointPreservation({ knownActions: known, replayActions: known.slice(0, 39) });
  assert.equal(result.lossCount, 0);
});

test("AQ real Sefer Abi suggestion rehydrates across Turkish-I badge and disclosure changes", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "ÖNERILER (3) ▾", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "section", label: "Bağlama uygun öneriler" },
  }, [{
    action: { role: "button", name: "ÖNERİLER (4) ▸", expectedEffectClass: "DRAWER_TRANSITION" },
    owner: { type: "section", label: "Bağlama uygun öneriler" },
    overlayScope: "DRAWER",
    materialState: { drawerOpen: true, drawerTitle: "Sefer Abi" },
  }]);
  assert.equal(context.semanticAction.name, "ÖNERILER (3) ▾");
  assert.equal(context.candidate.action.name, "ÖNERİLER (4) ▸");
});

test("AR real root navigation accepts the current link successor without root ordinal", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Konum veri sağlayıcıları", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "surface", label: "root", boundedOrdinal: 1 },
  }, [{
    action: { role: "link", name: "Konum veri sağlayıcıları", expectedEffectClass: "ROUTE_OR_ANCHOR_TRANSITION" },
    owner: { type: "navigation", label: "SİSTEM › Konum veri sağlayıcıları" },
    materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" },
    overlayScope: "NONE",
  }]);
  assert.equal(context.candidate.action.role, "link");
  assert.equal(context.requiredSurfaceState.systemNavigationDisclosure, "SİSTEM_OPEN");
});

test("AS historical assistant form signature reconstructs the missing drawer before enumeration", () => {
  const state = hybrid.deriveCurrentSurfaceRequirements({
    owner: { type: "form", label: "Bağlam: Genel Bakış Temizle Sor" },
    materialState: { filterSignature: "Sorunu yaz. Örnek: burada neden devam edemiyorum" },
  });
  assert.equal(state.assistantDrawerRequired, true);
});

test("AT real current navigation target recipe remains valid after disclosure reconstruction", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Yardımcı", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "surface", label: "root" },
  }, [{
    action: { role: "link", name: "Yardımcı", expectedEffectClass: "ROUTE_OR_ANCHOR_TRANSITION" },
    owner: { type: "navigation", label: "SİSTEM › Yardımcı" },
    materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" }, overlayScope: "NONE",
  }]);
  const observed = { ...context.candidate, visible: true, enabled: true };
  assert.equal(hybrid.validateCandidateDerivedLocator(context, observed).valid, true);
});

// Diagnostic-only contract: these cases assert the evidence schema that the
// existing semantic-stability verdict must expose. They intentionally do not
// alter the completion policy or click/scroll behavior.
function targetHitFixture(overrides = {}) {
  return {
    TARGET_TAG: "BUTTON",
    TARGET_RECT: { x: 24, y: 960, width: 160, height: 36, top: 960, right: 184, bottom: 996, left: 24 },
    VIEWPORT: { width: 1440, height: 900 },
    RECT_INTERSECTS_VIEWPORT: false,
    CENTER_POINT: { x: 104, y: 978 },
    CENTER_POINT_IN_VIEWPORT: false,
    ELEMENT_FROM_POINT_RESULT: null,
    TOPMOST_TAG: null,
    TOPMOST_ROLE: null,
    TOPMOST_ACCESSIBLE_NAME: null,
    TOPMOST_IS_TARGET: false,
    TOPMOST_IS_DESCENDANT: false,
    TOPMOST_IS_ANCESTOR: false,
    TOPMOST_ANCESTOR_CHAIN: [],
    TARGET_COMPUTED_POSITION: "static",
    TARGET_Z_INDEX: "auto",
    TARGET_POINTER_EVENTS: "auto",
    TOPMOST_COMPUTED_POSITION: null,
    TOPMOST_Z_INDEX: null,
    TOPMOST_POINTER_EVENTS: null,
    NEAREST_SCROLLABLE_ANCESTOR: { tag: "HTML", label: "document" },
    SCROLL_CONTAINER_TYPE: "DOCUMENT",
    DOCUMENT_SCROLL_X: 0,
    DOCUMENT_SCROLL_Y: 0,
    SCROLL_ANCESTOR_SCROLL_TOP: null,
    SCROLL_ANCESTOR_SCROLL_LEFT: null,
    OBSTRUCTION_OWNER: null,
    ...overrides,
  };
}

function diagnosticFor(target, observed = {}) {
  return hybrid.buildSemanticStabilityDiagnostic({
    targetOverlayScope: "NONE",
    observed: { modalOpen: false, drawerOpen: false, backdropOpen: false, targetHitTest: false, ...observed },
    target,
  });
}

test("AU diagnostic output distinguishes offscreen document targets without changing stability failure", () => {
  const diagnostic = diagnosticFor(targetHitFixture());
  assert.equal(diagnostic.FAILED_STABILITY_COMPONENT, "CENTER_OUTSIDE_VIEWPORT");
  assert.equal(diagnostic.PHYSICAL_FAILURE_CLASS, "DOCUMENT_SCROLL_OFFSCREEN");
  assert.equal(hybrid.planSemanticStabilityCompletion({ targetOverlayScope: "NONE", observed: { modalOpen: false, drawerOpen: false, backdropOpen: false, targetHitTest: false } }).complete, false);
});

test("AV diagnostic output distinguishes a nested scroll target from document scroll", () => {
  const diagnostic = diagnosticFor(targetHitFixture({ SCROLL_CONTAINER_TYPE: "NESTED", NEAREST_SCROLLABLE_ANCESTOR: { tag: "DIV", label: "workspace" } }));
  assert.equal(diagnostic.PHYSICAL_FAILURE_CLASS, "NESTED_SCROLL_OFFSCREEN");
  assert.equal(diagnostic.NEAREST_SCROLLABLE_ANCESTOR.tag, "DIV");
});

test("AW diagnostic output preserves an unrelated topmost obstruction", () => {
  const diagnostic = diagnosticFor(targetHitFixture({
    TARGET_RECT: { x: 24, y: 240, width: 160, height: 36, top: 240, right: 184, bottom: 276, left: 24 },
    RECT_INTERSECTS_VIEWPORT: true,
    CENTER_POINT: { x: 104, y: 258 },
    CENTER_POINT_IN_VIEWPORT: true,
    ELEMENT_FROM_POINT_RESULT: "DIV.modal-backdrop",
    TOPMOST_TAG: "DIV",
    TOPMOST_ROLE: null,
    TOPMOST_ACCESSIBLE_NAME: "",
    TOPMOST_COMPUTED_POSITION: "fixed",
    TOPMOST_Z_INDEX: "50",
    TOPMOST_POINTER_EVENTS: "auto",
    OBSTRUCTION_OWNER: "MODAL_BACKDROP",
  }));
  assert.equal(diagnostic.FAILED_STABILITY_COMPONENT, "UNRELATED_TOPMOST_ELEMENT");
  assert.equal(diagnostic.PHYSICAL_FAILURE_CLASS, "MODAL_OR_BACKDROP_OBSTRUCTION");
  assert.equal(diagnostic.TOPMOST_TAG, "DIV");
});

test("AX diagnostic output records a legitimate descendant hit without calling it an obstruction", () => {
  const diagnostic = hybrid.buildSemanticStabilityDiagnostic({
    targetOverlayScope: "NONE",
    observed: { modalOpen: false, drawerOpen: false, backdropOpen: false, targetHitTest: true },
    target: targetHitFixture({
      TARGET_RECT: { x: 24, y: 240, width: 160, height: 36, top: 240, right: 184, bottom: 276, left: 24 },
      RECT_INTERSECTS_VIEWPORT: true,
      CENTER_POINT: { x: 104, y: 258 },
      CENTER_POINT_IN_VIEWPORT: true,
      ELEMENT_FROM_POINT_RESULT: "SPAN.icon",
      TOPMOST_TAG: "SPAN",
      TOPMOST_IS_DESCENDANT: true,
    }),
  });
  assert.equal(diagnostic.FAILED_STABILITY_COMPONENT, null);
  assert.equal(diagnostic.PHYSICAL_FAILURE_CLASS, "LEGITIMATE_DESCENDANT_HIT");
});

test("AY diagnostic output records zero geometry and its measured rect", () => {
  const diagnostic = diagnosticFor(targetHitFixture({
    TARGET_RECT: { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 },
    RECT_INTERSECTS_VIEWPORT: false,
    CENTER_POINT: null,
    CENTER_POINT_IN_VIEWPORT: false,
    SCROLL_CONTAINER_TYPE: "NONE",
  }));
  assert.equal(diagnostic.FAILED_STABILITY_COMPONENT, "TARGET_RECT_ZERO");
  assert.deepEqual(diagnostic.TARGET_RECT, { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 });
});

test("AZ diagnostic output differentiates an actual overlay from a required overlay-contained target", () => {
  const overlay = diagnosticFor(targetHitFixture(), { backdropOpen: true });
  assert.equal(overlay.FAILED_STABILITY_COMPONENT, "OVERLAY_PRESENT");
  const contained = hybrid.buildSemanticStabilityDiagnostic({
    targetOverlayScope: "DRAWER",
    observed: { modalOpen: false, drawerOpen: true, backdropOpen: false, targetContained: true, targetHitTest: true },
    target: targetHitFixture({
      TARGET_RECT: { x: 24, y: 240, width: 160, height: 36, top: 240, right: 184, bottom: 276, left: 24 },
      RECT_INTERSECTS_VIEWPORT: true,
      CENTER_POINT: { x: 104, y: 258 },
      CENTER_POINT_IN_VIEWPORT: true,
      ELEMENT_FROM_POINT_RESULT: "BUTTON",
      TOPMOST_TAG: "BUTTON",
      TOPMOST_IS_TARGET: true,
    }),
  });
  assert.equal(contained.FAILED_STABILITY_COMPONENT, null);
  assert.equal(contained.PHYSICAL_FAILURE_CLASS, "TARGET_HIT_CONFIRMED");
});

test("BA diagnostic output preserves exact failed component plus hit-test, style, and scroll facts", () => {
  const diagnostic = diagnosticFor(targetHitFixture({
    TARGET_RECT: { x: 24, y: 240, width: 160, height: 36, top: 240, right: 184, bottom: 276, left: 24 },
    RECT_INTERSECTS_VIEWPORT: true,
    CENTER_POINT: { x: 104, y: 258 },
    CENTER_POINT_IN_VIEWPORT: true,
    ELEMENT_FROM_POINT_RESULT: null,
    TOPMOST_TAG: null,
    TARGET_COMPUTED_POSITION: "sticky",
    TARGET_Z_INDEX: "4",
    SCROLL_CONTAINER_TYPE: "NESTED",
    SCROLL_ANCESTOR_SCROLL_TOP: 144,
  }));
  assert.equal(diagnostic.FAILED_STABILITY_COMPONENT, "ELEMENT_FROM_POINT_NULL");
  for (const key of ["TARGET_RECT", "VIEWPORT", "ELEMENT_FROM_POINT_RESULT", "TARGET_COMPUTED_POSITION", "SCROLL_CONTAINER_TYPE", "SCROLL_ANCESTOR_SCROLL_TOP"]) assert.ok(Object.hasOwn(diagnostic, key), key);
  assert.equal(diagnostic.SCROLL_ANCESTOR_SCROLL_TOP, 144);
});

let failures = 0;
for (const item of cases) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}
if (failures) {
  console.log(`PRE_18_HYBRID_SURFACE_STATE_EXECUTOR_CHECK=RED (${failures}/${cases.length})`);
  process.exitCode = 1;
} else {
  console.log("PRE_18_HYBRID_SURFACE_STATE_EXECUTOR_CHECK=PASS");
}

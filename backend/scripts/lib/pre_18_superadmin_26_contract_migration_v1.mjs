/*
 * PRE-#18 Super Admin residual reconciliation, version 1.
 *
 * This is deliberately a migration manifest rather than a checkpoint rewrite.
 * It maps immutable historical evidence to a current, replayable action
 * contract.  Product source, frozen discovery, and canonical checkpoints are
 * never inputs that this module is allowed to mutate.
 */

export const SUPERADMIN_26_MIGRATION_VERSION = "PRE_18_SUPERADMIN_ACTION_CONTRACT_MIGRATION_V1";

export const STATE_RECIPE_STEPS = Object.freeze(new Set([
  "ROUTE_READY",
  "DETAILS_EXPANDED",
  "NAV_GROUP_OPEN",
  "ROW_TARGET_SELECTED",
  "INLINE_EDIT_OPEN",
  "ASSISTANT_DRAWER_OPEN",
  "ASSISTANT_OPTIONS_OPEN",
  "COMPOSER_HAS_CONTENT",
  "ASSISTANT_RESPONSE_SETTLED",
]));

export const STATE_RECIPE_VERSION = "PRE_18_SUPERADMIN_MIGRATED_STATE_RECIPE_V2";

const routeReady = Object.freeze({ type: "ROUTE_READY" });
const details = Object.freeze({ type: "DETAILS_EXPANDED", label: "Ayrıntılı çalışma alanını göster" });
const systemNavigation = Object.freeze({ type: "NAV_GROUP_OPEN", group: "SİSTEM" });
const drawer = Object.freeze({ type: "ASSISTANT_DRAWER_OPEN" });
const options = Object.freeze({ type: "ASSISTANT_OPTIONS_OPEN", label: "Sefer Abi seçenekleri" });
const settledResponse = Object.freeze({
  type: "ASSISTANT_RESPONSE_SETTLED",
  safePrompt: "Bu ekranda neye bakmalıyım?",
});

function semanticControl(role, name) {
  return Object.freeze({ role, name });
}

// A migrated state is not a declaration alone.  Producers describe the safe
// current transition and assertions independently prove its postcondition.
// Keeping these together in the migration artifact lets the browser runner
// reconstruct current state without ever replaying obsolete historical steps.
export function describeStateRecipeStep(step = {}) {
  const type = step.type;
  if (!STATE_RECIPE_STEPS.has(type)) throw new Error(`MIGRATION_STATE_RECIPE_UNSUPPORTED:${type || "UNKNOWN"}`);
  const label = step.label || null;
  const base = { type, precondition: "CURRENT_ROUTE_READY" };
  if (type === "ROUTE_READY") return { produce: { ...base, action: "VERIFY_ROUTE", control: null, postcondition: "ROUTE_READY" }, assert: { type, condition: "ROUTE_READY" } };
  if (type === "DETAILS_EXPANDED") return { produce: { ...base, action: "OPEN_DISCLOSURE", control: semanticControl("summary", label || "Ayrıntılı çalışma alanını göster"), postcondition: "DISCLOSURE_OPEN" }, assert: { type, condition: "DISCLOSURE_OPEN", control: semanticControl("summary", label || "Ayrıntılı çalışma alanını göster") } };
  if (type === "NAV_GROUP_OPEN") return { produce: { ...base, action: "OPEN_NAVIGATION_GROUP", control: semanticControl("button", step.group || "SİSTEM"), postcondition: "NAVIGATION_GROUP_OPEN" }, assert: { type, condition: "NAVIGATION_GROUP_OPEN", group: step.group || "SİSTEM" } };
  if (type === "ROW_TARGET_SELECTED") return { produce: { ...base, action: "VERIFY_CURRENT_ROW", control: null, businessTarget: step.businessTarget || null, postcondition: "ROW_TARGET_PRESENT" }, assert: { type, condition: "ROW_TARGET_PRESENT", businessTarget: step.businessTarget || null } };
  if (type === "INLINE_EDIT_OPEN") return { produce: { ...base, action: "OPEN_INLINE_EDIT", control: semanticControl("button", step.action || "Düzenle"), businessTarget: step.businessTarget || null, postcondition: "INLINE_EDIT_OPEN" }, assert: { type, condition: "INLINE_EDIT_OPEN", businessTarget: step.businessTarget || null } };
  if (type === "ASSISTANT_DRAWER_OPEN") return { produce: { ...base, action: "OPEN_ASSISTANT_DRAWER", control: semanticControl("button", "Sefer Abi’ye Sor"), postcondition: "ASSISTANT_DRAWER_OPEN" }, assert: { type, condition: "ASSISTANT_DRAWER_OPEN" } };
  if (type === "ASSISTANT_OPTIONS_OPEN") return { produce: { ...base, action: "OPEN_DISCLOSURE", control: semanticControl("summary", label || "Sefer Abi seçenekleri"), postcondition: "DISCLOSURE_OPEN" }, assert: { type, condition: "DISCLOSURE_OPEN", control: semanticControl("summary", label || "Sefer Abi seçenekleri"), expectedControl: semanticControl("button", "Küçük") } };
  if (type === "COMPOSER_HAS_CONTENT") return { produce: { ...base, action: "FILL_ASSISTANT_COMPOSER", control: semanticControl("textbox", "assistant-composer"), safePrompt: step.safePrompt || null, postcondition: "COMPOSER_HAS_CONTENT" }, assert: { type, condition: "COMPOSER_HAS_CONTENT" } };
  return { produce: { ...base, action: "SUBMIT_AND_WAIT_FOR_SETTLED_RESPONSE", control: semanticControl("button", "Sor"), safePrompt: step.safePrompt || null, postcondition: "ASSISTANT_RESPONSE_SETTLED" }, assert: { type, condition: "ASSISTANT_RESPONSE_SETTLED", expectedControl: semanticControl("button", "Sesli oku") } };
}

export function buildStateRecipeContract(steps = []) {
  const described = steps.map((step) => describeStateRecipeStep(step));
  return Object.freeze({
    version: STATE_RECIPE_VERSION,
    produce: described.map((item) => item.produce),
    assert: described.map((item) => item.assert),
  });
}

function target(id) {
  return Object.freeze({ type: "COMPANY", id: String(id) });
}

function rowTarget(id) {
  return Object.freeze({ type: "ROW_TARGET_SELECTED", businessTarget: target(id) });
}

function inlineEdit(id) {
  return Object.freeze({ type: "INLINE_EDIT_OPEN", businessTarget: target(id), action: "Düzenle" });
}

// C-IDs are stable references into the immutable 39-row differential capture.
// The public runner resolves them to the actual historical ACTION_CONTRACT_ID
// before emitting a run artifact, so no ordinal or DOM binding is used at
// execution time.
export const SUPERADMIN_26_SLOT_SPECS = Object.freeze({
  C00: { disposition: "EXECUTE", stableIntent: "OPEN_TELEMATICS", effect: "NAVIGATE:/superadmin/telematics", stateRecipe: [routeReady, systemNavigation] },
  C01: { disposition: "RETIRE", canonicalSlot: "C00", reason: "DUPLICATE_PRESENTATION_OCCURRENCE", effect: "NAVIGATE:/superadmin/telematics" },
  C08: { disposition: "EXPECTED_DISABLED", stableIntent: "SUBMIT_ASSISTANT_QUERY", effect: "SUBMIT:ASSISTANT_QUERY", stateRecipe: [routeReady, drawer] },
  C09: { disposition: "EXECUTE", stableIntent: "OPEN_COMPANY_PROFILE", effect: "OPEN:COMPANY_PROFILE", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1)] },
  C10: { disposition: "BOUNDARY", stableIntent: "DELETE_COMPANY", effect: "DELETE_BOUNDARY:COMPANY", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1)] },
  C13: { disposition: "EXECUTE", stableIntent: "EDIT_COMPANY_NAME", effect: "FOCUS:COMPANY_NAME", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1), inlineEdit(1)] },
  C14: { disposition: "EXECUTE", stableIntent: "EDIT_COMPANY_LOCATION", effect: "FOCUS:COMPANY_LOCATION", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1), inlineEdit(1)] },
  C15: { disposition: "EXECUTE", stableIntent: "EDIT_COMPANY_STATUS", effect: "FOCUS:COMPANY_STATUS", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1), inlineEdit(1)] },
  C16: { disposition: "EXECUTE", stableIntent: "COPY_COMPANY_ID", effect: "COPY:COMPANY_ID", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1)] },
  C17: { disposition: "BOUNDARY", stableIntent: "SAVE_COMPANY", effect: "SAVE_BOUNDARY:COMPANY", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1), inlineEdit(1)] },
  C18: { disposition: "EXECUTE", stableIntent: "CANCEL_COMPANY_EDIT", effect: "CANCEL_EDIT:COMPANY", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1), inlineEdit(1)] },
  C19: { disposition: "EXECUTE", stableIntent: "OPEN_COMPANY_PROFILE", effect: "OPEN:COMPANY_PROFILE", businessTarget: target(2), stateRecipe: [routeReady, rowTarget(2)] },
  C20: { disposition: "BOUNDARY", stableIntent: "DELETE_COMPANY", effect: "DELETE_BOUNDARY:COMPANY", businessTarget: target(2), stateRecipe: [routeReady, rowTarget(2)] },
  C22: { disposition: "EXECUTE", stableIntent: "SET_ASSISTANT_PANEL_SIZE_SMALL", effect: "SET_PANEL_SIZE:SMALL", stateRecipe: [routeReady, drawer, options] },
  C23: { disposition: "EXECUTE", stableIntent: "SET_ASSISTANT_PANEL_SIZE_MEDIUM", effect: "SET_PANEL_SIZE:MEDIUM", stateRecipe: [routeReady, drawer, options] },
  C24: { disposition: "EXECUTE", stableIntent: "SET_ASSISTANT_PANEL_SIZE_LARGE", effect: "SET_PANEL_SIZE:LARGE", stateRecipe: [routeReady, drawer, options] },
  C25: { disposition: "EXECUTE", stableIntent: "OPEN_FULL_SCREEN_CONVERSATION", effect: "OPEN:FULL_SCREEN_CONVERSATION", stateRecipe: [routeReady, drawer, options] },
  C29: { disposition: "EXECUTE", stableIntent: "READ_ASSISTANT_RESPONSE", effect: "POST_RESPONSE_ACTION:READ_ALOUD", stateRecipe: [routeReady, drawer, settledResponse] },
  C30: { disposition: "EXECUTE", stableIntent: "CONTINUE_ASSISTANT_RESPONSE", effect: "POST_RESPONSE_ACTION:CONTINUE", stateRecipe: [routeReady, drawer, settledResponse] },
  C31: { disposition: "EXECUTE", stableIntent: "OPEN_COMPANY_PROFILE", effect: "OPEN:COMPANY_PROFILE", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1)] },
  C32: { disposition: "BOUNDARY", stableIntent: "DELETE_COMPANY", effect: "DELETE_BOUNDARY:COMPANY", businessTarget: target(1), stateRecipe: [routeReady, rowTarget(1)] },
  C33: { disposition: "EXECUTE", stableIntent: "EDIT_COMPANY_NAME", effect: "FOCUS:COMPANY_NAME", businessTarget: target(2), stateRecipe: [routeReady, rowTarget(2), inlineEdit(2)] },
  C35: { disposition: "SUCCESSOR", stableIntent: "OPEN_CHECKIN_RECORDS", effect: "NAVIGATE:/room/checkin", successorStateRecipe: [routeReady, details], successorLabel: "Biniş kayıtları", successorExecutionMode: "SAFE_NAVIGATION_EXECUTION" },
  C36: { disposition: "SUCCESSOR", stableIntent: "OPEN_ASSISTANT_HELPER", effect: "NAVIGATE:/superadmin/copilot", successorStateRecipe: [routeReady, details], successorLabel: "Yardımcı" },
  C37: { disposition: "RETIRE", canonicalSlot: "C00", reason: "STALE_SURFACE_OCCURRENCE", effect: "NAVIGATE:/superadmin/telematics" },
  C38: { disposition: "RETIRE", canonicalSlot: "C00", reason: "STALE_SURFACE_OCCURRENCE", effect: "NAVIGATE:/superadmin/telematics" },
});

export const SUPERADMIN_EXISTING_PASS_SLOT_COUNT = 13;

const STABLE_IDENTITY_EXCLUDED = new Set([
  "ownerLabel",
  "ownerOrdinal",
  "rawFilterSignature",
  "domOrder",
  "fullRowText",
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableIdentity(historical = {}, spec = {}) {
  return Object.freeze({
    role: historical.ROLE,
    route: historical.ROUTE,
    surfaceClass: String(historical.SURFACE_ID || "").split("|").slice(0, 4).join("|"),
    viewportRepresentationClass: historical.VIEWPORT,
    actionFamily: spec.stableIntent,
    businessTargetType: spec.businessTarget?.type || null,
    stableTargetKey: spec.businessTarget?.id || null,
    expectedEffect: spec.effect,
    safetyClass: historical.SAFETY_CLASS,
    prerequisiteStateClass: (spec.successorStateRecipe || spec.stateRecipe || []).map((step) => step.type),
  });
}

function validateSpec(slot, spec) {
  if (!spec?.disposition) throw new Error(`MIGRATION_SPEC_MISSING_DISPOSITION:${slot}`);
  for (const step of spec.stateRecipe || spec.successorStateRecipe || []) {
    if (!STATE_RECIPE_STEPS.has(step.type)) throw new Error(`MIGRATION_STATE_RECIPE_UNSUPPORTED:${slot}:${step.type}`);
  }
  if (spec.businessTarget && (!spec.businessTarget.type || !spec.businessTarget.id)) throw new Error(`MIGRATION_BUSINESS_TARGET_INVALID:${slot}`);
}

function terminalPolicy(slot, spec) {
  if (slot === "C30") return "CONDITIONAL_HISTORICAL_STATE";
  if (spec.disposition === "BOUNDARY") return "SAFE_BOUNDARY";
  if (["C00", "C35", "C36"].includes(slot)) return "COMPATIBLE_EFFECT_EQUIVALENCE";
  return "SAFE_DETERMINISTIC_EXECUTION";
}

export function buildSuperAdmin26Migration(residuals = []) {
  if (!Array.isArray(residuals) || residuals.length !== 39) throw new Error(`MIGRATION_EXPECTED_39_RESIDUALS_FOUND:${Array.isArray(residuals) ? residuals.length : "NONE"}`);
  const rows = [];
  for (const [slot, spec] of Object.entries(SUPERADMIN_26_SLOT_SPECS)) {
    validateSpec(slot, spec);
    const index = Number(slot.slice(1));
    const historical = residuals[index];
    if (!historical?.ACTION_CONTRACT_ID && !historical?.HISTORICAL_ACTION_CONTRACT_ID) throw new Error(`MIGRATION_HISTORICAL_CONTRACT_MISSING:${slot}`);
    const stateRecipe = clone(buildStateRecipeContract(spec.successorStateRecipe || spec.stateRecipe || []));
    if (spec.successorLabel) {
      const disclosureAssertion = stateRecipe.assert.find((step) => step.type === "DETAILS_EXPANDED");
      if (disclosureAssertion) disclosureAssertion.expectedControl = semanticControl("button", spec.successorLabel);
    }
    rows.push(Object.freeze({
      SLOT: slot,
      HISTORICAL_ACTION_CONTRACT_ID: historical.HISTORICAL_ACTION_CONTRACT_ID || historical.ACTION_CONTRACT_ID,
      HISTORICAL_ACTION_NAME: historical.ACTION_NAME,
      HISTORICAL_ROUTE: historical.ROUTE,
      DISPOSITION: spec.disposition,
      STABLE_IDENTITY: stableIdentity(historical, spec),
      STATE_RECIPE: stateRecipe,
      HISTORICAL_SETUP_POLICY: "MIGRATION_FIRST_NO_STALE_REPLAY",
      TERMINAL_POLICY: terminalPolicy(slot, spec),
      BUSINESS_TARGET: clone(spec.businessTarget || null),
      EXPECTED_EFFECT_DESTINATION: spec.effect,
      SUCCESSOR_SLOT: spec.disposition === "SUCCESSOR" ? slot : (spec.canonicalSlot || null),
      SUCCESSOR_LABEL: spec.successorLabel || null,
      SUCCESSOR_EXECUTION_MODE: spec.successorExecutionMode || (spec.disposition === "SUCCESSOR" ? "EQUIVALENCE_ONLY" : null),
      RETIRE_REASON: spec.reason || null,
      IDENTITY_EXCLUDES: [...STABLE_IDENTITY_EXCLUDED],
    }));
  }
  const counts = Object.values(SUPERADMIN_26_SLOT_SPECS).reduce((acc, spec) => {
    acc[spec.disposition] = (acc[spec.disposition] || 0) + 1;
    return acc;
  }, {});
  const executions = (counts.EXECUTE || 0) + (counts.BOUNDARY || 0) + (counts.SUCCESSOR || 0);
  const accounting = {
    HISTORICAL_KNOWN_CONTRACT_COUNT: 359,
    PROPOSED_DISTINCT_CONTRACT_COUNT: 356,
    PROPOSED_RETIREMENT_COUNT: counts.RETIRE || 0,
    PROPOSED_SUCCESSOR_LINK_COUNT: counts.SUCCESSOR || 0,
    PROPOSED_TRUE_EXECUTION_COUNT: executions,
    PROPOSED_EXPECTED_DISABLED_COUNT: counts.EXPECTED_DISABLED || 0,
    HISTORICAL_RESIDUAL_SLOT_COUNT: rows.length,
    ACCOUNTING_BALANCED: rows.length === executions + (counts.EXPECTED_DISABLED || 0) + (counts.RETIRE || 0)
      && executions === 22 && (counts.EXPECTED_DISABLED || 0) === 1 && (counts.RETIRE || 0) === 3,
  };
  return Object.freeze({
    MIGRATION_VERSION: SUPERADMIN_26_MIGRATION_VERSION,
    FROZEN_HISTORY_MUTATION: "PROHIBITED",
    rows,
    accounting,
  });
}

export function isStateRecipeValid(recipe = []) {
  if (Array.isArray(recipe)) return recipe.every((step) => STATE_RECIPE_STEPS.has(step?.type));
  return Boolean(recipe && recipe.version === STATE_RECIPE_VERSION
    && Array.isArray(recipe.produce)
    && Array.isArray(recipe.assert)
    && recipe.produce.length === recipe.assert.length
    && recipe.produce.every((step) => STATE_RECIPE_STEPS.has(step?.type))
    && recipe.assert.every((step) => STATE_RECIPE_STEPS.has(step?.type)));
}

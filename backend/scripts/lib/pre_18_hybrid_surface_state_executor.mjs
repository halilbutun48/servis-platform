import fs from "node:fs/promises";
import path from "node:path";

const EXECUTION_STATES = new Set([
  "DISCOVERED",
  "ATTEMPTED",
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "ACCESSIBILITY_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
  "HARNESS_FAILURE",
  "NOT_SAFE_TO_EXECUTE_FULLY",
  "NOT_YET_TESTED",
]);

const TERMINAL_STATES = new Set([
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "ACCESSIBILITY_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
  "NOT_SAFE_TO_EXECUTE_FULLY",
]);

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function nullable(value) {
  return text(value) || null;
}

function finiteCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function ownerCandidateLabel(candidate = {}) {
  return nullable(
    candidate.semanticLabel
    || candidate.ariaLabel
    || candidate.ariaLabelledByText
    || candidate.heading
    || candidate.legend
    || candidate.caption
    || candidate.localLabel
    || candidate.localText
    || candidate.label,
  );
}

function ownerPriority(type) {
  return ({ modal: 0, drawer: 1, "table-row": 2, form: 3, navigation: 4, card: 5, section: 6, landmark: 7, surface: 8 })[type] ?? 9;
}

export function isOverBroadOwnerCandidate(candidate = {}) {
  const label = ownerCandidateLabel(candidate) || "";
  const interactiveDescendantCount = finiteCount(candidate.interactiveDescendantCount);
  const navigationDescendantCount = finiteCount(candidate.navigationDescendantCount);
  const textLength = finiteCount(candidate.textLength || label.length);
  const lacksSemanticLabel = !nullable(candidate.semanticLabel || candidate.ariaLabel || candidate.ariaLabelledByText || candidate.heading || candidate.legend || candidate.caption || candidate.localLabel);
  if (candidate.globalNavigation === true || candidate.applicationShell === true) return true;
  if (navigationDescendantCount >= 6) return true;
  if (interactiveDescendantCount >= 12 && lacksSemanticLabel) return true;
  if (textLength > 260 && lacksSemanticLabel) return true;
  return false;
}

// Browser capture provides nearby semantic candidates.  This policy chooses the
// narrowest meaningful candidate and deliberately rejects application-shell and
// full-sidebar aggregates; it never relies on DOM ids or positional selectors.
export function selectContextualOwner(candidates = [], action = {}) {
  const normalized = (Array.isArray(candidates) ? candidates : []).map((candidate, index) => {
    const type = nullable(candidate?.type) || "surface";
    const label = ownerCandidateLabel(candidate) || "";
    return {
      ...candidate,
      type,
      label,
      index,
      depth: finiteCount(candidate?.depth),
      priority: ownerPriority(type),
      overBroad: isOverBroadOwnerCandidate({ ...candidate, type, label }),
    };
  }).filter((candidate) => candidate.label);

  const selected = normalized
    .filter((candidate) => !candidate.overBroad)
    .sort((left, right) => left.priority - right.priority || left.depth - right.depth || left.label.length - right.label.length || left.index - right.index)[0];

  if (!selected) return { type: "surface", label: "root", boundedOrdinal: null };
  return {
    type: selected.type,
    label: selected.label,
    boundedOrdinal: Number.isInteger(selected.boundedOrdinal) && selected.boundedOrdinal >= 0 ? selected.boundedOrdinal : null,
  };
}

// A root owner is permitted only for a genuinely global, uniquely named
// control.  It is never a substitute for a missing local semantic context.
// Callers retain the classification so an ambiguous root cannot silently turn
// into a replayable or passing action.
export function classifyRootOwnerFallback(candidates = [], action = {}) {
  const owner = selectContextualOwner(candidates, action);
  if (owner.label !== "root") return { owner, classification: "LOCAL_OWNER", reason: "meaningful local owner selected" };
  if (!nullable(action?.name || action?.accessibleName || action?.userMeaning)) {
    return { owner, classification: "ACCESSIBILITY_PRODUCT_DEFECT_CANDIDATE", reason: "visible action lacks a meaningful semantic name and local owner" };
  }
  if (action?.globalUnique === true) {
    return { owner, classification: "LEGITIMATE_ROOT_OWNER", reason: "uniquely named global action has no narrower semantic owner" };
  }
  return { owner, classification: "HARNESS_OWNER_FAILURE", reason: "named action has no safe local owner and is not proven globally unique" };
}

function canonicalText(value) {
  return text(value).toLocaleLowerCase("tr-TR");
}

// DOM tag names, input types, and structural control kinds are machine
// identifiers rather than Turkish user-visible text.  Keep their case folding
// locale-independent so browser-native uppercase tag names retain ASCII
// identity (for example INPUT -> input, never ınput).
export function canonicalStructuralToken(value) {
  return text(value).toLowerCase();
}

function sameText(left, right) {
  const normalizedLeft = canonicalText(left);
  const normalizedRight = canonicalText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function compatibleText(left, right) {
  const normalizedLeft = canonicalText(left);
  const normalizedRight = canonicalText(right);
  return Boolean(normalizedLeft && normalizedRight && (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)));
}

function meaningfulTokenOverlap(left, right) {
  const ignored = new Set(["firma", "firmalar", "şirket", "şirketler", "satır", "durum", "güncel", "önceki", "table", "row", "button"]);
  const tokens = canonicalText(left).split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 5 && !ignored.has(token));
  const rightText = canonicalText(right);
  return tokens.some((token) => rightText.includes(token));
}

function actionName(action = {}) {
  return nullable(action.name || action.accessibleName || action.visibleText || action.userMeaning);
}

function actionRole(action = {}) {
  return nullable(action.role || action.controlRole || action.type) || "button";
}

// Keep native-control role semantics in one harness-owned rule. Capture and
// replay must agree with the role exposed to assistive technology; this does
// not alter product markup or accessibility behavior.
export function deriveImplicitAriaRole({ tag = "", type = "", explicitRole = "" } = {}) {
  const explicit = canonicalStructuralToken(explicitRole);
  if (explicit) return explicit;
  const element = canonicalStructuralToken(tag);
  const inputType = canonicalStructuralToken(type);
  if (element === "a") return "link";
  if (element === "button" || element === "summary") return "button";
  if (element === "select") return "combobox";
  if (element === "textarea") return "textbox";
  if (element === "input") {
    if (inputType === "checkbox" || inputType === "radio") return inputType;
    if (inputType === "number") return "spinbutton";
    return "textbox";
  }
  return "";
}

// Accessible control names are current user-facing semantics. This normalizer
// intentionally covers only evidence-backed rendering drift: Turkish dotted-I
// transport, a numeric contextual badge, and disclosure glyphs. It is not a
// fuzzy text matcher and is used only after role/surface filtering.
export function normalizeActionSemanticName(value) {
  return canonicalText(value)
    .normalize("NFKC")
    .replace(/ı/gu, "i")
    .replace(/\s*\(\d+\)\s*/gu, " ")
    .replace(/[▾▸⌄⌃∨∧]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

// CollapsibleSection renders its dynamic badge between dedicated title and
// subtitle nodes.  That is component structure, not generic numeric text.  A
// frozen capture can therefore retain a badge that a later current extraction
// correctly omits.  Harmonize only this known structural representation; do
// not globally remove numeric user-facing labels.
export function normalizeCollapsibleSectionSemanticName(value, structure = {}) {
  const kind = canonicalStructuralToken(structure?.kind).toUpperCase();
  const title = normalizeActionSemanticName(structure?.title);
  const subtitle = normalizeActionSemanticName(structure?.subtitle);
  const normalized = normalizeActionSemanticName(value);
  if (kind !== "COLLAPSIBLE_SECTION" || !title || !subtitle || !normalized) return normalized;
  const stable = `${title} ${subtitle}`.trim();
  if (normalized === stable) return stable;
  if (!normalized.startsWith(`${title} `) || !normalized.endsWith(` ${subtitle}`)) return normalized;
  const badgePresentation = normalized.slice(title.length, normalized.length - subtitle.length).trim();
  // The only removed content is an interior CollapsibleSection badge.  Title
  // and subtitle text, including legitimate numbers such as "Hat 12", stay
  // part of the semantic identity.
  if (/^\d+(?:\s+[\p{L}\p{N}]+){0,3}$/u.test(badgePresentation)) return stable;
  return normalized;
}

function sameSemanticActionName(leftAction, rightAction, rightControl = {}) {
  const normalizedLeft = normalizeCollapsibleSectionSemanticName(actionName(leftAction), rightControl?.semanticStructure || rightControl?.collapsibleSemanticStructure || {});
  const normalizedRight = normalizeCollapsibleSectionSemanticName(actionName(rightAction), rightControl?.semanticStructure || rightControl?.collapsibleSemanticStructure || {});
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function compatibleCurrentActionRole(previousAction = {}, candidate = {}) {
  const wanted = actionRole(previousAction);
  const current = actionRole(candidate.action || candidate);
  if (wanted === current) return true;
  const owner = candidate.owner || candidate.contextualOwner || {};
  const navigationSuccessor = ["button", "link"].includes(wanted) && ["button", "link"].includes(current)
    && ["navigation", "surface", "landmark"].includes(nullable(owner.type));
  return navigationSuccessor;
}

export function deriveCurrentSurfaceRequirements(historical = {}) {
  const state = historical.materialState || historical.currentSurfaceState || {};
  const owner = historical.owner || historical.contextualOwner || {};
  const fingerprint = canonicalText(`${state.filterSignature || ""} ${owner.label || ""}`);
  const assistantDrawerRequired = Boolean(
    state.drawerOpen === true
    || /sorunu yaz|bağlam[a-zçğıöşü]* uygun öner|bağlam:/iu.test(fingerprint)
  );
  return {
    assistantDrawerRequired,
    systemNavigationDisclosure: nullable(state.systemNavigationDisclosure),
    activeTab: nullable(state.activeTab),
    detailsOpen: state.detailsOpen === true,
  };
}

function overlayScope(candidate = {}) {
  const explicit = canonicalStructuralToken(candidate.overlayScope || candidate.overlay?.scope || candidate.overlay?.type);
  if (["modal", "drawer", "popover", "menu", "other"].includes(explicit)) return explicit.toUpperCase();
  const state = candidate.materialState || candidate.currentSurfaceState || {};
  if (state.modalOpen === true || nullable(state.modalTitle)) return "MODAL";
  if (state.drawerOpen === true || nullable(state.drawerTitle)) return "DRAWER";
  const owner = candidate.owner || candidate.contextualOwner || {};
  if (canonicalStructuralToken(owner.type) === "modal") return "MODAL";
  if (canonicalStructuralToken(owner.type) === "drawer") return "DRAWER";
  return "NONE";
}

function currentBusinessContext(candidate = {}) {
  const owner = candidate.owner || candidate.contextualOwner || {};
  return nullable(candidate.businessContext || candidate.control?.businessContext || owner.businessContext || owner.label);
}

export function structuralContextMatches(candidate = {}, required = null) {
  if (!required || typeof required !== "object") return true;
  const control = candidate.control || candidate.action?.control || {};
  if (required.dataTestId && String(control.dataTestId || "") !== String(required.dataTestId)) return false;
  if (required.formControl && canonicalStructuralToken(control.tag || control.type) !== canonicalStructuralToken(required.formControl)) return false;
  return true;
}

// A row/entity identity is a first-class execution constraint.  Historical
// owner prose remains useful evidence, but it must never resolve one business
// row merely because generic row text happens to overlap.
function currentBusinessTarget(candidate = {}) {
  const target = candidate.businessTarget || candidate.control?.businessTarget || candidate.owner?.businessTarget || candidate.contextualOwner?.businessTarget;
  if (!target?.type || target.id == null || String(target.id).trim() === "") return null;
  return { type: String(target.type), id: String(target.id) };
}

function sameBusinessTarget(left = null, right = null) {
  if (!left || !right) return false;
  return canonicalStructuralToken(left.type) === canonicalStructuralToken(right.type) && String(left.id) === String(right.id);
}

function expectedEffect(candidate = {}) {
  return nullable(candidate.stableEffect || candidate.action?.stableEffect || candidate.action?.expectedEffectClass || candidate.expectedEffectClass || candidate.action?.expectedEffect);
}

function candidateSemanticKey(candidate = {}) {
  const action = candidate.action || candidate;
  const owner = candidate.owner || candidate.contextualOwner || {};
  return stableJson({
    role: actionRole(action),
    name: actionName(action),
    businessContext: currentBusinessContext(candidate),
    businessTarget: currentBusinessTarget(candidate),
    ownerType: nullable(owner.type),
    ownerLabel: nullable(owner.label),
    overlayScope: overlayScope(candidate),
    expectedEffect: expectedEffect(candidate),
  });
}

// Multiple captures of one rendered current control (for example before and
// after opening the navigation disclosure) are not independent candidates.
// The key deliberately retains entity and local-owner identity so same-name
// controls for different rows never collapse.
export function deduplicateCurrentSemanticCandidates(candidates = []) {
  const current = [];
  const seen = new Map();
  let duplicateCount = 0;
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const action = candidate.action || candidate;
    const owner = candidate.owner || candidate.contextualOwner || {};
    const key = stableJson({
      role: actionRole(action),
      name: normalizeActionSemanticName(actionName(action)),
      businessTarget: currentBusinessTarget(candidate),
      ownerType: nullable(owner.type),
      ownerLabel: nullable(owner.label),
      overlayScope: overlayScope(candidate),
      stableEffect: expectedEffect(candidate),
    });
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.set(key, candidate);
    current.push(candidate);
  }
  return { candidates: current, duplicateCount };
}

function freezeExecutionContext(context = {}) {
  return Object.freeze({
    ...context,
    currentOwner: Object.freeze({ ...(context.currentOwner || {}) }),
    requiredSurfaceState: Object.freeze({ ...(context.requiredSurfaceState || {}) }),
    locatorRecipe: Object.freeze({ ...(context.locatorRecipe || {}) }),
  });
}

function overlayMatches(requiredTitle, observedTitle) {
  return !nullable(requiredTitle) || sameText(requiredTitle, observedTitle);
}

// A contract is independent unless its required material state explicitly owns
// the currently open modal or drawer. This policy makes overlay cleanup a
// deterministic, testable decision rather than a side effect of a later click.
export function planSurfaceStateStability({ requiredState = {}, observedState = {}, targetOwner = {} } = {}) {
  const requiredModal = nullable(requiredState.modalTitle);
  const requiredDrawer = nullable(requiredState.drawerTitle);
  const requiredModalOpen = requiredState.modalOpen === true;
  const requiredDrawerOpen = requiredState.drawerOpen === true;
  const observedModal = nullable(observedState.modalTitle);
  const observedDrawer = nullable(observedState.drawerTitle);
  const observedModalOpen = observedState.modalOpen === true || Boolean(observedModal);
  const observedDrawerOpen = observedState.drawerOpen === true || Boolean(observedDrawer);
  const observedUntitledOverlay = Number(observedState.overlayCount || 0) > 0 || observedState.overlayOpen === true;
  const ownerType = nullable(targetOwner.type);
  const ownerLabel = nullable(targetOwner.label);

  const requiredModalStable = Boolean((requiredModal && observedModal && overlayMatches(requiredModal, observedModal)) || (requiredModalOpen && observedModalOpen && ownerType === "modal"));
  const requiredDrawerStable = Boolean((requiredDrawer && observedDrawer && overlayMatches(requiredDrawer, observedDrawer)) || (requiredDrawerOpen && observedDrawerOpen && ownerType === "drawer"));
  const targetInsideRequiredModal = ownerType === "modal" && compatibleText(ownerLabel, requiredModal);
  const targetInsideRequiredDrawer = ownerType === "drawer" && compatibleText(ownerLabel, requiredDrawer);

  if ((requiredModalStable && (!observedDrawer || !requiredDrawer || overlayMatches(requiredDrawer, observedDrawer)))
      || (requiredDrawerStable && (!observedModal || !requiredModal || overlayMatches(requiredModal, observedModal)))) {
    return {
      strategy: "RESET_NONE",
      retainOverlay: true,
      reason: targetInsideRequiredModal || targetInsideRequiredDrawer ? "REQUIRED_OVERLAY_OWNS_TARGET" : "REQUIRED_OVERLAY_ALREADY_STABLE",
    };
  }
  if (observedModal || observedDrawer || observedUntitledOverlay) {
    return {
      strategy: "RESET_CLOSE_OVERLAY",
      retainOverlay: false,
      reason: "CURRENT_OVERLAY_IS_UNRELATED_TO_NEXT_CONTRACT",
    };
  }
  if (requiredModal || requiredDrawer || requiredModalOpen || requiredDrawerOpen) {
    return {
      strategy: "RESET_REOPEN_ROUTE",
      retainOverlay: false,
      reason: "REQUIRED_OVERLAY_NOT_CURRENTLY_RESTORED",
    };
  }
  return { strategy: "RESET_NONE", retainOverlay: false, reason: "SURFACE_STATE_ALREADY_STABLE" };
}

// The durable contract survives a rerender; its transient browser bindings do
// not. Callers must capture fresh current DOM semantics before the next action.
export function invalidateTransientBrowserBinding(_binding = {}, _transition = {}) {
  return { invalidated: true, locator: null, ownerBinding: null };
}

// Resolves a historical semantic action against freshly enumerated candidates.
// Historical owner text is only a hint: business/user context and the current
// smallest contextual owner decide the current target.
export function diagnoseCurrentSemanticResolution(previous = {}, candidates = []) {
  const previousAction = previous.action || previous;
  const previousOwner = previous.owner || previous.contextualOwner || {};
  const wantedRole = actionRole(previousAction);
  const wantedName = actionName(previousAction);
  const businessContext = nullable(previous.businessContext || previous.selectedBusinessContext || previousOwner.businessContext || previousOwner.label);
  const businessTarget = currentBusinessTarget(previous);
  const wantedEffect = expectedEffect(previous) || expectedEffect(previousAction);
  const semanticIdentity = previous.semanticIdentity || previous.replaySemanticIdentity || null;
  const requiredStructuralContext = semanticIdentity?.structuralContext || previous.structuralContext || null;
  const supplied = Array.isArray(candidates) ? candidates : [];
  const deduped = deduplicateCurrentSemanticCandidates(supplied);
  const all = deduped.candidates;
  const nearMatchSummary = all.slice(0, 12).map((candidate) => {
    const action = candidate.action || candidate;
    const owner = candidate.owner || candidate.contextualOwner || {};
    return {
      ROLE: actionRole(action),
      NAME: nullable(actionName(action)),
      OWNER_TYPE: nullable(owner.type),
      OWNER_LABEL: nullable(owner.label),
    };
  });
  const roleCompatible = all.filter((candidate) => compatibleCurrentActionRole(previousAction, candidate));
  const diagnostics = (overrides = {}) => ({
    CANDIDATES_BEFORE_FILTER: supplied.length,
    ENUMERATED_CANDIDATE_COUNT: supplied.length,
    ROLE_COMPATIBLE_COUNT: roleCompatible.length,
    NAME_COMPATIBLE_COUNT: 0,
    SURFACE_STATE_COMPATIBLE_COUNT: 0,
    BUSINESS_TARGET_COMPATIBLE_COUNT: 0,
    OWNER_COMPATIBLE_COUNT: 0,
    DEDUP_SURVIVOR_COUNT: all.length,
    ACTION_MAPPING_COMPATIBLE_COUNT: 0,
    AFTER_ROLE_NAME: 0,
    AFTER_STATE: 0,
    AFTER_BUSINESS_TARGET: 0,
    AFTER_EFFECT: 0,
    AFTER_OWNER_IF_REQUIRED: 0,
    AFTER_DEDUP: all.length,
    DUPLICATE_CURRENT_CANDIDATE_COUNT: deduped.duplicateCount,
    FINAL_CANDIDATE_COUNT: 0,
    FINAL_RESOLUTION_COUNT: 0,
    NEAR_MATCH_SUMMARY: nearMatchSummary,
    REJECTION_STAGE: null,
    REJECTION_REASON: null,
    ...overrides,
  });
  if (!wantedName) return { candidate: null, resolutionDiagnostics: diagnostics({ REJECTION_STAGE: "ACTION_NAME", REJECTION_REASON: "CURRENT_SEMANTIC_NAME_MISSING" }) };

  const roleNameMatches = all.map((candidate, index) => {
    const candidateAction = candidate.action || candidate;
    const candidateOwner = candidate.owner || candidate.contextualOwner || {};
    if (!compatibleCurrentActionRole(previousAction, candidate) || !sameSemanticActionName(previousAction, candidateAction, candidate.control || {}) || !structuralContextMatches(candidate, requiredStructuralContext)) return null;
    const ownerLabel = nullable(candidateOwner.label);
    const candidateBusiness = currentBusinessContext(candidate);
    const contextualMatch = Boolean(businessContext && (
      compatibleText(candidateBusiness, businessContext)
      || meaningfulTokenOverlap(candidateBusiness, businessContext)
      || compatibleText(ownerLabel, businessContext)
      || meaningfulTokenOverlap(ownerLabel, businessContext)
    ));
    const effectMatch = Boolean(wantedEffect && expectedEffect(candidate) && sameText(expectedEffect(candidate), wantedEffect));
    const currentOwnerMeaningful = nullable(candidateOwner.label) !== "root";
    return {
      candidate,
      index,
      candidateBusiness,
      candidateBusinessTarget: currentBusinessTarget(candidate),
      score: (contextualMatch ? 100 : 0) + (effectMatch ? 20 : 0) + (currentOwnerMeaningful ? 3 : 0),
    };
  }).filter(Boolean);

  // Structured business target filtering intentionally happens before textual
  // ranking.  It prevents "İstanbul / Aktif / Profil" style row prose from
  // becoming an accidental entity identifier.
  const matching = businessTarget
    ? roleNameMatches.filter((item) => sameBusinessTarget(item.candidateBusinessTarget, businessTarget))
    : roleNameMatches;

  if (!matching.length) return {
    candidate: null,
    resolutionDiagnostics: diagnostics({
      AFTER_ROLE_NAME: roleNameMatches.length,
      NAME_COMPATIBLE_COUNT: roleNameMatches.length,
      SURFACE_STATE_COMPATIBLE_COUNT: roleNameMatches.length,
      ACTION_MAPPING_COMPATIBLE_COUNT: roleNameMatches.length,
      AFTER_STATE: roleNameMatches.length,
      AFTER_BUSINESS_TARGET: 0,
      BUSINESS_TARGET_COMPATIBLE_COUNT: 0,
      REJECTION_STAGE: businessTarget ? "BUSINESS_TARGET" : "ROLE_NAME",
      REJECTION_REASON: businessTarget ? "CURRENT_BUSINESS_TARGET_NOT_FOUND" : "CURRENT_ROLE_NAME_NOT_FOUND",
    }),
  };
  const effectFiltered = wantedEffect && matching.some((item) => sameText(expectedEffect(item.candidate), wantedEffect))
    ? matching.filter((item) => sameText(expectedEffect(item.candidate), wantedEffect))
    : matching;
  const highest = Math.max(...effectFiltered.map((item) => item.score));
  const winners = effectFiltered.filter((item) => item.score === highest);
  if (winners.length !== 1) return {
    candidate: null,
    resolutionDiagnostics: diagnostics({
      AFTER_ROLE_NAME: roleNameMatches.length,
      NAME_COMPATIBLE_COUNT: roleNameMatches.length,
      SURFACE_STATE_COMPATIBLE_COUNT: roleNameMatches.length,
      ACTION_MAPPING_COMPATIBLE_COUNT: roleNameMatches.length,
      AFTER_STATE: roleNameMatches.length,
      AFTER_BUSINESS_TARGET: matching.length,
      BUSINESS_TARGET_COMPATIBLE_COUNT: matching.length,
      AFTER_EFFECT: effectFiltered.length,
      AFTER_OWNER_IF_REQUIRED: winners.length,
      OWNER_COMPATIBLE_COUNT: winners.length,
      FINAL_CANDIDATE_COUNT: winners.length,
      FINAL_RESOLUTION_COUNT: 0,
      REJECTION_STAGE: "CURRENT_SEMANTIC_DEDUP",
      REJECTION_REASON: "AMBIGUOUS_CURRENT_SEMANTIC_CANDIDATES",
    }),
  };
  const selected = winners[0];
  const candidate = selected.candidate;
  const currentOwner = candidate.owner || candidate.contextualOwner || { type: "surface", label: "root" };
  const candidateBusiness = selected.candidateBusiness;
  const candidateCount = matching.length;
  const unsafe = candidate.action?.safetyClass === "UNSAFE" || previousAction?.safetyClass === "UNSAFE";
  const hasOverlayAmbiguity = new Set(matching.map((item) => overlayScope(item.candidate))).size > 1;
  const ownerRequirement = candidateCount > 1 || unsafe || hasOverlayAmbiguity ? "REQUIRED" : "OPTIONAL";
  const currentScope = overlayScope(candidate);
  const candidateKey = nullable(candidate.candidateKey) || candidateSemanticKey(candidate);
  const currentAction = candidate.action || candidate;
  const currentRole = actionRole(currentAction);
  const currentName = actionName(currentAction);
  return {
    candidate,
    candidateKey,
    semanticAction: { role: wantedRole, name: wantedName },
    currentOwner,
    businessContext: candidateBusiness,
    businessTarget: selected.candidateBusinessTarget,
    ownerRequirement,
    overlayScope: currentScope,
    targetRequiresOverlay: currentScope !== "NONE",
    expectedEffect: expectedEffect(candidate) || wantedEffect,
    requiredSurfaceState: candidate.materialState || {},
    locatorRecipe: {
      candidateKey,
      route: nullable(previous.route),
      role: currentRole,
      name: currentName,
      businessContext: candidateBusiness,
      businessTarget: selected.candidateBusinessTarget,
      owner: ownerRequirement === "REQUIRED" ? currentOwner : null,
      overlayScope: currentScope,
      targetRequiresOverlay: currentScope !== "NONE",
      semanticIdentity,
      structuralContext: requiredStructuralContext,
    },
    resolutionDiagnostics: {
      CANDIDATES_BEFORE_FILTER: supplied.length,
      ENUMERATED_CANDIDATE_COUNT: supplied.length,
      ROLE_COMPATIBLE_COUNT: roleCompatible.length,
      NAME_COMPATIBLE_COUNT: roleNameMatches.length,
      SURFACE_STATE_COMPATIBLE_COUNT: roleNameMatches.length,
      BUSINESS_TARGET_COMPATIBLE_COUNT: matching.length,
      OWNER_COMPATIBLE_COUNT: winners.length,
      DEDUP_SURVIVOR_COUNT: all.length,
      ACTION_MAPPING_COMPATIBLE_COUNT: roleNameMatches.length,
      AFTER_ROLE_NAME: roleNameMatches.length,
      AFTER_STATE: roleNameMatches.length,
      AFTER_BUSINESS_TARGET: matching.length,
      AFTER_EFFECT: effectFiltered.length,
      AFTER_OWNER_IF_REQUIRED: winners.length,
      AFTER_DEDUP: all.length,
      DUPLICATE_CURRENT_CANDIDATE_COUNT: deduped.duplicateCount,
      FINAL_CANDIDATE_COUNT: winners.length,
      FINAL_RESOLUTION_COUNT: 1,
      NEAR_MATCH_SUMMARY: nearMatchSummary,
      REJECTION_STAGE: null,
      REJECTION_REASON: null,
    },
  };
}

export function buildCurrentSemanticExecutionContext(previous = {}, candidates = []) {
  const resolution = diagnoseCurrentSemanticResolution(previous, candidates);
  return resolution?.candidate ? freezeExecutionContext(resolution) : null;
}

// Compatibility entry point for callers that need only the selected current
// candidate.  It intentionally delegates to the single execution-context
// reconstruction so semantic selection and locator binding cannot diverge.
export function resolveCurrentSemanticAction(previous = {}, candidates = []) {
  return buildCurrentSemanticExecutionContext(previous, candidates)?.candidate || null;
}

export function validateCandidateDerivedLocator(context = {}, observed = {}) {
  const recipe = context.locatorRecipe || {};
  const observedRole = actionRole(observed.action || observed);
  const observedName = actionName(observed.action || observed);
  const observedKey = nullable(observed.candidateKey) || candidateSemanticKey(observed);
  const sameCandidate = observedKey === recipe.candidateKey;
  const roleMatches = !observedRole || observedRole === recipe.role;
  const nameMatches = !observedName || sameText(observedName, recipe.name);
  const overlayMatchesRecipe = !observed.overlayScope || canonicalStructuralToken(observed.overlayScope) === canonicalStructuralToken(recipe.overlayScope);
  const businessMatches = !recipe.businessContext || !observed.businessContext || compatibleText(observed.businessContext, recipe.businessContext) || meaningfulTokenOverlap(observed.businessContext, recipe.businessContext);
  const businessTargetMatches = !recipe.businessTarget || sameBusinessTarget(recipe.businessTarget, currentBusinessTarget(observed));
  // Resolver selection may mark an owner optional only for ranking when the
  // current candidate is unique.  Physical binding still must prove the same
  // canonical current owner before returning an ElementHandle.
  const authoritativeOwner = recipe.owner || context.currentOwner || null;
  const ownerMatches = authoritativeOwner == null || (nullable(observed.owner?.type) === nullable(authoritativeOwner.type) && sameText(observed.owner?.label, authoritativeOwner.label));
  const structuralContextMatchesRecipe = structuralContextMatches(observed, recipe.structuralContext || null);
  const visible = observed.visible !== false;
  const enabled = observed.enabled !== false;
  // Disabled targets are semantically bindable.  The executor terminalizes
  // their current state after binding; treating them as missing erased valid
  // EXPECTED_DISABLED evidence.
  const valid = sameCandidate && roleMatches && nameMatches && overlayMatchesRecipe && businessMatches && businessTargetMatches && ownerMatches && structuralContextMatchesRecipe && visible;
  return { valid, reason: valid ? "CURRENT_CANDIDATE_LOCATOR_VALID" : "CURRENT_CANDIDATE_LOCATOR_INVALID", sameCandidate, roleMatches, nameMatches, overlayMatches: overlayMatchesRecipe, businessMatches, businessTargetMatches, ownerMatches, structuralContextMatches: structuralContextMatchesRecipe, visible, enabled };
}

export function planSemanticStabilityCompletion({ targetOverlayScope = "NONE", observed = {} } = {}) {
  const scope = canonicalStructuralToken(targetOverlayScope || "NONE").toUpperCase();
  const modalOpen = observed.modalOpen === true;
  const drawerOpen = observed.drawerOpen === true;
  const backdropOpen = observed.backdropOpen === true || Number(observed.backdropCount || 0) > 0;
  const targetHitTest = observed.targetHitTest === true;
  const requiredEvidence = [];
  if (scope === "NONE") {
    requiredEvidence.push("MODAL_ABSENT", "DRAWER_ABSENT", "BACKDROP_ABSENT", "TARGET_HIT_TEST");
    return { complete: !modalOpen && !drawerOpen && !backdropOpen && targetHitTest, requiredEvidence, scope };
  }
  if (scope === "MODAL") requiredEvidence.push("REQUIRED_MODAL_PRESENT", "TARGET_CONTAINED", "TARGET_HIT_TEST");
  else if (scope === "DRAWER") requiredEvidence.push("REQUIRED_DRAWER_PRESENT", "TARGET_CONTAINED", "TARGET_HIT_TEST");
  else requiredEvidence.push("TARGET_CONTAINED", "TARGET_HIT_TEST");
  const requiredOverlayPresent = scope === "MODAL" ? modalOpen : scope === "DRAWER" ? drawerOpen : true;
  return { complete: requiredOverlayPresent && observed.targetContained === true && targetHitTest, requiredEvidence, scope };
}

// This is deliberately an observation-only companion to
// planSemanticStabilityCompletion. It must never participate in the stability
// verdict: callers use it to persist the actual failed predicate and browser
// geometry instead of the old generic required-evidence list.
function diagnosticValue(source = {}, upper, lower, fallback = null) {
  return source?.[upper] ?? source?.[lower] ?? fallback;
}

function numberOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function stableRect(value = {}) {
  const rect = value && typeof value === "object" ? value : {};
  return {
    x: numberOrNull(rect.x), y: numberOrNull(rect.y), width: numberOrNull(rect.width), height: numberOrNull(rect.height),
    top: numberOrNull(rect.top), right: numberOrNull(rect.right), bottom: numberOrNull(rect.bottom), left: numberOrNull(rect.left),
  };
}

function isPositiveRect(rect = {}) {
  return Number(rect.width) > 0 && Number(rect.height) > 0;
}

function upperText(value) {
  return canonicalStructuralToken(value).toUpperCase();
}

function physicalFailureClass({ targetHitTest, target, failedComponent }) {
  const scrollType = upperText(diagnosticValue(target, "SCROLL_CONTAINER_TYPE", "scrollContainerType", "NONE"));
  const obstruction = upperText(diagnosticValue(target, "OBSTRUCTION_OWNER", "obstructionOwner", ""));
  const topmostPosition = upperText(diagnosticValue(target, "TOPMOST_COMPUTED_POSITION", "topmostComputedPosition", ""));
  if (targetHitTest) {
    if (diagnosticValue(target, "TOPMOST_IS_DESCENDANT", "topmostIsDescendant", false) === true) return "LEGITIMATE_DESCENDANT_HIT";
    if (diagnosticValue(target, "TOPMOST_IS_ANCESTOR", "topmostIsAncestor", false) === true) return "LEGITIMATE_ANCESTOR_HIT";
    return "TARGET_HIT_CONFIRMED";
  }
  if (failedComponent === "CENTER_OUTSIDE_VIEWPORT") {
    if (scrollType === "NESTED" || scrollType === "MULTIPLE") return "NESTED_SCROLL_OFFSCREEN";
    return "DOCUMENT_SCROLL_OFFSCREEN";
  }
  if (failedComponent === "TARGET_RECT_ZERO") return "RECT_ZERO_OR_TRANSIENT";
  if (failedComponent === "ELEMENT_FROM_POINT_NULL") return "ELEMENT_FROM_POINT_NULL";
  if (/DRAWER/u.test(obstruction)) return "DRAWER_OBSTRUCTION";
  if (/MODAL|BACKDROP/u.test(obstruction)) return "MODAL_OR_BACKDROP_OBSTRUCTION";
  if (/STICKY_COLUMN/u.test(obstruction)) return "STICKY_COLUMN_OBSTRUCTION";
  if (/STICKY_HEADER/u.test(obstruction)) return "STICKY_HEADER_OBSTRUCTION";
  if (/FIXED_TOOLBAR/u.test(obstruction)) return "FIXED_TOOLBAR_OBSTRUCTION";
  if (/POINTER_EVENTS/u.test(obstruction)) return "POINTER_EVENTS_LAYER";
  if (/TRANSFORM/u.test(obstruction)) return "TRANSFORM_GEOMETRY";
  if (topmostPosition === "STICKY") return "STICKY_HEADER_OBSTRUCTION";
  if (topmostPosition === "FIXED") return "FIXED_TOOLBAR_OBSTRUCTION";
  return "UNRELATED_ELEMENT_OBSTRUCTION";
}

export function buildSemanticStabilityDiagnostic({ targetOverlayScope = "NONE", observed = {}, target = {} } = {}) {
  const completion = planSemanticStabilityCompletion({ targetOverlayScope, observed });
  const scope = completion.scope;
  const rect = stableRect(diagnosticValue(target, "TARGET_RECT", "targetRect", {}));
  const viewport = diagnosticValue(target, "VIEWPORT", "viewport", {}) || {};
  const center = diagnosticValue(target, "CENTER_POINT", "centerPoint", null);
  const targetHitTest = observed.targetHitTest === true;
  const modalOpen = observed.modalOpen === true;
  const drawerOpen = observed.drawerOpen === true;
  const backdropOpen = observed.backdropOpen === true || Number(observed.backdropCount || 0) > 0;
  const targetContained = observed.targetContained === true;
  const centerInViewport = diagnosticValue(target, "CENTER_POINT_IN_VIEWPORT", "centerPointInViewport", false) === true;
  const elementFromPoint = diagnosticValue(target, "ELEMENT_FROM_POINT_RESULT", "elementFromPointResult", null);
  let failedComponent = null;

  if (!completion.complete) {
    if (scope === "NONE" && (modalOpen || drawerOpen || backdropOpen)) failedComponent = "OVERLAY_PRESENT";
    else if (scope === "MODAL" && !modalOpen) failedComponent = "REQUIRED_OVERLAY_MISSING";
    else if (scope === "DRAWER" && !drawerOpen) failedComponent = "REQUIRED_OVERLAY_MISSING";
    else if (scope !== "NONE" && !targetContained) failedComponent = "TARGET_NOT_CONTAINED_IN_REQUIRED_OVERLAY";
    else if (!isPositiveRect(rect)) failedComponent = "TARGET_RECT_ZERO";
    else if (!centerInViewport) failedComponent = "CENTER_OUTSIDE_VIEWPORT";
    else if (!elementFromPoint) failedComponent = "ELEMENT_FROM_POINT_NULL";
    else failedComponent = "UNRELATED_TOPMOST_ELEMENT";
  }

  const physicalClass = physicalFailureClass({ targetHitTest, target, failedComponent });
  return {
    STABILITY_SCOPE: scope,
    STABILITY_COMPLETE: completion.complete,
    REQUIRED_STABILITY_EVIDENCE: completion.requiredEvidence,
    FAILED_STABILITY_COMPONENT: failedComponent,
    PHYSICAL_FAILURE_CLASS: physicalClass,
    TARGET_HIT_TEST: targetHitTest,
    TARGET_CONTAINED: targetContained,
    TARGET_TAG: diagnosticValue(target, "TARGET_TAG", "targetTag", null),
    TARGET_DATA_TESTID: diagnosticValue(target, "TARGET_DATA_TESTID", "targetDataTestId", null),
    TARGET_ACCESSIBLE_NAME: diagnosticValue(target, "TARGET_ACCESSIBLE_NAME", "targetAccessibleName", null),
    TARGET_ROLE: diagnosticValue(target, "TARGET_ROLE", "targetRole", null),
    TARGET_NODE_SIGNATURE: diagnosticValue(target, "TARGET_NODE_SIGNATURE", "targetNodeSignature", null),
    TARGET_SEMANTIC_IDENTITY: diagnosticValue(target, "TARGET_SEMANTIC_IDENTITY", "targetSemanticIdentity", null),
    INVOCATION_TARGET_TAG: diagnosticValue(target, "INVOCATION_TARGET_TAG", "invocationTargetTag", diagnosticValue(target, "TARGET_TAG", "targetTag", null)),
    INVOCATION_TARGET_DATA_TESTID: diagnosticValue(target, "INVOCATION_TARGET_DATA_TESTID", "invocationTargetDataTestId", diagnosticValue(target, "TARGET_DATA_TESTID", "targetDataTestId", null)),
    INVOCATION_TARGET_ACCESSIBLE_NAME: diagnosticValue(target, "INVOCATION_TARGET_ACCESSIBLE_NAME", "invocationTargetAccessibleName", diagnosticValue(target, "TARGET_ACCESSIBLE_NAME", "targetAccessibleName", null)),
    INVOCATION_TARGET_ROLE: diagnosticValue(target, "INVOCATION_TARGET_ROLE", "invocationTargetRole", diagnosticValue(target, "TARGET_ROLE", "targetRole", null)),
    INVOCATION_TARGET_NODE_SIGNATURE: diagnosticValue(target, "INVOCATION_TARGET_NODE_SIGNATURE", "invocationTargetNodeSignature", diagnosticValue(target, "TARGET_NODE_SIGNATURE", "targetNodeSignature", null)),
    INVOCATION_TARGET_SEMANTIC_IDENTITY: diagnosticValue(target, "INVOCATION_TARGET_SEMANTIC_IDENTITY", "invocationTargetSemanticIdentity", diagnosticValue(target, "TARGET_SEMANTIC_IDENTITY", "targetSemanticIdentity", null)),
    TARGET_RECT: rect,
    VIEWPORT: { width: numberOrNull(viewport.width), height: numberOrNull(viewport.height) },
    RECT_INTERSECTS_VIEWPORT: diagnosticValue(target, "RECT_INTERSECTS_VIEWPORT", "rectIntersectsViewport", false) === true,
    TARGET_INTERSECTION: diagnosticValue(target, "TARGET_INTERSECTION", "targetIntersection", null),
    CENTER_POINT: center && typeof center === "object" ? { x: numberOrNull(center.x), y: numberOrNull(center.y) } : null,
    CENTER_POINT_IN_VIEWPORT: centerInViewport,
    ELEMENT_FROM_POINT_RESULT: elementFromPoint,
    TOPMOST_TAG: diagnosticValue(target, "TOPMOST_TAG", "topmostTag", null),
    TOPMOST_ROLE: diagnosticValue(target, "TOPMOST_ROLE", "topmostRole", null),
    TOPMOST_ACCESSIBLE_NAME: diagnosticValue(target, "TOPMOST_ACCESSIBLE_NAME", "topmostAccessibleName", null),
    TOPMOST_IS_TARGET: diagnosticValue(target, "TOPMOST_IS_TARGET", "topmostIsTarget", false) === true,
    TOPMOST_IS_DESCENDANT: diagnosticValue(target, "TOPMOST_IS_DESCENDANT", "topmostIsDescendant", false) === true,
    TOPMOST_IS_ANCESTOR: diagnosticValue(target, "TOPMOST_IS_ANCESTOR", "topmostIsAncestor", false) === true,
    TOPMOST_ANCESTOR_CHAIN: diagnosticValue(target, "TOPMOST_ANCESTOR_CHAIN", "topmostAncestorChain", []),
    TARGET_COMPUTED_POSITION: diagnosticValue(target, "TARGET_COMPUTED_POSITION", "targetComputedPosition", null),
    TARGET_Z_INDEX: diagnosticValue(target, "TARGET_Z_INDEX", "targetZIndex", null),
    TARGET_POINTER_EVENTS: diagnosticValue(target, "TARGET_POINTER_EVENTS", "targetPointerEvents", null),
    TOPMOST_COMPUTED_POSITION: diagnosticValue(target, "TOPMOST_COMPUTED_POSITION", "topmostComputedPosition", null),
    TOPMOST_Z_INDEX: diagnosticValue(target, "TOPMOST_Z_INDEX", "topmostZIndex", null),
    TOPMOST_POINTER_EVENTS: diagnosticValue(target, "TOPMOST_POINTER_EVENTS", "topmostPointerEvents", null),
    NEAREST_SCROLLABLE_ANCESTOR: diagnosticValue(target, "NEAREST_SCROLLABLE_ANCESTOR", "nearestScrollableAncestor", null),
    SCROLL_CONTAINER_TYPE: upperText(diagnosticValue(target, "SCROLL_CONTAINER_TYPE", "scrollContainerType", "NONE")) || "NONE",
    DOCUMENT_SCROLL_X: numberOrNull(diagnosticValue(target, "DOCUMENT_SCROLL_X", "documentScrollX", 0)),
    DOCUMENT_SCROLL_Y: numberOrNull(diagnosticValue(target, "DOCUMENT_SCROLL_Y", "documentScrollY", 0)),
    DOCUMENT_SCROLL_TOP: numberOrNull(diagnosticValue(target, "DOCUMENT_SCROLL_TOP", "documentScrollTop", null)),
    DOCUMENT_SCROLL_HEIGHT: numberOrNull(diagnosticValue(target, "DOCUMENT_SCROLL_HEIGHT", "documentScrollHeight", null)),
    DOCUMENT_CLIENT_HEIGHT: numberOrNull(diagnosticValue(target, "DOCUMENT_CLIENT_HEIGHT", "documentClientHeight", null)),
    MAX_DOCUMENT_SCROLL_TOP: numberOrNull(diagnosticValue(target, "MAX_DOCUMENT_SCROLL_TOP", "maxDocumentScrollTop", null)),
    CURRENT_SCROLL_AT_MAX: diagnosticValue(target, "CURRENT_SCROLL_AT_MAX", "currentScrollAtMax", false) === true,
    DISTANCE_TO_MAX_SCROLL: numberOrNull(diagnosticValue(target, "DISTANCE_TO_MAX_SCROLL", "distanceToMaxScroll", null)),
    TARGET_CENTER_Y_RELATIVE_TO_VIEWPORT: numberOrNull(diagnosticValue(target, "TARGET_CENTER_Y_RELATIVE_TO_VIEWPORT", "targetCenterYRelativeToViewport", null)),
    TARGET_CENTER_Y_RELATIVE_TO_DOCUMENT: numberOrNull(diagnosticValue(target, "TARGET_CENTER_Y_RELATIVE_TO_DOCUMENT", "targetCenterYRelativeToDocument", null)),
    SCROLL_ANCESTOR_SCROLL_TOP: numberOrNull(diagnosticValue(target, "SCROLL_ANCESTOR_SCROLL_TOP", "scrollAncestorScrollTop", null)),
    SCROLL_ANCESTOR_SCROLL_LEFT: numberOrNull(diagnosticValue(target, "SCROLL_ANCESTOR_SCROLL_LEFT", "scrollAncestorScrollLeft", null)),
    ANCESTOR_POSITION_SUMMARY: diagnosticValue(target, "ANCESTOR_POSITION_SUMMARY", "ancestorPositionSummary", []),
    ANCESTOR_TRANSFORM_SUMMARY: diagnosticValue(target, "ANCESTOR_TRANSFORM_SUMMARY", "ancestorTransformSummary", []),
    ANCESTOR_OVERFLOW_SUMMARY: diagnosticValue(target, "ANCESTOR_OVERFLOW_SUMMARY", "ancestorOverflowSummary", []),
    OBSTRUCTION_OWNER: diagnosticValue(target, "OBSTRUCTION_OWNER", "obstructionOwner", null),
    KEYBOARD_FOCUS_CAPABLE: diagnosticValue(target, "KEYBOARD_FOCUS_CAPABLE", "keyboardFocusCapable", false) === true,
    OVERLAY_PRESENT: modalOpen || drawerOpen || backdropOpen,
    MODAL_PRESENT: modalOpen,
    DRAWER_PRESENT: drawerOpen,
    BACKDROP_PRESENT: backdropOpen,
    DIAGNOSTIC_EVALUATION_ERROR: diagnosticValue(target, "DIAGNOSTIC_EVALUATION_ERROR", "diagnosticEvaluationError", null),
  };
}

// A failed center-point probe is not terminal while the current semantic
// candidate can still be made actionable by the browser's bounded scrolling
// primitive.  The caller must re-resolve the candidate and re-run the complete
// stability/hit-test proof after scrolling; pre-scroll geometry is diagnostic
// evidence only.
export function planPreActionGeometryPreparation({ diagnostic = {} } = {}) {
  const physicalFailureClass = upperText(diagnostic.PHYSICAL_FAILURE_CLASS);
  const scrollContainerType = upperText(diagnostic.SCROLL_CONTAINER_TYPE || "NONE") || "NONE";
  const alreadyStable = diagnostic.STABILITY_COMPLETE === true
    && diagnostic.TARGET_HIT_TEST === true
    && diagnostic.CENTER_POINT_IN_VIEWPORT === true;
  const boundedScrollEligible = diagnostic.FAILED_STABILITY_COMPONENT === "CENTER_OUTSIDE_VIEWPORT"
    && ["NESTED_SCROLL_OFFSCREEN", "DOCUMENT_SCROLL_OFFSCREEN"].includes(physicalFailureClass);
  return {
    strategy: alreadyStable
      ? "NO_SCROLL_REQUIRED"
      : boundedScrollEligible
        ? "SCROLL_CURRENT_CANDIDATE_AND_RERESOLVE"
        : "NO_SAFE_PREPARATION_AVAILABLE",
    scrollContext: scrollContainerType,
    preserveAuthoritativeSurface: true,
    refreshCandidateAfterPreparation: boundedScrollEligible,
    refreshGeometryAfterPreparation: boundedScrollEligible,
    finalHitTestRequired: true,
    forceClick: false,
    scope: "CURRENT_CONTRACT_ONLY",
    hitTest190MembershipMutationAllowed: false,
  };
}

export function deriveHarnessActionabilityProof({
  visible = false,
  enabled = false,
  overlayContainmentProven = false,
  stabilityDiagnostic = {},
} = {}) {
  return visible === true
    && enabled === true
    && overlayContainmentProven === true
    && stabilityDiagnostic.STABILITY_COMPLETE === true
    && stabilityDiagnostic.TARGET_HIT_TEST === true
    && stabilityDiagnostic.CENTER_POINT_IN_VIEWPORT === true;
}

export function planPointerInterceptionRecovery({ message, interceptedOverlay = {}, requiredState = {}, executionContext = {} } = {}) {
  const pointerInterception = /intercept(?:s|ed)? pointer|receives pointer events|pointer events/iu.test(String(message || ""));
  if (!pointerInterception) return { strategy: "NO_POINTER_INTERCEPTION", forceClick: false, reason: "NO_POINTER_INTERCEPTION_SIGNAL" };
  const overlayType = canonicalStructuralToken(nullable(interceptedOverlay.type));
  const overlayTitle = nullable(interceptedOverlay.title || interceptedOverlay.label);
  const currentScope = canonicalStructuralToken(executionContext.overlayScope).toUpperCase();
  if (executionContext.targetRequiresOverlay === true && currentScope === canonicalStructuralToken(overlayType).toUpperCase()) {
    return { strategy: "RERESOLVE_INSIDE_REQUIRED_OVERLAY", forceClick: false, reason: "CURRENT_SEMANTIC_TARGET_IS_CONTAINED_BY_REQUIRED_OVERLAY" };
  }
  const requiredTitle = overlayType === "drawer" ? nullable(requiredState.drawerTitle) : nullable(requiredState.modalTitle);
  if (requiredTitle && sameText(requiredTitle, overlayTitle)) {
    return { strategy: "RERESOLVE_INSIDE_REQUIRED_OVERLAY", forceClick: false, reason: "EXPECTED_OVERLAY_OWNS_NEXT_CONTRACT" };
  }
  return { strategy: "RESET_CLOSE_OVERLAY_AND_RERESOLVE", forceClick: false, reason: "STALE_OR_UNRELATED_OVERLAY_INTERCEPTED_POINTER" };
}

export function assertCheckpointPreservation({ knownActions = [], replayActions = [] } = {}) {
  const merged = mergeActionCheckpoints({ actions: knownActions }, replayActions, { runId: "bounded-residual-check", runKind: "BOUNDED_CANARY" });
  const knownIds = new Set(knownActions.map((item) => item.ACTION_CONTRACT_ID));
  const mergedIds = new Set(merged.actions.map((item) => item.ACTION_CONTRACT_ID));
  const lossCount = [...knownIds].filter((id) => !mergedIds.has(id)).length;
  return { lossCount, mergedCount: merged.actions.length, knownCount: knownActions.length, checkpointMerge: merged.checkpointMerge };
}

// Closing an unrelated overlay must use its visible semantic control first.
// A route reconstruction is only the deterministic fallback when that control
// is absent or did not actually close the rendered overlay.
export function chooseSafeOverlayCloseAction(controls = []) {
  const normalized = (Array.isArray(controls) ? controls : []).map((control) => ({
    role: actionRole(control),
    name: actionName(control),
  })).filter((control) => control.name);
  const explicit = normalized.find((control) => /^(kapat|close)$/iu.test(control.name));
  if (explicit) return { role: explicit.role, name: explicit.name, source: "EXPLICIT_CLOSE" };
  const cancel = normalized.find((control) => /^(iptal|geri|vazgeç)$/iu.test(control.name));
  if (cancel) return { role: cancel.role, name: cancel.name, source: "CANCEL_OR_BACK" };
  return null;
}

// Reset only the state dimension that changed. The caller executes the
// strategy; this pure selector is intentionally independent of DOM handles.
export function deriveDeterministicResetStrategy({ before = {}, after = {} } = {}) {
  if (nullable(after.modalTitle) && !sameText(before.modalTitle, after.modalTitle)) return "RESET_CLOSE_OVERLAY";
  if (nullable(after.drawerTitle) && !sameText(before.drawerTitle, after.drawerTitle)) return "RESET_CLOSE_OVERLAY";
  if (after.modalOpen === true && before.modalOpen !== true) return "RESET_CLOSE_OVERLAY";
  if (after.drawerOpen === true && before.drawerOpen !== true) return "RESET_CLOSE_OVERLAY";
  if (nullable(before.url) && nullable(after.url) && before.url !== after.url) return "RESET_REOPEN_ROUTE";
  if (canonicalText(before.activeTab) !== canonicalText(after.activeTab)) return "RESET_RESTORE_TAB";
  if (canonicalText(before.disclosure) !== canonicalText(after.disclosure) || Boolean(before.detailsOpen) !== Boolean(after.detailsOpen)) return "RESET_RESTORE_DISCLOSURE";
  if (canonicalText(before.filterSignature) !== canonicalText(after.filterSignature)) return "RESET_CLEAR_FILTER";
  if (canonicalText(before.searchSignature) !== canonicalText(after.searchSignature)) return "RESET_CLEAR_SEARCH";
  if (Boolean(after.formDirty) && !Boolean(before.formDirty)) return "RESET_CANCEL_FORM";
  if (canonicalText(before.tableState) !== canonicalText(after.tableState)) return "RESET_REOPEN_TABLE_STATE";
  return "RESET_NONE";
}

// Root ownership is evaluated from the current rendered surface. A missing
// semantic name is a product accessibility concern, never a synthetic root PASS.
export function classifyCurrentRootOwner({ action = {}, currentPresent = true, globalUnique = false } = {}) {
  if (!actionName(action)) return { classification: "ACCESSIBILITY_PRODUCT_DEFECT", reason: "current actionable root control lacks a meaningful semantic name" };
  if (!currentPresent) return { classification: "CURRENT_SEMANTIC_ABSENCE", reason: "current rendered root action is absent" };
  if (globalUnique) return { classification: "LEGITIMATE_ROOT_OWNER", reason: "current root action is uniquely named and has no narrower owner" };
  return { classification: "HARNESS_OWNER_FAILURE", reason: "current root action remains ambiguous without a narrower owner" };
}

// A corrective must always take its source failures from the immutable
// historical checkpoint. The canonical checkpoint is an outcome store: after
// a successful corrective it intentionally no longer contains those failures.
// Reading the latter would make a second bounded canary non-idempotent.
export function selectHistoricalRootOwnerFailures(checkpoint = {}) {
  const actions = Array.isArray(checkpoint) ? checkpoint : (checkpoint.actions || []);
  return actions.filter((item) => {
    const state = item?.executionState || item?.EXECUTION_STATE;
    return state === "HARNESS_FAILURE" && item?.CONTEXTUAL_OWNER_LABEL === "root";
  });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function compactMaterialState(input = {}) {
  const state = input.materialState || input.state || {};
  const values = {
    activeTab: nullable(state.activeTab),
    disclosure: nullable(state.disclosure),
    detailsOpen: typeof state.detailsOpen === "boolean" ? state.detailsOpen : null,
    modalOpen: typeof state.modalOpen === "boolean" ? state.modalOpen : null,
    modalTitle: nullable(state.modalTitle),
    drawerOpen: typeof state.drawerOpen === "boolean" ? state.drawerOpen : null,
    drawerTitle: nullable(state.drawerTitle),
    systemNavigationDisclosure: nullable(state.systemNavigationDisclosure),
    filterSignature: nullable(state.filterSignature),
    selectedBusinessContext: nullable(state.selectedBusinessContext),
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null));
}

function ownerOf(input = {}) {
  const owner = input.owner || input.contextualOwner || {};
  return {
    type: nullable(owner.type) || "surface",
    label: nullable(owner.label) || "root",
    boundedOrdinal: Number.isInteger(owner.boundedOrdinal) && owner.boundedOrdinal >= 0 ? owner.boundedOrdinal : null,
  };
}

function actionOf(input = {}) {
  const action = input.action || {};
  return {
    role: nullable(action.role) || "button",
    name: nullable(action.name || action.accessibleName || action.visibleText) || null,
    userMeaning: nullable(action.userMeaning || action.name || action.accessibleName || action.visibleText) || null,
    expectedEffectClass: nullable(action.expectedEffectClass) || "RENDERED_TRANSITION",
    safetyClass: nullable(action.safetyClass) || "SAFE",
  };
}

function identity(contract) {
  return stableJson({
    version: contract.ACTION_CONTRACT_VERSION,
    role: contract.ROLE,
    route: contract.ROUTE,
    viewport: contract.VIEWPORT,
    surfaceId: contract.SURFACE_ID,
    materialState: contract.MATERIAL_STATE_SIGNATURE,
    actionRole: contract.ACTION_ROLE,
    actionName: contract.ACTION_NAME,
    userMeaning: contract.USER_MEANING,
    ownerType: contract.CONTEXTUAL_OWNER_TYPE,
    ownerLabel: contract.CONTEXTUAL_OWNER_LABEL,
    ownerOrdinal: contract.BOUNDED_OWNER_ORDINAL,
    expectedEffectClass: contract.EXPECTED_EFFECT_CLASS,
    safetyClass: contract.SAFETY_CLASS,
  });
}

export function captureActionContract(input = {}) {
  const surface = input.surface || {};
  const action = actionOf(input);
  const owner = ownerOf(input);
  const contract = {
    ACTION_CONTRACT_VERSION: "pre18-hybrid-surface-state-v1",
    ROLE: nullable(input.role),
    ROUTE: nullable(input.route),
    VIEWPORT: nullable(input.viewport),
    SURFACE_ID: nullable(surface.id || input.surfaceId) || "surface",
    SURFACE_TITLE: nullable(surface.title || input.surfaceTitle),
    MATERIAL_STATE_SIGNATURE: stableJson(compactMaterialState(input)),
    ACTION_ROLE: action.role,
    ACTION_NAME: action.name,
    USER_MEANING: action.userMeaning,
    CONTEXTUAL_OWNER_TYPE: owner.type,
    CONTEXTUAL_OWNER_LABEL: owner.label,
    BOUNDED_OWNER_ORDINAL: owner.boundedOrdinal,
    EXPECTED_EFFECT_CLASS: action.expectedEffectClass,
    SAFETY_CLASS: action.safetyClass,
    EQUIVALENT_RENDERED_OCCURRENCE_COUNT: 1,
    CAPTURE_METADATA: {
      semanticNamePresent: Boolean(action.name),
      sourceDomIdentityExcluded: true,
    },
  };
  contract.ACTION_CONTRACT_ID = identity(contract);
  return contract;
}

export function deduplicateActionContracts(records = []) {
  const contracts = new Map();
  let equivalentOccurrencesCollapsed = 0;
  for (const record of records) {
    const contract = record.ACTION_CONTRACT_ID ? record : captureActionContract(record);
    const existing = contracts.get(contract.ACTION_CONTRACT_ID);
    if (!existing) {
      contracts.set(contract.ACTION_CONTRACT_ID, { ...contract });
      continue;
    }
    existing.EQUIVALENT_RENDERED_OCCURRENCE_COUNT += 1;
    equivalentOccurrencesCollapsed += 1;
  }
  return { contracts: [...contracts.values()], equivalentOccurrencesCollapsed };
}

export function buildActionExecutionPlan(contract = {}) {
  return {
    actionContractId: contract.ACTION_CONTRACT_ID,
    requiredSurfaceState: {
      role: contract.ROLE,
      route: contract.ROUTE,
      viewport: contract.VIEWPORT,
      surfaceId: contract.SURFACE_ID,
      materialStateSignature: contract.MATERIAL_STATE_SIGNATURE,
    },
    reset: {
      required: true,
      strategy: "REOPEN_SURFACE_STATE",
      requiredBeforeAction: true,
      requiredAfterAction: true,
    },
  };
}

export function isTerminalActionEvidence(result = {}) {
  const state = result.executionState || result.EXECUTION_STATE;
  const classification = result.classification || result.CLASSIFICATION;
  if (!TERMINAL_STATES.has(state)) return false;
  if (state === "NOT_SAFE_TO_EXECUTE_FULLY") {
    return classification === "NOT_SAFE_TO_EXECUTE_FULLY"
      && result.safetyFlowProven === true
      && result.unsafeMutationExecuted === false
      && Array.isArray(result.evidence || result.EVIDENCE)
      && (result.evidence || result.EVIDENCE).length > 0;
  }
  if (state === "VALIDLY_SKIPPED") {
    return Boolean(classification)
      && Array.isArray(result.evidence || result.EVIDENCE)
      && (result.evidence || result.EVIDENCE).length > 0;
  }
  return result.visible === true
    && result.enabled === true
    && result.actionAttempted === true
    && Boolean(result.actionResult)
    && Boolean(result.expectedEffect)
    && Boolean(result.observedEffect)
    && Boolean(classification)
    && Array.isArray(result.evidence || result.EVIDENCE)
    && (result.evidence || result.EVIDENCE).length > 0;
}

export function prepareActionResume(contracts = [], checkpoint = {}) {
  const prior = new Map((checkpoint.actions || []).map((item) => [item.ACTION_CONTRACT_ID, item]));
  return contracts.map((raw) => {
    const contract = raw.ACTION_CONTRACT_ID ? raw : captureActionContract(raw);
    const previous = prior.get(contract.ACTION_CONTRACT_ID);
    if (previous && isTerminalActionEvidence(previous)) return { ...contract, ...previous, resumed: true };
    return {
      ...contract,
      executionState: "NOT_YET_TESTED",
      EXECUTION_STATE: "NOT_YET_TESTED",
      classification: null,
      CLASSIFICATION: null,
      attemptCount: previous?.attemptCount || 0,
      resumed: false,
    };
  });
}

export function actionSemanticResumeKey(contract = {}) {
  return stableJson({
    role: contract.ROLE,
    route: contract.ROUTE,
    viewport: contract.VIEWPORT,
    surfaceId: contract.SURFACE_ID,
    materialState: contract.MATERIAL_STATE_SIGNATURE,
    actionRole: contract.ACTION_ROLE,
    actionName: contract.ACTION_NAME,
    expectedEffectClass: contract.EXPECTED_EFFECT_CLASS,
    safetyClass: contract.SAFETY_CLASS,
  });
}

// Owner semantics may become narrower after a harness-only correction.  A
// prior terminal record can be retained only when its route/state/action key
// has exactly one terminal match; duplicate same-name controls still require
// their full contextual owner identity.
export function reuseCompatibleTerminalAction(contract = {}, priorActions = []) {
  const terminal = (Array.isArray(priorActions) ? priorActions : []).filter(isTerminalActionEvidence);
  const exact = terminal.find((item) => item.ACTION_CONTRACT_ID === contract.ACTION_CONTRACT_ID);
  if (exact) return { ...exact, resumed: true, ownerCompatibility: "EXACT" };
  const key = actionSemanticResumeKey(contract);
  const matches = terminal.filter((item) => actionSemanticResumeKey(item) === key);
  if (matches.length !== 1) return null;
  return { ...matches[0], resumed: true, ownerCompatibility: "UNIQUE_SEMANTIC_ACTION" };
}

export function buildActionCheckpoint(actions = [], run = {}) {
  const counts = Object.fromEntries([...EXECUTION_STATES].map((state) => [state, 0]));
  for (const action of actions) {
    const state = action.executionState || action.EXECUTION_STATE || "NOT_YET_TESTED";
    if (!EXECUTION_STATES.has(state)) throw new Error(`invalid action execution state: ${state}`);
    counts[state] += 1;
  }
  const terminalClassified = actions.filter(isTerminalActionEvidence).length;
  return {
    schemaVersion: "pre18-hybrid-surface-state-checkpoint-v1",
    runId: run.runId,
    runKind: run.runKind,
    progress: {
      meaning: "action contracts with terminal rendered or safety evidence, never enumeration or loop iterations",
      actionContracts: actions.length,
      terminalClassified,
      remaining: actions.length - terminalClassified,
    },
    counts: { ...counts, TERMINAL_CLASSIFIED_COUNT: terminalClassified, RETRYABLE_COUNT: actions.length - terminalClassified },
    actions: actions.map((action) => ({ ...action, retryable: !isTerminalActionEvidence(action) })),
  };
}

function stateOf(record = {}) {
  return record.executionState || record.EXECUTION_STATE || "NOT_YET_TESTED";
}

function evidenceOf(record = {}) {
  const source = record.evidence || record.EVIDENCE || [];
  return Array.isArray(source) ? source : [];
}

function unionEvidence(left = [], right = []) {
  return [...new Set([...left, ...right].map((item) => typeof item === "string" ? item : stableJson(item)))].map((item) => {
    try { return JSON.parse(item); } catch { return item; }
  });
}

function mergeMatchingRecord(existing, incoming) {
  if (!existing) return { ...incoming };
  if (!incoming) return { ...existing };
  const oldTerminal = isTerminalActionEvidence(existing);
  const nextTerminal = isTerminalActionEvidence(incoming);
  const oldState = stateOf(existing);
  const nextState = stateOf(incoming);
  const attemptCount = Math.max(finiteCount(existing.attemptCount), finiteCount(incoming.attemptCount));
  if (oldTerminal && !nextTerminal) return { ...existing, attemptCount, preservedTerminal: true };
  if (oldTerminal && nextTerminal && oldState !== nextState) {
    return {
      ...existing,
      attemptCount,
      evidence: unionEvidence(evidenceOf(existing), evidenceOf(incoming)),
      terminalConflict: {
        policy: "PRESERVE_EXISTING_TERMINAL_AND_APPEND_CONFLICT",
        existingState: oldState,
        incomingState: nextState,
        incomingClassification: incoming.classification || incoming.CLASSIFICATION || null,
      },
    };
  }
  if (oldTerminal && nextTerminal) {
    return { ...existing, ...incoming, attemptCount, evidence: unionEvidence(evidenceOf(existing), evidenceOf(incoming)) };
  }
  if (!oldTerminal && nextTerminal) {
    return { ...existing, ...incoming, attemptCount, evidence: unionEvidence(evidenceOf(existing), evidenceOf(incoming)) };
  }
  return { ...existing, ...incoming, attemptCount, evidence: unionEvidence(evidenceOf(existing), evidenceOf(incoming)) };
}

// The canonical resume checkpoint is always a union: a partial enumeration is
// an update source, never a replacement source. Exact IDs are the only keys
// merged here; owner/state compatibility is evaluated separately by the
// replay layer so state variants cannot be collapsed accidentally.
export function mergeActionCheckpoints(previous = {}, current = [], run = {}) {
  const previousActions = Array.isArray(previous) ? previous : (previous.actions || []);
  const currentActions = Array.isArray(current) ? current : (current.actions || []);
  const byId = new Map();
  for (const item of previousActions) {
    const record = item?.ACTION_CONTRACT_ID ? item : captureActionContract(item);
    byId.set(record.ACTION_CONTRACT_ID, { ...record });
  }
  for (const item of currentActions) {
    const record = item?.ACTION_CONTRACT_ID ? item : captureActionContract(item);
    byId.set(record.ACTION_CONTRACT_ID, mergeMatchingRecord(byId.get(record.ACTION_CONTRACT_ID), record));
  }
  const actions = [...byId.values()];
  const checkpoint = buildActionCheckpoint(actions, run);
  return {
    ...checkpoint,
    previousSchemaVersion: Array.isArray(previous) ? null : (previous.schemaVersion || null),
    recovery: Array.isArray(previous) ? undefined : (previous.recovery ? { ...previous.recovery } : undefined),
    checkpointMerge: {
      policy: "UNION_BY_EXACT_ACTION_CONTRACT_ID_PRESERVE_TERMINALS",
      knownBefore: previousActions.length,
      updatesApplied: currentActions.length,
      knownAfter: actions.length,
      knownActionContractLossCount: Math.max(0, previousActions.length - actions.length),
    },
  };
}

// Historical contracts with an insufficient old descriptor must remain in the
// canonical checkpoint. Once a current rendered successor or a verified
// semantic absence exists, they become explicitly retired evidence instead of
// disappearing or being misreported as a new PASS.
export function retireHistoricalContract(record = {}, { reason, evidence = [], successorActionContractId = null, status = "CURRENT_SEMANTIC_ABSENCE" } = {}) {
  if (!reason) throw new Error("retirement reason is required");
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error("retirement evidence is required");
  return {
    ...record,
    executionState: "VALIDLY_SKIPPED",
    EXECUTION_STATE: "VALIDLY_SKIPPED",
    classification: status,
    CLASSIFICATION: status,
    evidence: unionEvidence(evidenceOf(record), evidence),
    retryable: false,
    contractRetirement: {
      status: "VALIDLY_RETIRED",
      reason,
      successorActionContractId,
    },
  };
}

export async function atomicWriteJson(file, value) {
  const directory = path.dirname(file);
  await fs.mkdir(directory, { recursive: true });
  const temp = path.join(directory, `.${path.basename(file)}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`);
  const body = `${JSON.stringify(value, null, 2)}\n`;
  let handle = null;
  try {
    handle = await fs.open(temp, "w");
    await handle.writeFile(body, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(temp, file);
  } catch (error) {
    await handle?.close().catch(() => {});
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

export async function writeImmutableJson(file, value) {
  try {
    await fs.access(file);
    throw new Error(`immutable artifact already exists: ${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await atomicWriteJson(file, value);
}

export function classifyActionAccessibility(input = {}) {
  const semanticIdentity = Boolean(text(input.role) && (text(input.accessibleName) || text(input.userMeaning)));
  if (input.visible && input.actionable && !semanticIdentity && input.structuralFallbackRequired) {
    return { classification: "ACCESSIBILITY_PRODUCT_DEFECT", retryable: false, reason: "visible actionable control lacks meaningful role/name/user meaning" };
  }
  return { classification: "HARNESS_FAILURE", retryable: true, reason: "semantic identity exists or accessibility evidence is insufficient" };
}

export function createRunArtifactManifest({ root, runId, runKind }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(String(runId || ""))) throw new Error("RUN_ID is required and must be filesystem-safe");
  if (!/^(FULL_CAPTURE|FULL_EXECUTION|BOUNDED_CANARY|SELF_CHECK)$/u.test(String(runKind || ""))) throw new Error("unsupported immutable run kind");
  const normalizedRoot = String(root || "").replace(/[\\/]+$/u, "");
  if (!normalizedRoot) throw new Error("artifact root is required");
  const runDirectory = `${normalizedRoot}/runs/${runId}/${runKind}`;
  return {
    RUN_ID: runId,
    RUN_KIND: runKind,
    runDirectory,
    manifestPath: `${runDirectory}/manifest.json`,
    checkpointPath: `${runDirectory}/checkpoint.json`,
    failureLedgerPath: `${runDirectory}/failure-ledger.json`,
    summaryPath: `${runDirectory}/summary.json`,
    evidenceDirectory: `${runDirectory}/evidence`,
  };
}

export function createFailureLedgerEntry({ runId, contract = {}, failureStage, failureReason, evidence = [], resetResult = "NOT_ATTEMPTED" }) {
  return {
    RUN_ID: runId,
    ROLE: contract.ROLE,
    ROUTE: contract.ROUTE,
    VIEWPORT: contract.VIEWPORT,
    SURFACE: contract.SURFACE_ID,
    SURFACE_STATE: contract.MATERIAL_STATE_SIGNATURE,
    ACTION_CONTRACT: contract.ACTION_CONTRACT_ID,
    OWNER: `${contract.CONTEXTUAL_OWNER_TYPE}:${contract.CONTEXTUAL_OWNER_LABEL}`,
    ACTION_NAME: contract.ACTION_NAME,
    FAILURE_STAGE: failureStage,
    FAILURE_REASON: failureReason,
    RETRYABLE: true,
    RESET_RESULT: resetResult,
    EVIDENCE: evidence,
  };
}

export function createRunId(prefix = "pre18-hybrid") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/gu, "-")}-${Math.random().toString(36).slice(2, 8)}`;
}

export { EXECUTION_STATES, TERMINAL_STATES };

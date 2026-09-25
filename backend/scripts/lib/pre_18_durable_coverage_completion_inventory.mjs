const REPLAY_DESCRIPTOR_VERSION = "pre18-durable-coverage-v1";

const EXECUTION_STATES = new Set([
  "DISCOVERED",
  "ATTEMPTED",
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
  "HARNESS_FAILURE",
  "NOT_YET_TESTED",
]);

const TERMINAL_STATES = new Set([
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
]);

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function nullableText(value) {
  const normalized = text(value);
  return normalized || null;
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableObject(value));
}

function firstContext(contexts = []) {
  return contexts.find((context) => context?.type && context?.label) || contexts.find((context) => context?.type) || {
    type: "surface",
    label: "root",
  };
}

function ownerContext(input = {}) {
  const explicit = input.owner || input.contextualOwner;
  const contexts = [
    input.modalContext && { type: "modal", label: input.modalContext.title || input.modalContext.label },
    input.drawerContext && { type: "drawer", label: input.drawerContext.title || input.drawerContext.label },
    input.formContext && { type: "form", label: input.formContext.title || input.formContext.label },
    input.tableContext && { type: input.tableContext.rowLabel ? "table-row" : "table", label: input.tableContext.rowLabel || input.tableContext.label },
    input.cardContext && { type: "card", label: input.cardContext.title || input.cardContext.label },
    typeof explicit === "string" ? { type: "context", label: explicit } : explicit,
    input.sectionHeading && { type: "section", label: input.sectionHeading },
    input.landmark && { type: "landmark", label: input.landmark },
  ];
  const owner = firstContext(contexts);
  return {
    type: nullableText(owner.type) || "surface",
    label: nullableText(owner.label) || "root",
    boundedOrdinal: Number.isInteger(owner.boundedOrdinal) && owner.boundedOrdinal >= 0 ? owner.boundedOrdinal : null,
  };
}

function compactState(input = {}) {
  const state = input.state || {};
  const values = {
    surfaceId: nullableText(input.surface?.id || input.surfaceId),
    activeTab: nullableText(state.activeTab),
    detailsOpen: typeof state.detailsOpen === "boolean" ? state.detailsOpen : null,
    disclosure: nullableText(state.disclosure),
    modalTitle: nullableText(state.modalTitle || input.modalContext?.title || input.modalContext?.label),
    drawerTitle: nullableText(state.drawerTitle || input.drawerContext?.title || input.drawerContext?.label),
    filterSignature: nullableText(state.filterSignature),
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null));
}

function semanticLocatorPlan(descriptor) {
  if (descriptor.ACCESSIBLE_NAME) {
    return {
      strategy: "accessible-with-owner",
      role: descriptor.CONTROL_ROLE,
      name: descriptor.ACCESSIBLE_NAME,
      ownerType: descriptor.CONTEXTUAL_OWNER_TYPE,
      ownerLabel: descriptor.CONTEXTUAL_OWNER_LABEL,
    };
  }
  if (descriptor.CONTEXTUAL_OWNER_LABEL && descriptor.CONTROL_ROLE) {
    return {
      strategy: "structural-owner",
      role: descriptor.CONTROL_ROLE,
      controlType: descriptor.CONTROL_TYPE,
      visibleText: descriptor.VISIBLE_TEXT,
      iconDescription: descriptor.ICON_DESCRIPTION,
      ownerType: descriptor.CONTEXTUAL_OWNER_TYPE,
      ownerLabel: descriptor.CONTEXTUAL_OWNER_LABEL,
      ordinalWithinOwner: descriptor.BOUNDED_OWNER_ORDINAL,
    };
  }
  return { strategy: "unaddressable" };
}

function descriptorIdentity(descriptor) {
  return stableJson({
    v: descriptor.REPLAY_DESCRIPTOR_VERSION,
    role: descriptor.ROLE,
    route: descriptor.ROUTE,
    viewport: descriptor.VIEWPORT,
    surfaceId: descriptor.SURFACE_ID,
    state: descriptor.STATE_SIGNATURE,
    controlRole: descriptor.CONTROL_ROLE,
    controlType: descriptor.CONTROL_TYPE,
    accessibleName: descriptor.ACCESSIBLE_NAME,
    visibleText: descriptor.VISIBLE_TEXT,
    ownerType: descriptor.CONTEXTUAL_OWNER_TYPE,
    ownerLabel: descriptor.CONTEXTUAL_OWNER_LABEL,
    ownerOrdinal: descriptor.BOUNDED_OWNER_ORDINAL,
    actionHint: descriptor.ACTION_HINT,
  });
}

export function captureDurableDescriptor(input = {}) {
  const control = input.control || {};
  const owner = ownerContext(input);
  const descriptor = {
    REPLAY_DESCRIPTOR_VERSION,
    ROLE: nullableText(input.role),
    ROUTE: nullableText(input.route),
    VIEWPORT: nullableText(input.viewport),
    SURFACE_ID: nullableText(input.surface?.id || input.surfaceId),
    SURFACE_TITLE: nullableText(input.surface?.title || input.surfaceTitle),
    STATE_SIGNATURE: stableJson(compactState(input)),
    CONTROL_ROLE: nullableText(control.role),
    CONTROL_TYPE: nullableText(control.type || control.tag),
    ACCESSIBLE_NAME: nullableText(control.accessibleName || control.semanticName),
    VISIBLE_TEXT: nullableText(control.visibleText || control.label),
    ICON_DESCRIPTION: nullableText(control.iconDescription),
    CONTEXTUAL_OWNER_TYPE: owner.type,
    CONTEXTUAL_OWNER_LABEL: owner.label,
    BOUNDED_OWNER_ORDINAL: owner.boundedOrdinal,
    LANDMARK_CONTEXT: nullableText(input.landmark),
    SECTION_HEADING_CONTEXT: nullableText(input.sectionHeading),
    FORM_CONTEXT: nullableText(input.formContext?.title || input.formContext?.label),
    TABLE_CONTEXT: nullableText(input.tableContext?.label || input.tableContext?.rowLabel),
    CARD_CONTEXT: nullableText(input.cardContext?.title || input.cardContext?.label),
    MODAL_CONTEXT: nullableText(input.modalContext?.title || input.modalContext?.label),
    DRAWER_CONTEXT: nullableText(input.drawerContext?.title || input.drawerContext?.label),
    ACTION_HINT: nullableText(input.actionHint || control.actionHint || control.href),
    SAFE_CLASSIFICATION: nullableText(input.safeClassification) || "SAFE",
  };
  descriptor.DESCRIPTOR_ID = descriptorIdentity(descriptor);
  descriptor.locatorPlan = semanticLocatorPlan(descriptor);
  return descriptor;
}

export function classifyAddressability(descriptor = {}) {
  const structural = descriptor.locatorPlan?.strategy === "structural-owner";
  const unaddressable = descriptor.locatorPlan?.strategy === "unaddressable";
  return {
    addressability: unaddressable ? "UNADDRESSABLE_HARNESS_ITEM" : structural ? "STRUCTURAL_OWNER" : "ACCESSIBLE_SEMANTIC",
    locatorPlan: descriptor.locatorPlan,
    accessibilityProductDefectCandidate: Boolean(structural && !descriptor.ACCESSIBLE_NAME),
  };
}

export function deduplicateCapturedDescriptors(records = []) {
  const unique = new Map();
  let exactDuplicateRemovedCount = 0;
  const legacyGroups = new Map();
  for (const record of records) {
    const descriptor = record.DESCRIPTOR_ID ? record : captureDurableDescriptor(record);
    if (unique.has(descriptor.DESCRIPTOR_ID)) {
      exactDuplicateRemovedCount += 1;
      continue;
    }
    unique.set(descriptor.DESCRIPTOR_ID, descriptor);
    const legacyKey = text(record.LEGACY_WEAK_KEY || record.legacyWeakKey || `${descriptor.CONTROL_ROLE}|${descriptor.ACCESSIBLE_NAME || descriptor.VISIBLE_TEXT}`);
    if (!legacyGroups.has(legacyKey)) legacyGroups.set(legacyKey, new Set());
    legacyGroups.get(legacyKey).add(descriptor.DESCRIPTOR_ID);
  }
  const falseCollisionSplitCount = [...legacyGroups.values()].reduce((sum, ids) => sum + Math.max(0, ids.size - 1), 0);
  return {
    records: [...unique.values()],
    stats: {
      EXACT_DUPLICATE_REMOVED_COUNT: exactDuplicateRemovedCount,
      FALSE_COLLISION_SPLIT_COUNT: falseCollisionSplitCount,
    },
  };
}

function read(result, camel, upper) {
  return result?.[camel] ?? result?.[upper];
}

function reusableTerminalProof(result = {}) {
  const state = read(result, "executionState", "EXECUTION_STATE");
  const classification = read(result, "classification", "CLASSIFICATION");
  if (state === "PROVEN_PASS" || state === "PROVEN_PRODUCT_DEFECT") {
    return read(result, "visible", "VISIBLE") === true
      && read(result, "enabled", "ENABLED") === true
      && read(result, "actionAttempted", "ACTION_ATTEMPTED") === true
      && Boolean(read(result, "actionResult", "ACTION_RESULT"))
      && Boolean(read(result, "expectedEffect", "EXPECTED_EFFECT"))
      && Boolean(read(result, "observedEffect", "OBSERVED_EFFECT"))
      && Array.isArray(read(result, "evidence", "EVIDENCE"))
      && read(result, "evidence", "EVIDENCE").length > 0
      && Boolean(classification);
  }
  return state === "VALIDLY_SKIPPED"
    && classification === "NOT_SAFE_TO_EXECUTE_FULLY"
    && read(result, "safetyFlowProven", "SAFETY_FLOW_PROVEN") === true;
}

export function prepareDurableReplay(descriptors = [], checkpoint = {}) {
  const priorById = new Map((checkpoint.controls || []).map((item) => [item.DESCRIPTOR_ID, item]));
  return descriptors.map((item) => {
    const descriptor = item.DESCRIPTOR_ID ? item : captureDurableDescriptor(item);
    const prior = priorById.get(descriptor.DESCRIPTOR_ID);
    if (prior && reusableTerminalProof(prior)) return { ...descriptor, ...prior, resumed: true };
    return {
      ...descriptor,
      executionState: "NOT_YET_TESTED",
      EXECUTION_STATE: "NOT_YET_TESTED",
      classification: null,
      CLASSIFICATION: null,
      resumed: false,
    };
  });
}

export function buildDurableCheckpoint(records = []) {
  const counts = Object.fromEntries([...EXECUTION_STATES].map((state) => [state, 0]));
  for (const record of records) {
    const state = read(record, "executionState", "EXECUTION_STATE") || "NOT_YET_TESTED";
    if (!EXECUTION_STATES.has(state)) throw new Error(`invalid execution state: ${state}`);
    counts[state] += 1;
  }
  const terminalClassified = [...TERMINAL_STATES].reduce((sum, state) => sum + counts[state], 0);
  return {
    schemaVersion: "pre18-durable-coverage-checkpoint-v1",
    replayDescriptorVersion: REPLAY_DESCRIPTOR_VERSION,
    progress: {
      meaning: "terminal classified controls with persisted rendered evidence, never loop iterations",
      inventory: records.length,
      terminalClassified,
      remaining: records.length - terminalClassified,
    },
    counts: { ...counts, TERMINAL_CLASSIFIED_COUNT: terminalClassified, RETRYABLE_COUNT: records.length - terminalClassified },
    controls: records.map((record) => ({
      ...record,
      retryable: !TERMINAL_STATES.has(read(record, "executionState", "EXECUTION_STATE")),
    })),
  };
}

export { REPLAY_DESCRIPTOR_VERSION };

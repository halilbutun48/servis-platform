const ACTION_CLASSES = new Set([
  "CREATE",
  "NAVIGATE",
  "VIEW",
  "EXPLAIN",
  "COMPARE",
  "CONTINUE",
  "RESUME",
  "NEXT",
  "PREPARE",
  "ANALYZE",
  "NONE",
]);

const OBJECT_CLASSES = new Set([
  "SHIFT",
  "AGREEMENT",
  "OFFER",
  "ROUTE",
  "PERSONNEL",
  "SURFACE",
  "RECORD",
]);

const RESOLUTION_STATUSES = new Set([
  "RESOLVED",
  "AMBIGUOUS",
  "UNRESOLVED",
  "NOT_APPLICABLE",
]);

const EXPLICITNESS_VALUES = new Set(["EXPLICIT", "CONTEXTUAL", "NONE", "UNRESOLVED"]);
const CONFIDENCE_VALUES = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);
const MODIFIER_KEYS = ["new", "current", "next", "explicitTarget"];
const PROPOSAL_KEYS = new Set([
  "actionClass",
  "objectClass",
  "targetCandidate",
  "modifiers",
  "explicitness",
  "evidence",
  "confidence",
  "resolutionStatus",
]);
const TARGET_KEYS = new Set(["objectClass", "targetKey", "semanticId"]);
const FORBIDDEN_INPUT_KEYS = new Set([
  "tenantRecords",
  "personnelRecords",
  "parentRecords",
  "addresses",
  "gpsHistory",
  "financialRecords",
  "rawBusinessObjects",
  "unauthorizedRecords",
  "crossTenantData",
  "credentials",
  "tokens",
  "cookies",
  "fullConversationHistory",
]);

export const MODEL_FALLBACK_FAILURE_CODES = Object.freeze({
  UNAVAILABLE: "UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  RATE_LIMIT: "RATE_LIMIT",
  MALFORMED_OUTPUT: "MALFORMED_OUTPUT",
  SCHEMA_INVALID: "SCHEMA_INVALID",
  UNSUPPORTED_ENUM: "UNSUPPORTED_ENUM",
  EMPTY_PROPOSAL: "EMPTY_PROPOSAL",
  REFUSAL: "REFUSAL",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  VERSION_MISMATCH: "VERSION_MISMATCH",
  DETERMINISTIC_CONFLICT: "DETERMINISTIC_CONFLICT",
});

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value, max = 160) {
  const text = String(value ?? "").trim();
  return text && text.length <= max ? text : null;
}

function hasForbiddenKey(value, seen = new Set()) {
  if (!isObject(value) && !Array.isArray(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, seen));
  return Object.entries(value).some(([key, child]) => FORBIDDEN_INPUT_KEYS.has(key) || hasForbiddenKey(child, seen));
}

export function validateProviderNeutralInput(input = {}) {
  if (!isObject(input)) return { valid: false, failureCode: MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID };
  const allowedKeys = new Set(["utterance", "discourseMetadata", "taskMetadata", "roleContext", "surfaceMetadata"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { valid: false, failureCode: MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID };
  }
  if (typeof input.utterance !== "string" || input.utterance.trim().length === 0 || input.utterance.length > 500) {
    return { valid: false, failureCode: MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID };
  }
  if (hasForbiddenKey(input)) {
    return { valid: false, failureCode: MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID };
  }
  return { valid: true, failureCode: null };
}

export function evaluateSemanticFallbackEligibility({
  semanticScopeClass,
  resolutionStatus,
  confidence = null,
  hasProductEvidence = false,
} = {}) {
  const scope = String(semanticScopeClass || "").trim().toUpperCase();
  const resolution = String(resolutionStatus || "").trim().toUpperCase();
  const confidenceClass = String(confidence || "").trim().toUpperCase();

  if (scope === "OFF_TOPIC_GENUINE") {
    return { eligible: false, reasonCode: "GENUINE_OFF_TOPIC", invoked: false };
  }
  if (["PRODUCT_EXPLICIT", "PRODUCT_CONTEXTUAL"].includes(scope) && resolution === "RESOLVED" && confidenceClass !== "LOW") {
    return { eligible: false, reasonCode: "HIGH_CONFIDENCE_DETERMINISTIC", invoked: false };
  }
  // PRODUCT_AMBIGUOUS is the scope-level bucket used for both genuine
  // multiple-intent ambiguity and a single product-domain coverage gap. The
  // typed action resolution distinguishes them: only AMBIGUOUS stays on the
  // clarification path; an UNRESOLVED product candidate may be eligible.
  if (resolution === "AMBIGUOUS") {
    return { eligible: false, reasonCode: "GENUINE_AMBIGUITY", invoked: false };
  }
  if (!hasProductEvidence) {
    return { eligible: false, reasonCode: "NO_PRODUCT_EVIDENCE", invoked: false };
  }
  if (confidenceClass === "LOW") {
    return { eligible: true, reasonCode: "LOW_CONFIDENCE_PRODUCT_COVERAGE_GAP", invoked: false };
  }
  if (resolution === "UNRESOLVED") {
    return { eligible: true, reasonCode: "UNRESOLVED_PRODUCT_COVERAGE_GAP", invoked: false };
  }
  return { eligible: false, reasonCode: "NOT_ELIGIBLE", invoked: false };
}

function invalid(failureCode, errors = []) {
  return { valid: false, failureCode, errors };
}

export function validateProviderNeutralProposal(proposal) {
  if (!isObject(proposal)) return invalid(MODEL_FALLBACK_FAILURE_CODES.MALFORMED_OUTPUT);
  const unexpectedKeys = Object.keys(proposal).filter((key) => !PROPOSAL_KEYS.has(key));
  if (unexpectedKeys.length) return invalid("UNEXPECTED_AUTHORITY_FIELD", unexpectedKeys);

  const actionClass = String(proposal.actionClass || "").trim().toUpperCase();
  const objectClass = proposal.objectClass === null ? null : String(proposal.objectClass || "").trim().toUpperCase();
  const resolutionStatus = String(proposal.resolutionStatus || "").trim().toUpperCase();
  const confidence = String(proposal.confidence || "").trim().toUpperCase();
  if (!ACTION_CLASSES.has(actionClass) || (objectClass !== null && !OBJECT_CLASSES.has(objectClass))) {
    return invalid(MODEL_FALLBACK_FAILURE_CODES.UNSUPPORTED_ENUM);
  }
  if (!RESOLUTION_STATUSES.has(resolutionStatus) || !CONFIDENCE_VALUES.has(confidence)) {
    return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  }
  if (confidence !== "HIGH") return invalid(MODEL_FALLBACK_FAILURE_CODES.LOW_CONFIDENCE);
  if (resolutionStatus !== "RESOLVED") return invalid(resolutionStatus === "AMBIGUOUS" ? "AMBIGUOUS_PROPOSAL" : MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  if (!EXPLICITNESS_VALUES.has(String(proposal.explicitness || "").trim().toUpperCase())) {
    return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  }
  if (!Array.isArray(proposal.evidence) || proposal.evidence.length < 1 || proposal.evidence.length > 8
    || proposal.evidence.some((item) => !safeText(item, 80))) {
    return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  }
  if (!isObject(proposal.modifiers) || Object.keys(proposal.modifiers).some((key) => !MODIFIER_KEYS.includes(key))
    || MODIFIER_KEYS.some((key) => typeof proposal.modifiers[key] !== "boolean")) {
    return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  }
  if (proposal.targetCandidate !== null) {
    if (!isObject(proposal.targetCandidate)
      || Object.keys(proposal.targetCandidate).some((key) => !TARGET_KEYS.has(key))
      || (proposal.targetCandidate.objectClass && !OBJECT_CLASSES.has(String(proposal.targetCandidate.objectClass).toUpperCase()))
      || (proposal.targetCandidate.objectClass && objectClass
        && String(proposal.targetCandidate.objectClass).toUpperCase() !== objectClass)
      || (proposal.targetCandidate.semanticId && /^\d+$/u.test(String(proposal.targetCandidate.semanticId)))
      || Object.entries(proposal.targetCandidate).some(([key, value]) => key !== "objectClass" && !safeText(value, 120))) {
      return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
    }
  }
  if (actionClass === "CREATE" && objectClass === null) return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  if (actionClass === "NONE" && resolutionStatus === "RESOLVED") return invalid(MODEL_FALLBACK_FAILURE_CODES.SCHEMA_INVALID);
  return {
    valid: true,
    failureCode: null,
    proposal: {
      actionClass,
      objectClass,
      targetCandidate: proposal.targetCandidate || null,
      modifiers: { ...proposal.modifiers },
      explicitness: String(proposal.explicitness).trim().toUpperCase(),
      evidence: [...proposal.evidence].map((item) => String(item).trim()),
      confidence,
      resolutionStatus,
    },
  };
}

function safeFailure(failureCode) {
  return {
    status: "SAFE_CLARIFICATION",
    failureCode,
    canonicalCandidate: null,
  };
}

function isHighConfidenceDeterministic(result) {
  return String(result?.resolutionStatus || "").toUpperCase() === "RESOLVED"
    && String(result?.confidence || "HIGH").toUpperCase() === "HIGH";
}

export async function invokeProviderNeutralSemanticProposer({ proposer = null, input, deterministicResult = null } = {}) {
  const inputValidation = validateProviderNeutralInput(input);
  if (!inputValidation.valid) return { result: safeFailure(inputValidation.failureCode), trace: { invoked: false, proposerKind: "NONE" } };
  if (isHighConfidenceDeterministic(deterministicResult)) {
    return {
      result: { status: "DETERMINISTIC_PRESERVED", failureCode: null, canonicalCandidate: deterministicResult },
      trace: { invoked: false, proposerKind: "NONE", conflictStatus: "NOT_APPLICABLE" },
    };
  }
  if (!proposer) return { result: safeFailure(MODEL_FALLBACK_FAILURE_CODES.UNAVAILABLE), trace: { invoked: false, proposerKind: "NONE" } };

  let raw;
  try {
    raw = typeof proposer === "function"
      ? await proposer(input)
      : await proposer.propose(input);
  } catch (error) {
    const failureCode = Object.values(MODEL_FALLBACK_FAILURE_CODES).includes(String(error?.code || ""))
      ? String(error.code)
      : MODEL_FALLBACK_FAILURE_CODES.UNAVAILABLE;
    return { result: safeFailure(failureCode), trace: { invoked: true, proposerKind: "MOCK", failClosedReason: failureCode } };
  }
  if (!raw) return { result: safeFailure(MODEL_FALLBACK_FAILURE_CODES.EMPTY_PROPOSAL), trace: { invoked: true, proposerKind: "MOCK", failClosedReason: "EMPTY_PROPOSAL" } };
  if (raw.failureCode) return { result: safeFailure(String(raw.failureCode)), trace: { invoked: true, proposerKind: "MOCK", failClosedReason: String(raw.failureCode) } };

  const validation = validateProviderNeutralProposal(raw);
  if (!validation.valid) return { result: safeFailure(validation.failureCode), trace: { invoked: true, proposerKind: "MOCK", failClosedReason: validation.failureCode } };
  if (deterministicResult && (validation.proposal.actionClass !== deterministicResult.actionClass
    || validation.proposal.objectClass !== deterministicResult.objectClass)) {
    return { result: safeFailure(MODEL_FALLBACK_FAILURE_CODES.DETERMINISTIC_CONFLICT), trace: { invoked: true, proposerKind: "MOCK", conflictStatus: "MATERIAL_CONFLICT" } };
  }
  return {
    result: { status: "PROPOSAL_ACCEPTED", failureCode: null, canonicalCandidate: validation.proposal },
    trace: { invoked: true, proposerKind: "MOCK", schemaValid: true, allowlistValid: true, deterministicValidation: "PASS", conflictStatus: "NONE" },
  };
}

export const PROVIDER_NEUTRAL_SEMANTIC_ACTION_CLASSES = Object.freeze([...ACTION_CLASSES]);
export const PROVIDER_NEUTRAL_SEMANTIC_OBJECT_CLASSES = Object.freeze([...OBJECT_CLASSES]);
export const PROVIDER_NEUTRAL_RESOLUTION_STATUSES = Object.freeze([...RESOLUTION_STATUSES]);

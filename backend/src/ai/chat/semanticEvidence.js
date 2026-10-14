const DIMENSION_VALUES = Object.freeze({
  subject: Object.freeze(["ROLE", "EXPLICIT_ACTOR", "NONE"]),
  roleAspect: Object.freeze([
    "CAPABILITY",
    "RESPONSIBILITY",
    "OWNERSHIP",
    "DECISION_RESPONSIBILITY",
    "PROCESS_RESPONSIBILITY",
    "BOUNDARY",
    "LIMITATION",
    "ORIENTATION",
    "STARTING_GUIDANCE",
    "NONE",
  ]),
  requestMode: Object.freeze([
    "EXPLAIN",
    "VIEW",
    "NAVIGATE",
    "GUIDED_SHOW",
    "CONTINUE",
    "NEXT",
    "PREVIOUS",
    "COMPARE",
    "ANALYZE",
    "CREATE",
    "UPDATE",
    "DELETE",
    "SEND",
    "OTHER_PRODUCT_REQUEST",
    "GENUINE_OOS",
    "UNRESOLVED",
  ]),
  object: Object.freeze([
    "SHIFT",
    "AGREEMENT",
    "OFFER",
    "ROUTE",
    "FINANCIAL",
    "SURFACE",
    "RECORD",
    "ENTITY",
    "NONE",
  ]),
  relation: Object.freeze([
    "OWNERSHIP",
    "ASSIGNMENT",
    "INCLUSION",
    "ORDER",
    "ACTOR_OBJECT",
    "PROCESS",
    "NEGATION",
    "LIMITATION",
    "CONTRAST",
    "NONE",
  ]),
  temporal: Object.freeze(["PAST", "CURRENT", "FUTURE", "RECURRING", "NONE"]),
  order: Object.freeze(["SEQUENCE", "FIRST", "NEXT", "PREVIOUS", "NONE"]),
  priority: Object.freeze(["PRIORITY", "URGENT", "REQUIRED", "NONE"]),
  reference: Object.freeze(["UNIQUE", "AMBIGUOUS", "STALE", "ABSENT"]),
  targetRequest: Object.freeze(["PRODUCT_AREA", "RECORD", "ENTITY", "SURFACE", "NONE"]),
  polarity: Object.freeze(["AFFIRMATIVE", "NEGATIVE", "LIMITATION", "CONTRAST"]),
  productHelp: Object.freeze([
    "ORIENTATION",
    "CAPABILITY_GUIDANCE",
    "PROCESS_GUIDANCE",
    "RESPONSIBILITY_GUIDANCE",
    "NONE",
  ]),
  contradictions: Object.freeze([
    "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT",
    "CONCRETE_REQUEST_MODE_OVERRIDES_BROAD_ROLE_ASPECT",
    "NEGATED_RELATION",
    "LIMITED_RELATION",
    "CONFLICTING_CANDIDATES",
  ]),
  provenance: Object.freeze([
    "RAW_TEXT",
    "MORPHOLOGY",
    "STRUCTURE",
    "AUTH_CONTEXT",
    "SURFACE_CONTEXT",
    "ACTIVE_TASK",
    "REFERENCE_HISTORY",
    "INFERENCE",
  ]),
  quality: Object.freeze([
    "HIGH",
    "MEDIUM",
    "LOW",
    "SUPPORT",
    "CONTRADICTION",
    "INCOMPLETE",
    "AMBIGUOUS",
  ]),
  contextUsed: Object.freeze([
    "AUTH_CONTEXT",
    "SURFACE_CONTEXT",
    "ACTIVE_TASK",
    "REFERENCE_HISTORY",
  ]),
});

const PROVENANCE_SOURCES = new Set(DIMENSION_VALUES.provenance);
const FORBIDDEN_DECISION_FIELDS = new Set([
  "roleHelp",
  "scope",
  "semanticScope",
  "action",
  "semanticAction",
  "authorization",
  "uiTarget",
  "capability",
  "canonicalRequest",
  "objectClass",
  "route",
]);
const MUTABLE = Symbol("mutableSemanticEvidence");
const FINALIZED = Symbol("finalizedSemanticEvidence");

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function cloneAndSort(value, label = "metadata", ancestors = new WeakSet()) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "function" || typeof value === "symbol") {
      throw new TypeError(`${label} must contain JSON-compatible metadata`);
    }
    return value;
  }
  if (ancestors.has(value)) throw new TypeError(`${label} cannot contain circular metadata`);
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    result = value.map((child) => cloneAndSort(child, label, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} must contain plain metadata objects`);
    }
    result = {};
    for (const key of Object.keys(value).sort()) {
      if (FORBIDDEN_DECISION_FIELDS.has(key)) {
        throw new TypeError(`${label} contains forbidden decision field: ${key}`);
      }
      result[key] = cloneAndSort(value[key], label, ancestors);
    }
  }
  ancestors.delete(value);
  return result;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertNoDecisionFields(value, label) {
  cloneAndSort(value, label);
}

function assertAllowed(dimension, value) {
  const allowed = DIMENSION_VALUES[dimension];
  if (!allowed) throw new RangeError(`dimension must be one of: ${Object.keys(DIMENSION_VALUES).join(", ")}`);
  if (!allowed.includes(value)) throw new RangeError(`value is not an allowed value for ${dimension}`);
}

function assertProvenance(value) {
  if (!PROVENANCE_SOURCES.has(value)) throw new RangeError("provenance must be an approved provenance source");
}

function assertQuality(value) {
  if (!DIMENSION_VALUES.quality.includes(value)) throw new RangeError("quality must be an approved quality value");
}

function normalizeSourceSpan(sourceSpan, sourceText) {
  assertPlainObject(sourceSpan, "sourceSpan");
  const { start, end } = sourceSpan;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > sourceText.length) {
    throw new RangeError("sourceSpan must be an in-bounds integer span");
  }
  return Object.freeze({ start, end });
}

function normalizeContextRef(contextRef) {
  if (typeof contextRef === "string" && contextRef.length > 0) return contextRef;
  if (contextRef && typeof contextRef === "object" && !Array.isArray(contextRef)) {
    const normalized = cloneAndSort(contextRef, "contextRef");
    if (Object.keys(normalized).length > 0) return deepFreeze(normalized);
  }
  throw new TypeError("contextRef must be a non-empty string or object");
}

function normalizeContextRecord(record) {
  assertPlainObject(record, "contextUsed record");
  assertNoDecisionFields(record, "contextUsed record");
  const provenance = record.provenance ?? record.source;
  assertProvenance(provenance);
  const contextRef = normalizeContextRef(record.contextRef ?? record.reference);
  const quality = record.quality ?? "HIGH";
  assertQuality(quality);
  return deepFreeze({
    contextRef,
    provenance,
    quality,
    value: record.value === undefined ? provenance : cloneAndSort(record.value, "contextUsed value"),
    authorizationEffect: "NONE",
  });
}

function normalizeEvidenceItem(item, sourceText) {
  assertPlainObject(item, "evidence item");
  assertNoDecisionFields(item, "evidence item");
  if (typeof item.dimension !== "string") throw new TypeError("evidence item dimension is required");
  if (!Object.prototype.hasOwnProperty.call(item, "value")) throw new TypeError("evidence item value is required");
  assertAllowed(item.dimension, item.value);
  assertProvenance(item.provenance);
  assertQuality(item.quality);
  if (item.authorizationEffect !== undefined && item.authorizationEffect !== "NONE") {
    throw new TypeError("authorizationEffect must be NONE");
  }
  const hasSpan = item.sourceSpan !== undefined;
  const hasContext = item.contextRef !== undefined;
  if (!hasSpan && !hasContext) throw new TypeError("evidence item requires sourceSpan or contextRef");

  const normalized = {
    dimension: item.dimension,
    value: cloneAndSort(item.value, "evidence item value"),
    provenance: item.provenance,
    quality: item.quality,
    authorizationEffect: "NONE",
  };
  if (hasSpan) {
    normalized.sourceSpan = normalizeSourceSpan(item.sourceSpan, sourceText);
    normalized.sourceText = sourceText.slice(normalized.sourceSpan.start, normalized.sourceSpan.end);
  }
  if (hasContext) normalized.contextRef = normalizeContextRef(item.contextRef);
  return normalized;
}

function ensureMutableEvidence(evidence) {
  assertPlainObject(evidence, "evidence");
  if (evidence[FINALIZED]) throw new TypeError("cannot add evidence to finalized evidence");
  if (!evidence[MUTABLE]) throw new TypeError("evidence was not created by createSemanticEvidence");
}

export function createSemanticEvidence({ sourceText, featureSet, contextUsed = [] }) {
  if (typeof sourceText !== "string") throw new TypeError("sourceText must be a string");
  assertPlainObject(featureSet, "featureSet");
  if (!Array.isArray(contextUsed)) throw new TypeError("contextUsed must be an array");
  const evidence = {
    sourceText,
    featureSet: cloneAndSort(featureSet, "featureSet"),
    contextUsed: contextUsed.map(normalizeContextRecord),
    items: [],
  };
  Object.defineProperty(evidence, MUTABLE, { value: true });
  return evidence;
}

export function addSemanticEvidence(evidence, item) {
  ensureMutableEvidence(evidence);
  evidence.items.push(normalizeEvidenceItem(item, evidence.sourceText));
  return evidence;
}

export function finalizeSemanticEvidence(evidence) {
  if (evidence && evidence[FINALIZED]) return evidence;
  ensureMutableEvidence(evidence);
  const items = evidence.items.map((item) => cloneAndSort(item, "evidence item"));
  const contradictions = items.filter((item) => item.dimension === "contradictions");
  const supportCount = items.filter((item) => item.quality !== "CONTRADICTION").length;
  const result = {
    sourceText: evidence.sourceText,
    featureSet: cloneAndSort(evidence.featureSet, "featureSet"),
    items,
    contradictions,
    provenance: items.map((item) => ({
      dimension: item.dimension,
      source: item.provenance,
      quality: item.quality,
      authorizationEffect: "NONE",
      ...(item.sourceSpan ? { sourceSpan: item.sourceSpan } : { contextRef: item.contextRef }),
    })),
    quality: {
      itemCount: items.length,
      supportCount,
      contradictionCount: contradictions.length,
      completeness: items.length === 0 ? "INCOMPLETE" : "PARTIAL",
    },
    contextUsed: evidence.contextUsed.map((record) => cloneAndSort(record, "contextUsed record")),
  };
  Object.defineProperty(result, FINALIZED, { value: true });
  return deepFreeze(result);
}

export { DIMENSION_VALUES };

const CANONICAL_PROVENANCE_REGISTRY_ID = "BATCH-10A-CANONICAL-PROVENANCE-REGISTRY-01";
const CANONICAL_PROVENANCE_REGISTRY_VERSION = "2026-08-18";

const CANONICAL_PROVENANCE_BASELINE_PRESENCE = Object.freeze([
  "ABSENT",
  "PRESENT",
]);

const CANONICAL_PROVENANCE_WORKING_TREE_STATES = Object.freeze([
  "ABSENT",
  "TRACKED_MODIFIED",
  "TRACKED_NEW_FILE",
  "TRACKED_UNMODIFIED",
  "UNTRACKED_CANONICAL_NEW_FILE",
  "UNTRACKED_MODIFIED",
]);

const CANONICAL_PROVENANCE_CLASSES = Object.freeze([
  "CONCURRENT_CANONICAL",
  "LEGITIMATE_CANONICAL_NEW_FILE",
]);

const CANONICAL_PROVENANCE_LIFECYCLE_STATUSES = Object.freeze([
  "ACTIVE_PROVEN",
  "ACTIVE_UNPROVEN",
  "HISTORICAL",
]);

const CANONICAL_PROVENANCE_READ_WRITE_CLASSES = Object.freeze([
  "READ",
  "WRITE",
  "MIXED",
  "SUPPORT",
]);

const CANONICAL_CURRENT_HEAD_POLICY_STATES = Object.freeze([
  "ABSENT",
  "APPROVED",
]);

const CANONICAL_PROVENANCE_SEED_PATHS = Object.freeze([
  "backend/src/routes/commercialCoreRoutes.js",
  "backend/src/routes/commercialCorePaymentRoutes.js",
  "backend/src/routes/commercialCorePaymentReportsRoutes.js",
  "backend/src/routes/commercialCoreRoomRoutes.js",
  "backend/src/routes/commercialCoreRouteData.js",
  "backend/src/lib/requestUrl.js",
]);

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function freezeList(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`FAIL ${label}: not an array`);
  }

  const normalized = value.map((item) => String(item || "").trim());
  if (normalized.length === 0) {
    throw new Error(`FAIL ${label}: is empty`);
  }
  if (normalized.some((item) => !item)) {
    throw new Error(`FAIL ${label}: contains empty entries`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`FAIL ${label}: contains duplicates`);
  }

  return Object.freeze(normalized);
}

function freezeRecord(record) {
  return Object.freeze({
    ...record,
    semanticDomains: freezeList(record.semanticDomains, `${record.path} semanticDomains`),
    capabilities: freezeList(record.capabilities, `${record.path} capabilities`),
    regressionOwners: freezeList(record.regressionOwners, `${record.path} regressionOwners`),
    securityOwners: freezeList(record.securityOwners, `${record.path} securityOwners`),
    evidenceChecks: freezeList(record.evidenceChecks, `${record.path} evidenceChecks`),
  });
}

const rawCanonicalProvenanceRecords = [
  {
    path: "backend/src/routes/commercialCoreRoutes.js",
    currentSha256: "11A5136CDA54B1467757BF9422EB6B63B0B00F9633CD1A8AF3303A5BA2A06E41",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "CONCURRENT_CANONICAL",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "commercialCore route composition",
    compositionOwner: "backend/src/routes/commercialCore.js",
    semanticDomains: ["COMMERCIAL_CORE", "ROUTING", "ROUTE_ATTACHMENT"],
    capabilities: [
      "manifest endpoint",
      "lifecycle template endpoint",
      "rules endpoint",
      "mounting payment routes",
      "mounting room routes",
    ],
    regressionOwners: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
    ],
    securityOwners: [
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
    ],
    readWriteClass: "SUPPORT",
    evidenceChecks: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    parentCompositionPath: "backend/src/routes/commercialCore.js",
    currentHeadPolicyState: "APPROVED",
    notes: "Commercial-core composition router; current-head approved concurrent canonical route family.",
  },
  {
    path: "backend/src/routes/commercialCorePaymentRoutes.js",
    currentSha256: "9BB53FE97B17F28892AF3B8C8E91373D7276183873E0258E694AD694F5E1B552",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "CONCURRENT_CANONICAL",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "commercialCore payment backbone",
    compositionOwner: "backend/src/routes/commercialCoreRoutes.js",
    semanticDomains: ["COMMERCIAL_CORE", "PAYMENT", "SETTLEMENT", "APPROVAL"],
    capabilities: [
      "payment backbone status/settings",
      "payment pilot rollout",
      "required rollout",
      "payment account readiness",
      "settlement planning/execution/cancel/ready",
      "reconciliation upsert",
    ],
    regressionOwners: [
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    securityOwners: [
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    readWriteClass: "MIXED",
    evidenceChecks: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    parentCompositionPath: "backend/src/routes/commercialCoreRoutes.js",
    currentHeadPolicyState: "APPROVED",
    notes: "Write-gated payment backbone with step-up approval and audit logging.",
  },
  {
    path: "backend/src/routes/commercialCorePaymentReportsRoutes.js",
    currentSha256: "02A327CB70645AA8652E542F5825B271B143AE7A741FC8FBD1CB0C157093FD36",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "CONCURRENT_CANONICAL",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "commercialCore payment reporting",
    compositionOwner: "backend/src/routes/commercialCorePaymentRoutes.js",
    semanticDomains: ["COMMERCIAL_CORE", "PAYMENT", "REPORTING", "AUDIT"],
    capabilities: [
      "sources report",
      "readiness preview",
      "CSV export",
      "ledger export",
      "audit logging",
    ],
    regressionOwners: [
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    securityOwners: [
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    readWriteClass: "MIXED",
    evidenceChecks: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:pay01e",
      "check:paysafe01",
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    parentCompositionPath: "backend/src/routes/commercialCorePaymentRoutes.js",
    currentHeadPolicyState: "APPROVED",
    notes: "Readonly reporting surfaces plus audit-log write side effect for exports.",
  },
  {
    path: "backend/src/routes/commercialCoreRoomRoutes.js",
    currentSha256: "AF4576A429E1B7026974DFC18DB5F9EB034580818A7D32159644878A4E7C94C7",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "CONCURRENT_CANONICAL",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "commercialCore room surfaces",
    compositionOwner: "backend/src/routes/commercialCoreRoutes.js",
    semanticDomains: ["COMMERCIAL_CORE", "ROOM", "SHIFTS", "PREVIEW"],
    capabilities: [
      "room summary",
      "room financial operations preview",
      "room items",
    ],
    regressionOwners: [
      "check:roomprofitabilityandquotefloor01",
      "check:safedrive01",
      "check:securitykvkkfinal01",
    ],
    securityOwners: [
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
    ],
    readWriteClass: "READ",
    evidenceChecks: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:roomprofitabilityandquotefloor01",
      "check:safedrive01",
      "check:securitykvkkfinal01",
    ],
    parentCompositionPath: "backend/src/routes/commercialCoreRoutes.js",
    currentHeadPolicyState: "APPROVED",
    notes: "ROOM-facing preview/read model only; no hidden write.",
  },
  {
    path: "backend/src/routes/commercialCoreRouteData.js",
    currentSha256: "5EB28DD6ABEC1AD63CA236AB567BB14B0CEEF35D54DF75343D5EC746F5A6FCD2",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "CONCURRENT_CANONICAL",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "commercialCore shared route data",
    compositionOwner:
      "backend/src/routes/commercialCorePaymentRoutes.js + backend/src/routes/commercialCorePaymentReportsRoutes.js",
    semanticDomains: ["COMMERCIAL_CORE", "SHARED_SUPPORT", "SCHEMA", "CSV"],
    capabilities: [
      "schema validation",
      "query parsing",
      "CSV serialization",
      "shared row shaping",
    ],
    regressionOwners: [
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
    ],
    securityOwners: ["check:securitykvkkfinal01"],
    readWriteClass: "SUPPORT",
    evidenceChecks: [
      "node backend/scripts/current_head_scope_policy_01_check.js",
      "check:roomprofitabilityandquotefloor01",
      "check:securitykvkkfinal01",
    ],
    parentCompositionPath:
      "backend/src/routes/commercialCorePaymentRoutes.js + backend/src/routes/commercialCorePaymentReportsRoutes.js",
    currentHeadPolicyState: "APPROVED",
    notes: "Shared support module for payment and report routes.",
  },
  {
    path: "backend/src/lib/requestUrl.js",
    currentSha256: "629D6C894B91551AB14518F36E2BF4C5CEF48DC60ADBB01A17EFE7755C30063E",
    baselinePresence: "ABSENT",
    workingTreeState: "TRACKED_UNMODIFIED",
    provenanceClass: "LEGITIMATE_CANONICAL_NEW_FILE",
    lifecycleStatus: "ACTIVE_PROVEN",
    technicalOwner: "shared request URL sanitization",
    compositionOwner:
      "backend/src/server.js + backend/src/bootstrap/rateLimits.js + backend/src/middleware/apiRequestLog.js + backend/src/routes/public.js",
    semanticDomains: ["HTTP", "SANITIZATION", "SECURITY", "KVKK"],
    capabilities: [
      "request URL sanitization",
      "sensitive query redaction",
    ],
    regressionOwners: [
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    securityOwners: [
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    readWriteClass: "SUPPORT",
    evidenceChecks: [
      "check:securitykvkkfinal01",
      "check:auditlogandapprovaltrace01",
    ],
    parentCompositionPath:
      "backend/src/server.js + backend/src/bootstrap/rateLimits.js + backend/src/middleware/apiRequestLog.js + backend/src/routes/public.js",
    currentHeadPolicyState: "ABSENT",
    notes: "Legitimate canonical new file; explicitly not a STEP-167 semantic dependency.",
  },
];

export const CANONICAL_PROVENANCE_RECORDS = Object.freeze(
  rawCanonicalProvenanceRecords.map(freezeRecord)
);

export const CANONICAL_PROVENANCE_PATHS = Object.freeze(
  CANONICAL_PROVENANCE_RECORDS.map((record) => record.path)
);

export const CANONICAL_PROVENANCE_BY_PATH = Object.freeze(
  Object.fromEntries(
    CANONICAL_PROVENANCE_RECORDS.map((record) => [record.path, record])
  )
);

function fail(label, message) {
  throw new Error(`FAIL ${label}: ${message}`);
}

function isStableEvidenceRef(value) {
  return (
    typeof value === "string" &&
    value.trim() &&
    (value.startsWith("check:") || value.startsWith("node backend/scripts/"))
  );
}

function assertStringField(value, label, field) {
  if (typeof value !== "string" || !value.trim()) {
    fail(label, `${field} must be a non-empty string`);
  }
}

function assertSha256Field(value, label, field) {
  assertStringField(value, label, field);
  if (!/^[A-F0-9]{64}$/.test(value)) {
    fail(label, `${field} must be an uppercase sha256 hex string`);
  }
}

function assertEnum(value, allowed, label, field) {
  if (!allowed.includes(value)) {
    fail(label, `${field} must be one of ${allowed.join(", ")}`);
  }
}

function assertUniqueStringList(value, label, field) {
  if (!Array.isArray(value)) {
    fail(label, `${field} must be an array`);
  }

  const normalized = value.map((item) => String(item || "").trim());
  if (normalized.length === 0) {
    fail(label, `${field} must not be empty`);
  }
  if (normalized.some((item) => !item)) {
    fail(label, `${field} contains empty entries`);
  }
  if (new Set(normalized).size !== normalized.length) {
    fail(label, `${field} contains duplicates`);
  }
}

function assertEvidenceRefList(value, label, field) {
  assertUniqueStringList(value, label, field);
  if (!value.every(isStableEvidenceRef)) {
    fail(label, `${field} must contain stable evidence refs`);
  }
}

export function getCanonicalProvenanceRecord(path) {
  return CANONICAL_PROVENANCE_BY_PATH[normalizePath(path)] ?? null;
}

export function assertCanonicalProvenanceRegistryShape(
  records = CANONICAL_PROVENANCE_RECORDS,
  label = "canonical provenance registry"
) {
  if (!Array.isArray(records)) {
    fail(label, "registry is not an array");
  }

  if (records.length !== CANONICAL_PROVENANCE_SEED_PATHS.length) {
    fail(
      label,
      `registry length mismatch (${records.length} !== ${CANONICAL_PROVENANCE_SEED_PATHS.length})`
    );
  }

  const expectedPaths = new Set(CANONICAL_PROVENANCE_SEED_PATHS);
  const seenPaths = new Set();

  for (const [index, record] of records.entries()) {
    const recordLabel = `${label} row ${index + 1}`;

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      fail(recordLabel, "record is not an object");
    }

    assertStringField(record.path, recordLabel, "path");
    assertSha256Field(record.currentSha256, recordLabel, "currentSha256");
    assertEnum(record.baselinePresence, CANONICAL_PROVENANCE_BASELINE_PRESENCE, recordLabel, "baselinePresence");
    assertEnum(record.workingTreeState, CANONICAL_PROVENANCE_WORKING_TREE_STATES, recordLabel, "workingTreeState");
    assertEnum(record.provenanceClass, CANONICAL_PROVENANCE_CLASSES, recordLabel, "provenanceClass");
    assertEnum(record.lifecycleStatus, CANONICAL_PROVENANCE_LIFECYCLE_STATUSES, recordLabel, "lifecycleStatus");
    assertStringField(record.technicalOwner, recordLabel, "technicalOwner");
    assertStringField(record.compositionOwner, recordLabel, "compositionOwner");
    assertEnum(record.readWriteClass, CANONICAL_PROVENANCE_READ_WRITE_CLASSES, recordLabel, "readWriteClass");
    assertEnum(record.currentHeadPolicyState, CANONICAL_CURRENT_HEAD_POLICY_STATES, recordLabel, "currentHeadPolicyState");
    assertStringField(record.notes, recordLabel, "notes");

    assertUniqueStringList(record.semanticDomains, recordLabel, "semanticDomains");
    assertUniqueStringList(record.capabilities, recordLabel, "capabilities");
    assertEvidenceRefList(record.regressionOwners, recordLabel, "regressionOwners");
    assertEvidenceRefList(record.securityOwners, recordLabel, "securityOwners");
    assertEvidenceRefList(record.evidenceChecks, recordLabel, "evidenceChecks");

    const normalizedPath = normalizePath(record.path);
    if (seenPaths.has(normalizedPath)) {
      fail(recordLabel, `duplicate path ${normalizedPath}`);
    }
    seenPaths.add(normalizedPath);

    if (!expectedPaths.has(normalizedPath)) {
      fail(recordLabel, `unexpected path ${normalizedPath}`);
    }

    if (normalizedPath === "backend/src/lib/requestUrl.js") {
      if (record.provenanceClass !== "LEGITIMATE_CANONICAL_NEW_FILE") {
        fail(recordLabel, "requestUrl.js must remain LEGITIMATE_CANONICAL_NEW_FILE");
      }
      if (record.currentHeadPolicyState !== "ABSENT") {
        fail(recordLabel, "requestUrl.js must stay absent from current-head policy");
      }
    } else {
      if (record.provenanceClass !== "CONCURRENT_CANONICAL") {
        fail(recordLabel, `${normalizedPath} must remain CONCURRENT_CANONICAL`);
      }
      if (record.currentHeadPolicyState !== "APPROVED") {
        fail(recordLabel, `${normalizedPath} must stay approved by current-head policy`);
      }
    }
  }

  const sortedExpected = [...expectedPaths].sort();
  const sortedActual = [...seenPaths].sort();
  if (sortedExpected.join("|") !== sortedActual.join("|")) {
    fail(label, "seed scope path set mismatch");
  }

  return Object.freeze({
    count: records.length,
    paths: Object.freeze([...sortedActual]),
  });
}

export {
  CANONICAL_PROVENANCE_REGISTRY_ID,
  CANONICAL_PROVENANCE_REGISTRY_VERSION,
  CANONICAL_PROVENANCE_BASELINE_PRESENCE,
  CANONICAL_PROVENANCE_WORKING_TREE_STATES,
  CANONICAL_PROVENANCE_CLASSES,
  CANONICAL_PROVENANCE_LIFECYCLE_STATUSES,
  CANONICAL_PROVENANCE_READ_WRITE_CLASSES,
  CANONICAL_CURRENT_HEAD_POLICY_STATES,
  CANONICAL_PROVENANCE_SEED_PATHS,
};

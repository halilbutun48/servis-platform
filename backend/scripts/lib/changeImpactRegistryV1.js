const CHANGE_IMPACT_REGISTRY_V1_VERSION = "step-1a-hot-identity-pilot";

export const CHANGE_IMPACT_VALID_DOMAINS = Object.freeze([
  "AUTH",
  "ADMIN",
  "PUBLIC",
  "COMPANY",
  "ROOM",
  "AGREEMENT",
  "SHIFT",
  "OFFER_MARKETPLACE",
  "QUALITY",
  "FINANCE_PAYMENT",
  "ROUTE_DISPATCH",
  "GPS_TELEMATICS",
  "AI_SEFER_ABI",
  "NOTIFICATION",
  "WEB_SHELL",
  "WEB_DOMAIN_PANELS",
  "MOBILE",
  "TOOLING",
  "CHECKER_INFRA",
  "DOCS_REGISTRY",
  "GENERATED_EVIDENCE",
  "RUNTIME_DATA",
  "SECURITY",
]);

export const CHANGE_IMPACT_VALID_OWNER_CATEGORIES = Object.freeze([
  "ROLE_TENANT_SECURITY_OWNED",
  "CURRENT_HEAD_APPROVED_DIFF",
  "CANONICAL_PROVENANCE_OWNED",
  "CANONICAL_PRISMA_SCHEMA_OWNED",
  "IDENTITY_OWNER_MISSING",
]);

export const CHANGE_IMPACT_VALID_PROTECTION_CLASSES = Object.freeze([
  "DOMAIN_SEMANTIC",
  "AUTH_TENANT",
  "GLOBAL_CURRENT_HEAD",
  "PROVENANCE",
  "AI_AUTHORITY",
  "SECURITY_SUPPORT",
]);

export const CHANGE_IMPACT_VALID_SMOKE_SUITES = Object.freeze([
  "ALL_PANELS",
  "MOBILE_ALL_ROLES",
  "PREMIUM",
]);

export const CHANGE_IMPACT_VALID_CURRENT_HEAD_POLICY_STATES = Object.freeze([
  "APPROVED",
  "ABSENT",
]);

export const CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES = Object.freeze({
  ROLE_TENANT_SECURITY_OWNED: "backend/scripts/lib/guardGitScope.js#isAppJsxRoleTenantScopePath",
  CURRENT_HEAD_APPROVED_DIFF: "backend/scripts/lib/currentHeadScopePolicy.js#CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF",
  CANONICAL_PROVENANCE_OWNED: "backend/scripts/lib/canonicalProvenanceRegistry.js#getCanonicalProvenanceRecord",
  CANONICAL_PRISMA_SCHEMA_OWNED: "backend/scripts/prisma_schema_modularization_01_check.js",
  IDENTITY_OWNER_MISSING: "IDENTITY_OWNER_MISSING",
});

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function freezeStringList(value, label, allowedValues = null) {
  if (!Array.isArray(value)) {
    throw new Error(`FAIL ${label}: not an array`);
  }

  const normalized = value.map((item) => String(item || "").trim());
  if (normalized.some((item) => !item)) {
    throw new Error(`FAIL ${label}: contains empty entries`);
  }

  const unique = [...new Set(normalized)];
  if (unique.length !== normalized.length) {
    throw new Error(`FAIL ${label}: contains duplicates`);
  }

  if (allowedValues) {
    for (const item of unique) {
      if (!allowedValues.includes(item)) {
        throw new Error(`FAIL ${label}: invalid value ${item}`);
      }
    }
  }

  return Object.freeze(unique);
}

function freezeRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("FAIL change impact record: not an object");
  }

  const keys = Object.keys(record);
  if (keys.some((key) => /sha/i.test(key))) {
    throw new Error(`FAIL ${String(record.sourcePath || record.path || "change impact record")}: sha field is forbidden`);
  }

  const sourcePath = normalizePath(record.sourcePath || record.path);
  if (!sourcePath) {
    throw new Error("FAIL change impact record: sourcePath missing");
  }

  const primaryDomain = String(record.primaryDomain || "").trim();
  const identityOwnerCategory = String(record.identityOwnerCategory || "").trim();
  const identityOwnerRef = record.identityOwnerRef == null ? null : String(record.identityOwnerRef).trim();
  const identityModel = String(record.identityModel || "").trim();
  const currentHeadPolicyState = String(record.currentHeadPolicyState || "").trim();
  const notes = String(record.notes || "").trim();
  const impactLevel = Number(record.impactLevel);
  const requiresFullRelease = Boolean(record.requiresFullRelease);

  if (!primaryDomain) {
    throw new Error(`FAIL ${sourcePath}: primaryDomain missing`);
  }
  if (!CHANGE_IMPACT_VALID_DOMAINS.includes(primaryDomain)) {
    throw new Error(`FAIL ${sourcePath}: invalid primaryDomain ${primaryDomain}`);
  }
  if (!CHANGE_IMPACT_VALID_OWNER_CATEGORIES.includes(identityOwnerCategory)) {
    throw new Error(`FAIL ${sourcePath}: invalid identityOwnerCategory ${identityOwnerCategory}`);
  }
  if (identityOwnerCategory === "IDENTITY_OWNER_MISSING") {
    if (identityOwnerRef !== null && identityOwnerRef !== CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.IDENTITY_OWNER_MISSING) {
      throw new Error(`FAIL ${sourcePath}: missing owner must not invent a ref`);
    }
  } else {
    const expectedRef = CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES[identityOwnerCategory];
    if (!expectedRef) {
      throw new Error(`FAIL ${sourcePath}: unknown identity owner category ${identityOwnerCategory}`);
    }
    if (identityOwnerRef !== expectedRef) {
      throw new Error(`FAIL ${sourcePath}: identityOwnerRef mismatch`);
    }
  }
  if (!identityModel) {
    throw new Error(`FAIL ${sourcePath}: identityModel missing`);
  }
  if (!CHANGE_IMPACT_VALID_CURRENT_HEAD_POLICY_STATES.includes(currentHeadPolicyState)) {
    throw new Error(`FAIL ${sourcePath}: invalid currentHeadPolicyState ${currentHeadPolicyState}`);
  }
  if (!Number.isInteger(impactLevel) || impactLevel < 0 || impactLevel > 4) {
    throw new Error(`FAIL ${sourcePath}: invalid impactLevel ${String(record.impactLevel)}`);
  }
  if (!notes) {
    throw new Error(`FAIL ${sourcePath}: notes missing`);
  }

  const secondaryDomains = freezeStringList(
    record.secondaryDomains || [],
    `${sourcePath} secondaryDomains`,
    CHANGE_IMPACT_VALID_DOMAINS,
  );
  if (secondaryDomains.includes(primaryDomain)) {
    throw new Error(`FAIL ${sourcePath}: secondaryDomains must not repeat primaryDomain`);
  }

  const protectionClasses = freezeStringList(
    record.protectionClasses || [],
    `${sourcePath} protectionClasses`,
    CHANGE_IMPACT_VALID_PROTECTION_CLASSES,
  );
  const semanticOwnerGroups = freezeStringList(record.semanticOwnerGroups || [], `${sourcePath} semanticOwnerGroups`);
  const smokeSuites = freezeStringList(
    record.smokeSuites || [],
    `${sourcePath} smokeSuites`,
    CHANGE_IMPACT_VALID_SMOKE_SUITES,
  );

  if (smokeSuites.length > 0 && impactLevel < 3) {
    throw new Error(`FAIL ${sourcePath}: smoke-invalidating rows must use impactLevel >= 3`);
  }
  if (smokeSuites.length > 0 && !requiresFullRelease) {
    throw new Error(`FAIL ${sourcePath}: smoke-invalidating rows must require full release`);
  }
  if (smokeSuites.length === 0 && requiresFullRelease && impactLevel < 3) {
    throw new Error(`FAIL ${sourcePath}: full-release rows must be smoke-invalidating or level 3+`);
  }

  return Object.freeze({
    sourcePath,
    primaryDomain,
    secondaryDomains,
    identityOwnerCategory,
    identityOwnerRef,
    identityModel,
    currentHeadPolicyState,
    protectionClasses,
    semanticOwnerGroups,
    smokeSuites,
    impactLevel,
    requiresFullRelease,
    notes,
  });
}

export const CHANGE_IMPACT_REGISTRY_V1_RECORDS = Object.freeze([
  freezeRecord({
    sourcePath: "web/src/App.jsx",
    primaryDomain: "WEB_SHELL",
    secondaryDomains: ["AUTH", "PUBLIC", "ADMIN", "COMPANY", "ROOM", "MOBILE"],
    identityOwnerCategory: "ROLE_TENANT_SECURITY_OWNED",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.ROLE_TENANT_SECURITY_OWNED,
    identityModel: "exact-role-tenant-scope-helper",
    currentHeadPolicyState: "ABSENT",
    protectionClasses: ["DOMAIN_SEMANTIC", "AUTH_TENANT"],
    semanticOwnerGroups: ["WEB_SHELL", "ROLE_TENANT_UX", "PUBLIC_BOUNDARY"],
    smokeSuites: ["MOBILE_ALL_ROLES", "ALL_PANELS"],
    impactLevel: 3,
    requiresFullRelease: true,
    notes: "App shell identity is owned by the exact App.jsx role/tenant helper; smoke fanout is mobile-all-roles then all-panels.",
  }),
  freezeRecord({
    sourcePath: "backend/src/routes/commercialCore.js",
    primaryDomain: "FINANCE_PAYMENT",
    secondaryDomains: ["ROOM", "QUALITY", "ADMIN"],
    identityOwnerCategory: "CURRENT_HEAD_APPROVED_DIFF",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    identityModel: "approved-current-head-diff",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "GLOBAL_CURRENT_HEAD"],
    semanticOwnerGroups: ["COMMERCIAL_CORE", "PAYMENT_PREVIEW", "ROOM_FINANCE"],
    smokeSuites: ["PREMIUM"],
    impactLevel: 3,
    requiresFullRelease: true,
    notes: "Commercial core is a current-head approved diff entry and a premium smoke identity input.",
  }),
  freezeRecord({
    sourcePath: "backend/src/routes/trustQuality.js",
    primaryDomain: "QUALITY",
    secondaryDomains: ["COMPANY", "ROOM", "FINANCE_PAYMENT"],
    identityOwnerCategory: "CURRENT_HEAD_APPROVED_DIFF",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    identityModel: "approved-current-head-diff",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "GLOBAL_CURRENT_HEAD"],
    semanticOwnerGroups: ["QUALITY_CORE", "QUALITY_REVIEW", "ROOM_COMPANY_SCOPE"],
    smokeSuites: ["PREMIUM"],
    impactLevel: 3,
    requiresFullRelease: true,
    notes: "Trust-quality is a current-head approved diff entry and a premium smoke identity input.",
  }),
  freezeRecord({
    sourcePath: "backend/src/routes/shifts/company.js",
    primaryDomain: "SHIFT",
    secondaryDomains: ["COMPANY", "ROOM", "AGREEMENT", "ROUTE_DISPATCH"],
    identityOwnerCategory: "CURRENT_HEAD_APPROVED_DIFF",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    identityModel: "approved-current-head-diff",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "AUTH_TENANT", "GLOBAL_CURRENT_HEAD"],
    semanticOwnerGroups: ["SHIFT_CORE", "COMPANY_MUTATION", "ROUTE_DISPATCH_PREP"],
    smokeSuites: [],
    impactLevel: 2,
    requiresFullRelease: false,
    notes: "Company shift mutation is current-head owned but does not currently participate in smoke source identities.",
  }),
  freezeRecord({
    sourcePath: "backend/src/routes/companyOverview.js",
    primaryDomain: "COMPANY",
    secondaryDomains: ["SHIFT", "FINANCE_PAYMENT"],
    identityOwnerCategory: "CURRENT_HEAD_APPROVED_DIFF",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    identityModel: "approved-current-head-diff",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "AUTH_TENANT", "GLOBAL_CURRENT_HEAD"],
    semanticOwnerGroups: ["COMPANY_OVERVIEW", "FINANCIAL_PREVIEW", "COST_SURFACES"],
    smokeSuites: [],
    impactLevel: 2,
    requiresFullRelease: false,
    notes: "Company overview remains current-head owned; the pilot does not treat it as a current smoke identity input.",
  }),
  freezeRecord({
    sourcePath: "backend/src/routes/auth.js",
    primaryDomain: "AUTH",
    secondaryDomains: ["PUBLIC", "ADMIN", "COMPANY", "ROOM", "MOBILE"],
    identityOwnerCategory: "CURRENT_HEAD_APPROVED_DIFF",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    identityModel: "approved-current-head-diff",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "AUTH_TENANT", "GLOBAL_CURRENT_HEAD"],
    semanticOwnerGroups: ["AUTH_CORE", "STEP_UP_AUTH", "PARENT_ACCESS"],
    smokeSuites: [],
    impactLevel: 2,
    requiresFullRelease: false,
    notes: "Auth is current-head owned and security-sensitive, but the pilot keeps it outside current smoke source identities.",
  }),
  freezeRecord({
    sourcePath: "backend/src/ai/service.js",
    primaryDomain: "AI_SEFER_ABI",
    secondaryDomains: ["SHIFT", "GPS_TELEMATICS", "ROUTE_DISPATCH"],
    identityOwnerCategory: "IDENTITY_OWNER_MISSING",
    identityOwnerRef: null,
    identityModel: "unresolved-canonical-owner",
    currentHeadPolicyState: "APPROVED",
    protectionClasses: ["DOMAIN_SEMANTIC", "AI_AUTHORITY"],
    semanticOwnerGroups: ["AI_FOUNDATION", "COPILOT_BOUNDARY", "LIVE_SELECTION_HELPER"],
    smokeSuites: [],
    impactLevel: 2,
    requiresFullRelease: false,
    notes: "No canonical owner exists in the current SSOTs, so the pilot records an explicit unresolved identity owner instead of inventing a SHA mirror.",
  }),
  freezeRecord({
    sourcePath: "backend/src/lib/requestUrl.js",
    primaryDomain: "TOOLING",
    secondaryDomains: ["PUBLIC", "ADMIN", "SECURITY"],
    identityOwnerCategory: "CANONICAL_PROVENANCE_OWNED",
    identityOwnerRef: CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CANONICAL_PROVENANCE_OWNED,
    identityModel: "canonical-provenance-record",
    currentHeadPolicyState: "ABSENT",
    protectionClasses: ["DOMAIN_SEMANTIC", "PROVENANCE", "SECURITY_SUPPORT"],
    semanticOwnerGroups: ["REQUEST_URL_SANITIZATION", "KVKK_REDACTION", "OBSERVABILITY_SUPPORT"],
    smokeSuites: [],
    impactLevel: 2,
    requiresFullRelease: false,
    notes: "Request URL sanitization is owned by canonical provenance, not by a duplicated SHA table in the new impact layer.",
  }),
]);

export const CHANGE_IMPACT_REGISTRY_V1_PATHS = Object.freeze(
  CHANGE_IMPACT_REGISTRY_V1_RECORDS.map((record) => record.sourcePath),
);

export const CHANGE_IMPACT_REGISTRY_V1_BY_PATH = Object.freeze(
  Object.fromEntries(
    CHANGE_IMPACT_REGISTRY_V1_RECORDS.map((record) => [record.sourcePath, record]),
  ),
);

export function assertChangeImpactRegistryV1Shape(
  registry = CHANGE_IMPACT_REGISTRY_V1_RECORDS,
  label = "change impact registry v1",
) {
  if (!Array.isArray(registry)) {
    throw new Error(`FAIL ${label}: registry is not an array`);
  }
  if (registry.length !== CHANGE_IMPACT_REGISTRY_V1_PATHS.length) {
    throw new Error(`FAIL ${label}: registry length mismatch (${registry.length} !== ${CHANGE_IMPACT_REGISTRY_V1_PATHS.length})`);
  }

  const seenPaths = new Set();

  for (const record of registry) {
    const normalized = freezeRecord(record);
    if (seenPaths.has(normalized.sourcePath)) {
      throw new Error(`FAIL ${label}: duplicate path ${normalized.sourcePath}`);
    }
    seenPaths.add(normalized.sourcePath);
  }

  const actualPaths = [...seenPaths].sort();
  const expectedPaths = [...CHANGE_IMPACT_REGISTRY_V1_PATHS].sort();
  if (actualPaths.join("|") !== expectedPaths.join("|")) {
    throw new Error(`FAIL ${label}: sourcePath set mismatch`);
  }

  return Object.freeze(
    registry.map((record) => freezeRecord(record)),
  );
}

export function buildChangeImpactRegistryV1Summary(
  registry = CHANGE_IMPACT_REGISTRY_V1_RECORDS,
) {
  const records = assertChangeImpactRegistryV1Shape(registry, "change impact registry v1 summary");
  const identityOwnerCategoryCounts = Object.create(null);
  const currentHeadPolicyCounts = Object.create(null);
  const impactLevelCounts = Object.create(null);
  const smokeSuiteCounts = Object.create(null);
  const domainCounts = Object.create(null);

  let resolvedOwnerCount = 0;
  let missingOwnerCount = 0;
  let fullReleaseCount = 0;

  for (const record of records) {
    identityOwnerCategoryCounts[record.identityOwnerCategory] = (identityOwnerCategoryCounts[record.identityOwnerCategory] || 0) + 1;
    currentHeadPolicyCounts[record.currentHeadPolicyState] = (currentHeadPolicyCounts[record.currentHeadPolicyState] || 0) + 1;
    impactLevelCounts[String(record.impactLevel)] = (impactLevelCounts[String(record.impactLevel)] || 0) + 1;
    domainCounts[record.primaryDomain] = (domainCounts[record.primaryDomain] || 0) + 1;
    if (record.identityOwnerCategory === "IDENTITY_OWNER_MISSING") {
      missingOwnerCount += 1;
    } else {
      resolvedOwnerCount += 1;
    }
    if (record.requiresFullRelease) {
      fullReleaseCount += 1;
    }
    for (const suite of record.smokeSuites) {
      smokeSuiteCounts[suite] = (smokeSuiteCounts[suite] || 0) + 1;
    }
  }

  return Object.freeze({
    version: CHANGE_IMPACT_REGISTRY_V1_VERSION,
    count: records.length,
    resolvedOwnerCount,
    missingOwnerCount,
    fullReleaseCount,
    identityOwnerCategoryCounts: Object.freeze({ ...identityOwnerCategoryCounts }),
    currentHeadPolicyCounts: Object.freeze({ ...currentHeadPolicyCounts }),
    impactLevelCounts: Object.freeze({ ...impactLevelCounts }),
    smokeSuiteCounts: Object.freeze({ ...smokeSuiteCounts }),
    domainCounts: Object.freeze({ ...domainCounts }),
  });
}

export function buildChangeImpactRegistryV1(
  registry = CHANGE_IMPACT_REGISTRY_V1_RECORDS,
) {
  const records = assertChangeImpactRegistryV1Shape(registry, "change impact registry v1");
  const summary = buildChangeImpactRegistryV1Summary(records);
  return Object.freeze({
    version: CHANGE_IMPACT_REGISTRY_V1_VERSION,
    count: records.length,
    records,
    summary,
  });
}

export function getChangeImpactForPath(relPath) {
  const normalized = normalizePath(relPath);
  const registered = CHANGE_IMPACT_REGISTRY_V1_BY_PATH[normalized];
  if (registered) return registered;

  // #11 owns the modular schema folder as one exact architectural boundary.
  // Resolve individual .prisma files without inflating the historical M90
  // registry counts or introducing a broad repository wildcard.
  if (
    normalized === "backend/prisma/schema.prisma"
    || (normalized.startsWith("backend/prisma/schema/") && normalized.endsWith(".prisma"))
  ) {
    return Object.freeze({
      sourcePath: normalized,
      primaryDomain: "TOOLING",
      secondaryDomains: Object.freeze(["AUTH", "COMPANY", "ROOM", "FINANCE_PAYMENT"]),
      identityOwnerCategory: "CANONICAL_PRISMA_SCHEMA_OWNED",
      identityOwnerRef: "backend/scripts/prisma_schema_modularization_01_check.js",
      identityModel: "prisma-schema-folder-modularization-01",
      currentHeadPolicyState: "ABSENT",
      protectionClasses: Object.freeze(["DOMAIN_SEMANTIC"]),
      semanticOwnerGroups: Object.freeze(["PRISMA_SCHEMA", "PRISMA_GENERATION", "PRISMA_DB_IMPACT"]),
      smokeSuites: Object.freeze([]),
      impactLevel: 4,
      requiresFullRelease: true,
      notes: "Exact #11 modular schema boundary; validate, parity-check, then run the #10 generation contract.",
    });
  }

  return null;
}

export function getImpactDomain(relPath) {
  return getChangeImpactForPath(relPath)?.primaryDomain ?? null;
}

export function getImpactSmokeSuites(relPath) {
  return Object.freeze([...(getChangeImpactForPath(relPath)?.smokeSuites || [])]);
}

export function getIdentityOwner(relPath) {
  return getChangeImpactForPath(relPath)?.identityOwnerRef ?? null;
}

export function getIdentityOwnerCategory(relPath) {
  return getChangeImpactForPath(relPath)?.identityOwnerCategory ?? null;
}

export function getImpactLevel(relPath) {
  const value = getChangeImpactForPath(relPath)?.impactLevel;
  return Number.isFinite(value) ? value : null;
}

export function isChangeImpactPath(relPath) {
  return Boolean(getChangeImpactForPath(relPath));
}

assertChangeImpactRegistryV1Shape();

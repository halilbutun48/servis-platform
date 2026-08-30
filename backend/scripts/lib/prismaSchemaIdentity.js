export const CANONICAL_PRISMA_SCHEMA_PATH = "backend/prisma/schema.prisma";
export const CANONICAL_PRISMA_SCHEMA_ROOT_PATH = "backend/prisma";
export const CANONICAL_PRISMA_SCHEMA_MODULE_PATHS = Object.freeze([
  "backend/prisma/schema/commercial.prisma",
  "backend/prisma/schema/fleet.prisma",
  "backend/prisma/schema/identity.prisma",
  "backend/prisma/schema/operations.prisma",
  "backend/prisma/schema/platform.prisma",
  "backend/prisma/schema/reference.prisma",
  "backend/prisma/schema/routing.prisma",
  "backend/prisma/schema/security.prisma",
  "backend/prisma/schema/telemetry.prisma",
  "backend/prisma/schema/tenant.prisma",
]);
export const CANONICAL_PRISMA_SCHEMA_FILE_PATHS = Object.freeze([
  CANONICAL_PRISMA_SCHEMA_PATH,
  ...CANONICAL_PRISMA_SCHEMA_MODULE_PATHS,
]);

// These are reviewed identities for the same canonical schema file. The two
// forms stay explicit because consumers use different byte-normalization rules.
export const CANONICAL_PRISMA_SCHEMA_RAW_SHA256 =
  "B10517E6F9E8BC48C7EBC0587ACC9A5C884AAB32E80CD2F3D7D5E3F16C4221D5";
export const CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 =
  "B10517E6F9E8BC48C7EBC0587ACC9A5C884AAB32E80CD2F3D7D5E3F16C4221D5";

export const CANONICAL_PRISMA_SCHEMA_IDENTITIES = Object.freeze({
  rawBytes: Object.freeze({
    path: CANONICAL_PRISMA_SCHEMA_PATH,
    algorithm: "SHA-256(raw bytes)",
    sha256: CANONICAL_PRISMA_SCHEMA_RAW_SHA256,
  }),
  normalizedText: Object.freeze({
    path: CANONICAL_PRISMA_SCHEMA_PATH,
    algorithm: "SHA-256(UTF-8 text with LF normalization)",
    sha256: CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256,
  }),
});

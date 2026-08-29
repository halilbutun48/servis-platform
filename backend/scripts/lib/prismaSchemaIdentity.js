export const CANONICAL_PRISMA_SCHEMA_PATH = "backend/prisma/schema.prisma";

// These are reviewed identities for the same canonical schema file. The two
// forms stay explicit because consumers use different byte-normalization rules.
export const CANONICAL_PRISMA_SCHEMA_RAW_SHA256 =
  "74855E441102FBB6B07CF697D9B9986608923C86F47A42F27246C1F71E2E84FD";
export const CANONICAL_PRISMA_SCHEMA_NORMALIZED_SHA256 =
  "74855E441102FBB6B07CF697D9B9986608923C86F47A42F27246C1F71E2E84FD";

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

CREATE TYPE "ExternalReferenceDataClass" AS ENUM ('INTERNAL_ACTUAL', 'EXTERNAL_REFERENCE', 'DEMO_FIXTURE');
CREATE TYPE "ExternalReferenceFamily" AS ENUM ('FUEL_DIESEL', 'FUEL_GASOLINE', 'FUEL_LPG', 'FX', 'INFLATION_INDEX', 'COST_INDEX', 'TOLL', 'BRIDGE', 'TUNNEL', 'FERRY', 'MAINTENANCE_REFERENCE', 'TYRE_REFERENCE', 'VEHICLE_CLASS_REFERENCE', 'REGIONAL_COST_REFERENCE');
CREATE TYPE "ExternalReferenceUnit" AS ENUM ('CURRENCY', 'CURRENCY_PER_L', 'CURRENCY_PER_KM', 'CURRENCY_PER_MONTH', 'CURRENCY_PER_TRIP', 'CURRENCY_PER_UNIT', 'RATE', 'INDEX_POINT');
CREATE TYPE "ExternalReferenceFreshness" AS ENUM ('FRESH', 'STALE', 'EXPIRED', 'SOURCE_UNAVAILABLE', 'FALLBACK', 'UNKNOWN');
CREATE TYPE "ExternalReferenceConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');
CREATE TYPE "ExternalReferenceCompleteness" AS ENUM ('COMPLETE', 'INCOMPLETE');
CREATE TYPE "ExternalReferenceConflictState" AS ENUM ('NO_CONFLICT', 'CONFLICT', 'UNKNOWN');
CREATE TYPE "ExternalReferenceProviderStatus" AS ENUM ('CONFIGURED', 'NOT_CONFIGURED', 'INVALID_CONFIG', 'UNAVAILABLE');
CREATE TYPE "ExternalReferenceFallbackState" AS ENUM ('NONE', 'FALLBACK_PROVIDER', 'STALE_CACHE', 'NO_SAFE_FALLBACK');
CREATE TYPE "ExternalReferenceScopeType" AS ENUM ('GLOBAL', 'REGION', 'CITY', 'CUSTOM');

CREATE TABLE "ExternalCostReference" (
    "id" SERIAL NOT NULL,
    "referenceKey" TEXT NOT NULL,
    "dataClass" "ExternalReferenceDataClass" NOT NULL DEFAULT 'EXTERNAL_REFERENCE',
    "family" "ExternalReferenceFamily" NOT NULL,
    "valueDecimal" TEXT NOT NULL,
    "valueMinor" INTEGER,
    "unit" "ExternalReferenceUnit" NOT NULL,
    "currencyCode" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "providerKey" TEXT NOT NULL,
    "providerVersion" TEXT,
    "asOf" TIMESTAMP(3),
    "regionCode" TEXT,
    "scopeType" "ExternalReferenceScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
    "freshness" "ExternalReferenceFreshness" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" "ExternalReferenceConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "completeness" "ExternalReferenceCompleteness" NOT NULL DEFAULT 'INCOMPLETE',
    "conflictState" "ExternalReferenceConflictState" NOT NULL DEFAULT 'UNKNOWN',
    "providerStatus" "ExternalReferenceProviderStatus" NOT NULL DEFAULT 'CONFIGURED',
    "fallbackState" "ExternalReferenceFallbackState" NOT NULL DEFAULT 'NONE',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshUntil" TIMESTAMP(3),
    "staleUntil" TIMESTAMP(3),
    "sourceMetadata" JSONB,
    "rawPayloadHash" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCostReference_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ExternalCostReference"
  ADD CONSTRAINT "ExternalCostReference_external_only_check"
  CHECK ("dataClass" = 'EXTERNAL_REFERENCE');

CREATE UNIQUE INDEX "ExternalCostReference_referenceKey_key"
  ON "ExternalCostReference"("referenceKey");
CREATE INDEX "ExternalCostReference_family_regionCode_scopeType_scopeKey_idx"
  ON "ExternalCostReference"("family", "regionCode", "scopeType", "scopeKey");
CREATE INDEX "ExternalCostReference_providerKey_family_asOf_idx"
  ON "ExternalCostReference"("providerKey", "family", "asOf");
CREATE INDEX "ExternalCostReference_freshness_staleUntil_idx"
  ON "ExternalCostReference"("freshness", "staleUntil");

ALTER TABLE "ExternalCostReference"
  ADD CONSTRAINT "ExternalCostReference_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

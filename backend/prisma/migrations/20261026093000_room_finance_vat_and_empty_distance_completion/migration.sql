-- ROOM_FINANCE_VAT_ADJUSTED_PROFIT_01: additive evidence fields only.
-- Existing rows remain UNKNOWN/null and are not reclassified or assigned empty km.
CREATE TYPE "RoomCostVatDeductibility" AS ENUM (
  'UNKNOWN',
  'DEDUCTIBLE',
  'NON_DEDUCTIBLE',
  'NOT_APPLICABLE'
);

ALTER TABLE "RoomCostEntry"
  ADD COLUMN "vatDeductibility" "RoomCostVatDeductibility" NOT NULL DEFAULT 'UNKNOWN';

ALTER TABLE "Shift"
  ADD COLUMN "emptyDistanceKm" DOUBLE PRECISION,
  ADD COLUMN "emptyDistanceEvidenceRef" TEXT,
  ADD COLUMN "emptyDistanceReason" TEXT;

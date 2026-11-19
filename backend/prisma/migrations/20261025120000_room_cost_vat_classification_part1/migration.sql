-- ROOM Accounting Foundation Part 1: additive VAT evidence classification.
-- Existing RoomCostEntry rows remain economically unchanged and are UNKNOWN.
CREATE TYPE "RoomCostVatClassification" AS ENUM (
  'UNKNOWN',
  'DOCUMENTED_VAT',
  'OUT_OF_SCOPE',
  'DOCUMENTED_EXEMPT',
  'VERIFIED_ZERO_RATE'
);

ALTER TABLE "RoomCostEntry"
  ADD COLUMN "vatClassification" "RoomCostVatClassification" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "vatEvidenceRef" TEXT,
  ADD COLUMN "vatClassificationReason" TEXT;

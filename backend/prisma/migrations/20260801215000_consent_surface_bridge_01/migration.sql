DROP INDEX "Consent_userId_createdAt_idx";

ALTER TABLE "Consent"
  ALTER COLUMN "acceptedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Consent_acceptedAt_idx"
  ON "Consent"("acceptedAt");

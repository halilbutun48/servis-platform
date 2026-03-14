-- M46.9: Session & Refresh Security

-- Access token invalidation lever (sv/sessionVersion)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- Backfill safety (idempotent)
UPDATE "User" SET "sessionVersion" = 1 WHERE "sessionVersion" IS NULL;

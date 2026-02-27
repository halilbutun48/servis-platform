-- M51: Shift süre uzatma (Company talep -> Room karar)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftExtendDecision') THEN
    CREATE TYPE "ShiftExtendDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
  END IF;
END$$;

ALTER TABLE "Shift"
  ADD COLUMN IF NOT EXISTS "extendRequestedEndAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "extendRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "extendDecision" "ShiftExtendDecision" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "extendNoteCompany" TEXT,
  ADD COLUMN IF NOT EXISTS "extendNoteRoom" TEXT,
  ADD COLUMN IF NOT EXISTS "extendDecisionAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Shift_extendDecision_idx" ON "Shift"("extendDecision");

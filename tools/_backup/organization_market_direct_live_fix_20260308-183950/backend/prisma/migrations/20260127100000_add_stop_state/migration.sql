-- M9: Stop state (PENDING/REACHED/SKIPPED)

-- CreateEnum
CREATE TYPE "StopState" AS ENUM ('PENDING', 'REACHED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Stop"
  ADD COLUMN     "state" "StopState" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN     "reachedAt" TIMESTAMP(3),
  ADD COLUMN     "skippedAt" TIMESTAMP(3),
  ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: eski ShiftProgress.lastReachedOrder -> Stop.state (best-effort)
UPDATE "Stop" s
SET "state" = 'REACHED',
    "reachedAt" = COALESCE(sp."updatedAt", CURRENT_TIMESTAMP)
FROM "ShiftProgress" sp
WHERE sp."shiftId" = s."shiftId"
  AND sp."lastReachedOrder" >= s."order"
  AND sp."lastReachedOrder" > 0;

-- Index for nextStop queries
CREATE INDEX "Stop_shiftId_state_order_idx" ON "Stop"("shiftId", "state", "order");

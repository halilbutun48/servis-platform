-- M81: route snapshot for DB-first preview
ALTER TABLE "Shift"
  ADD COLUMN IF NOT EXISTS "routeSnapshotPolyline" TEXT,
  ADD COLUMN IF NOT EXISTS "routeSnapshotDistanceM" INTEGER,
  ADD COLUMN IF NOT EXISTS "routeSnapshotDurationSec" INTEGER,
  ADD COLUMN IF NOT EXISTS "routeSnapshotValidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "routeSnapshotInputHash" TEXT;

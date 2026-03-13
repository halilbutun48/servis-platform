ALTER TABLE "Driver"
  ADD COLUMN IF NOT EXISTS "driverCode" TEXT,
  ADD COLUMN IF NOT EXISTS "pinTemporary" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pinUpdatedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Driver_driverCode_key'
  ) THEN
    CREATE UNIQUE INDEX "Driver_driverCode_key" ON "Driver"("driverCode");
  END IF;
END $$;

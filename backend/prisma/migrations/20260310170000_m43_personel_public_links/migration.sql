-- M43 prep: login-optional personel public live links

CREATE TABLE IF NOT EXISTS "PassengerLiveLink" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "personelId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PassengerLiveLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PassengerLiveLink_tokenHash_key" ON "PassengerLiveLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "PassengerLiveLink_shiftId_createdAt_idx" ON "PassengerLiveLink"("shiftId", "createdAt");
CREATE INDEX IF NOT EXISTS "PassengerLiveLink_personelId_createdAt_idx" ON "PassengerLiveLink"("personelId", "createdAt");
CREATE INDEX IF NOT EXISTS "PassengerLiveLink_expiresAt_idx" ON "PassengerLiveLink"("expiresAt");
CREATE INDEX IF NOT EXISTS "PassengerLiveLink_revokedAt_idx" ON "PassengerLiveLink"("revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PassengerLiveLink_shiftId_fkey'
  ) THEN
    ALTER TABLE "PassengerLiveLink"
      ADD CONSTRAINT "PassengerLiveLink_shiftId_fkey"
      FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PassengerLiveLink_personelId_fkey'
  ) THEN
    ALTER TABLE "PassengerLiveLink"
      ADD CONSTRAINT "PassengerLiveLink_personelId_fkey"
      FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

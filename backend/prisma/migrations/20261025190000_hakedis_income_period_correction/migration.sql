CREATE TYPE "HakedisIncomePeriodCorrectionStatus" AS ENUM ('ACTIVE', 'REVERSED');

CREATE TABLE "HakedisIncomePeriodCorrection" (
    "id" SERIAL NOT NULL,
    "hakedisId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "sourcePeriodStart" DATE NOT NULL,
    "sourcePeriodEnd" DATE NOT NULL,
    "recognizedPeriodStart" DATE NOT NULL,
    "recognizedPeriodEnd" DATE NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "HakedisIncomePeriodCorrectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousCorrectionId" INTEGER,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HakedisIncomePeriodCorrection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HakedisIncomePeriodCorrection_idempotencyKey_key" ON "HakedisIncomePeriodCorrection"("idempotencyKey");
CREATE INDEX "HakedisIncomePeriodCorrection_hakedisId_status_idx" ON "HakedisIncomePeriodCorrection"("hakedisId", "status");
CREATE INDEX "HakedisIncomePeriodCorrection_roomId_recognizedPeriodStart_recognizedPeriodEnd_status_idx" ON "HakedisIncomePeriodCorrection"("roomId", "recognizedPeriodStart", "recognizedPeriodEnd", "status");
CREATE INDEX "HakedisIncomePeriodCorrection_previousCorrectionId_idx" ON "HakedisIncomePeriodCorrection"("previousCorrectionId");

ALTER TABLE "HakedisIncomePeriodCorrection"
  ADD CONSTRAINT "HakedisIncomePeriodCorrection_hakedisId_fkey"
  FOREIGN KEY ("hakedisId") REFERENCES "HakedisRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

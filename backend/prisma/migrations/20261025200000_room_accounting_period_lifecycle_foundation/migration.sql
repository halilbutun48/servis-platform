CREATE TYPE "RoomAccountingPeriodStatus" AS ENUM ('OPEN', 'REVIEW', 'READY_TO_CLOSE', 'CLOSED', 'REOPEN_REQUESTED', 'REOPENED');

CREATE TABLE "RoomAccountingPeriod" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "RoomAccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "closeReason" TEXT,
    "reopenReason" TEXT,
    "policyDecisionRef" TEXT,
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "closedByUserId" INTEGER,
    "closedAt" TIMESTAMP(3),
    "reopenRequestedByUserId" INTEGER,
    "reopenRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomAccountingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoomAccountingPeriod_roomId_periodStart_periodEnd_key"
  ON "RoomAccountingPeriod"("roomId", "periodStart", "periodEnd");
CREATE INDEX "RoomAccountingPeriod_roomId_status_idx"
  ON "RoomAccountingPeriod"("roomId", "status");
CREATE INDEX "RoomAccountingPeriod_roomId_periodStart_periodEnd_status_idx"
  ON "RoomAccountingPeriod"("roomId", "periodStart", "periodEnd", "status");

ALTER TABLE "RoomAccountingPeriod"
  ADD CONSTRAINT "RoomAccountingPeriod_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

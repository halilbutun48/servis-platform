-- ROOM-COST-ALLOCATION-01: additive allocation quantity/rate and lineage.
-- This migration intentionally keeps the existing RoomCostEntry ledger intact.

CREATE TYPE "RoomCostAllocationLineageKind" AS ENUM ('COMPONENT', 'REFERENCE');
CREATE TYPE "RoomCostAllocationTargetKind" AS ENUM ('VEHICLE', 'DRIVER', 'AGREEMENT', 'SHIFT', 'PERIOD');

ALTER TABLE "RoomCostEntry"
  ADD COLUMN "allocationQuantity" DECIMAL(18,4),
  ADD COLUMN "allocationUnit" TEXT,
  ADD COLUMN "allocationUnitRateMinor" INTEGER;

CREATE TABLE "RoomCostAllocationLine" (
  "id" SERIAL NOT NULL,
  "roomId" INTEGER NOT NULL,
  "entryId" INTEGER NOT NULL,
  "lineageKind" "RoomCostAllocationLineageKind" NOT NULL DEFAULT 'COMPONENT',
  "targetKind" "RoomCostAllocationTargetKind" NOT NULL,
  "lineageKey" TEXT NOT NULL,
  "vehicleId" INTEGER,
  "driverId" INTEGER,
  "agreementId" INTEGER,
  "shiftId" INTEGER,
  "periodStart" DATE,
  "periodEnd" DATE,
  "quantity" DECIMAL(18,4),
  "unit" TEXT,
  "unitRateMinor" INTEGER,
  "allocatedAmountMinor" INTEGER NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "sourceRef" TEXT,
  "evidenceRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoomCostAllocationLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoomCostAllocationLine_roomId_id_key"
  ON "RoomCostAllocationLine"("roomId", "id");
CREATE UNIQUE INDEX "RoomCostAllocationLine_roomId_entryId_lineageKey_key"
  ON "RoomCostAllocationLine"("roomId", "entryId", "lineageKey");
CREATE INDEX "RoomCostAllocationLine_roomId_entryId_idx"
  ON "RoomCostAllocationLine"("roomId", "entryId");
CREATE INDEX "RoomCostAllocationLine_roomId_targetKind_vehicleId_driverId_agreementId_shiftId_idx"
  ON "RoomCostAllocationLine"("roomId", "targetKind", "vehicleId", "driverId", "agreementId", "shiftId");
CREATE INDEX "RoomCostAllocationLine_roomId_periodStart_periodEnd_idx"
  ON "RoomCostAllocationLine"("roomId", "periodStart", "periodEnd");

ALTER TABLE "RoomCostAllocationLine"
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_entryId_fkey"
    FOREIGN KEY ("roomId", "entryId") REFERENCES "RoomCostEntry"("roomId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_vehicleId_fkey"
    FOREIGN KEY ("roomId", "vehicleId") REFERENCES "Vehicle"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_driverId_fkey"
    FOREIGN KEY ("roomId", "driverId") REFERENCES "Driver"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_agreementId_fkey"
    FOREIGN KEY ("roomId", "agreementId") REFERENCES "Agreement"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RoomCostAllocationLine_roomId_shiftId_fkey"
    FOREIGN KEY ("roomId", "shiftId") REFERENCES "Shift"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

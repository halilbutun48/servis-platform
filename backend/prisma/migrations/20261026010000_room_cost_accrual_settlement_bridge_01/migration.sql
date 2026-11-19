CREATE TYPE "RoomCostSettlementStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE "RoomCostSettlement" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "accrualEntryId" INTEGER NOT NULL,
    "actualEntryId" INTEGER NOT NULL,
    "settledAmountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "settlementRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RoomCostSettlementStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdByUserId" INTEGER,
    "confirmedByUserId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCostSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoomCostSettlement_roomId_idempotencyKey_key"
  ON "RoomCostSettlement"("roomId", "idempotencyKey");
CREATE UNIQUE INDEX "RoomCostSettlement_roomId_settlementRef_key"
  ON "RoomCostSettlement"("roomId", "settlementRef");
CREATE INDEX "RoomCostSettlement_roomId_accrualEntryId_idx"
  ON "RoomCostSettlement"("roomId", "accrualEntryId");
CREATE INDEX "RoomCostSettlement_roomId_actualEntryId_idx"
  ON "RoomCostSettlement"("roomId", "actualEntryId");
CREATE INDEX "RoomCostSettlement_roomId_status_idx"
  ON "RoomCostSettlement"("roomId", "status");

ALTER TABLE "RoomCostSettlement"
  ADD CONSTRAINT "RoomCostSettlement_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomCostSettlement"
  ADD CONSTRAINT "RoomCostSettlement_roomId_accrualEntryId_fkey"
  FOREIGN KEY ("roomId", "accrualEntryId") REFERENCES "RoomCostEntry"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomCostSettlement"
  ADD CONSTRAINT "RoomCostSettlement_roomId_actualEntryId_fkey"
  FOREIGN KEY ("roomId", "actualEntryId") REFERENCES "RoomCostEntry"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

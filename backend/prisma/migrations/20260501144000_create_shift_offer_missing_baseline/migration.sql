CREATE TYPE "ShiftOfferStatus" AS ENUM ('OPEN', 'COUNTERED', 'ACCEPTED', 'CANCELLED');

CREATE TABLE "ShiftOffer" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "roomId" INTEGER NOT NULL,
  "status" "ShiftOfferStatus" NOT NULL DEFAULT 'OPEN',
  "amountCompany" INTEGER,
  "noteCompany" TEXT,
  "amountRoom" INTEGER,
  "noteRoom" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShiftOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShiftOffer_shiftId_roomId_key" ON "ShiftOffer"("shiftId", "roomId");
CREATE INDEX "ShiftOffer_shiftId_idx" ON "ShiftOffer"("shiftId");
CREATE INDEX "ShiftOffer_roomId_idx" ON "ShiftOffer"("roomId");
CREATE INDEX "ShiftOffer_status_idx" ON "ShiftOffer"("status");

ALTER TABLE "ShiftOffer"
  ADD CONSTRAINT "ShiftOffer_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftOffer"
  ADD CONSTRAINT "ShiftOffer_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

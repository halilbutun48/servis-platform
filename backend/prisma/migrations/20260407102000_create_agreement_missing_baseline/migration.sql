-- Agreement missing baseline repair for fresh installs
-- Creates the historical Agreement core before m82_9 adds CommercialSource -> Agreement.

CREATE TYPE "AgreementStatus" AS ENUM ('REQUESTED', 'COUNTERED', 'APPROVED', 'ACTIVE', 'DONE', 'CANCELLED', 'REJECTED');
CREATE TYPE "AgreementExtendStatus" AS ENUM ('NONE', 'PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ShiftDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "RoutePattern" AS ENUM ('ONE_WAY', 'LOOP');

CREATE TABLE "Agreement" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL,
  "roomId" INTEGER NOT NULL,
  "vehicleId" INTEGER,
  "driverId" INTEGER,
  "hubLat" DOUBLE PRECISION,
  "hubLng" DOUBLE PRECISION,
  "direction" "ShiftDirection" NOT NULL DEFAULT 'INBOUND',
  "pattern" "RoutePattern" NOT NULL DEFAULT 'ONE_WAY',
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "weekMask" INTEGER NOT NULL,
  "startMin" INTEGER NOT NULL,
  "endMin" INTEGER NOT NULL,
  "status" "AgreementStatus" NOT NULL DEFAULT 'REQUESTED',
  "companyOfferAmount" INTEGER,
  "companyOfferNote" TEXT,
  "roomOfferAmount" INTEGER,
  "roomOfferNote" TEXT,
  "extendStatus" "AgreementExtendStatus" NOT NULL DEFAULT 'NONE',
  "extendRequestedEndDate" DATE,
  "extendRequestedAt" TIMESTAMP(3),
  "extendOfferAmount" INTEGER,
  "extendOfferNote" TEXT,
  "extendCounterAmount" INTEGER,
  "extendCounterNote" TEXT,
  "extendDecisionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Agreement_companyId_idx" ON "Agreement"("companyId");
CREATE INDEX "Agreement_roomId_idx" ON "Agreement"("roomId");
CREATE INDEX "Agreement_vehicleId_idx" ON "Agreement"("vehicleId");
CREATE INDEX "Agreement_driverId_idx" ON "Agreement"("driverId");
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");
CREATE INDEX "Agreement_startDate_endDate_idx" ON "Agreement"("startDate", "endDate");

ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

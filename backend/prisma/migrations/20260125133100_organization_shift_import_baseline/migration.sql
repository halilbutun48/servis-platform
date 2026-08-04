-- Batch 2 organization / shift import / assignment baseline.
-- Only historical seed-root ownership allowed; deferred foreign keys stay out until their parent tables exist.

CREATE TYPE "OrganizationPlanStatus" AS ENUM ('DRAFT', 'SHIFT_PUBLISHED', 'AGREEMENT_REQUESTED', 'CANCELLED');

CREATE TABLE "OrganizationPlan" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Organization Plan',
  "planDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startMin" INTEGER NOT NULL DEFAULT 480,
  "endMin" INTEGER NOT NULL DEFAULT 1080,
  "roomId" INTEGER,
  "notes" TEXT,
  "status" "OrganizationPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedShiftId" INTEGER,
  "linkedAgreementId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationPlan_companyId_status_idx" ON "OrganizationPlan"("companyId", "status");
CREATE INDEX "OrganizationPlan_companyId_planDate_idx" ON "OrganizationPlan"("companyId", "planDate");
CREATE INDEX "OrganizationPlan_roomId_idx" ON "OrganizationPlan"("roomId");

CREATE TABLE "OrganizationStop" (
  "id" SERIAL NOT NULL,
  "planId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "windowStartMin" INTEGER,
  "windowEndMin" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationStop_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationStop_planId_order_idx" ON "OrganizationStop"("planId", "order");
ALTER TABLE "OrganizationStop"
  ADD CONSTRAINT "OrganizationStop_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "OrganizationPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShiftPersonel" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "personelId" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShiftPersonel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShiftPersonel_shiftId_personelId_key" ON "ShiftPersonel"("shiftId", "personelId");
CREATE INDEX "ShiftPersonel_shiftId_idx" ON "ShiftPersonel"("shiftId");
CREATE INDEX "ShiftPersonel_personelId_idx" ON "ShiftPersonel"("personelId");

CREATE TABLE "ShiftImport" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "createdByUserId" INTEGER,
  "fileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShiftImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftImport_shiftId_idx" ON "ShiftImport"("shiftId");

CREATE TABLE "ShiftImportRow" (
  "id" SERIAL NOT NULL,
  "importId" INTEGER NOT NULL,
  "rowNo" INTEGER NOT NULL,
  "rawJson" JSONB,
  "fullName" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "geoStatus" "GeoStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "personelId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShiftImportRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftImportRow_importId_idx" ON "ShiftImportRow"("importId");
ALTER TABLE "ShiftImportRow"
  ADD CONSTRAINT "ShiftImportRow_importId_fkey"
  FOREIGN KEY ("importId") REFERENCES "ShiftImport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StopAssignment" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "stopId" INTEGER NOT NULL,
  "personelId" INTEGER NOT NULL,
  "walkM" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StopAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StopAssignment_shiftId_personelId_key" ON "StopAssignment"("shiftId", "personelId");
CREATE INDEX "StopAssignment_shiftId_idx" ON "StopAssignment"("shiftId");
CREATE INDEX "StopAssignment_stopId_idx" ON "StopAssignment"("stopId");

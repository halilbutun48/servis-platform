-- Financial operations persistence: CompanyBudgetPlan + RoomQuoteFloorDraft
CREATE TYPE "CompanyBudgetPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "RoomQuoteFloorDraftStatus" AS ENUM ('DRAFT', 'APPLIED', 'ARCHIVED');

CREATE TABLE "CompanyBudgetPlan" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL,
  "status" "CompanyBudgetPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "budgetAmountMinor" INTEGER,
  "periodStart" DATE,
  "periodEnd" DATE,
  "budgetSource" TEXT,
  "budgetApprovalState" TEXT,
  "description" TEXT,
  "warningThresholdBps" INTEGER,
  "inputSnapshot" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" INTEGER,
  "updatedByUserId" INTEGER,
  "activatedByUserId" INTEGER,
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyBudgetPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomQuoteFloorDraft" (
  "id" SERIAL NOT NULL,
  "roomId" INTEGER NOT NULL,
  "status" "RoomQuoteFloorDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "manualBaselineOperationalCostMinor" INTEGER,
  "targetContributionBps" INTEGER,
  "riskReserveBps" INTEGER,
  "quoteFloorMinor" INTEGER,
  "quoteFloorPerPassengerMinor" INTEGER,
  "baselineSource" TEXT,
  "inputSnapshot" JSONB,
  "calculationVersion" TEXT NOT NULL DEFAULT 'ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" INTEGER,
  "updatedByUserId" INTEGER,
  "appliedByUserId" INTEGER,
  "appliedShiftOfferId" INTEGER,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomQuoteFloorDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyBudgetPlan_companyId_status_idx" ON "CompanyBudgetPlan"("companyId", "status");
CREATE INDEX "CompanyBudgetPlan_companyId_updatedAt_idx" ON "CompanyBudgetPlan"("companyId", "updatedAt");
CREATE INDEX "CompanyBudgetPlan_companyId_activatedAt_idx" ON "CompanyBudgetPlan"("companyId", "activatedAt");
CREATE INDEX "RoomQuoteFloorDraft_roomId_status_idx" ON "RoomQuoteFloorDraft"("roomId", "status");
CREATE INDEX "RoomQuoteFloorDraft_roomId_updatedAt_idx" ON "RoomQuoteFloorDraft"("roomId", "updatedAt");
CREATE INDEX "RoomQuoteFloorDraft_appliedShiftOfferId_idx" ON "RoomQuoteFloorDraft"("appliedShiftOfferId");

ALTER TABLE "CompanyBudgetPlan"
  ADD CONSTRAINT "CompanyBudgetPlan_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyBudgetPlan"
  ADD CONSTRAINT "CompanyBudgetPlan_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyBudgetPlan"
  ADD CONSTRAINT "CompanyBudgetPlan_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyBudgetPlan"
  ADD CONSTRAINT "CompanyBudgetPlan_activatedByUserId_fkey"
  FOREIGN KEY ("activatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomQuoteFloorDraft"
  ADD CONSTRAINT "RoomQuoteFloorDraft_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomQuoteFloorDraft"
  ADD CONSTRAINT "RoomQuoteFloorDraft_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomQuoteFloorDraft"
  ADD CONSTRAINT "RoomQuoteFloorDraft_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomQuoteFloorDraft"
  ADD CONSTRAINT "RoomQuoteFloorDraft_appliedByUserId_fkey"
  FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoomQuoteFloorDraft"
  ADD CONSTRAINT "RoomQuoteFloorDraft_appliedShiftOfferId_fkey"
  FOREIGN KEY ("appliedShiftOfferId") REFERENCES "ShiftOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

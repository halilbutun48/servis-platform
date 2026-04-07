-- M82.9 Dormant payment backbone
CREATE TYPE "PaymentMode" AS ENUM ('OFF', 'OPTIONAL', 'REQUIRED');
CREATE TYPE "CommercialSourceType" AS ENUM ('AGREEMENT', 'SHIFT_SERIES');
CREATE TYPE "CommissionScopeType" AS ENUM ('GLOBAL', 'ROOM');
CREATE TYPE "SettlementPlanStatus" AS ENUM ('DORMANT', 'READY', 'ACTIVE', 'DISABLED');
CREATE TYPE "SettlementEntryKind" AS ENUM ('COMPANY_CHARGE', 'PLATFORM_COMMISSION', 'PROVIDER_PAYOUT');
CREATE TYPE "SettlementEntryStatus" AS ENUM ('DORMANT', 'PLANNED', 'READY', 'EXECUTED', 'CANCELLED');
CREATE TYPE "PaymentAccountOwnerType" AS ENUM ('PLATFORM', 'COMPANY', 'ROOM');
CREATE TYPE "PaymentAccountStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'VERIFIED', 'ERROR');

CREATE TABLE "CommissionRule" (
  "id" SERIAL NOT NULL,
  "scopeType" "CommissionScopeType" NOT NULL DEFAULT 'GLOBAL',
  "roomId" INTEGER,
  "paymentMode" "PaymentMode" NOT NULL DEFAULT 'OFF',
  "commissionBps" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAccount" (
  "id" SERIAL NOT NULL,
  "ownerType" "PaymentAccountOwnerType" NOT NULL,
  "companyId" INTEGER,
  "roomId" INTEGER,
  "providerKey" TEXT NOT NULL DEFAULT 'DORMANT',
  "status" "PaymentAccountStatus" NOT NULL DEFAULT 'INACTIVE',
  "label" TEXT,
  "maskedIban" TEXT,
  "accountRef" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialSource" (
  "id" SERIAL NOT NULL,
  "sourceType" "CommercialSourceType" NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "agreementId" INTEGER,
  "shiftRootId" INTEGER,
  "shiftGroupKey" TEXT,
  "companyId" INTEGER NOT NULL,
  "roomId" INTEGER,
  "paymentModeSnapshot" "PaymentMode" NOT NULL DEFAULT 'OFF',
  "commissionBpsSnapshot" INTEGER NOT NULL DEFAULT 0,
  "amountCompanySnapshot" INTEGER,
  "amountProviderSnapshot" INTEGER,
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "providerAdapterKey" TEXT NOT NULL DEFAULT 'DORMANT',
  "settlementStatus" "SettlementPlanStatus" NOT NULL DEFAULT 'DORMANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementPlan" (
  "id" SERIAL NOT NULL,
  "commercialSourceId" INTEGER NOT NULL,
  "status" "SettlementPlanStatus" NOT NULL DEFAULT 'DORMANT',
  "paymentModeSnapshot" "PaymentMode" NOT NULL DEFAULT 'OFF',
  "commissionBpsSnapshot" INTEGER NOT NULL DEFAULT 0,
  "providerAdapterKey" TEXT NOT NULL DEFAULT 'DORMANT',
  "grossAmount" INTEGER NOT NULL DEFAULT 0,
  "commissionAmount" INTEGER NOT NULL DEFAULT 0,
  "providerNetAmount" INTEGER NOT NULL DEFAULT 0,
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettlementEntry" (
  "id" SERIAL NOT NULL,
  "settlementPlanId" INTEGER NOT NULL,
  "kind" "SettlementEntryKind" NOT NULL,
  "status" "SettlementEntryStatus" NOT NULL DEFAULT 'DORMANT',
  "amount" INTEGER NOT NULL DEFAULT 0,
  "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
  "providerRef" TEXT,
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercialSource_sourceKey_key" ON "CommercialSource"("sourceKey");
CREATE INDEX "CommissionRule_scopeType_isActive_idx" ON "CommissionRule"("scopeType", "isActive");
CREATE INDEX "CommissionRule_roomId_isActive_idx" ON "CommissionRule"("roomId", "isActive");
CREATE INDEX "PaymentAccount_ownerType_status_idx" ON "PaymentAccount"("ownerType", "status");
CREATE INDEX "PaymentAccount_companyId_idx" ON "PaymentAccount"("companyId");
CREATE INDEX "PaymentAccount_roomId_idx" ON "PaymentAccount"("roomId");
CREATE INDEX "CommercialSource_sourceType_createdAt_idx" ON "CommercialSource"("sourceType", "createdAt");
CREATE INDEX "CommercialSource_agreementId_idx" ON "CommercialSource"("agreementId");
CREATE INDEX "CommercialSource_shiftRootId_idx" ON "CommercialSource"("shiftRootId");
CREATE INDEX "CommercialSource_companyId_createdAt_idx" ON "CommercialSource"("companyId", "createdAt");
CREATE INDEX "CommercialSource_roomId_createdAt_idx" ON "CommercialSource"("roomId", "createdAt");
CREATE INDEX "SettlementPlan_commercialSourceId_idx" ON "SettlementPlan"("commercialSourceId");
CREATE INDEX "SettlementPlan_status_createdAt_idx" ON "SettlementPlan"("status", "createdAt");
CREATE INDEX "SettlementEntry_settlementPlanId_kind_idx" ON "SettlementEntry"("settlementPlanId", "kind");
CREATE INDEX "SettlementEntry_status_dueAt_idx" ON "SettlementEntry"("status", "dueAt");

ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSource" ADD CONSTRAINT "CommercialSource_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSource" ADD CONSTRAINT "CommercialSource_shiftRootId_fkey" FOREIGN KEY ("shiftRootId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSource" ADD CONSTRAINT "CommercialSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialSource" ADD CONSTRAINT "CommercialSource_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettlementPlan" ADD CONSTRAINT "SettlementPlan_commercialSourceId_fkey" FOREIGN KEY ("commercialSourceId") REFERENCES "CommercialSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementEntry" ADD CONSTRAINT "SettlementEntry_settlementPlanId_fkey" FOREIGN KEY ("settlementPlanId") REFERENCES "SettlementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

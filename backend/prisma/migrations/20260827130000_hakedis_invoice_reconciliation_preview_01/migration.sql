CREATE TYPE "HakedisRecordStatus" AS ENUM ('DRAFT', 'READY', 'FINALIZED', 'CANCELLED');
CREATE TYPE "InvoiceRecordStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'PAID');

CREATE TABLE "HakedisRecord" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "status" "HakedisRecordStatus" NOT NULL DEFAULT 'READY',
    "calculationVersion" TEXT NOT NULL DEFAULT 'HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01',
    "source" TEXT,
    "notes" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HakedisRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceRecord" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "agreementId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "roomId" INTEGER,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "status" "InvoiceRecordStatus" NOT NULL DEFAULT 'ISSUED',
    "source" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HakedisRecord_reference_key" ON "HakedisRecord"("reference");
CREATE UNIQUE INDEX "InvoiceRecord_reference_key" ON "InvoiceRecord"("reference");
CREATE INDEX "HakedisRecord_agreementId_periodStart_periodEnd_status_idx" ON "HakedisRecord"("agreementId", "periodStart", "periodEnd", "status");
CREATE INDEX "HakedisRecord_companyId_periodStart_periodEnd_idx" ON "HakedisRecord"("companyId", "periodStart", "periodEnd");
CREATE INDEX "HakedisRecord_roomId_periodStart_periodEnd_idx" ON "HakedisRecord"("roomId", "periodStart", "periodEnd");
CREATE INDEX "InvoiceRecord_agreementId_periodStart_periodEnd_status_idx" ON "InvoiceRecord"("agreementId", "periodStart", "periodEnd", "status");
CREATE INDEX "InvoiceRecord_companyId_periodStart_periodEnd_idx" ON "InvoiceRecord"("companyId", "periodStart", "periodEnd");
CREATE INDEX "InvoiceRecord_roomId_periodStart_periodEnd_idx" ON "InvoiceRecord"("roomId", "periodStart", "periodEnd");

ALTER TABLE "HakedisRecord"
  ADD CONSTRAINT "HakedisRecord_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HakedisRecord"
  ADD CONSTRAINT "HakedisRecord_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HakedisRecord"
  ADD CONSTRAINT "HakedisRecord_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HakedisRecord"
  ADD CONSTRAINT "HakedisRecord_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceRecord"
  ADD CONSTRAINT "InvoiceRecord_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceRecord"
  ADD CONSTRAINT "InvoiceRecord_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceRecord"
  ADD CONSTRAINT "InvoiceRecord_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceRecord"
  ADD CONSTRAINT "InvoiceRecord_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

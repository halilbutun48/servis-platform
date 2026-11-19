-- ROOM invoice-linked collection foundation v1.
-- Additive only: existing invoice, settlement and cost records are untouched.
CREATE TYPE "InvoiceCollectionStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TYPE "InvoiceCollectionDirection" AS ENUM ('COLLECTION', 'REVERSAL');

CREATE TYPE "InvoiceCollectionPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

CREATE TABLE "InvoiceCollection" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "collectedAt" DATE NOT NULL,
    "paymentMethod" "InvoiceCollectionPaymentMethod" NOT NULL,
    "direction" "InvoiceCollectionDirection" NOT NULL DEFAULT 'COLLECTION',
    "status" "InvoiceCollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceRef" TEXT,
    "note" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "reversalOfId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" INTEGER NOT NULL,
    "confirmedByUserId" INTEGER,
    "cancelledByUserId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceCollection_roomId_idempotencyKey_key" ON "InvoiceCollection"("roomId", "idempotencyKey");
CREATE INDEX "InvoiceCollection_invoiceId_status_idx" ON "InvoiceCollection"("invoiceId", "status");
CREATE INDEX "InvoiceCollection_roomId_invoiceId_status_idx" ON "InvoiceCollection"("roomId", "invoiceId", "status");
CREATE INDEX "InvoiceCollection_reversalOfId_idx" ON "InvoiceCollection"("reversalOfId");
CREATE INDEX "InvoiceCollection_companyId_collectedAt_idx" ON "InvoiceCollection"("companyId", "collectedAt");

ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "InvoiceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_confirmedByUserId_fkey"
  FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceCollection" ADD CONSTRAINT "InvoiceCollection_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "InvoiceCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "RoomCostCategoryKind" AS ENUM ('BUILT_IN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RoomCostRecordKind" AS ENUM ('ACTUAL', 'BUDGET', 'FORECAST', 'ACCRUAL');

-- CreateEnum
CREATE TYPE "RoomCostOccurrenceKind" AS ENUM ('ONE_OFF', 'PERIODIC', 'RECURRING', 'PER_KM', 'PER_TRIP', 'PER_SHIFT');

-- CreateEnum
CREATE TYPE "RoomCostVatMode" AS ENUM ('INCLUDED', 'EXCLUDED', 'NOT_APPLICABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RoomCostLifecycle" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomCostAllocation" AS ENUM ('DIRECT', 'COUNT_IN_ROLLUP', 'EXCLUDED_FROM_ROLLUP');

-- CreateEnum
CREATE TYPE "UserCapabilityKey" AS ENUM ('ROOM_FINANCE_SALARY');

-- CreateTable
CREATE TABLE "RoomCostCategory" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "RoomCostCategoryKind" NOT NULL DEFAULT 'BUILT_IN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomCostEntry" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "vehicleId" INTEGER,
    "driverId" INTEGER,
    "agreementId" INTEGER,
    "shiftId" INTEGER,
    "occurredAt" TIMESTAMP(3),
    "periodStart" DATE,
    "periodEnd" DATE,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'TRY',
    "vatMode" "RoomCostVatMode" NOT NULL,
    "vatAmountMinor" INTEGER,
    "recordKind" "RoomCostRecordKind" NOT NULL DEFAULT 'ACTUAL',
    "occurrenceKind" "RoomCostOccurrenceKind" NOT NULL DEFAULT 'ONE_OFF',
    "allocation" "RoomCostAllocation" NOT NULL DEFAULT 'DIRECT',
    "evidenceRef" TEXT,
    "sourceRef" TEXT,
    "sourceType" TEXT,
    "description" TEXT,
    "lifecycle" "RoomCostLifecycle" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfEntryId" INTEGER,
    "createdByUserId" INTEGER,
    "updatedByUserId" INTEGER,
    "confirmedByUserId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "cancelledByUserId" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCapabilityGrant" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "capability" "UserCapabilityKey" NOT NULL,
    "grantedByUserId" INTEGER NOT NULL,
    "activeGrantKey" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomCostCategory_roomId_isActive_idx" ON "RoomCostCategory"("roomId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCostCategory_roomId_key_key" ON "RoomCostCategory"("roomId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCostCategory_roomId_id_key" ON "RoomCostCategory"("roomId", "id");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_occurredAt_idx" ON "RoomCostEntry"("roomId", "occurredAt");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_periodStart_periodEnd_idx" ON "RoomCostEntry"("roomId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_recordKind_lifecycle_idx" ON "RoomCostEntry"("roomId", "recordKind", "lifecycle");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_vehicleId_idx" ON "RoomCostEntry"("roomId", "vehicleId");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_driverId_idx" ON "RoomCostEntry"("roomId", "driverId");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_categoryId_idx" ON "RoomCostEntry"("roomId", "categoryId");

-- CreateIndex
CREATE INDEX "RoomCostEntry_roomId_sourceRef_periodStart_periodEnd_idx" ON "RoomCostEntry"("roomId", "sourceRef", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCostEntry_roomId_id_key" ON "RoomCostEntry"("roomId", "id");

-- CreateIndex
CREATE INDEX "UserCapabilityGrant_roomId_capability_revokedAt_idx" ON "UserCapabilityGrant"("roomId", "capability", "revokedAt");

-- CreateIndex
CREATE INDEX "UserCapabilityGrant_userId_capability_revokedAt_idx" ON "UserCapabilityGrant"("userId", "capability", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCapabilityGrant_roomId_userId_capability_activeGrantKey_key" ON "UserCapabilityGrant"("roomId", "userId", "capability", "activeGrantKey");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_roomId_id_key" ON "Agreement"("roomId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_roomId_id_key" ON "Driver"("roomId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_roomId_id_key" ON "Shift"("roomId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "User_roomId_id_key" ON "User"("roomId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_roomId_id_key" ON "Vehicle"("roomId", "id");

-- AddForeignKey
ALTER TABLE "RoomCostCategory" ADD CONSTRAINT "RoomCostCategory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_categoryId_fkey" FOREIGN KEY ("roomId", "categoryId") REFERENCES "RoomCostCategory"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_vehicleId_fkey" FOREIGN KEY ("roomId", "vehicleId") REFERENCES "Vehicle"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_driverId_fkey" FOREIGN KEY ("roomId", "driverId") REFERENCES "Driver"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_agreementId_fkey" FOREIGN KEY ("roomId", "agreementId") REFERENCES "Agreement"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_shiftId_fkey" FOREIGN KEY ("roomId", "shiftId") REFERENCES "Shift"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_roomId_reversalOfEntryId_fkey" FOREIGN KEY ("roomId", "reversalOfEntryId") REFERENCES "RoomCostEntry"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCostEntry" ADD CONSTRAINT "RoomCostEntry_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCapabilityGrant" ADD CONSTRAINT "UserCapabilityGrant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCapabilityGrant" ADD CONSTRAINT "UserCapabilityGrant_roomId_userId_fkey" FOREIGN KEY ("roomId", "userId") REFERENCES "User"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCapabilityGrant" ADD CONSTRAINT "UserCapabilityGrant_roomId_grantedByUserId_fkey" FOREIGN KEY ("roomId", "grantedByUserId") REFERENCES "User"("roomId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

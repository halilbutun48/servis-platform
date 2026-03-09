-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "companyOfferNote" TEXT,
ADD COLUMN     "companyOfferVehicleId" INTEGER,
ADD COLUMN     "roomOfferDriverNote" TEXT,
ADD COLUMN     "roomOfferNote" TEXT,
ADD COLUMN     "roomOfferToDriver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomOfferVehicleId" INTEGER;

-- CreateIndex
CREATE INDEX "Shift_companyOfferVehicleId_idx" ON "Shift"("companyOfferVehicleId");

-- CreateIndex
CREATE INDEX "Shift_roomOfferVehicleId_idx" ON "Shift"("roomOfferVehicleId");

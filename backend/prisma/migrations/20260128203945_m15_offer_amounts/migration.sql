-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "companyOfferAmount" INTEGER,
ADD COLUMN     "roomOfferAmount" INTEGER;

-- CreateIndex
CREATE INDEX "Shift_companyOfferAmount_idx" ON "Shift"("companyOfferAmount");

-- CreateIndex
CREATE INDEX "Shift_roomOfferAmount_idx" ON "Shift"("roomOfferAmount");

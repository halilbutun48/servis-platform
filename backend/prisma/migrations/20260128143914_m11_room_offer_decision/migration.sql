-- CreateEnum
CREATE TYPE "OfferDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "roomOfferDecision" "OfferDecision" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "roomOfferDecisionAt" TIMESTAMP(3),
ADD COLUMN     "roomOfferDecisionNote" TEXT;

-- CreateIndex
CREATE INDEX "Shift_roomOfferDecision_idx" ON "Shift"("roomOfferDecision");

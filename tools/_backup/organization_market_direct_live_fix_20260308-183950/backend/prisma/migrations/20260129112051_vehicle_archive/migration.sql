-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedReason" TEXT;

-- CreateIndex
CREATE INDEX "Vehicle_roomId_archivedAt_idx" ON "Vehicle"("roomId", "archivedAt");

-- M13: Vehicle meta fields (type, brand/model/year, inspection, service, odometer)

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MINIBUS', 'MIDIBUS', 'OTOBUS');

-- CreateEnum
CREATE TYPE "OdometerSource" AS ENUM ('MANUAL', 'GPS');

-- AlterTable
ALTER TABLE "Vehicle"
  ADD COLUMN     "type" "VehicleType",
  ADD COLUMN     "brand" TEXT,
  ADD COLUMN     "model" TEXT,
  ADD COLUMN     "modelYear" INTEGER,
  ADD COLUMN     "color" TEXT,
  ADD COLUMN     "vin" TEXT,
  ADD COLUMN     "note" TEXT,
  ADD COLUMN     "inspectionDueAt" TIMESTAMP(3),
  ADD COLUMN     "insuranceDueAt" TIMESTAMP(3),
  ADD COLUMN     "cascoDueAt" TIMESTAMP(3),
  ADD COLUMN     "lastServiceAt" TIMESTAMP(3),
  ADD COLUMN     "lastServiceKm" INTEGER,
  ADD COLUMN     "serviceIntervalKm" INTEGER NOT NULL DEFAULT 15000,
  ADD COLUMN     "serviceIntervalDays" INTEGER,
  ADD COLUMN     "odometerKm" INTEGER,
  ADD COLUMN     "odometerUpdatedAt" TIMESTAMP(3),
  ADD COLUMN     "odometerSource" "OdometerSource" NOT NULL DEFAULT 'MANUAL';

-- Optional unique constraint for VIN (Postgres allows multiple NULLs)
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

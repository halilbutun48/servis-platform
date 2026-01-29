-- M14: Vehicle -> Driver bind (default driver on vehicle)

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "driverId" INTEGER;

-- Index
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- Foreign key
ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

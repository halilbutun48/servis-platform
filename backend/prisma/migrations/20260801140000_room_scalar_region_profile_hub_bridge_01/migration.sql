ALTER TABLE "Room"
ADD COLUMN "regionId" INTEGER,
ADD COLUMN "district" TEXT,
ADD COLUMN "addressLine" TEXT,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "hubLat" DOUBLE PRECISION,
ADD COLUMN "hubLng" DOUBLE PRECISION;

ALTER TABLE "Room"
ADD CONSTRAINT "Room_regionId_fkey"
FOREIGN KEY ("regionId")
REFERENCES "Region"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Room_regionId_idx"
ON "Room"("regionId");

CREATE INDEX "Room_district_idx"
ON "Room"("district");

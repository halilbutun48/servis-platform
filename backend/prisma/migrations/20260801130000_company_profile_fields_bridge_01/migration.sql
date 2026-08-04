ALTER TABLE "Company"
ADD COLUMN "district" TEXT,
ADD COLUMN "legalName" TEXT,
ADD COLUMN "taxNo" TEXT,
ADD COLUMN "taxOffice" TEXT,
ADD COLUMN "addressLine" TEXT,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "hubLat" DOUBLE PRECISION,
ADD COLUMN "hubLng" DOUBLE PRECISION;

CREATE INDEX "Company_district_idx"
ON "Company"("district");

CREATE INDEX "Company_regionId_kind_idx"
ON "Company"("regionId", "kind");
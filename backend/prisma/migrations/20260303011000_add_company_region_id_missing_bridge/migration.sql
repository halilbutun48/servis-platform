ALTER TABLE "Company"
ADD COLUMN "regionId" INTEGER;

ALTER TABLE "Company"
ADD CONSTRAINT "Company_regionId_fkey"
FOREIGN KEY ("regionId")
REFERENCES "Region"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Company_regionId_idx"
ON "Company"("regionId");

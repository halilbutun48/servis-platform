ALTER TABLE "Vehicle" ADD COLUMN "hgsClass" INTEGER;

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_hgsClass_range_check"
CHECK ("hgsClass" IS NULL OR ("hgsClass" >= 1 AND "hgsClass" <= 6));

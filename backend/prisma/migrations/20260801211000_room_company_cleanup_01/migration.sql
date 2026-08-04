ALTER TABLE "Room"
  DROP CONSTRAINT "Room_companyId_fkey";

DROP INDEX "Room_companyId_idx";

ALTER TABLE "Room"
  DROP COLUMN "companyId";

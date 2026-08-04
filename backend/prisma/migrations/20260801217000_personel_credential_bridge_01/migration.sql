DROP INDEX "PersonelCredential_personelId_status_idx";

DROP INDEX "PersonelCredential_type_idx";

ALTER TABLE "PersonelCredential"
  DROP COLUMN "createdAt";

ALTER TABLE "PersonelCredential"
  DROP COLUMN "updatedAt";

ALTER TABLE "PersonelCredential"
  ADD CONSTRAINT "PersonelCredential_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PersonelCredential_personelId_idx"
  ON "PersonelCredential"("personelId");

CREATE INDEX "PersonelCredential_status_idx"
  ON "PersonelCredential"("status");

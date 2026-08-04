ALTER TABLE "Personel"
ADD COLUMN "kind" "PersonelKind" NOT NULL DEFAULT 'PERSONEL',
ADD COLUMN "phone" TEXT,
ADD COLUMN "homeAddress" TEXT,
ALTER COLUMN "homeLat" DROP NOT NULL,
ALTER COLUMN "homeLng" DROP NOT NULL,
ADD COLUMN "geoStatus" "GeoStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
ADD COLUMN "geoManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "geoNote" TEXT,
ADD COLUMN "geoUpdatedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;

CREATE INDEX "Personel_companyId_kind_idx" ON "Personel"("companyId", "kind");
CREATE UNIQUE INDEX "Personel_companyId_phone_key" ON "Personel"("companyId", "phone");

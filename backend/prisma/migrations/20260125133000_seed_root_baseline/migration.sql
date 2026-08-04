-- Seed root baseline migration for fresh installs.
-- Creates the earliest missing seed-root enums and tables before the first historical migration.

CREATE TYPE "CompanyKind" AS ENUM ('COMPANY', 'SCHOOL', 'ORGANIZATION');
CREATE TYPE "PersonelKind" AS ENUM ('PERSONEL', 'STUDENT');
CREATE TYPE "GeoStatus" AS ENUM ('OK', 'NEEDS_REVIEW', 'FAILED');

CREATE TABLE "Region" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

CREATE TABLE "ParentChild" (
  "id" SERIAL NOT NULL,
  "parentUserId" INTEGER NOT NULL,
  "personelId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentChild_parentUserId_personelId_key" ON "ParentChild"("parentUserId", "personelId");
CREATE INDEX "ParentChild_personelId_idx" ON "ParentChild"("personelId");

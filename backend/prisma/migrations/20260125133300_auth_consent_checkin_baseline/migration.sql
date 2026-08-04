-- Batch 4 auth / consent / check-in baseline.
-- External parent foreign keys are deferred until their owner tables exist.

CREATE TYPE "CredentialType" AS ENUM ('QR', 'NFC');
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "CheckinEventType" AS ENUM ('BOARD', 'ALIGHT');
CREATE TYPE "CheckinSource" AS ENUM ('QR', 'NFC', 'MANUAL');

CREATE TABLE "RefreshSession" (
  "id" SERIAL NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "deviceId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedById" INTEGER,
  "ip" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_userId_createdAt_idx" ON "RefreshSession"("userId", "createdAt");
CREATE INDEX "RefreshSession_deviceId_idx" ON "RefreshSession"("deviceId");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");
ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_replacedById_fkey"
  FOREIGN KEY ("replacedById") REFERENCES "RefreshSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PersonelCredential" (
  "id" SERIAL NOT NULL,
  "personelId" INTEGER NOT NULL,
  "type" "CredentialType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PersonelCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonelCredential_tokenHash_key" ON "PersonelCredential"("tokenHash");
CREATE INDEX "PersonelCredential_personelId_status_idx" ON "PersonelCredential"("personelId", "status");
CREATE INDEX "PersonelCredential_type_idx" ON "PersonelCredential"("type");

CREATE TABLE "CheckinEvent" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "personelId" INTEGER NOT NULL,
  "eventType" "CheckinEventType" NOT NULL,
  "source" "CheckinSource" NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CheckinEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckinEvent_shiftId_at_idx" ON "CheckinEvent"("shiftId", "at");
CREATE INDEX "CheckinEvent_personelId_at_idx" ON "CheckinEvent"("personelId", "at");
CREATE INDEX "CheckinEvent_eventType_at_idx" ON "CheckinEvent"("eventType", "at");

CREATE TABLE "Consent" (
  "id" SERIAL NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER NOT NULL,
  "role" TEXT,
  "docKey" TEXT NOT NULL,
  "docVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ip" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Consent_userId_docKey_docVersion_key" ON "Consent"("userId", "docKey", "docVersion");
CREATE INDEX "Consent_userId_createdAt_idx" ON "Consent"("userId", "createdAt");
CREATE INDEX "Consent_docKey_docVersion_idx" ON "Consent"("docKey", "docVersion");

CREATE TABLE "ParentInvite" (
  "id" SERIAL NOT NULL,
  "companyId" INTEGER NOT NULL,
  "childPersonelId" INTEGER NOT NULL,
  "parentFullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "consumedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ParentInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentInvite_tokenHash_key" ON "ParentInvite"("tokenHash");
CREATE INDEX "ParentInvite_companyId_createdAt_idx" ON "ParentInvite"("companyId", "createdAt");
CREATE INDEX "ParentInvite_childPersonelId_createdAt_idx" ON "ParentInvite"("childPersonelId", "createdAt");
CREATE INDEX "ParentInvite_email_idx" ON "ParentInvite"("email");

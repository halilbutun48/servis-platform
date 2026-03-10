-- Step 2 / M43: Google Auth + Invite Gate

DO $$ BEGIN
  CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InviteType" AS ENUM ('PERSONEL_INVITE', 'DRIVER_INVITE', 'ROOM_USER_INVITE', 'COMPANY_USER_INVITE', 'PARENT_INVITE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "UserIdentity" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" "IdentityProvider" NOT NULL,
  "providerSub" TEXT NOT NULL,
  "email" TEXT,
  "emailVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserIdentity_provider_providerSub_key" ON "UserIdentity"("provider", "providerSub");
CREATE INDEX IF NOT EXISTS "UserIdentity_userId_idx" ON "UserIdentity"("userId");
CREATE INDEX IF NOT EXISTS "UserIdentity_email_idx" ON "UserIdentity"("email");

CREATE TABLE IF NOT EXISTS "Invite" (
  "id" SERIAL NOT NULL,
  "type" "InviteType" NOT NULL,
  "role" "Role" NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "fullName" TEXT,
  "companyId" INTEGER,
  "roomId" INTEGER,
  "personelId" INTEGER,
  "childPersonelId" INTEGER,
  "driverId" INTEGER,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER,
  "consumedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invite_tokenHash_key" ON "Invite"("tokenHash");
CREATE INDEX IF NOT EXISTS "Invite_email_createdAt_idx" ON "Invite"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_companyId_createdAt_idx" ON "Invite"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_roomId_createdAt_idx" ON "Invite"("roomId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_personelId_createdAt_idx" ON "Invite"("personelId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_childPersonelId_createdAt_idx" ON "Invite"("childPersonelId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_driverId_createdAt_idx" ON "Invite"("driverId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invite_expiresAt_idx" ON "Invite"("expiresAt");
CREATE INDEX IF NOT EXISTS "Invite_revokedAt_idx" ON "Invite"("revokedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'UserIdentity_userId_fkey') THEN
    ALTER TABLE "UserIdentity"
      ADD CONSTRAINT "UserIdentity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_companyId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_roomId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_roomId_fkey"
      FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_personelId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_personelId_fkey"
      FOREIGN KEY ("personelId") REFERENCES "Personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_childPersonelId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_childPersonelId_fkey"
      FOREIGN KEY ("childPersonelId") REFERENCES "Personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_driverId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_createdByUserId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_consumedByUserId_fkey') THEN
    ALTER TABLE "Invite"
      ADD CONSTRAINT "Invite_consumedByUserId_fkey"
      FOREIGN KEY ("consumedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

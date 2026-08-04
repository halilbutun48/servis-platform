ALTER TABLE "User"
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "deviceBoundAt" TIMESTAMP(3),
ADD COLUMN "deviceLastSeenAt" TIMESTAMP(3),
ADD COLUMN "totpSecretBase32" TEXT,
ADD COLUMN "totpPendingSecretBase32" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpLastVerifiedAt" TIMESTAMP(3);

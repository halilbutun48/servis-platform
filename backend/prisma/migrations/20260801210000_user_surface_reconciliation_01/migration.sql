ALTER TABLE "Notification"
  ADD COLUMN "userId" INTEGER;

CREATE INDEX "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Consent"
  ALTER COLUMN "role" TYPE "Role"
  USING "role"::"Role";

ALTER TABLE "Consent"
  ADD CONSTRAINT "Consent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

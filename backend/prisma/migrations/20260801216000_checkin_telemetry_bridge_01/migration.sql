DROP INDEX "CheckinEvent_eventType_at_idx";

ALTER TABLE "CheckinEvent"
  DROP COLUMN "createdAt";

CREATE INDEX "CheckinEvent_shiftId_personelId_eventType_at_idx"
  ON "CheckinEvent"("shiftId", "personelId", "eventType", "at");

ALTER TABLE "CheckinEvent"
  ADD CONSTRAINT "CheckinEvent_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckinEvent"
  ADD CONSTRAINT "CheckinEvent_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RoomCostEntry batch draft identity is nullable so all existing rows remain unbatched.
ALTER TABLE "RoomCostEntry"
  ADD COLUMN "draftBatchId" UUID;

CREATE INDEX "RoomCostEntry_roomId_createdByUserId_draftBatchId_idx"
  ON "RoomCostEntry"("roomId", "createdByUserId", "draftBatchId");

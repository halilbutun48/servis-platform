ALTER TABLE "Shift"
  ADD COLUMN "splitRootId" INTEGER,
  ADD COLUMN "splitGroupKey" TEXT,
  ADD COLUMN "splitIndex" INTEGER,
  ADD COLUMN "splitTotal" INTEGER;

ALTER TABLE "Shift"
  ADD CONSTRAINT "Shift_splitRootId_fkey"
  FOREIGN KEY ("splitRootId") REFERENCES "Shift"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Shift_splitRootId_idx"
ON "Shift"("splitRootId");

CREATE INDEX "Shift_splitGroupKey_idx"
ON "Shift"("splitGroupKey");

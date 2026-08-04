ALTER TABLE "Shift"
  ADD COLUMN "agreementId" INTEGER,
  ADD COLUMN "organizationPlanId" INTEGER;

ALTER TABLE "Shift"
  ADD CONSTRAINT "Shift_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Shift"
  ADD CONSTRAINT "Shift_organizationPlanId_fkey"
  FOREIGN KEY ("organizationPlanId") REFERENCES "OrganizationPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Shift_agreementId_idx"
ON "Shift"("agreementId");

CREATE INDEX "Shift_organizationPlanId_idx"
ON "Shift"("organizationPlanId");

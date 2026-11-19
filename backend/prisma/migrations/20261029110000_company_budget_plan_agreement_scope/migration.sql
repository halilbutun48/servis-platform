CREATE TABLE "CompanyBudgetPlanAgreement" (
    "id" SERIAL NOT NULL,
    "budgetPlanId" INTEGER NOT NULL,
    "agreementId" INTEGER NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBudgetPlanAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyBudgetPlanAgreement_budgetPlanId_agreementId_key"
ON "CompanyBudgetPlanAgreement"("budgetPlanId", "agreementId");

CREATE INDEX "CompanyBudgetPlanAgreement_agreementId_idx"
ON "CompanyBudgetPlanAgreement"("agreementId");

CREATE INDEX "CompanyBudgetPlanAgreement_budgetPlanId_createdAt_idx"
ON "CompanyBudgetPlanAgreement"("budgetPlanId", "createdAt");

ALTER TABLE "CompanyBudgetPlanAgreement"
ADD CONSTRAINT "CompanyBudgetPlanAgreement_budgetPlanId_fkey"
FOREIGN KEY ("budgetPlanId") REFERENCES "CompanyBudgetPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyBudgetPlanAgreement"
ADD CONSTRAINT "CompanyBudgetPlanAgreement_agreementId_fkey"
FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyBudgetPlanAgreement"
ADD CONSTRAINT "CompanyBudgetPlanAgreement_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationPlan"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "OrganizationStop"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "DriverPenalty"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "CompanyBudgetPlan"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "RoomQuoteFloorDraft"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Agreement"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "CommissionRule"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "PaymentAccount"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "CommercialSource"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "SettlementPlan"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "SettlementEntry"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "GpsDevice"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "RouteLearned"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "UserIdentity"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Consent"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "Company"
ADD COLUMN "kind" "CompanyKind" NOT NULL DEFAULT 'COMPANY';

CREATE INDEX "Company_kind_idx" ON "Company"("kind");
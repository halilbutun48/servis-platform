CREATE TYPE "GuidedBatchRequestStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "GuidedBatchRequest" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER NOT NULL,
    "actorRole" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "GuidedBatchRequestStatus" NOT NULL DEFAULT 'PROCESSING',
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "GuidedBatchRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuidedBatchRequest_actorUserId_companyId_idempotencyKey_key"
    ON "GuidedBatchRequest"("actorUserId", "companyId", "idempotencyKey");

CREATE INDEX "GuidedBatchRequest_companyId_createdAt_idx"
    ON "GuidedBatchRequest"("companyId", "createdAt");

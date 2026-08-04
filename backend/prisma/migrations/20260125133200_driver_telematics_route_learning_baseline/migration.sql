-- Batch 3 driver / telematics / route learning baseline.
-- Parent-table foreign keys are deferred until later migrations introduce those owners.

CREATE TYPE "GpsDeviceStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "PenaltyType" AS ENUM ('NO_SHOW');
CREATE TYPE "PenaltyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

CREATE TABLE "DriverPenalty" (
  "id" SERIAL NOT NULL,
  "driverId" INTEGER NOT NULL,
  "shiftId" INTEGER,
  "type" "PenaltyType" NOT NULL,
  "status" "PenaltyStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DriverPenalty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverPenalty_driverId_idx" ON "DriverPenalty"("driverId");
CREATE INDEX "DriverPenalty_shiftId_idx" ON "DriverPenalty"("shiftId");
CREATE INDEX "DriverPenalty_status_idx" ON "DriverPenalty"("status");
CREATE INDEX "DriverPenalty_type_idx" ON "DriverPenalty"("type");
CREATE INDEX "DriverPenalty_endsAt_idx" ON "DriverPenalty"("endsAt");

CREATE TABLE "GpsDevice" (
  "id" SERIAL NOT NULL,
  "vehicleId" INTEGER NOT NULL,
  "vendor" TEXT NOT NULL,
  "serial" TEXT NOT NULL,
  "label" TEXT,
  "status" "GpsDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
  "authTokenHash" TEXT NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "lastIngestAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GpsDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GpsDevice_authTokenHash_key" ON "GpsDevice"("authTokenHash");
CREATE UNIQUE INDEX "GpsDevice_vendor_serial_key" ON "GpsDevice"("vendor", "serial");
CREATE INDEX "GpsDevice_vehicleId_status_idx" ON "GpsDevice"("vehicleId", "status");
CREATE INDEX "GpsDevice_serial_idx" ON "GpsDevice"("serial");

CREATE TABLE "RouteLearnSample" (
  "id" SERIAL NOT NULL,
  "routeKey" TEXT NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "vehicleId" INTEGER NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "polylineMatched" TEXT NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RouteLearnSample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RouteLearnSample_shiftId_key" ON "RouteLearnSample"("shiftId");
CREATE INDEX "RouteLearnSample_routeKey_createdAt_idx" ON "RouteLearnSample"("routeKey", "createdAt");
CREATE INDEX "RouteLearnSample_vehicleId_startAt_idx" ON "RouteLearnSample"("vehicleId", "startAt");

CREATE TABLE "RouteLearned" (
  "routeKey" TEXT NOT NULL,
  "polylineCanonical" TEXT NOT NULL,
  "distanceKmLearned" DOUBLE PRECISION NOT NULL,
  "durationMinLearned" INTEGER NOT NULL,
  "sampleCount" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RouteLearned_pkey" PRIMARY KEY ("routeKey")
);

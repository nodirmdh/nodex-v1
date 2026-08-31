ALTER TABLE "TripTimelineEvent" ADD COLUMN IF NOT EXISTS "actorUserId" TEXT;

CREATE TABLE IF NOT EXISTS "TripStartPin" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeLength" INTEGER NOT NULL DEFAULT 4,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripStartPin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripLocationPoint" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "bookingId" TEXT,
  "actorType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "latitude" DECIMAL(9,6) NOT NULL,
  "longitude" DECIMAL(9,6) NOT NULL,
  "accuracyMeters" DECIMAL(8,2),
  "speedMetersPerSecond" DECIMAL(8,2),
  "headingDegrees" DECIMAL(6,2),
  "source" TEXT NOT NULL,
  "reason" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripLocationPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripEtaSnapshot" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "driverEtaToPickupSeconds" INTEGER,
  "driverEtaToDropoffSeconds" INTEGER,
  "delaySeconds" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "source" TEXT NOT NULL DEFAULT 'MANUAL_MAPS_ADAPTER',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripEtaSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TripTimelineEvent_actorUserId_createdAt_idx" ON "TripTimelineEvent"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripStartPin_tripId_status_expiresAt_idx" ON "TripStartPin"("tripId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "TripStartPin_bookingId_status_expiresAt_idx" ON "TripStartPin"("bookingId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "TripStartPin_verifiedById_verifiedAt_idx" ON "TripStartPin"("verifiedById", "verifiedAt");
CREATE INDEX IF NOT EXISTS "TripLocationPoint_tripId_recordedAt_idx" ON "TripLocationPoint"("tripId", "recordedAt");
CREATE INDEX IF NOT EXISTS "TripLocationPoint_bookingId_recordedAt_idx" ON "TripLocationPoint"("bookingId", "recordedAt");
CREATE INDEX IF NOT EXISTS "TripLocationPoint_actorUserId_actorType_recordedAt_idx" ON "TripLocationPoint"("actorUserId", "actorType", "recordedAt");
CREATE INDEX IF NOT EXISTS "TripLocationPoint_source_recordedAt_idx" ON "TripLocationPoint"("source", "recordedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TripEtaSnapshot_tripId_key" ON "TripEtaSnapshot"("tripId");
CREATE INDEX IF NOT EXISTS "TripEtaSnapshot_status_updatedAt_idx" ON "TripEtaSnapshot"("status", "updatedAt");

ALTER TABLE "TripStartPin" ADD CONSTRAINT "TripStartPin_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripStartPin" ADD CONSTRAINT "TripStartPin_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLocationPoint" ADD CONSTRAINT "TripLocationPoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLocationPoint" ADD CONSTRAINT "TripLocationPoint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripEtaSnapshot" ADD CONSTRAINT "TripEtaSnapshot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

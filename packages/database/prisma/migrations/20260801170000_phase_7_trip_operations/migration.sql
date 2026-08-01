ALTER TYPE "SeatStatus" ADD VALUE IF NOT EXISTS 'OCCUPIED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW_CLIENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW_DRIVER';
ALTER TYPE "BookingSeatStatus" ADD VALUE IF NOT EXISTS 'OCCUPIED';

CREATE TABLE IF NOT EXISTS "BoardingCode" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeLength" INTEGER NOT NULL DEFAULT 6,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BoardingCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BoardingAttempt" (
  "id" TEXT NOT NULL,
  "boardingCodeId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripOperationEvent" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripOperationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripStatusTransition" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "fromStatus" "TripStatus" NOT NULL,
  "toStatus" "TripStatus" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripStatusTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingOperationEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingOperationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoShowRecord" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "bookingId" TEXT,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoShowRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripCancellation" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripCancellation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TripCompletionSummary" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "completedByUserId" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "boardedCount" INTEGER NOT NULL DEFAULT 0,
  "noShowClientCount" INTEGER NOT NULL DEFAULT 0,
  "cancelledCount" INTEGER NOT NULL DEFAULT 0,
  "totalBookingsCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "TripCompletionSummary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BoardingCode_bookingId_status_expiresAt_idx" ON "BoardingCode"("bookingId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "BoardingAttempt_boardingCodeId_createdAt_idx" ON "BoardingAttempt"("boardingCodeId", "createdAt");
CREATE INDEX IF NOT EXISTS "BoardingAttempt_actorUserId_createdAt_idx" ON "BoardingAttempt"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripOperationEvent_tripId_createdAt_idx" ON "TripOperationEvent"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripOperationEvent_type_createdAt_idx" ON "TripOperationEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "TripStatusTransition_tripId_createdAt_idx" ON "TripStatusTransition"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "TripStatusTransition_toStatus_createdAt_idx" ON "TripStatusTransition"("toStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingOperationEvent_bookingId_createdAt_idx" ON "BookingOperationEvent"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingOperationEvent_type_createdAt_idx" ON "BookingOperationEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "NoShowRecord_tripId_createdAt_idx" ON "NoShowRecord"("tripId", "createdAt");
CREATE INDEX IF NOT EXISTS "NoShowRecord_bookingId_createdAt_idx" ON "NoShowRecord"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "NoShowRecord_type_createdAt_idx" ON "NoShowRecord"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "TripCancellation_tripId_createdAt_idx" ON "TripCancellation"("tripId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TripCompletionSummary_tripId_key" ON "TripCompletionSummary"("tripId");
CREATE INDEX IF NOT EXISTS "TripCompletionSummary_completedAt_idx" ON "TripCompletionSummary"("completedAt");

ALTER TABLE "BoardingCode" ADD CONSTRAINT "BoardingCode_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardingAttempt" ADD CONSTRAINT "BoardingAttempt_boardingCodeId_fkey" FOREIGN KEY ("boardingCodeId") REFERENCES "BoardingCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardingAttempt" ADD CONSTRAINT "BoardingAttempt_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripOperationEvent" ADD CONSTRAINT "TripOperationEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripOperationEvent" ADD CONSTRAINT "TripOperationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripStatusTransition" ADD CONSTRAINT "TripStatusTransition_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripStatusTransition" ADD CONSTRAINT "TripStatusTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingOperationEvent" ADD CONSTRAINT "BookingOperationEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingOperationEvent" ADD CONSTRAINT "BookingOperationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NoShowRecord" ADD CONSTRAINT "NoShowRecord_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoShowRecord" ADD CONSTRAINT "NoShowRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoShowRecord" ADD CONSTRAINT "NoShowRecord_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripCancellation" ADD CONSTRAINT "TripCancellation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripCancellation" ADD CONSTRAINT "TripCancellation_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripCompletionSummary" ADD CONSTRAINT "TripCompletionSummary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripCompletionSummary" ADD CONSTRAINT "TripCompletionSummary_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

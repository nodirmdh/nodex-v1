ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'BOARDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

DO $$ BEGIN
  CREATE TYPE "BookingType" AS ENUM ('SEAT', 'MULTI_SEAT', 'WHOLE_CAR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeatHoldStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'EXPIRED', 'RELEASED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MANUAL_TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AgeCategory" AS ENUM ('ADULT', 'CHILD', 'INFANT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookingSeatStatus" AS ENUM ('HELD', 'BOOKED', 'RELEASED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeatType" AS ENUM ('FRONT', 'REAR', 'STANDARD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BaggageType" AS ENUM ('CABIN_BAG', 'SUITCASE', 'OVERSIZED', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TripSeat"
  ADD COLUMN IF NOT EXISTS "row" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "column" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "seatType" "SeatType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "priceMinor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "type" "BookingType" NOT NULL DEFAULT 'SEAT',
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS "passengerCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "pickupPointId" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationPickupPointId" TEXT,
  ADD COLUMN IF NOT EXISTS "clientComment" TEXT,
  ADD COLUMN IF NOT EXISTS "pricingSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "tripSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "termsSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "SeatHold"
  ADD COLUMN IF NOT EXISTS "tripId" TEXT,
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "SeatHold" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "SeatHold" ALTER COLUMN "status" TYPE "SeatHoldStatus" USING "status"::"SeatHoldStatus";
ALTER TABLE "SeatHold" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
UPDATE "SeatHold" SET "idempotencyKey" = "id" WHERE "idempotencyKey" IS NULL;
UPDATE "SeatHold" SET "tripId" = "Booking"."tripId"
FROM "Booking"
WHERE "SeatHold"."bookingId" = "Booking"."id" AND "SeatHold"."tripId" IS NULL;
ALTER TABLE "SeatHold" ALTER COLUMN "idempotencyKey" SET NOT NULL;
ALTER TABLE "SeatHold" ALTER COLUMN "tripId" SET NOT NULL;

ALTER TABLE "SeatHoldItem"
  ADD COLUMN IF NOT EXISTS "tripSeatId" TEXT;

CREATE TABLE IF NOT EXISTS "BookingPassenger" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "phone" TEXT,
  "ageCategory" "AgeCategory" NOT NULL DEFAULT 'ADULT',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "seatKey" TEXT,
  "notes" TEXT,
  CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingSeat" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "tripSeatSnapshotId" TEXT,
  "tripSeatId" TEXT,
  "seatKey" TEXT NOT NULL,
  "priceMinor" BIGINT NOT NULL DEFAULT 0,
  "status" "BookingSeatStatus" NOT NULL DEFAULT 'HELD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingBaggage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "type" "BaggageType" NOT NULL DEFAULT 'SUITCASE',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "weightKg" DECIMAL(5,2),
  "notes" TEXT,
  CONSTRAINT "BookingBaggage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingTimelineEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingCancellation" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TripSeat_tripId_status_idx" ON "TripSeat"("tripId", "status");
CREATE INDEX IF NOT EXISTS "Booking_clientId_status_createdAt_idx" ON "Booking"("clientId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_tripId_status_idx" ON "Booking"("tripId", "status");
CREATE INDEX IF NOT EXISTS "Booking_paymentMethod_status_idx" ON "Booking"("paymentMethod", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "SeatHold_tripId_idempotencyKey_key" ON "SeatHold"("tripId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "SeatHold_status_expiresAt_idx" ON "SeatHold"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "SeatHold_clientId_status_createdAt_idx" ON "SeatHold"("clientId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SeatHold_bookingId_idx" ON "SeatHold"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "SeatHoldItem_seatHoldId_seatKey_key" ON "SeatHoldItem"("seatHoldId", "seatKey");
CREATE INDEX IF NOT EXISTS "SeatHoldItem_seatKey_idx" ON "SeatHoldItem"("seatKey");
CREATE INDEX IF NOT EXISTS "BookingPassenger_bookingId_idx" ON "BookingPassenger"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "BookingSeat_bookingId_seatKey_key" ON "BookingSeat"("bookingId", "seatKey");
CREATE INDEX IF NOT EXISTS "BookingSeat_seatKey_status_idx" ON "BookingSeat"("seatKey", "status");
CREATE INDEX IF NOT EXISTS "BookingBaggage_bookingId_idx" ON "BookingBaggage"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingTimelineEvent_bookingId_createdAt_idx" ON "BookingTimelineEvent"("bookingId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingTimelineEvent_type_createdAt_idx" ON "BookingTimelineEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingCancellation_bookingId_createdAt_idx" ON "BookingCancellation"("bookingId", "createdAt");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_destinationPickupPointId_fkey" FOREIGN KEY ("destinationPickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatHold" ADD CONSTRAINT "SeatHold_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeatHoldItem" ADD CONSTRAINT "SeatHoldItem_tripSeatId_fkey" FOREIGN KEY ("tripSeatId") REFERENCES "TripSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_tripSeatId_fkey" FOREIGN KEY ("tripSeatId") REFERENCES "TripSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingBaggage" ADD CONSTRAINT "BookingBaggage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingTimelineEvent" ADD CONSTRAINT "BookingTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingCancellation" ADD CONSTRAINT "BookingCancellation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "travelPreferences" JSONB,
  ADD COLUMN IF NOT EXISTS "pickupLocation" JSONB,
  ADD COLUMN IF NOT EXISTS "requestedDepartureAtUtc" TIMESTAMP(3);
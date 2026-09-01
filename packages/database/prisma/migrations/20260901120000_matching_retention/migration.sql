ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WAITLIST_MATCH_FOUND';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FAVORITE_DRIVER_ROUTE_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RETURN_ROUTE_MATCH_AVAILABLE';

CREATE TYPE "WaitlistEntryStatus" AS ENUM ('ACTIVE', 'MATCHED', 'BOOKED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "WaitlistEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "destinationCityId" TEXT NOT NULL,
  "requestedDate" TIMESTAMP(3) NOT NULL,
  "preferredDepartureAtUtc" TIMESTAMP(3),
  "timeWindowHours" INTEGER,
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "wholeCar" BOOLEAN NOT NULL DEFAULT false,
  "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "matchedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaitlistMatch" (
  "id" TEXT NOT NULL,
  "waitlistId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "actedAt" TIMESTAMP(3),
  CONSTRAINT "WaitlistMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FavoriteDriver" (
  "id" TEXT NOT NULL,
  "clientUserId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteDriver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedRoute" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "destinationCityId" TEXT NOT NULL,
  "preferredDepartureWindow" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnRouteRelation" (
  "id" TEXT NOT NULL,
  "originalTripId" TEXT NOT NULL,
  "returnTripId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRouteRelation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaitlistEntry_userId_status_createdAt_idx" ON "WaitlistEntry"("userId", "status", "createdAt");
CREATE INDEX "WaitlistEntry_originCityId_destinationCityId_status_requestedDate_idx" ON "WaitlistEntry"("originCityId", "destinationCityId", "status", "requestedDate");
CREATE INDEX "WaitlistEntry_status_expiresAt_idx" ON "WaitlistEntry"("status", "expiresAt");
CREATE UNIQUE INDEX "WaitlistMatch_waitlistId_tripId_key" ON "WaitlistMatch"("waitlistId", "tripId");
CREATE INDEX "WaitlistMatch_tripId_createdAt_idx" ON "WaitlistMatch"("tripId", "createdAt");
CREATE INDEX "WaitlistMatch_waitlistId_createdAt_idx" ON "WaitlistMatch"("waitlistId", "createdAt");
CREATE UNIQUE INDEX "FavoriteDriver_clientUserId_driverId_key" ON "FavoriteDriver"("clientUserId", "driverId");
CREATE INDEX "FavoriteDriver_driverId_createdAt_idx" ON "FavoriteDriver"("driverId", "createdAt");
CREATE UNIQUE INDEX "SavedRoute_userId_originCityId_destinationCityId_preferredDepartureWindow_key" ON "SavedRoute"("userId", "originCityId", "destinationCityId", "preferredDepartureWindow");
CREATE INDEX "SavedRoute_originCityId_destinationCityId_idx" ON "SavedRoute"("originCityId", "destinationCityId");
CREATE UNIQUE INDEX "ReturnRouteRelation_returnTripId_key" ON "ReturnRouteRelation"("returnTripId");
CREATE INDEX "ReturnRouteRelation_originalTripId_createdAt_idx" ON "ReturnRouteRelation"("originalTripId", "createdAt");

ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WaitlistMatch" ADD CONSTRAINT "WaitlistMatch_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistMatch" ADD CONSTRAINT "WaitlistMatch_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteDriver" ADD CONSTRAINT "FavoriteDriver_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteDriver" ADD CONSTRAINT "FavoriteDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRouteRelation" ADD CONSTRAINT "ReturnRouteRelation_originalTripId_fkey" FOREIGN KEY ("originalTripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRouteRelation" ADD CONSTRAINT "ReturnRouteRelation_returnTripId_fkey" FOREIGN KEY ("returnTripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
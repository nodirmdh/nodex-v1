ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED';
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

CREATE TYPE "PickupPointType" AS ENUM ('CITY_CENTER', 'BUS_STATION', 'RAILWAY_STATION', 'AIRPORT', 'CUSTOM');
CREATE TYPE "TripStopType" AS ENUM ('ORIGIN', 'INTERMEDIATE', 'DESTINATION');

CREATE TABLE "Region" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "City" (
  "id" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameRu" TEXT NOT NULL,
  "nameUz" TEXT NOT NULL,
  "nameKaa" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isLaunchCity" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PickupPoint" (
  "id" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "type" "PickupPointType" NOT NULL DEFAULT 'CUSTOM',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PickupPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Route" (
  "id" TEXT NOT NULL,
  "originCityId" TEXT NOT NULL,
  "destinationCityId" TEXT NOT NULL,
  "distanceKm" INTEGER,
  "estimatedDurationMinutes" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouteStop" (
  "id" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Trip"
  ADD COLUMN "routeId" TEXT,
  ADD COLUMN "originCityId" TEXT,
  ADD COLUMN "destinationCityId" TEXT,
  ADD COLUMN "arrivalEstimateAtUtc" TIMESTAMP(3),
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  ADD COLUMN "passengerSeatCapacity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "availableSeatCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "pricePerSeatMinor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "wholeCarPriceMinor" BIGINT,
  ADD COLUMN "parcelSupported" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "parcelPriceMinor" BIGINT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UZS',
  ADD COLUMN "luggageRules" TEXT,
  ADD COLUMN "comment" TEXT,
  ADD COLUMN "publicationValidationSnapshot" JSONB,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "unpublishedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "blockReason" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "TripStop" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "pickupPointId" TEXT,
  "order" INTEGER NOT NULL,
  "type" "TripStopType" NOT NULL,
  "plannedAtUtc" TIMESTAMP(3),
  "label" TEXT,
  "address" TEXT,
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripSeatSnapshot" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "passengerSeatCapacity" INTEGER NOT NULL,
  "availableSeatCount" INTEGER NOT NULL,
  "seatLabels" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripSeatSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripModerationEvent" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripTimelineEvent" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TripTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");
CREATE INDEX "Region_countryCode_isActive_sortOrder_idx" ON "Region"("countryCode", "isActive", "sortOrder");

CREATE UNIQUE INDEX "City_code_key" ON "City"("code");
CREATE INDEX "City_regionId_isActive_sortOrder_idx" ON "City"("regionId", "isActive", "sortOrder");
CREATE INDEX "City_isLaunchCity_isActive_sortOrder_idx" ON "City"("isLaunchCity", "isActive", "sortOrder");

CREATE UNIQUE INDEX "PickupPoint_cityId_name_key" ON "PickupPoint"("cityId", "name");
CREATE INDEX "PickupPoint_cityId_isActive_sortOrder_idx" ON "PickupPoint"("cityId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "Route_originCityId_destinationCityId_key" ON "Route"("originCityId", "destinationCityId");
CREATE INDEX "Route_isActive_idx" ON "Route"("isActive");

CREATE UNIQUE INDEX "RouteStop_routeId_order_key" ON "RouteStop"("routeId", "order");
CREATE INDEX "RouteStop_cityId_idx" ON "RouteStop"("cityId");

CREATE INDEX "Trip_driverProfileId_status_departureAtUtc_idx" ON "Trip"("driverProfileId", "status", "departureAtUtc");
CREATE INDEX "Trip_vehicleId_status_departureAtUtc_idx" ON "Trip"("vehicleId", "status", "departureAtUtc");
CREATE INDEX "Trip_originCityId_destinationCityId_departureAtUtc_idx" ON "Trip"("originCityId", "destinationCityId", "departureAtUtc");
CREATE INDEX "Trip_status_departureAtUtc_idx" ON "Trip"("status", "departureAtUtc");
CREATE INDEX "Trip_routeId_idx" ON "Trip"("routeId");

CREATE UNIQUE INDEX "TripStop_tripId_order_key" ON "TripStop"("tripId", "order");
CREATE INDEX "TripStop_cityId_idx" ON "TripStop"("cityId");
CREATE INDEX "TripStop_pickupPointId_idx" ON "TripStop"("pickupPointId");

CREATE UNIQUE INDEX "TripSeatSnapshot_tripId_key" ON "TripSeatSnapshot"("tripId");

CREATE INDEX "TripModerationEvent_tripId_createdAt_idx" ON "TripModerationEvent"("tripId", "createdAt");
CREATE INDEX "TripModerationEvent_action_createdAt_idx" ON "TripModerationEvent"("action", "createdAt");

CREATE INDEX "TripTimelineEvent_tripId_createdAt_idx" ON "TripTimelineEvent"("tripId", "createdAt");
CREATE INDEX "TripTimelineEvent_type_createdAt_idx" ON "TripTimelineEvent"("type", "createdAt");

ALTER TABLE "City" ADD CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Route" ADD CONSTRAINT "Route_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Route" ADD CONSTRAINT "Route_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripSeatSnapshot" ADD CONSTRAINT "TripSeatSnapshot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripModerationEvent" ADD CONSTRAINT "TripModerationEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripTimelineEvent" ADD CONSTRAINT "TripTimelineEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

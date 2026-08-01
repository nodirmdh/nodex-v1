CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "originCityId" TEXT,
    "destinationCityId" TEXT,
    "tripId" TEXT,
    "queryDate" TIMESTAMP(3),
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "sort" TEXT,
    "filtersJson" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "selectedResultRank" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'SEARCH_PERFORMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt");
CREATE INDEX "SearchEvent_originCityId_destinationCityId_createdAt_idx" ON "SearchEvent"("originCityId", "destinationCityId", "createdAt");
CREATE INDEX "SearchEvent_tripId_createdAt_idx" ON "SearchEvent"("tripId", "createdAt");
CREATE INDEX "SearchEvent_userId_createdAt_idx" ON "SearchEvent"("userId", "createdAt");

ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

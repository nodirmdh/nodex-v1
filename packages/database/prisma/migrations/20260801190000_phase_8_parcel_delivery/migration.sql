CREATE TYPE "ParcelStatus" AS ENUM (
  'DRAFT',
  'CREATED',
  'PENDING_DRIVER_ACCEPTANCE',
  'ACCEPTED',
  'HANDED_TO_DRIVER',
  'IN_TRANSIT',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'CANCELLED_BY_SENDER',
  'CANCELLED_BY_DRIVER',
  'CANCELLED_BY_ADMIN',
  'REJECTED',
  'LOST',
  'DAMAGED',
  'DISPUTED',
  'EXPIRED'
);

CREATE TYPE "ParcelCodeStatus" AS ENUM (
  'ACTIVE',
  'VERIFIED',
  'EXPIRED',
  'LOCKED',
  'REPLACED'
);

CREATE TYPE "ParcelAttachmentType" AS ENUM (
  'PACKAGE_BEFORE_HANDOVER',
  'PACKAGE_AT_HANDOVER',
  'PACKAGE_DAMAGED',
  'PACKAGE_AT_DELIVERY',
  'OTHER'
);

CREATE TABLE "ParcelCategory" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParcelCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProhibitedParcelCategory" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProhibitedParcelCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelOrder" (
  "id" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "tripId" TEXT,
  "driverProfileId" TEXT,
  "vehicleId" TEXT,
  "status" "ParcelStatus" NOT NULL DEFAULT 'DRAFT',
  "categoryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "weightGrams" INTEGER NOT NULL,
  "lengthCm" INTEGER NOT NULL,
  "widthCm" INTEGER NOT NULL,
  "heightCm" INTEGER NOT NULL,
  "declaredValueMinor" BIGINT NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "priceMinor" BIGINT NOT NULL DEFAULT 0,
  "senderName" TEXT NOT NULL,
  "senderPhone" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "pickupPointId" TEXT,
  "destinationPickupPointId" TEXT,
  "pickupLabel" TEXT NOT NULL,
  "destinationLabel" TEXT NOT NULL,
  "senderComment" TEXT,
  "recipientComment" TEXT,
  "contentDeclarationAcceptedAt" TIMESTAMP(3),
  "packagingDeclarationAcceptedAt" TIMESTAMP(3),
  "termsSnapshot" JSONB,
  "tripSnapshot" JSONB,
  "pricingSnapshot" JSONB,
  "handoverAt" TIMESTAMP(3),
  "inTransitAt" TIMESTAMP(3),
  "readyForPickupAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ParcelOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelAttachment" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "fileObjectId" TEXT,
  "type" "ParcelAttachmentType" NOT NULL DEFAULT 'OTHER',
  "originalFileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParcelAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelHandoverCode" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeLength" INTEGER NOT NULL DEFAULT 6,
  "status" "ParcelCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParcelHandoverCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelPickupCode" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeLength" INTEGER NOT NULL DEFAULT 6,
  "status" "ParcelCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lockedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParcelPickupCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelEvent" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParcelEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelIssue" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParcelIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelCancellation" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParcelCancellation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParcelTimelineEvent" (
  "id" TEXT NOT NULL,
  "parcelId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParcelTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParcelCategory_code_key" ON "ParcelCategory"("code");
CREATE INDEX "ParcelCategory_isActive_sortOrder_idx" ON "ParcelCategory"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ProhibitedParcelCategory_code_key" ON "ProhibitedParcelCategory"("code");
CREATE INDEX "ProhibitedParcelCategory_isActive_sortOrder_idx" ON "ProhibitedParcelCategory"("isActive", "sortOrder");
CREATE INDEX "ParcelOrder_senderUserId_status_createdAt_idx" ON "ParcelOrder"("senderUserId", "status", "createdAt");
CREATE INDEX "ParcelOrder_tripId_status_idx" ON "ParcelOrder"("tripId", "status");
CREATE INDEX "ParcelOrder_driverProfileId_status_idx" ON "ParcelOrder"("driverProfileId", "status");
CREATE INDEX "ParcelOrder_categoryId_status_idx" ON "ParcelOrder"("categoryId", "status");
CREATE INDEX "ParcelAttachment_parcelId_type_idx" ON "ParcelAttachment"("parcelId", "type");
CREATE INDEX "ParcelAttachment_fileObjectId_idx" ON "ParcelAttachment"("fileObjectId");
CREATE INDEX "ParcelHandoverCode_parcelId_status_expiresAt_idx" ON "ParcelHandoverCode"("parcelId", "status", "expiresAt");
CREATE INDEX "ParcelPickupCode_parcelId_status_expiresAt_idx" ON "ParcelPickupCode"("parcelId", "status", "expiresAt");
CREATE INDEX "ParcelEvent_parcelId_createdAt_idx" ON "ParcelEvent"("parcelId", "createdAt");
CREATE INDEX "ParcelEvent_type_createdAt_idx" ON "ParcelEvent"("type", "createdAt");
CREATE INDEX "ParcelIssue_parcelId_createdAt_idx" ON "ParcelIssue"("parcelId", "createdAt");
CREATE INDEX "ParcelIssue_type_createdAt_idx" ON "ParcelIssue"("type", "createdAt");
CREATE INDEX "ParcelCancellation_parcelId_createdAt_idx" ON "ParcelCancellation"("parcelId", "createdAt");
CREATE INDEX "ParcelTimelineEvent_parcelId_createdAt_idx" ON "ParcelTimelineEvent"("parcelId", "createdAt");
CREATE INDEX "ParcelTimelineEvent_type_createdAt_idx" ON "ParcelTimelineEvent"("type", "createdAt");

ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ParcelCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelOrder" ADD CONSTRAINT "ParcelOrder_destinationPickupPointId_fkey" FOREIGN KEY ("destinationPickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelAttachment" ADD CONSTRAINT "ParcelAttachment_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelAttachment" ADD CONSTRAINT "ParcelAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelHandoverCode" ADD CONSTRAINT "ParcelHandoverCode_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelPickupCode" ADD CONSTRAINT "ParcelPickupCode_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelEvent" ADD CONSTRAINT "ParcelEvent_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelEvent" ADD CONSTRAINT "ParcelEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelIssue" ADD CONSTRAINT "ParcelIssue_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelIssue" ADD CONSTRAINT "ParcelIssue_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelCancellation" ADD CONSTRAINT "ParcelCancellation_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelCancellation" ADD CONSTRAINT "ParcelCancellation_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParcelTimelineEvent" ADD CONSTRAINT "ParcelTimelineEvent_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "ParcelOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParcelTimelineEvent" ADD CONSTRAINT "ParcelTimelineEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

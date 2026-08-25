CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "VehicleDocumentType" AS ENUM ('REGISTRATION_CERTIFICATE', 'INSURANCE', 'TECHNICAL_INSPECTION', 'OWNERSHIP_OR_USAGE_PROOF', 'OTHER');
CREATE TYPE "VehiclePhotoType" AS ENUM ('FRONT', 'REAR', 'LEFT_SIDE', 'RIGHT_SIDE', 'INTERIOR_FRONT', 'INTERIOR_REAR', 'PLATE', 'OTHER');
CREATE TYPE "VehicleAssetStatus" AS ENUM ('UPLOADED', 'ACCEPTED', 'REJECTED', 'REPLACED', 'DELETED');
CREATE TYPE "VehicleModerationAction" AS ENUM ('START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND', 'RESTORE');
CREATE TYPE "VehicleModerationReasonCode" AS ENUM ('DOCUMENT_UNREADABLE', 'DOCUMENT_EXPIRED', 'DOCUMENT_MISMATCH', 'PHOTO_INCOMPLETE', 'PLATE_MISMATCH', 'INVALID_VEHICLE_DATA', 'DUPLICATE_PLATE', 'SAFETY_CONCERN', 'OTHER');

ALTER TABLE "Vehicle"
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "normalizedPlate" TEXT,
  ADD COLUMN "bodyType" TEXT,
  ADD COLUMN "passengerSeatCount" INTEGER,
  ADD COLUMN "luggageCapacity" TEXT,
  ADD COLUMN "amenities" JSONB,
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewStartedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "changesRequestedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "Vehicle"
SET
  "normalizedPlate" = regexp_replace(upper("plateNumber"), '[^A-Z0-9]', '', 'g'),
  "passengerSeatCount" = "passengerSeats",
  "moderationStatus" = COALESCE("moderationStatus", 'DRAFT');

ALTER TABLE "Vehicle"
  ALTER COLUMN "normalizedPlate" SET NOT NULL,
  ALTER COLUMN "passengerSeatCount" SET NOT NULL;

CREATE TABLE "VehicleDocument" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" "VehicleDocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileObjectId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" "VehicleAssetStatus" NOT NULL DEFAULT 'UPLOADED',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehiclePhoto" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "type" "VehiclePhotoType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileObjectId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" "VehicleAssetStatus" NOT NULL DEFAULT 'UPLOADED',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleModerationReview" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "action" "VehicleModerationAction" NOT NULL,
  "reasonCode" "VehicleModerationReasonCode",
  "comment" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleModerationReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleModerationEvent" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Vehicle_driverProfileId_status_idx" ON "Vehicle"("driverProfileId", "status");
CREATE INDEX "Vehicle_status_submittedAt_idx" ON "Vehicle"("status", "submittedAt");
CREATE INDEX "Vehicle_normalizedPlate_idx" ON "Vehicle"("normalizedPlate");
CREATE INDEX "Vehicle_isPrimary_idx" ON "Vehicle"("isPrimary");
CREATE UNIQUE INDEX "Vehicle_active_normalizedPlate_key" ON "Vehicle"("normalizedPlate") WHERE "archivedAt" IS NULL AND "status" <> 'ARCHIVED';
CREATE UNIQUE INDEX "Vehicle_driver_primary_key" ON "Vehicle"("driverProfileId") WHERE "isPrimary" = true AND "archivedAt" IS NULL AND "status" <> 'ARCHIVED';
CREATE INDEX "VehicleDocument_vehicleId_type_status_idx" ON "VehicleDocument"("vehicleId", "type", "status");
CREATE INDEX "VehicleDocument_storageKey_idx" ON "VehicleDocument"("storageKey");
CREATE INDEX "VehiclePhoto_vehicleId_type_status_idx" ON "VehiclePhoto"("vehicleId", "type", "status");
CREATE INDEX "VehiclePhoto_storageKey_idx" ON "VehiclePhoto"("storageKey");
CREATE INDEX "VehicleModerationReview_vehicleId_createdAt_idx" ON "VehicleModerationReview"("vehicleId", "createdAt");
CREATE INDEX "VehicleModerationReview_reviewerUserId_idx" ON "VehicleModerationReview"("reviewerUserId");
CREATE INDEX "VehicleModerationEvent_vehicleId_createdAt_idx" ON "VehicleModerationEvent"("vehicleId", "createdAt");
CREATE INDEX "VehicleModerationEvent_type_createdAt_idx" ON "VehicleModerationEvent"("type", "createdAt");

ALTER TABLE "VehicleDocument"
  ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VehicleDocument_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehiclePhoto"
  ADD CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VehiclePhoto_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehicleModerationReview"
  ADD CONSTRAINT "VehicleModerationReview_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "VehicleModerationReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleModerationEvent"
  ADD CONSTRAINT "VehicleModerationEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

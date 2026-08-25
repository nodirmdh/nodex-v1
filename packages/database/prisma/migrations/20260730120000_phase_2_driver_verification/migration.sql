CREATE TYPE "DriverVerificationApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'SUSPENDED');
CREATE TYPE "DriverVerificationDocumentType" AS ENUM ('IDENTITY_FRONT', 'IDENTITY_BACK', 'DRIVER_LICENSE_FRONT', 'DRIVER_LICENSE_BACK', 'VEHICLE_REGISTRATION_FRONT', 'VEHICLE_REGISTRATION_BACK', 'DRIVER_SELFIE', 'DRIVER_WITH_LICENSE_SELFIE', 'VEHICLE_FRONT', 'VEHICLE_REAR', 'VEHICLE_LEFT', 'VEHICLE_RIGHT', 'VEHICLE_INTERIOR');
CREATE TYPE "DriverVerificationDocumentStatus" AS ENUM ('UPLOADED', 'ACCEPTED', 'REJECTED', 'REPLACED', 'DELETED');
CREATE TYPE "DriverVerificationReviewAction" AS ENUM ('START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_CHANGES', 'SUSPEND', 'RESTORE');
CREATE TYPE "DriverVerificationReasonCode" AS ENUM ('DOCUMENT_UNREADABLE', 'DOCUMENT_EXPIRED', 'DOCUMENT_MISMATCH', 'SELFIE_MISMATCH', 'MISSING_DOCUMENT', 'INVALID_LICENSE_CATEGORY', 'INVALID_VEHICLE_DATA', 'VEHICLE_PHOTO_INCOMPLETE', 'DUPLICATE_DRIVER', 'FRAUD_SUSPECTED', 'OTHER');

ALTER TABLE "DriverProfile"
  ADD COLUMN "currentApplicationId" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;

CREATE TABLE "DriverVerificationApplication" (
  "id" TEXT NOT NULL,
  "driverProfileId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "DriverVerificationApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "reviewStartedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "changesRequestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "lastSubmittedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "legalFirstName" TEXT,
  "legalLastName" TEXT,
  "legalMiddleName" TEXT,
  "birthDate" TIMESTAMP(3),
  "gender" TEXT,
  "citizenship" TEXT,
  "personalIdentificationNumber" TEXT,
  "registeredAddress" TEXT,
  "residentialAddress" TEXT,
  "phone" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "driverLicenseNumber" TEXT,
  "driverLicenseIssuedAt" TIMESTAMP(3),
  "driverLicenseExpiresAt" TIMESTAMP(3),
  "driverLicenseCategory" TEXT,
  "driverExperienceSince" TIMESTAMP(3),
  "vehicleMake" TEXT,
  "vehicleModel" TEXT,
  "vehicleYear" INTEGER,
  "vehicleColor" TEXT,
  "vehiclePlateNumber" TEXT,
  "vehicleRegistrationNumber" TEXT,
  "vehicleSeats" INTEGER,
  "consentAcceptedAt" TIMESTAMP(3),
  "consentVersion" TEXT,
  "privacyVersion" TEXT,
  "verificationPolicyVersion" TEXT,
  "duplicateWarning" BOOLEAN NOT NULL DEFAULT false,
  "duplicateReason" TEXT,
  CONSTRAINT "DriverVerificationApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverVerificationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "DriverVerificationDocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileObjectId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" "DriverVerificationDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverVerificationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverVerificationReview" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "action" "DriverVerificationReviewAction" NOT NULL,
  "reasonCode" "DriverVerificationReasonCode",
  "comment" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverVerificationReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverVerificationEvent" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverVerificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverProfile_currentApplicationId_key" ON "DriverProfile"("currentApplicationId");
CREATE UNIQUE INDEX "DriverVerificationApplication_driverProfileId_version_key" ON "DriverVerificationApplication"("driverProfileId", "version");
CREATE INDEX "DriverVerificationApplication_status_submittedAt_idx" ON "DriverVerificationApplication"("status", "submittedAt");
CREATE INDEX "DriverVerificationApplication_reviewedByUserId_idx" ON "DriverVerificationApplication"("reviewedByUserId");
CREATE INDEX "DriverVerificationApplication_duplicateWarning_idx" ON "DriverVerificationApplication"("duplicateWarning");
CREATE INDEX "DriverVerificationApplication_phone_idx" ON "DriverVerificationApplication"("phone");
CREATE INDEX "DriverVerificationApplication_driverLicenseNumber_idx" ON "DriverVerificationApplication"("driverLicenseNumber");
CREATE INDEX "DriverVerificationApplication_vehiclePlateNumber_idx" ON "DriverVerificationApplication"("vehiclePlateNumber");
CREATE INDEX "DriverVerificationDocument_applicationId_type_status_idx" ON "DriverVerificationDocument"("applicationId", "type", "status");
CREATE INDEX "DriverVerificationDocument_storageKey_idx" ON "DriverVerificationDocument"("storageKey");
CREATE INDEX "DriverVerificationReview_applicationId_createdAt_idx" ON "DriverVerificationReview"("applicationId", "createdAt");
CREATE INDEX "DriverVerificationReview_reviewerUserId_idx" ON "DriverVerificationReview"("reviewerUserId");
CREATE INDEX "DriverVerificationEvent_applicationId_createdAt_idx" ON "DriverVerificationEvent"("applicationId", "createdAt");
CREATE INDEX "DriverVerificationEvent_type_createdAt_idx" ON "DriverVerificationEvent"("type", "createdAt");

ALTER TABLE "DriverVerificationApplication"
  ADD CONSTRAINT "DriverVerificationApplication_driverProfileId_fkey"
  FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DriverVerificationApplication_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DriverVerificationApplication_lastSubmittedByUserId_fkey"
  FOREIGN KEY ("lastSubmittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DriverVerificationApplication_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverProfile"
  ADD CONSTRAINT "DriverProfile_currentApplicationId_fkey"
  FOREIGN KEY ("currentApplicationId") REFERENCES "DriverVerificationApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverVerificationDocument"
  ADD CONSTRAINT "DriverVerificationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "DriverVerificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DriverVerificationDocument_fileObjectId_fkey"
  FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverVerificationReview"
  ADD CONSTRAINT "DriverVerificationReview_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "DriverVerificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "DriverVerificationReview_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DriverVerificationEvent"
  ADD CONSTRAINT "DriverVerificationEvent_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "DriverVerificationApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

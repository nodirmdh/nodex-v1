-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('DRIVER_BY_CLIENT', 'CLIENT_BY_DRIVER', 'PARCEL_DRIVER_BY_SENDER', 'PARCEL_SENDER_BY_DRIVER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'UNDER_REVIEW', 'REJECTED', 'DELETED_BY_AUTHOR', 'REMOVED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "ReviewCriterionCode" AS ENUM ('SAFETY', 'DRIVING_QUALITY', 'POLITENESS', 'PUNCTUALITY', 'VEHICLE_CLEANLINESS', 'COMMUNICATION', 'RESPECT_FOR_VEHICLE', 'ACCURATE_INFORMATION', 'PACKAGING', 'CAREFUL_HANDLING');

-- CreateEnum
CREATE TYPE "ReliabilityLevel" AS ENUM ('NEW', 'STANDARD', 'RELIABLE', 'HIGHLY_RELIABLE', 'AT_RISK', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ReliabilityEventType" AS ENUM ('TRIP_COMPLETED', 'BOOKING_COMPLETED', 'CLIENT_CANCELLED', 'DRIVER_CANCELLED', 'CLIENT_NO_SHOW', 'DRIVER_NO_SHOW', 'PARCEL_DELIVERED', 'PARCEL_LOST', 'PARCEL_DAMAGED', 'SAFETY_REPORT_CONFIRMED', 'RESTRICTION_APPLIED', 'RESTRICTION_REMOVED');

-- CreateEnum
CREATE TYPE "SafetyReportType" AS ENUM ('UNSAFE_DRIVING', 'HARASSMENT', 'THREATS', 'VIOLENCE', 'DISCRIMINATION', 'FRAUD', 'IMPERSONATION', 'DANGEROUS_VEHICLE', 'INAPPROPRIATE_CONTENT', 'PROHIBITED_PARCEL', 'LOST_PARCEL', 'DAMAGED_PARCEL', 'PRIVACY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SafetyReportStatus" AS ENUM ('SUBMITTED', 'TRIAGED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED', 'DUPLICATE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SafetyIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'TRIAGED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountRestrictionType" AS ENUM ('CHAT_RESTRICTED', 'BOOKING_RESTRICTED', 'DRIVER_TRIP_CREATION_RESTRICTED', 'PARCEL_RESTRICTED', 'TEMPORARY_SUSPENSION', 'FULL_SUSPENSION');

-- CreateEnum
CREATE TYPE "AccountRestrictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EmergencyActionType" AS ENUM ('SOS_STARTED', 'EMERGENCY_NUMBER_CALLED', 'TRIP_SHARED', 'SUPPORT_CONTACTED', 'SAFETY_REPORT_CREATED', 'DETAILS_COPIED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_MODERATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAFETY_REPORT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAFETY_REPORT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAFETY_REPORT_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAFETY_ALERT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESTRICTION_APPLIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESTRICTION_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESTRICTION_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRIP_SHARE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRIP_SHARE_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRUSTED_CONTACT_ADDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RELIABILITY_LEVEL_CHANGED';

-- CreateTable
CREATE TABLE "ReviewCriterion" (
    "id" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "code" "ReviewCriterionCode" NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "revieweeUserId" TEXT NOT NULL,
    "bookingId" TEXT,
    "tripId" TEXT,
    "parcelOrderId" TEXT,
    "overallRating" INTEGER NOT NULL,
    "text" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "moderationReason" TEXT,
    "reportedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCriterionScore" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewModeration" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "ReviewStatus",
    "toStatus" "ReviewStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingAggregate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'OVERALL',
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ratingDistribution" JSONB NOT NULL DEFAULT '{}',
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RatingAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliabilityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedTripsCount" INTEGER NOT NULL DEFAULT 0,
    "completedBookingsCount" INTEGER NOT NULL DEFAULT 0,
    "clientCancellationCount" INTEGER NOT NULL DEFAULT 0,
    "driverCancellationCount" INTEGER NOT NULL DEFAULT 0,
    "clientNoShowCount" INTEGER NOT NULL DEFAULT 0,
    "driverNoShowCount" INTEGER NOT NULL DEFAULT 0,
    "parcelDeliveredCount" INTEGER NOT NULL DEFAULT 0,
    "parcelIssueCount" INTEGER NOT NULL DEFAULT 0,
    "lateCancellationCount" INTEGER NOT NULL DEFAULT 0,
    "accountRestrictionCount" INTEGER NOT NULL DEFAULT 0,
    "reliabilityLevel" "ReliabilityLevel" NOT NULL DEFAULT 'NEW',
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ReliabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliabilityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReliabilityEventType" NOT NULL,
    "bookingId" TEXT,
    "tripId" TEXT,
    "parcelOrderId" TEXT,
    "safetyReportId" TEXT,
    "restrictionId" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReliabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "tripId" TEXT,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "reviewId" TEXT,
    "supportTicketId" TEXT,
    "type" "SafetyReportType" NOT NULL,
    "severity" "SafetySeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "status" "SafetyReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedToUserId" TEXT,
    "resolutionCode" TEXT,
    "resolutionSummary" TEXT,
    "duplicateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fileObjectId" TEXT,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReportInternalNote" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyReportInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" TEXT NOT NULL,
    "primaryReportId" TEXT,
    "subjectUserId" TEXT,
    "severity" "SafetySeverity" NOT NULL,
    "status" "SafetyIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncidentEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "reportId" TEXT,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyIncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedContact" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripShare" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripShareAccessEvent" (
    "id" TEXT NOT NULL,
    "tripShareId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripShareAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAction" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" "EmergencyActionType" NOT NULL,
    "tripId" TEXT,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "safetyReportId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "SafetySeverity" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "decision" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" "ModerationCaseStatus",
    "toStatus" "ModerationCaseStatus",
    "reason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AccountRestrictionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "status" "AccountRestrictionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT NOT NULL,
    "removedByUserId" TEXT,
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRestrictionEvent" (
    "id" TEXT NOT NULL,
    "restrictionId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRestrictionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewCriterion_type_isActive_sortOrder_idx" ON "ReviewCriterion"("type", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCriterion_type_code_key" ON "ReviewCriterion"("type", "code");

-- CreateIndex
CREATE INDEX "Review_reviewerUserId_createdAt_idx" ON "Review"("reviewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_revieweeUserId_status_publishedAt_idx" ON "Review"("revieweeUserId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_tripId_idx" ON "Review"("tripId");

-- CreateIndex
CREATE INDEX "Review_bookingId_idx" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_parcelOrderId_idx" ON "Review"("parcelOrderId");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_type_reviewerUserId_revieweeUserId_bookingId_parcelO_key" ON "Review"("type", "reviewerUserId", "revieweeUserId", "bookingId", "parcelOrderId");

-- CreateIndex
CREATE INDEX "ReviewCriterionScore_criterionId_idx" ON "ReviewCriterionScore"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCriterionScore_reviewId_criterionId_key" ON "ReviewCriterionScore"("reviewId", "criterionId");

-- CreateIndex
CREATE INDEX "ReviewModeration_reviewId_createdAt_idx" ON "ReviewModeration"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewModeration_toStatus_createdAt_idx" ON "ReviewModeration"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "RatingAggregate_scope_averageRating_idx" ON "RatingAggregate"("scope", "averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "RatingAggregate_userId_scope_key" ON "RatingAggregate"("userId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "ReliabilityProfile_userId_key" ON "ReliabilityProfile"("userId");

-- CreateIndex
CREATE INDEX "ReliabilityProfile_reliabilityLevel_idx" ON "ReliabilityProfile"("reliabilityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ReliabilityEvent_dedupeKey_key" ON "ReliabilityEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "ReliabilityEvent_userId_occurredAt_idx" ON "ReliabilityEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReliabilityEvent_type_occurredAt_idx" ON "ReliabilityEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "UserBlock_blockerUserId_removedAt_idx" ON "UserBlock"("blockerUserId", "removedAt");

-- CreateIndex
CREATE INDEX "UserBlock_blockedUserId_removedAt_idx" ON "UserBlock"("blockedUserId", "removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerUserId_blockedUserId_removedAt_key" ON "UserBlock"("blockerUserId", "blockedUserId", "removedAt");

-- CreateIndex
CREATE INDEX "SafetyReport_reporterUserId_createdAt_idx" ON "SafetyReport"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyReport_reportedUserId_status_createdAt_idx" ON "SafetyReport"("reportedUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyReport_status_severity_createdAt_idx" ON "SafetyReport"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyReport_tripId_idx" ON "SafetyReport"("tripId");

-- CreateIndex
CREATE INDEX "SafetyReport_bookingId_idx" ON "SafetyReport"("bookingId");

-- CreateIndex
CREATE INDEX "SafetyReport_parcelOrderId_idx" ON "SafetyReport"("parcelOrderId");

-- CreateIndex
CREATE INDEX "SafetyReport_conversationId_idx" ON "SafetyReport"("conversationId");

-- CreateIndex
CREATE INDEX "SafetyReport_messageId_idx" ON "SafetyReport"("messageId");

-- CreateIndex
CREATE INDEX "SafetyReport_reviewId_idx" ON "SafetyReport"("reviewId");

-- CreateIndex
CREATE INDEX "SafetyReportAttachment_reportId_idx" ON "SafetyReportAttachment"("reportId");

-- CreateIndex
CREATE INDEX "SafetyReportAttachment_fileObjectId_idx" ON "SafetyReportAttachment"("fileObjectId");

-- CreateIndex
CREATE INDEX "SafetyReportInternalNote_reportId_createdAt_idx" ON "SafetyReportInternalNote"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_status_severity_createdAt_idx" ON "SafetyIncident"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_subjectUserId_status_idx" ON "SafetyIncident"("subjectUserId", "status");

-- CreateIndex
CREATE INDEX "SafetyIncidentEvent_incidentId_createdAt_idx" ON "SafetyIncidentEvent"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncidentEvent_reportId_createdAt_idx" ON "SafetyIncidentEvent"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyIncidentEvent_type_createdAt_idx" ON "SafetyIncidentEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "TrustedContact_ownerUserId_deletedAt_idx" ON "TrustedContact"("ownerUserId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TripShare_tokenHash_key" ON "TripShare"("tokenHash");

-- CreateIndex
CREATE INDEX "TripShare_ownerUserId_revokedAt_expiresAt_idx" ON "TripShare"("ownerUserId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "TripShare_tripId_expiresAt_idx" ON "TripShare"("tripId", "expiresAt");

-- CreateIndex
CREATE INDEX "TripShareAccessEvent_tripShareId_accessedAt_idx" ON "TripShareAccessEvent"("tripShareId", "accessedAt");

-- CreateIndex
CREATE INDEX "EmergencyAction_actorUserId_createdAt_idx" ON "EmergencyAction"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyAction_tripId_createdAt_idx" ON "EmergencyAction"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyAction_bookingId_createdAt_idx" ON "EmergencyAction"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationCase_status_severity_createdAt_idx" ON "ModerationCase"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationCase_subjectUserId_status_idx" ON "ModerationCase"("subjectUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationCase_sourceType_sourceId_key" ON "ModerationCase"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ModerationCaseEvent_caseId_createdAt_idx" ON "ModerationCaseEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "AccountRestriction_userId_status_type_idx" ON "AccountRestriction"("userId", "status", "type");

-- CreateIndex
CREATE INDEX "AccountRestriction_status_endsAt_idx" ON "AccountRestriction"("status", "endsAt");

-- CreateIndex
CREATE INDEX "AccountRestrictionEvent_restrictionId_createdAt_idx" ON "AccountRestrictionEvent"("restrictionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewCriterionScore" ADD CONSTRAINT "ReviewCriterionScore_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCriterionScore" ADD CONSTRAINT "ReviewCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ReviewCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewModeration" ADD CONSTRAINT "ReviewModeration_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportAttachment" ADD CONSTRAINT "SafetyReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportAttachment" ADD CONSTRAINT "SafetyReportAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReportInternalNote" ADD CONSTRAINT "SafetyReportInternalNote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncidentEvent" ADD CONSTRAINT "SafetyIncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SafetyIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncidentEvent" ADD CONSTRAINT "SafetyIncidentEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripShareAccessEvent" ADD CONSTRAINT "TripShareAccessEvent_tripShareId_fkey" FOREIGN KEY ("tripShareId") REFERENCES "TripShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCaseEvent" ADD CONSTRAINT "ModerationCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRestrictionEvent" ADD CONSTRAINT "AccountRestrictionEvent_restrictionId_fkey" FOREIGN KEY ("restrictionId") REFERENCES "AccountRestriction"("id") ON DELETE CASCADE ON UPDATE CASCADE;


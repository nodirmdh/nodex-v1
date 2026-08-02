-- CreateEnum
CREATE TYPE "PaymentTargetType" AS ENUM ('BOOKING', 'PARCEL_ORDER', 'DRIVER_PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'REQUIRES_ACTION', 'PROCESSING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'SENT_TO_PROVIDER', 'PENDING_PROVIDER', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CLIENT_CANCELLATION', 'DRIVER_CANCELLATION', 'ADMIN_CANCELLATION', 'TRIP_CANCELLED', 'DRIVER_NO_SHOW', 'DUPLICATE_PAYMENT', 'PARCEL_REJECTED', 'PARCEL_CANCELLED', 'SERVICE_NOT_DELIVERED', 'MANUAL_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'READY', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DriverEarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'REVERSED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "CashSettlementStatus" AS ENUM ('OPEN', 'DECLARED', 'CONFIRMED', 'DISPUTED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('PAYMENT', 'REFUND', 'FEE', 'EARNING', 'PAYOUT', 'CASH_SETTLEMENT', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'MISMATCH', 'RESOLVED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('SEARCH_PERFORMED', 'TRIP_VIEWED', 'BOOKING_STARTED', 'PAYMENT_INTENT_CREATED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'REFUND_REQUESTED', 'REFUND_SUCCEEDED', 'PARCEL_CREATED', 'SUPPORT_TICKET_CREATED', 'SAFETY_REPORT_CREATED', 'REVIEW_SUBMITTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';

-- CreateTable
CREATE TABLE "PaymentProviderAccount" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "targetType" "PaymentTargetType" NOT NULL,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "driverPayoutId" TEXT,
    "adjustmentReference" TEXT,
    "payerUserId" TEXT,
    "payeeUserId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "provider" "PaymentProvider",
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "paidMinor" BIGINT NOT NULL DEFAULT 0,
    "refundedMinor" BIGINT NOT NULL DEFAULT 0,
    "pricingSnapshotId" TEXT,
    "idempotencyKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "providerReference" TEXT,
    "clientAction" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "providerReference" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerAccountId" TEXT,
    "paymentIntentId" TEXT,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefundAttempt" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PROCESSING',
    "providerReference" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefundAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "rateBps" INTEGER NOT NULL DEFAULT 0,
    "fixedMinor" BIGINT NOT NULL DEFAULT 0,
    "ruleSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverEarning" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "paymentId" TEXT,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "payoutId" TEXT,
    "status" "DriverEarningStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "grossMinor" BIGINT NOT NULL,
    "feeMinor" BIGINT NOT NULL DEFAULT 0,
    "netMinor" BIGINT NOT NULL,
    "availableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPayout" (
    "id" TEXT NOT NULL,
    "driverProfileId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "grossMinor" BIGINT NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "providerReference" TEXT,
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPayoutItem" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "earningId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverPayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLedgerEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentId" TEXT,
    "account" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdByUserId" TEXT,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "paymentId" TEXT,
    "providerReference" TEXT,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "expectedAmountMinor" BIGINT,
    "providerAmountMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPaymentDeclaration" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "declaredByUserId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "amountMinor" BIGINT NOT NULL,
    "status" "CashSettlementStatus" NOT NULL DEFAULT 'DECLARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "CashPaymentDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSettlement" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "driverProfileId" TEXT NOT NULL,
    "bookingId" TEXT,
    "parcelOrderId" TEXT,
    "status" "CashSettlementStatus" NOT NULL DEFAULT 'OPEN',
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "expectedMinor" BIGINT NOT NULL,
    "receivedMinor" BIGINT NOT NULL DEFAULT 0,
    "confirmedByUserId" TEXT,
    "disputedByUserId" TEXT,
    "resolvedByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDispute" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "targetType" "PaymentTargetType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "feeRateBps" INTEGER NOT NULL DEFAULT 0,
    "fixedFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSnapshot" (
    "id" TEXT NOT NULL,
    "targetType" "PaymentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "subtotalMinor" BIGINT NOT NULL,
    "feeMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "ruleCode" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionPlaceholder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionPlaceholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "actorUserId" TEXT,
    "sessionId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "metricKey" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "value" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "funnelKey" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "requestedByUserId" TEXT,
    "storageKey" TEXT,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentProviderAccount_provider_isActive_idx" ON "PaymentProviderAccount"("provider", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_provider_displayName_key" ON "PaymentProviderAccount"("provider", "displayName");

-- CreateIndex
CREATE INDEX "Payment_targetType_bookingId_idx" ON "Payment"("targetType", "bookingId");

-- CreateIndex
CREATE INDEX "Payment_targetType_parcelOrderId_idx" ON "Payment"("targetType", "parcelOrderId");

-- CreateIndex
CREATE INDEX "Payment_payerUserId_status_createdAt_idx" ON "Payment"("payerUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentIntent_paymentId_status_idx" ON "PaymentIntent"("paymentId", "status");

-- CreateIndex
CREATE INDEX "PaymentIntent_provider_status_createdAt_idx" ON "PaymentIntent"("provider", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_idempotencyKey_key" ON "PaymentIntent"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_provider_providerReference_key" ON "PaymentIntent"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentIntentId_createdAt_idx" ON "PaymentAttempt"("paymentIntentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_providerReference_idx" ON "PaymentAttempt"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_createdAt_idx" ON "PaymentAttempt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentIntentId_receivedAt_idx" ON "PaymentWebhookEvent"("paymentIntentId", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_processedAt_idx" ON "PaymentWebhookEvent"("provider", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_eventId_key" ON "PaymentWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_status_idx" ON "PaymentRefund"("paymentId", "status");

-- CreateIndex
CREATE INDEX "PaymentRefund_status_createdAt_idx" ON "PaymentRefund"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_idempotencyKey_key" ON "PaymentRefund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentRefundAttempt_refundId_createdAt_idx" ON "PaymentRefundAttempt"("refundId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentRefundAttempt_provider_providerReference_idx" ON "PaymentRefundAttempt"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_targetType_targetId_idx" ON "PaymentAllocation"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PlatformFee_paymentId_idx" ON "PlatformFee"("paymentId");

-- CreateIndex
CREATE INDEX "PlatformFee_createdAt_idx" ON "PlatformFee"("createdAt");

-- CreateIndex
CREATE INDEX "DriverEarning_driverProfileId_status_createdAt_idx" ON "DriverEarning"("driverProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DriverEarning_paymentId_idx" ON "DriverEarning"("paymentId");

-- CreateIndex
CREATE INDEX "DriverEarning_payoutId_idx" ON "DriverEarning"("payoutId");

-- CreateIndex
CREATE INDEX "DriverPayout_driverProfileId_status_createdAt_idx" ON "DriverPayout"("driverProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DriverPayout_provider_providerReference_idx" ON "DriverPayout"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "DriverPayoutItem_earningId_idx" ON "DriverPayoutItem"("earningId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverPayoutItem_payoutId_earningId_key" ON "DriverPayoutItem"("payoutId", "earningId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_referenceType_referenceId_idx" ON "FinancialTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_createdAt_idx" ON "FinancialTransaction"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_idempotencyKey_key" ON "FinancialTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_transactionId_idx" ON "FinancialLedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_paymentId_idx" ON "FinancialLedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_account_createdAt_idx" ON "FinancialLedgerEntry"("account", "createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_provider_status_startedAt_idx" ON "ReconciliationRun"("provider", "status", "startedAt");

-- CreateIndex
CREATE INDEX "ReconciliationItem_runId_status_idx" ON "ReconciliationItem"("runId", "status");

-- CreateIndex
CREATE INDEX "ReconciliationItem_paymentId_idx" ON "ReconciliationItem"("paymentId");

-- CreateIndex
CREATE INDEX "CashPaymentDeclaration_paymentId_idx" ON "CashPaymentDeclaration"("paymentId");

-- CreateIndex
CREATE INDEX "CashPaymentDeclaration_bookingId_idx" ON "CashPaymentDeclaration"("bookingId");

-- CreateIndex
CREATE INDEX "CashPaymentDeclaration_parcelOrderId_idx" ON "CashPaymentDeclaration"("parcelOrderId");

-- CreateIndex
CREATE INDEX "CashSettlement_driverProfileId_status_createdAt_idx" ON "CashSettlement"("driverProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CashSettlement_paymentId_idx" ON "CashSettlement"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentDispute_paymentId_status_idx" ON "PaymentDispute"("paymentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_code_key" ON "PricingRule"("code");

-- CreateIndex
CREATE INDEX "PricingRule_targetType_isActive_startsAt_idx" ON "PricingRule"("targetType", "isActive", "startsAt");

-- CreateIndex
CREATE INDEX "PricingSnapshot_targetType_targetId_idx" ON "PricingSnapshot"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionPlaceholder_code_key" ON "PromotionPlaceholder"("code");

-- CreateIndex
CREATE INDEX "FinancialAuditEvent_entityType_entityId_createdAt_idx" ON "FinancialAuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialAuditEvent_actorUserId_createdAt_idx" ON "FinancialAuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_occurredAt_idx" ON "AnalyticsEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_actorUserId_occurredAt_idx" ON "AnalyticsEvent"("actorUserId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_dedupeKey_key" ON "AnalyticsEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "DailyMetric_metricKey_metricDate_idx" ON "DailyMetric"("metricKey", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_metricDate_metricKey_key" ON "DailyMetric"("metricDate", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelSnapshot_snapshotDate_funnelKey_key" ON "FunnelSnapshot"("snapshotDate", "funnelKey");

-- CreateIndex
CREATE INDEX "ReportExport_type_status_createdAt_idx" ON "ReportExport"("type", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefundAttempt" ADD CONSTRAINT "PaymentRefundAttempt_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "PaymentRefund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFee" ADD CONSTRAINT "PlatformFee_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "DriverPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPayout" ADD CONSTRAINT "DriverPayout_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "PaymentProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverPayoutItem" ADD CONSTRAINT "DriverPayoutItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "DriverPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDispute" ADD CONSTRAINT "PaymentDispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


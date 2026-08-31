CREATE TABLE IF NOT EXISTS "RewardTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "driverProfileId" TEXT,
  "roleContext" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "tripId" TEXT,
  "referralId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Referral" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "code" TEXT,
  "roleContext" TEXT NOT NULL DEFAULT 'CLIENT',
  "status" TEXT NOT NULL DEFAULT 'INVITED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registeredAt" TIMESTAMP(3),
  "qualifiedAt" TIMESTAMP(3),
  "rewardedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "reason" TEXT,
  "metadata" JSONB,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FraudEvaluation" (
  "id" TEXT NOT NULL,
  "rewardTransactionId" TEXT,
  "tripId" TEXT,
  "referralId" TEXT,
  "subjectUserId" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "reasons" JSONB NOT NULL,
  "decision" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FraudEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RewardMilestoneDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "rewardType" TEXT NOT NULL,
  "rewardAmount" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardMilestoneDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DriverMilestoneProgress" (
  "id" TEXT NOT NULL,
  "driverProfileId" TEXT NOT NULL,
  "milestoneDefinitionId" TEXT NOT NULL,
  "qualifyingTripCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "reachedAt" TIMESTAMP(3),
  "rewardTransactionId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverMilestoneProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RewardTransaction_userId_type_sourceType_sourceId_key" ON "RewardTransaction"("userId", "type", "sourceType", "sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardTransaction_idempotencyKey_key" ON "RewardTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "RewardTransaction_userId_status_createdAt_idx" ON "RewardTransaction"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "RewardTransaction_driverProfileId_status_createdAt_idx" ON "RewardTransaction"("driverProfileId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "RewardTransaction_tripId_type_idx" ON "RewardTransaction"("tripId", "type");
CREATE INDEX IF NOT EXISTS "RewardTransaction_referralId_type_idx" ON "RewardTransaction"("referralId", "type");
CREATE INDEX IF NOT EXISTS "RewardTransaction_status_createdAt_idx" ON "RewardTransaction"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referredUserId_roleContext_key" ON "Referral"("referredUserId", "roleContext");
CREATE INDEX IF NOT EXISTS "Referral_referrerUserId_status_createdAt_idx" ON "Referral"("referrerUserId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Referral_code_idx" ON "Referral"("code");
CREATE INDEX IF NOT EXISTS "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "FraudEvaluation_rewardTransactionId_key" ON "FraudEvaluation"("rewardTransactionId");
CREATE INDEX IF NOT EXISTS "FraudEvaluation_subjectUserId_status_createdAt_idx" ON "FraudEvaluation"("subjectUserId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "FraudEvaluation_tripId_riskLevel_idx" ON "FraudEvaluation"("tripId", "riskLevel");
CREATE INDEX IF NOT EXISTS "FraudEvaluation_referralId_riskLevel_idx" ON "FraudEvaluation"("referralId", "riskLevel");
CREATE INDEX IF NOT EXISTS "FraudEvaluation_status_createdAt_idx" ON "FraudEvaluation"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "RewardMilestoneDefinition_code_key" ON "RewardMilestoneDefinition"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "DriverMilestoneProgress_driverProfileId_milestoneDefinitionId_key" ON "DriverMilestoneProgress"("driverProfileId", "milestoneDefinitionId");
CREATE UNIQUE INDEX IF NOT EXISTS "DriverMilestoneProgress_rewardTransactionId_key" ON "DriverMilestoneProgress"("rewardTransactionId");
CREATE INDEX IF NOT EXISTS "DriverMilestoneProgress_driverProfileId_status_idx" ON "DriverMilestoneProgress"("driverProfileId", "status");

ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FraudEvaluation" ADD CONSTRAINT "FraudEvaluation_rewardTransactionId_fkey" FOREIGN KEY ("rewardTransactionId") REFERENCES "RewardTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FraudEvaluation" ADD CONSTRAINT "FraudEvaluation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudEvaluation" ADD CONSTRAINT "FraudEvaluation_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudEvaluation" ADD CONSTRAINT "FraudEvaluation_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FraudEvaluation" ADD CONSTRAINT "FraudEvaluation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverMilestoneProgress" ADD CONSTRAINT "DriverMilestoneProgress_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverMilestoneProgress" ADD CONSTRAINT "DriverMilestoneProgress_milestoneDefinitionId_fkey" FOREIGN KEY ("milestoneDefinitionId") REFERENCES "RewardMilestoneDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverMilestoneProgress" ADD CONSTRAINT "DriverMilestoneProgress_rewardTransactionId_fkey" FOREIGN KEY ("rewardTransactionId") REFERENCES "RewardTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

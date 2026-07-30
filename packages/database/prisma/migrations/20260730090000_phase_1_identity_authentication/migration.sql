CREATE TYPE "AppContext" AS ENUM ('CLIENT_APP', 'DRIVER_APP', 'ADMIN_WEB', 'LOCAL_MOCK');
CREATE TYPE "UserTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK', 'TELEGRAM');
CREATE TYPE "DriverOnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BASIC_COMPLETED');
CREATE TYPE "DriverVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "User"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "theme" "UserTheme" NOT NULL DEFAULT 'TELEGRAM',
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "acceptedTermsAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyVersion" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "TelegramIdentity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "telegramUserId" BIGINT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "languageCode" TEXT,
  "isPremium" BOOLEAN NOT NULL DEFAULT false,
  "photoUrl" TEXT,
  "allowsWriteToPm" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastAuthenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramIdentity_userId_key" ON "TelegramIdentity"("userId");
CREATE UNIQUE INDEX "TelegramIdentity_telegramUserId_key" ON "TelegramIdentity"("telegramUserId");
CREATE INDEX "TelegramIdentity_username_idx" ON "TelegramIdentity"("username");

ALTER TABLE "TelegramIdentity"
  ADD CONSTRAINT "TelegramIdentity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TelegramIdentity" (
  "id",
  "userId",
  "telegramUserId",
  "username",
  "firstName",
  "lastName",
  "languageCode",
  "createdAt",
  "updatedAt",
  "lastAuthenticatedAt"
)
SELECT
  'tg_' || "id",
  "id",
  "telegramId",
  "username",
  "firstName",
  "lastName",
  "locale",
  "createdAt",
  "updatedAt",
  CURRENT_TIMESTAMP
FROM "User"
WHERE "telegramId" IS NOT NULL
ON CONFLICT ("telegramUserId") DO NOTHING;

CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'ru',
  "theme" "UserTheme" NOT NULL DEFAULT 'TELEGRAM',
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

ALTER TABLE "UserPreference"
  ADD CONSTRAINT "UserPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserPreference" ("id", "userId", "locale", "theme", "createdAt", "updatedAt")
SELECT 'pref_' || "id", "id", "locale", "theme", "createdAt", "updatedAt"
FROM "User"
ON CONFLICT ("userId") DO NOTHING;

DROP TABLE IF EXISTS "UserSession";

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "appContext" "AppContext" NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "sessionFamilyId" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokeReason" TEXT,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");
CREATE INDEX "AuthSession_sessionFamilyId_idx" ON "AuthSession"("sessionFamilyId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverProfile"
  ADD COLUMN "onboardingStatus" "DriverOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "city" TEXT;

ALTER TABLE "DriverProfile"
  ALTER COLUMN "verificationStatus" DROP DEFAULT;

ALTER TABLE "DriverProfile"
  ALTER COLUMN "verificationStatus" TYPE "DriverVerificationStatus"
  USING (
    CASE
      WHEN "verificationStatus" = 'APPROVED' THEN 'APPROVED'
      WHEN "verificationStatus" = 'REJECTED' THEN 'REJECTED'
      WHEN "verificationStatus" = 'PENDING' THEN 'PENDING'
      WHEN "verificationStatus" = 'SUSPENDED' THEN 'SUSPENDED'
      ELSE 'NOT_SUBMITTED'
    END
  )::"DriverVerificationStatus";

ALTER TABLE "DriverProfile"
  ALTER COLUMN "verificationStatus" SET DEFAULT 'NOT_SUBMITTED';

CREATE TABLE "ClientProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "city" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

ALTER TABLE "ClientProfile"
  ADD CONSTRAINT "ClientProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

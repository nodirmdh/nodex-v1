import "reflect-metadata";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Socket } from "node:net";
import { dirname, resolve } from "node:path";
import { Catch, HttpException, Module } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ThrottlerModule } from "@nestjs/throttler";
import {
  signSessionToken,
  validateTelegramInitData,
  verifySessionToken,
  type TelegramUserPayload,
} from "@nodex/auth";
import { parseAppEnv, supportedLocales, type SupportedLocale } from "@nodex/config";
import {
  ManualPaymentProviderAdapter,
  MockPaymentProviderAdapter,
  PaymentProviderRegistry,
  assertBalancedLedger,
  assertRefundAllowed,
  calculatePricing,
  refundableAmount,
  transitionIntentStatus,
  transitionPaymentStatus,
  type CurrencyCode,
  type PaymentProviderCode,
} from "@nodex/payments";
import { PrismaClient, serializeBigInt, type Prisma } from "@nodex/database";
import {
  bookingCancelSchema,
  bookingConfirmSchema,
  bookingHoldSchema,
  boardingCodeCanAttempt,
  boardingCodeRegenerateSchema,
  boardingCodeVerifySchema,
  calculateSlaDueAt,
  accountRestrictionSchema,
  analyticsEventSchema,
  chatMessageEditSchema,
  chatMessageSchema,
  calculateRatingAggregate,
  calculateReliabilityLevel,
  canCreateUserBlock,
  driverBookingDecisionSchema,
  driverDocumentCompleteSchema,
  driverDocumentPresignSchema,
  driverReviewDecisionSchema,
  driverVerificationDraftSchema,
  citySchema,
  generateSeatLayout,
  createConversationSchema,
  pickupPointSchema,
  regionSchema,
  operationReasonSchema,
  bookingChatEligible,
  calculateParcelPriceMinor,
  defaultChatLimits,
  defaultParcelLimits,
  evaluateSupportTransition,
  evaluateParcelTransition,
  evaluateReviewEligibility,
  evaluateSafetyTransition,
  emergencyActionSchema,
  messageReportSchema,
  notificationCreateSchema,
  parcelCodeCanAttempt,
  parcelCodeVerifySchema,
  parcelDraftSchema,
  parcelPhotoSchema,
  parcelReasonSchema,
  parcelSubmitSchema,
  parcelStatuses,
  parcelChatEligible,
  routeSchema,
  searchEventSchema,
  safetyAssignmentSchema,
  safetyInternalNoteSchema,
  safetyReportSchema,
  safetyReportStatusSchema,
  cashConfirmationSchema,
  mockWebhookSchema,
  normalizeMinorUnit,
  paymentIntentCreateSchema,
  payoutCreateSchema,
  payoutStatusSchema,
  providerAllowedInProduction,
  reconciliationRunSchema,
  refundRequestSchema,
  supportAssignmentSchema,
  supportAttachmentMetadataSchema,
  supportTicketCreateSchema,
  supportTicketMessageSchema,
  supportTicketStatusSchema,
  tripAdminActionSchema,
  tripCancelSchema,
  tripCompleteSchema,
  tripDraftSchema,
  tripLocationPointSchema,
  tripStartPinVerifySchema,
  evaluateTripLocationWrite,
  evaluateRewardFraud,
  calculateDriverMilestoneProgress,
  rewardReviewDecisionSchema,
  referralCreateSchema,
  rewardStatusForFraudStatus,
  tripStartSchema,
  evaluateTripTransition,
  tripSearchQuerySchema,
  tripShareCreateSchema,
  tripStopSchema,
  canMatchWaitlistEntryToTrip,
  waitlistEntryCreateSchema,
  savedRouteCreateSchema,
  returnTripDraftSchema,
  reviewEditSchema,
  reviewReportSchema,
  reviewSchema,
  restrictionRevokeSchema,
  stripUnsafeReviewText,
  trustedContactSchema,
  userBlockSchema,
  vehicleDocumentCompleteSchema,
  vehicleDocumentPresignSchema,
  vehicleDraftSchema,
  vehicleModerationDecisionSchema,
  vehiclePhotoCompleteSchema,
  vehiclePhotoPresignSchema,
} from "@nodex/validation";
import { json } from "express";
import type { Request, Response } from "express";
import helmet from "helmet";
import { LoggerModule } from "nestjs-pino";

type AppContext = "CLIENT_APP" | "DRIVER_APP" | "ADMIN_WEB" | "LOCAL_MOCK";
type RoleCode = "CLIENT" | "DRIVER" | "ADMIN" | "SUPPORT";
type UserTheme = "SYSTEM" | "LIGHT" | "DARK" | "TELEGRAM";
type AuthenticatedRequest = Request & {
  requestId?: string;
  rawBody?: string;
  auth?: { userId: string; sessionId: string; roles: RoleCode[]; appContext: AppContext };
};

const prisma = new PrismaClient();
const env = parseAppEnv(process.env);
const paymentRegistry = new PaymentProviderRegistry();
paymentRegistry.register(new MockPaymentProviderAdapter());
paymentRegistry.register(new ManualPaymentProviderAdapter());
const accessTokenSecret = env.AUTH_ACCESS_TOKEN_SECRET || env.JWT_SECRET;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const refreshCookieName = "nodex_refresh";
const bookingHoldTtlMs = durationToMs(process.env.BOOKING_HOLD_TTL ?? "10m");
const bookingLockTtlMs = durationToMs(process.env.BOOKING_LOCK_TTL ?? "15s");
const boardingCodeTtlMs = durationToMs(process.env.BOARDING_CODE_TTL ?? "2h");
const boardingCodeLength = Number(process.env.BOARDING_CODE_LENGTH ?? 6);
const boardingCodeMaxAttempts = Number(process.env.BOARDING_CODE_MAX_ATTEMPTS ?? 5);
const tripStartPinTtlMs = durationToMs(process.env.TRIP_START_PIN_TTL ?? "2h");
const tripStartPinLength = Number(process.env.TRIP_START_PIN_LENGTH ?? 4);
const tripStartPinMaxAttempts = Number(process.env.TRIP_START_PIN_MAX_ATTEMPTS ?? 5);
const periodicTrackingMinIntervalMs = durationToMs(
  process.env.TRIP_PERIODIC_TRACKING_MIN_INTERVAL ?? "60s",
);
const parcelCodeTtlMs = durationToMs(process.env.PARCEL_CODE_TTL ?? "24h");
const parcelCodeLength = Number(process.env.PARCEL_CODE_LENGTH ?? 6);
const parcelCodeMaxAttempts = Number(process.env.PARCEL_CODE_MAX_ATTEMPTS ?? 5);
const appContextRoles: Record<AppContext, RoleCode> = {
  CLIENT_APP: "CLIENT",
  DRIVER_APP: "DRIVER",
  ADMIN_WEB: "ADMIN",
  LOCAL_MOCK: "CLIENT",
};

const openApiOutputArgIndex = process.argv.indexOf("--openapi-output");
const openApiOutputPath =
  openApiOutputArgIndex >= 0 ? process.argv[openApiOutputArgIndex + 1] : undefined;

@Catch()
class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<AuthenticatedRequest>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception instanceof Error ? exception.message : "Unexpected error";
    response.status(status).json({
      error: {
        code: status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
        message,
        details: [],
        requestId: request.requestId ?? "unknown",
      },
    });
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.initData",
          "req.body.accessToken",
          "req.body.refreshToken",
          "req.body.token",
          "*.botToken",
          "*.refreshTokenHash",
          "*.phone",
        ],
        customProps: () => ({ service: "nodex-api" }),
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
})
class AppModule {}

function durationToMs(duration: string) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";
  return value * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function ipHash(req: Request) {
  const raw = req.ip || req.socket.remoteAddress || "unknown";
  return hashSecret(raw);
}

function normalizePhone(phone: unknown) {
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+")) return normalized.slice(0, 32);
  if (normalized.startsWith("998")) return `+${normalized}`.slice(0, 32);
  return normalized.slice(0, 32);
}

function normalizeLocale(locale: unknown, fallback: SupportedLocale = "ru"): SupportedLocale {
  return typeof locale === "string" && supportedLocales.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : fallback;
}

function normalizeTheme(theme: unknown): UserTheme {
  return ["SYSTEM", "LIGHT", "DARK", "TELEGRAM"].includes(String(theme))
    ? (theme as UserTheme)
    : "TELEGRAM";
}

function cleanText(value: unknown, max = 120) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[<>]/g, "").trim();
  return text ? text.slice(0, max) : null;
}

function getCookie(req: Request, name: string) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const entry = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function setRefreshCookie(res: Response, refreshToken: string, expiresAt: Date) {
  const parts = [
    `${refreshCookieName}=${encodeURIComponent(refreshToken)}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (env.AUTH_COOKIE_SECURE || env.NODE_ENV === "production") parts.push("Secure");
  if (env.AUTH_COOKIE_DOMAIN) parts.push(`Domain=${env.AUTH_COOKIE_DOMAIN}`);
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearRefreshCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${refreshCookieName}=; HttpOnly; Path=/api/v1/auth; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

function appContextFromBody(value: unknown): AppContext {
  if (value === "CLIENT_APP" || value === "DRIVER_APP" || value === "ADMIN_WEB") return value;
  throw Object.assign(new Error("Invalid app context"), {
    statusCode: 400,
    code: "AUTH_CONTEXT_INVALID",
  });
}

function botTokenForContext(appContext: AppContext) {
  if (appContext === "CLIENT_APP") return env.TELEGRAM_CLIENT_BOT_TOKEN;
  if (appContext === "DRIVER_APP") return env.TELEGRAM_DRIVER_BOT_TOKEN;
  throw Object.assign(new Error("Invalid app context"), {
    statusCode: 400,
    code: "AUTH_CONTEXT_INVALID",
  });
}

async function writeAudit(
  action: string,
  entityType: string,
  entityId: string,
  actorUserId?: string,
  requestId?: string,
  payload?: unknown,
) {
  const data: Prisma.AuditEventCreateInput = {
    action,
    entityType,
    entityId,
    actorUserId: actorUserId ?? null,
    requestId: requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await prisma.auditEvent.create({
    data,
  });
}

async function ensureRole(userId: string, code: RoleCode, requestId?: string) {
  const role = await prisma.role.upsert({
    where: { code },
    create: { code, name: code },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });
  await writeAudit("ROLE_ASSIGNED", "User", userId, userId, requestId, { role: code });
}

async function createSession(userId: string, appContext: AppContext, req: Request) {
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + durationToMs(env.AUTH_REFRESH_TOKEN_TTL));
  const session = await prisma.authSession.create({
    data: {
      userId,
      appContext,
      refreshTokenHash: hashSecret(refreshToken),
      sessionFamilyId: randomUUID(),
      userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
      ipHash: ipHash(req),
      expiresAt,
    },
  });
  const accessTokenExpiresAt = new Date(Date.now() + durationToMs(env.AUTH_ACCESS_TOKEN_TTL));
  const accessToken = await signSessionToken(
    { sub: userId, sid: session.id, appContext },
    accessTokenSecret,
    env.AUTH_ACCESS_TOKEN_TTL,
  );
  return { session, refreshToken, accessToken, accessTokenExpiresAt };
}

async function userRoles(userId: string): Promise<RoleCode[]> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return roles
    .map(({ role }) => role.code)
    .filter((code): code is RoleCode => ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"].includes(code));
}

async function serializeUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      telegramIdentity: true,
      clientProfile: true,
      driver: true,
      preferences: true,
      roles: { include: { role: true } },
      sessions: { where: { revokedAt: null } },
    },
  });
  const roles = user.roles.map(({ role }) => role.code);
  return serializeBigInt({
    id: user.id,
    status: user.status,
    roles,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    username: user.telegramIdentity?.username ?? user.username,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    locale: user.preferences?.locale ?? user.locale,
    theme: user.preferences?.theme ?? user.theme,
    acceptedTermsAt: user.acceptedTermsAt,
    profileCompletion: {
      client: Boolean(user.clientProfile?.city),
      driver: user.driver?.onboardingStatus ?? null,
      acceptedTerms: Boolean(user.acceptedTermsAt),
    },
    clientProfile: roles.includes("CLIENT") ? user.clientProfile : null,
    driverProfile: roles.includes("DRIVER") ? user.driver : null,
    sessionsCount: user.sessions.length,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
  });
}

async function authenticate(req: AuthenticatedRequest, res: Response, roles?: RoleCode[]) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json(errorBody("AUTH_SESSION_EXPIRED", "Authentication required", req));
    return false;
  }
  try {
    const token = authHeader.slice("Bearer ".length);
    const verified = await verifySessionToken(token, accessTokenSecret);
    const userId = String(verified.payload.sub);
    const sessionId = String(verified.payload.sid);
    const appContext = String(verified.payload.appContext) as AppContext;
    const session = await prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== userId ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      res.status(401).json(errorBody("AUTH_SESSION_EXPIRED", "Session expired", req));
      return false;
    }
    if (session.user.status === "BLOCKED" || session.user.status === "DELETED") {
      res.status(403).json(errorBody("AUTH_USER_BLOCKED", "User is blocked", req));
      return false;
    }
    const ownedRoles = await userRoles(userId);
    if (roles && roles.every((role) => !ownedRoles.includes(role))) {
      res.status(403).json(errorBody("AUTH_ROLE_FORBIDDEN", "Role is forbidden", req));
      return false;
    }
    req.auth = { userId, sessionId, roles: ownedRoles, appContext };
    return true;
  } catch {
    res.status(401).json(errorBody("AUTH_SESSION_EXPIRED", "Session expired", req));
    return false;
  }
}

function errorBody(code: string, message: string, req: AuthenticatedRequest) {
  return { error: { code, message, details: [], requestId: req.requestId ?? "unknown" } };
}

function handleError(res: Response, req: AuthenticatedRequest, error: unknown) {
  const status =
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 400;
  const code =
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "VALIDATION_ERROR";
  const message = error instanceof Error ? error.message : "Request failed";
  res.status(status).json(errorBody(code, message, req));
}

function phase1OpenApiPaths() {
  const bearer = [{ bearer: [] }];
  const json = { "application/json": { schema: { type: "object" } } };
  return {
    "/api/v1/auth/telegram": {
      post: {
        operationId: "telegramAuth",
        tags: ["Authentication"],
        requestBody: { required: true, content: json },
        responses: {
          200: { description: "Authenticated", content: json },
          400: { description: "Invalid initData" },
        },
      },
    },
    "/api/v1/auth/mock": {
      post: {
        operationId: "mockAuth",
        tags: ["Authentication"],
        requestBody: { required: true, content: json },
        responses: {
          200: { description: "Mock authenticated", content: json },
          403: { description: "Mock disabled" },
        },
      },
    },
    "/api/v1/auth/refresh": {
      post: {
        operationId: "refreshAuth",
        tags: ["Authentication"],
        responses: {
          200: { description: "Session refreshed", content: json },
          401: { description: "Invalid refresh token" },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        operationId: "logout",
        tags: ["Authentication"],
        security: bearer,
        responses: { 200: { description: "Logged out", content: json } },
      },
    },
    "/api/v1/auth/logout-all": {
      post: {
        operationId: "logoutAll",
        tags: ["Authentication"],
        security: bearer,
        responses: { 200: { description: "All sessions logged out", content: json } },
      },
    },
    "/api/v1/auth/session": {
      get: {
        operationId: "getSession",
        tags: ["Authentication"],
        security: bearer,
        responses: { 200: { description: "Current session", content: json } },
      },
    },
    "/api/v1/me": {
      get: {
        operationId: "getMe",
        tags: ["Profile"],
        security: bearer,
        responses: { 200: { description: "Current user", content: json } },
      },
      patch: {
        operationId: "updateMe",
        tags: ["Profile"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Updated user", content: json } },
      },
    },
    "/api/v1/me/preferences": {
      patch: {
        operationId: "updatePreferences",
        tags: ["Profile"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Updated preferences", content: json } },
      },
    },
    "/api/v1/me/accept-terms": {
      post: {
        operationId: "acceptTerms",
        tags: ["Profile"],
        security: bearer,
        responses: { 200: { description: "Terms accepted", content: json } },
      },
    },
    "/api/v1/me/sessions": {
      get: {
        operationId: "listMySessions",
        tags: ["Profile"],
        security: bearer,
        responses: { 200: { description: "User sessions", content: json } },
      },
    },
    "/api/v1/me/sessions/{sessionId}": {
      delete: {
        operationId: "revokeMySession",
        tags: ["Profile"],
        security: bearer,
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Session revoked", content: json },
          404: { description: "Session not found" },
        },
      },
    },
    "/api/v1/admin/users": {
      get: {
        operationId: "listAdminUsers",
        tags: ["Admin"],
        security: bearer,
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string" } },
          { name: "role", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Users list", content: json },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/v1/admin/users/{userId}": {
      get: {
        operationId: "getAdminUser",
        tags: ["Admin"],
        security: bearer,
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "User detail", content: json },
          404: { description: "User not found" },
        },
      },
    },
  };
}

function phase2OpenApiPaths() {
  const bearer = [{ bearer: [] }];
  const json = { "application/json": { schema: { type: "object" } } };
  const applicationId = {
    name: "applicationId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  const documentId = {
    name: "documentId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  return {
    "/api/v1/driver/verification": {
      get: {
        operationId: "getDriverVerification",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Current driver verification", content: json } },
      },
      post: {
        operationId: "createDriverVerification",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 201: { description: "Driver verification draft", content: json } },
      },
      patch: {
        operationId: "updateDriverVerification",
        tags: ["Driver Verification"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Updated driver verification draft", content: json } },
      },
    },
    "/api/v1/driver/verification/submit": {
      post: {
        operationId: "submitDriverVerification",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Submitted driver verification", content: json } },
      },
    },
    "/api/v1/driver/verification/withdraw": {
      post: {
        operationId: "withdrawDriverVerification",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Withdrawn driver verification", content: json } },
      },
    },
    "/api/v1/driver/verification/history": {
      get: {
        operationId: "getDriverVerificationHistory",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Driver verification history", content: json } },
      },
    },
    "/api/v1/driver/verification/completion": {
      get: {
        operationId: "getDriverVerificationCompletion",
        tags: ["Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Driver verification completion", content: json } },
      },
    },
    "/api/v1/driver/verification/documents/presign": {
      post: {
        operationId: "presignDriverVerificationDocument",
        tags: ["Driver Verification"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Signed upload URL", content: json } },
      },
    },
    "/api/v1/driver/verification/documents/complete": {
      post: {
        operationId: "completeDriverVerificationDocument",
        tags: ["Driver Verification"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Completed document upload", content: json } },
      },
    },
    "/api/v1/driver/verification/documents/{documentId}": {
      delete: {
        operationId: "deleteDriverVerificationDocument",
        tags: ["Driver Verification"],
        security: bearer,
        parameters: [documentId],
        responses: { 200: { description: "Deleted document metadata", content: json } },
      },
    },
    "/api/v1/driver/verification/documents/{documentId}/replace": {
      post: {
        operationId: "replaceDriverVerificationDocument",
        tags: ["Driver Verification"],
        security: bearer,
        parameters: [documentId],
        requestBody: { required: false, content: json },
        responses: { 202: { description: "Replacement flow hint", content: json } },
      },
    },
    "/api/v1/driver/verification/documents/{documentId}/download": {
      get: {
        operationId: "downloadDriverVerificationDocument",
        tags: ["Driver Verification"],
        security: bearer,
        parameters: [documentId],
        responses: { 200: { description: "Signed download URL", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications": {
      get: {
        operationId: "listAdminDriverVerifications",
        tags: ["Admin Driver Verification"],
        security: bearer,
        responses: { 200: { description: "Verification queue", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}": {
      get: {
        operationId: "getAdminDriverVerification",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        responses: { 200: { description: "Verification detail", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/history": {
      get: {
        operationId: "getAdminDriverVerificationHistory",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        responses: { 200: { description: "Verification history", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/start-review": {
      post: {
        operationId: "startAdminDriverVerificationReview",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        responses: { 200: { description: "Review started", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/approve": {
      post: {
        operationId: "approveAdminDriverVerification",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Approved", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/reject": {
      post: {
        operationId: "rejectAdminDriverVerification",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Rejected", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/request-changes": {
      post: {
        operationId: "requestAdminDriverVerificationChanges",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Changes requested", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/suspend": {
      post: {
        operationId: "suspendAdminDriverVerification",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Suspended", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/restore": {
      post: {
        operationId: "restoreAdminDriverVerification",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Restored", content: json } },
      },
    },
    "/api/v1/admin/driver-verifications/{applicationId}/documents/{documentId}": {
      get: {
        operationId: "getAdminDriverVerificationDocument",
        tags: ["Admin Driver Verification"],
        security: bearer,
        parameters: [applicationId, documentId],
        responses: { 200: { description: "Admin document download", content: json } },
      },
    },
  };
}

function phase3OpenApiPaths() {
  const bearer = [{ bearer: [] }];
  const json = { "application/json": { schema: { type: "object" } } };
  const vehicleId = {
    name: "vehicleId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  const documentId = {
    name: "documentId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  const photoId = {
    name: "photoId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  return {
    "/api/v1/vehicles": {
      get: {
        operationId: "listDriverVehicles",
        tags: ["Vehicles"],
        security: bearer,
        responses: { 200: { description: "Driver vehicles", content: json } },
      },
      post: {
        operationId: "createDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        requestBody: { required: false, content: json },
        responses: { 201: { description: "Vehicle draft", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}": {
      get: {
        operationId: "getDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Vehicle detail", content: json } },
      },
      patch: {
        operationId: "updateDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Updated vehicle", content: json } },
      },
      delete: {
        operationId: "archiveDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Archived vehicle", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/submit": {
      post: {
        operationId: "submitDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Submitted vehicle", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/resubmit": {
      post: {
        operationId: "resubmitDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Resubmitted vehicle", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/set-primary": {
      post: {
        operationId: "setPrimaryDriverVehicle",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Primary vehicle set", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/documents": {
      post: {
        operationId: "completeVehicleDocument",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Vehicle document", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/documents/presign": {
      post: {
        operationId: "presignVehicleDocument",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Signed document upload", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/documents/{documentId}": {
      delete: {
        operationId: "deleteVehicleDocument",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId, documentId],
        responses: { 200: { description: "Vehicle document removed", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/photos": {
      post: {
        operationId: "completeVehiclePhoto",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Vehicle photo", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/photos/presign": {
      post: {
        operationId: "presignVehiclePhoto",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Signed photo upload", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/photos/{photoId}": {
      delete: {
        operationId: "deleteVehiclePhoto",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId, photoId],
        responses: { 200: { description: "Vehicle photo removed", content: json } },
      },
    },
    "/api/v1/vehicles/{vehicleId}/history": {
      get: {
        operationId: "getDriverVehicleHistory",
        tags: ["Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Vehicle history", content: json } },
      },
    },
    "/api/v1/admin/vehicles": {
      get: {
        operationId: "listAdminVehicles",
        tags: ["Admin Vehicles"],
        security: bearer,
        responses: { 200: { description: "Vehicle moderation queue", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}": {
      get: {
        operationId: "getAdminVehicle",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Vehicle moderation detail", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/history": {
      get: {
        operationId: "getAdminVehicleHistory",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Vehicle moderation history", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/start-review": {
      post: {
        operationId: "startAdminVehicleReview",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        responses: { 200: { description: "Vehicle review started", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/approve": {
      post: {
        operationId: "approveAdminVehicle",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Vehicle approved", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/request-changes": {
      post: {
        operationId: "requestAdminVehicleChanges",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Vehicle changes requested", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/reject": {
      post: {
        operationId: "rejectAdminVehicle",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Vehicle rejected", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/suspend": {
      post: {
        operationId: "suspendAdminVehicle",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Vehicle suspended", content: json } },
      },
    },
    "/api/v1/admin/vehicles/{vehicleId}/restore": {
      post: {
        operationId: "restoreAdminVehicle",
        tags: ["Admin Vehicles"],
        security: bearer,
        parameters: [vehicleId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Vehicle restored", content: json } },
      },
    },
  };
}

function phase4OpenApiPaths() {
  const bearer = [{ bearer: [] }];
  const json = { "application/json": { schema: { type: "object" } } };
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  const cityId = { name: "cityId", in: "path", required: true, schema: { type: "string" } };
  const routeId = { name: "routeId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/regions": {
      get: {
        operationId: "listRegions",
        tags: ["Directories"],
        responses: { 200: { description: "Regions", content: json } },
      },
    },
    "/api/v1/cities": {
      get: {
        operationId: "listCities",
        tags: ["Directories"],
        responses: { 200: { description: "Cities", content: json } },
      },
    },
    "/api/v1/cities/{cityId}": {
      get: {
        operationId: "getCity",
        tags: ["Directories"],
        parameters: [cityId],
        responses: { 200: { description: "City", content: json } },
      },
    },
    "/api/v1/cities/{cityId}/pickup-points": {
      get: {
        operationId: "listCityPickupPoints",
        tags: ["Directories"],
        parameters: [cityId],
        responses: { 200: { description: "Pickup points", content: json } },
      },
    },
    "/api/v1/routes": {
      get: {
        operationId: "listRoutes",
        tags: ["Directories"],
        responses: { 200: { description: "Routes", content: json } },
      },
    },
    "/api/v1/routes/{routeId}": {
      get: {
        operationId: "getRoute",
        tags: ["Directories"],
        parameters: [routeId],
        responses: { 200: { description: "Route", content: json } },
      },
    },
    "/api/v1/trips/mine": {
      get: {
        operationId: "listMyTrips",
        tags: ["Trips"],
        security: bearer,
        responses: { 200: { description: "My trips", content: json } },
      },
    },
    "/api/v1/trips": {
      post: {
        operationId: "createTrip",
        tags: ["Trips"],
        security: bearer,
        requestBody: { required: false, content: json },
        responses: { 201: { description: "Trip draft", content: json } },
      },
    },
    "/api/v1/trips/{tripId}": {
      get: {
        operationId: "getTrip",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Trip", content: json } },
      },
      patch: {
        operationId: "updateTrip",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Updated trip", content: json } },
      },
    },
    "/api/v1/trips/{tripId}/publish": {
      post: {
        operationId: "publishTrip",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Published trip", content: json } },
      },
    },
    "/api/v1/trips/{tripId}/unpublish": {
      post: {
        operationId: "unpublishTrip",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Unpublished trip", content: json } },
      },
    },
    "/api/v1/trips/{tripId}/cancel": {
      post: {
        operationId: "cancelTrip",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Cancelled trip", content: json } },
      },
    },
    "/api/v1/trips/{tripId}/history": {
      get: {
        operationId: "getTripHistory",
        tags: ["Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Trip history", content: json } },
      },
    },
    "/api/v1/admin/regions": {
      get: {
        operationId: "listAdminRegions",
        tags: ["Admin Directories"],
        security: bearer,
        responses: { 200: { description: "Admin regions", content: json } },
      },
      post: {
        operationId: "createAdminRegion",
        tags: ["Admin Directories"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Region", content: json } },
      },
    },
    "/api/v1/admin/cities": {
      get: {
        operationId: "listAdminCities",
        tags: ["Admin Directories"],
        security: bearer,
        responses: { 200: { description: "Admin cities", content: json } },
      },
      post: {
        operationId: "createAdminCity",
        tags: ["Admin Directories"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "City", content: json } },
      },
    },
    "/api/v1/admin/pickup-points": {
      get: {
        operationId: "listAdminPickupPoints",
        tags: ["Admin Directories"],
        security: bearer,
        responses: { 200: { description: "Admin pickup points", content: json } },
      },
      post: {
        operationId: "createAdminPickupPoint",
        tags: ["Admin Directories"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Pickup point", content: json } },
      },
    },
    "/api/v1/admin/routes": {
      get: {
        operationId: "listAdminRoutes",
        tags: ["Admin Directories"],
        security: bearer,
        responses: { 200: { description: "Admin routes", content: json } },
      },
      post: {
        operationId: "createAdminRoute",
        tags: ["Admin Directories"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Route", content: json } },
      },
    },
    "/api/v1/admin/trips": {
      get: {
        operationId: "listAdminTrips",
        tags: ["Admin Trips"],
        security: bearer,
        responses: { 200: { description: "Admin trips", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}": {
      get: {
        operationId: "getAdminTrip",
        tags: ["Admin Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Admin trip", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/block": {
      post: {
        operationId: "blockAdminTrip",
        tags: ["Admin Trips"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Blocked trip", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/unblock": {
      post: {
        operationId: "unblockAdminTrip",
        tags: ["Admin Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Unblocked trip", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/cancel": {
      post: {
        operationId: "cancelAdminTrip",
        tags: ["Admin Trips"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Admin cancelled trip", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/history": {
      get: {
        operationId: "getAdminTripHistory",
        tags: ["Admin Trips"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Admin trip history", content: json } },
      },
    },
  };
}

function phase5OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/trips/search": {
      get: {
        operationId: "searchPublicTrips",
        tags: ["Public Trip Search"],
        parameters: [
          { name: "originCityId", in: "query", required: true, schema: { type: "string" } },
          { name: "destinationCityId", in: "query", required: true, schema: { type: "string" } },
          { name: "date", in: "query", required: true, schema: { type: "string" } },
          { name: "passengers", in: "query", required: false, schema: { type: "integer" } },
          { name: "sort", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Search results", content: json } },
      },
    },
    "/api/v1/trips/public/{tripId}": {
      get: {
        operationId: "getPublicTrip",
        tags: ["Public Trip Search"],
        parameters: [tripId],
        responses: { 200: { description: "Public trip detail", content: json } },
      },
    },
    "/api/v1/search-events": {
      post: {
        operationId: "recordSearchEvent",
        tags: ["Public Trip Search"],
        requestBody: { required: true, content: json },
        responses: { 202: { description: "Search event accepted", content: json } },
      },
    },
  };
}

function phase6OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  const holdId = { name: "holdId", in: "path", required: true, schema: { type: "string" } };
  const bookingId = { name: "bookingId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/trips/public/{tripId}/seats": {
      get: {
        operationId: "getPublicTripSeats",
        tags: ["Booking"],
        parameters: [tripId],
        responses: { 200: { description: "Public seat inventory", content: json } },
      },
    },
    "/api/v1/bookings/holds": {
      post: {
        operationId: "createSeatHold",
        tags: ["Booking"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Seat hold", content: json } },
      },
    },
    "/api/v1/bookings/holds/{holdId}": {
      get: {
        operationId: "getSeatHold",
        tags: ["Booking"],
        security: bearer,
        parameters: [holdId],
        responses: { 200: { description: "Seat hold detail", content: json } },
      },
      delete: {
        operationId: "releaseSeatHold",
        tags: ["Booking"],
        security: bearer,
        parameters: [holdId],
        responses: { 200: { description: "Released hold", content: json } },
      },
    },
    "/api/v1/bookings/holds/{holdId}/confirm": {
      post: {
        operationId: "confirmSeatHold",
        tags: ["Booking"],
        security: bearer,
        parameters: [holdId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Confirmed booking", content: json } },
      },
    },
    "/api/v1/bookings/mine": {
      get: {
        operationId: "listMyBookings",
        tags: ["Booking"],
        security: bearer,
        responses: { 200: { description: "Client bookings", content: json } },
      },
    },
    "/api/v1/bookings/{bookingId}": {
      get: {
        operationId: "getMyBooking",
        tags: ["Booking"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Client booking", content: json } },
      },
    },
    "/api/v1/bookings/{bookingId}/cancel": {
      post: {
        operationId: "cancelMyBooking",
        tags: ["Booking"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Cancelled booking", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/bookings": {
      get: {
        operationId: "listDriverTripBookings",
        tags: ["Driver Bookings"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Trip bookings", content: json } },
      },
    },
    "/api/v1/driver/bookings/{bookingId}": {
      get: {
        operationId: "getDriverBooking",
        tags: ["Driver Bookings"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Driver booking", content: json } },
      },
    },
    "/api/v1/driver/bookings/{bookingId}/approve": {
      post: {
        operationId: "approveDriverBooking",
        tags: ["Driver Bookings"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Approved booking", content: json } },
      },
    },
    "/api/v1/driver/bookings/{bookingId}/reject": {
      post: {
        operationId: "rejectDriverBooking",
        tags: ["Driver Bookings"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Rejected booking", content: json } },
      },
    },
    "/api/v1/admin/bookings": {
      get: {
        operationId: "listAdminBookings",
        tags: ["Admin Bookings"],
        security: bearer,
        responses: { 200: { description: "Admin bookings", content: json } },
      },
    },
    "/api/v1/admin/bookings/{bookingId}": {
      get: {
        operationId: "getAdminBooking",
        tags: ["Admin Bookings"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Admin booking", content: json } },
      },
    },
    "/api/v1/admin/bookings/{bookingId}/cancel": {
      post: {
        operationId: "cancelAdminBooking",
        tags: ["Admin Bookings"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Admin cancelled booking", content: json } },
      },
    },
    "/api/v1/admin/bookings/{bookingId}/history": {
      get: {
        operationId: "getAdminBookingHistory",
        tags: ["Admin Bookings"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Booking history", content: json } },
      },
    },
  };
}

function phase7OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  const bookingId = { name: "bookingId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/bookings/{bookingId}/boarding-code": {
      get: {
        operationId: "getMyBoardingCode",
        tags: ["Trip Operations"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Client boarding code", content: json } },
      },
    },
    "/api/v1/bookings/{bookingId}/boarding-code/regenerate": {
      post: {
        operationId: "regenerateMyBoardingCode",
        tags: ["Trip Operations"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Regenerated boarding code", content: json } },
      },
    },
    "/api/v1/bookings/{bookingId}/operation-status": {
      get: {
        operationId: "getMyBookingOperationStatus",
        tags: ["Trip Operations"],
        security: bearer,
        parameters: [bookingId],
        responses: { 200: { description: "Booking operation status", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/start-boarding": {
      post: {
        operationId: "startDriverTripBoarding",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Boarding started", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/passengers": {
      get: {
        operationId: "listDriverTripPassengers",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Driver passengers", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/boarding": {
      get: {
        operationId: "getDriverTripBoarding",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Driver boarding state", content: json } },
      },
    },
    "/api/v1/driver/bookings/{bookingId}/board": {
      post: {
        operationId: "boardDriverBooking",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Boarded booking", content: json } },
      },
    },
    "/api/v1/driver/bookings/{bookingId}/no-show": {
      post: {
        operationId: "markDriverBookingNoShow",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [bookingId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Client no-show marked", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/start": {
      post: {
        operationId: "startDriverTrip",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Trip started", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/complete": {
      post: {
        operationId: "completeDriverTrip",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: false, content: json },
        responses: { 200: { description: "Trip completed", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/cancel": {
      post: {
        operationId: "cancelDriverTripOperational",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Trip cancelled by driver", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/operations": {
      get: {
        operationId: "getDriverTripOperations",
        tags: ["Driver Trip Operations"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Driver trip operations", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/operations": {
      get: {
        operationId: "getAdminTripOperations",
        tags: ["Admin Trip Operations"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Admin trip operations", content: json } },
      },
    },
    "/api/v1/admin/trips/{tripId}/no-show-driver": {
      post: {
        operationId: "markAdminDriverNoShow",
        tags: ["Admin Trip Operations"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Driver no-show marked", content: json } },
      },
    },
  };
}

function phase8OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  const parcelId = { name: "parcelId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/parcel-categories": {
      get: {
        operationId: "listParcelCategories",
        tags: ["Parcels"],
        responses: { 200: { description: "Parcel categories", content: json } },
      },
    },
    "/api/v1/parcel-rules": {
      get: {
        operationId: "getParcelRules",
        tags: ["Parcels"],
        responses: {
          200: { description: "Parcel limits and prohibited categories", content: json },
        },
      },
    },
    "/api/v1/trips/public/{tripId}/parcel-availability": {
      get: {
        operationId: "getTripParcelAvailability",
        tags: ["Parcels"],
        parameters: [tripId],
        responses: { 200: { description: "Trip parcel availability", content: json } },
      },
    },
    "/api/v1/parcels": {
      post: {
        operationId: "createParcel",
        tags: ["Client Parcels"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Parcel draft", content: json } },
      },
    },
    "/api/v1/parcels/mine": {
      get: {
        operationId: "listMyParcels",
        tags: ["Client Parcels"],
        security: bearer,
        responses: { 200: { description: "Client parcels", content: json } },
      },
    },
    "/api/v1/parcels/{parcelId}": {
      get: {
        operationId: "getMyParcel",
        tags: ["Client Parcels"],
        security: bearer,
        parameters: [parcelId],
        responses: { 200: { description: "Client parcel", content: json } },
      },
    },
    "/api/v1/parcels/{parcelId}/submit": {
      post: {
        operationId: "submitParcel",
        tags: ["Client Parcels"],
        security: bearer,
        parameters: [parcelId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Submitted parcel", content: json } },
      },
    },
    "/api/v1/parcels/{parcelId}/cancel": {
      post: {
        operationId: "cancelMyParcel",
        tags: ["Client Parcels"],
        security: bearer,
        parameters: [parcelId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Cancelled parcel", content: json } },
      },
    },
    "/api/v1/driver/trips/{tripId}/parcels": {
      get: {
        operationId: "listDriverTripParcels",
        tags: ["Driver Parcels"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Driver trip parcels", content: json } },
      },
    },
    "/api/v1/driver/parcels/{parcelId}/handover": {
      post: {
        operationId: "handoverDriverParcel",
        tags: ["Driver Parcels"],
        security: bearer,
        parameters: [parcelId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Parcel handed to driver", content: json } },
      },
    },
    "/api/v1/driver/parcels/{parcelId}/ready-for-pickup": {
      post: {
        operationId: "markParcelReadyForPickup",
        tags: ["Driver Parcels"],
        security: bearer,
        parameters: [parcelId],
        responses: { 200: { description: "Parcel ready for pickup", content: json } },
      },
    },
    "/api/v1/driver/parcels/{parcelId}/deliver": {
      post: {
        operationId: "deliverDriverParcel",
        tags: ["Driver Parcels"],
        security: bearer,
        parameters: [parcelId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Parcel delivered", content: json } },
      },
    },
    "/api/v1/admin/parcels": {
      get: {
        operationId: "listAdminParcels",
        tags: ["Admin Parcels"],
        security: bearer,
        responses: { 200: { description: "Admin parcels", content: json } },
      },
    },
    "/api/v1/admin/parcels/{parcelId}/history": {
      get: {
        operationId: "getAdminParcelHistory",
        tags: ["Admin Parcels"],
        security: bearer,
        parameters: [parcelId],
        responses: { 200: { description: "Parcel history", content: json } },
      },
    },
  };
}

function phase9OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const conversationId = {
    name: "conversationId",
    in: "path",
    required: true,
    schema: { type: "string" },
  };
  const messageId = { name: "messageId", in: "path", required: true, schema: { type: "string" } };
  const notificationId = { name: "id", in: "path", required: true, schema: { type: "string" } };
  const ticketId = { name: "ticketId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/conversations": {
      get: {
        operationId: "listConversations",
        tags: ["Communications"],
        security: bearer,
        responses: { 200: { description: "Conversations", content: json } },
      },
      post: {
        operationId: "createConversation",
        tags: ["Communications"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Conversation", content: json } },
      },
    },
    "/api/v1/conversations/{conversationId}": {
      get: {
        operationId: "getConversation",
        tags: ["Communications"],
        security: bearer,
        parameters: [conversationId],
        responses: { 200: { description: "Conversation", content: json } },
      },
    },
    "/api/v1/conversations/{conversationId}/messages": {
      get: {
        operationId: "listConversationMessages",
        tags: ["Communications"],
        security: bearer,
        parameters: [conversationId],
        responses: { 200: { description: "Messages", content: json } },
      },
      post: {
        operationId: "sendConversationMessage",
        tags: ["Communications"],
        security: bearer,
        parameters: [conversationId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Message", content: json } },
      },
    },
    "/api/v1/conversations/{conversationId}/read": {
      post: {
        operationId: "markConversationRead",
        tags: ["Communications"],
        security: bearer,
        parameters: [conversationId],
        responses: { 200: { description: "Read receipt", content: json } },
      },
    },
    "/api/v1/messages/{messageId}": {
      patch: {
        operationId: "editChatMessage",
        tags: ["Communications"],
        security: bearer,
        parameters: [messageId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Message", content: json } },
      },
      delete: {
        operationId: "deleteChatMessage",
        tags: ["Communications"],
        security: bearer,
        parameters: [messageId],
        responses: { 200: { description: "Message", content: json } },
      },
    },
    "/api/v1/messages/{messageId}/report": {
      post: {
        operationId: "reportChatMessage",
        tags: ["Communications"],
        security: bearer,
        parameters: [messageId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Report", content: json } },
      },
    },
    "/api/v1/notifications": {
      get: {
        operationId: "listNotifications",
        tags: ["Notifications"],
        security: bearer,
        responses: { 200: { description: "Notifications", content: json } },
      },
    },
    "/api/v1/notifications/unread-count": {
      get: {
        operationId: "getUnreadNotificationCount",
        tags: ["Notifications"],
        security: bearer,
        responses: { 200: { description: "Unread count", content: json } },
      },
    },
    "/api/v1/notifications/{id}/read": {
      post: {
        operationId: "markNotificationRead",
        tags: ["Notifications"],
        security: bearer,
        parameters: [notificationId],
        responses: { 200: { description: "Notification", content: json } },
      },
    },
    "/api/v1/notifications/read-all": {
      post: {
        operationId: "markAllNotificationsRead",
        tags: ["Notifications"],
        security: bearer,
        responses: { 200: { description: "Read count", content: json } },
      },
    },
    "/api/v1/notifications/{id}/archive": {
      post: {
        operationId: "archiveNotification",
        tags: ["Notifications"],
        security: bearer,
        parameters: [notificationId],
        responses: { 200: { description: "Notification", content: json } },
      },
    },
    "/api/v1/support/tickets": {
      get: {
        operationId: "listMySupportTickets",
        tags: ["Support"],
        security: bearer,
        responses: { 200: { description: "Tickets", content: json } },
      },
      post: {
        operationId: "createSupportTicket",
        tags: ["Support"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/support/tickets/{ticketId}": {
      get: {
        operationId: "getMySupportTicket",
        tags: ["Support"],
        security: bearer,
        parameters: [ticketId],
        responses: { 200: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/support/tickets/{ticketId}/messages": {
      post: {
        operationId: "sendSupportTicketMessage",
        tags: ["Support"],
        security: bearer,
        parameters: [ticketId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/admin/support/tickets": {
      get: {
        operationId: "listAdminSupportTickets",
        tags: ["Admin Support"],
        security: bearer,
        responses: { 200: { description: "Admin tickets", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}": {
      get: {
        operationId: "getAdminSupportTicket",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        responses: { 200: { description: "Admin ticket", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}/reply": {
      post: {
        operationId: "replyAdminSupportTicket",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}/internal-notes": {
      post: {
        operationId: "createSupportInternalNote",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Internal note", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}/assign": {
      post: {
        operationId: "assignSupportTicket",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}/status": {
      post: {
        operationId: "updateSupportTicketStatus",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Ticket", content: json } },
      },
    },
    "/api/v1/admin/support/tickets/{ticketId}/history": {
      get: {
        operationId: "getSupportTicketHistory",
        tags: ["Admin Support"],
        security: bearer,
        parameters: [ticketId],
        responses: { 200: { description: "History", content: json } },
      },
    },
  };
}

function phase10OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const reviewId = { name: "reviewId", in: "path", required: true, schema: { type: "string" } };
  const reportId = { name: "reportId", in: "path", required: true, schema: { type: "string" } };
  const userId = { name: "userId", in: "path", required: true, schema: { type: "string" } };
  const tripId = { name: "tripId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/reviews/eligibility": {
      get: {
        operationId: "getReviewEligibility",
        tags: ["Trust Safety"],
        security: bearer,
        responses: { 200: { description: "Review eligibility", content: json } },
      },
    },
    "/api/v1/reviews": {
      post: {
        operationId: "createReview",
        tags: ["Trust Safety"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Review", content: json } },
      },
    },
    "/api/v1/reviews/mine": {
      get: {
        operationId: "listMyReviews",
        tags: ["Trust Safety"],
        security: bearer,
        responses: { 200: { description: "Submitted reviews", content: json } },
      },
    },
    "/api/v1/reviews/received": {
      get: {
        operationId: "listReceivedReviews",
        tags: ["Trust Safety"],
        security: bearer,
        responses: { 200: { description: "Received reviews", content: json } },
      },
    },
    "/api/v1/reviews/{reviewId}": {
      get: {
        operationId: "getReview",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [reviewId],
        responses: { 200: { description: "Review", content: json } },
      },
      patch: {
        operationId: "updateReview",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [reviewId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Review", content: json } },
      },
      delete: {
        operationId: "deleteReview",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [reviewId],
        responses: { 200: { description: "Deletion result", content: json } },
      },
    },
    "/api/v1/reviews/{reviewId}/report": {
      post: {
        operationId: "reportReview",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [reviewId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Safety report", content: json } },
      },
    },
    "/api/v1/users/{userId}/rating-summary": {
      get: {
        operationId: "getUserRatingSummary",
        tags: ["Trust Safety"],
        parameters: [userId],
        responses: { 200: { description: "Rating summary", content: json } },
      },
    },
    "/api/v1/users/{userId}/block": {
      post: {
        operationId: "blockUser",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [userId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Block", content: json } },
      },
      delete: {
        operationId: "unblockUser",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [userId],
        responses: { 200: { description: "Unblock result", content: json } },
      },
    },
    "/api/v1/safety/reports": {
      post: {
        operationId: "createSafetyReport",
        tags: ["Trust Safety"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Safety report", content: json } },
      },
    },
    "/api/v1/trusted-contacts": {
      get: {
        operationId: "listTrustedContacts",
        tags: ["Trust Safety"],
        security: bearer,
        responses: { 200: { description: "Trusted contacts", content: json } },
      },
      post: {
        operationId: "createTrustedContact",
        tags: ["Trust Safety"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Trusted contact", content: json } },
      },
    },
    "/api/v1/trips/{tripId}/shares": {
      get: {
        operationId: "listTripShares",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [tripId],
        responses: { 200: { description: "Trip shares", content: json } },
      },
      post: {
        operationId: "createTripShare",
        tags: ["Trust Safety"],
        security: bearer,
        parameters: [tripId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Trip share", content: json } },
      },
    },
    "/api/v1/emergency/actions": {
      post: {
        operationId: "createEmergencyAction",
        tags: ["Trust Safety"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Emergency action", content: json } },
      },
    },
    "/api/v1/admin/safety/reports": {
      get: {
        operationId: "listAdminSafetyReports",
        tags: ["Admin Trust Safety"],
        security: bearer,
        responses: { 200: { description: "Safety reports", content: json } },
      },
    },
    "/api/v1/admin/safety/reports/{reportId}/status": {
      post: {
        operationId: "updateSafetyReportStatus",
        tags: ["Admin Trust Safety"],
        security: bearer,
        parameters: [reportId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Safety report", content: json } },
      },
    },
  };
}

function phase11OpenApiPaths() {
  const json = { "application/json": { schema: { type: "object" } } };
  const bearer = [{ bearer: [] }];
  const paymentId = { name: "paymentId", in: "path", required: true, schema: { type: "string" } };
  const payoutId = { name: "payoutId", in: "path", required: true, schema: { type: "string" } };
  return {
    "/api/v1/payments/intents": {
      post: {
        operationId: "createPaymentIntent",
        tags: ["Payments"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Payment", content: json } },
      },
    },
    "/api/v1/payments/{paymentId}": {
      get: {
        operationId: "getPayment",
        tags: ["Payments"],
        security: bearer,
        parameters: [paymentId],
        responses: { 200: { description: "Payment", content: json } },
      },
    },
    "/api/v1/payments/{paymentId}/refunds": {
      post: {
        operationId: "requestPaymentRefund",
        tags: ["Payments"],
        security: bearer,
        parameters: [paymentId],
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Refund", content: json } },
      },
    },
    "/api/v1/payments/mock/webhook": {
      post: {
        operationId: "receiveMockPaymentWebhook",
        tags: ["Payments"],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Webhook accepted", content: json } },
      },
    },
    "/api/v1/driver/payments/cash-confirmations": {
      post: {
        operationId: "confirmDriverCashPayment",
        tags: ["Driver Finance"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Payment", content: json } },
      },
    },
    "/api/v1/driver/earnings": {
      get: {
        operationId: "listDriverEarnings",
        tags: ["Driver Finance"],
        security: bearer,
        responses: { 200: { description: "Earnings", content: json } },
      },
    },
    "/api/v1/admin/finance/payments": {
      get: {
        operationId: "listAdminFinancePayments",
        tags: ["Admin Finance"],
        security: bearer,
        responses: { 200: { description: "Payments", content: json } },
      },
    },
    "/api/v1/admin/finance/ledger": {
      get: {
        operationId: "listFinancialLedger",
        tags: ["Admin Finance"],
        security: bearer,
        responses: { 200: { description: "Ledger", content: json } },
      },
    },
    "/api/v1/admin/finance/payouts": {
      post: {
        operationId: "createDriverPayout",
        tags: ["Admin Finance"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Payout", content: json } },
      },
    },
    "/api/v1/admin/finance/payouts/{payoutId}/status": {
      post: {
        operationId: "updateDriverPayoutStatus",
        tags: ["Admin Finance"],
        security: bearer,
        parameters: [payoutId],
        requestBody: { required: true, content: json },
        responses: { 200: { description: "Payout", content: json } },
      },
    },
    "/api/v1/admin/finance/reconciliation-runs": {
      post: {
        operationId: "createReconciliationRun",
        tags: ["Admin Finance"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Reconciliation run", content: json } },
      },
    },
    "/api/v1/analytics/events": {
      post: {
        operationId: "createAnalyticsEvent",
        tags: ["Analytics"],
        security: bearer,
        requestBody: { required: true, content: json },
        responses: { 201: { description: "Analytics event", content: json } },
      },
    },
    "/api/v1/admin/analytics/metrics": {
      get: {
        operationId: "listAdminAnalyticsMetrics",
        tags: ["Analytics"],
        security: bearer,
        responses: { 200: { description: "Analytics metrics", content: json } },
      },
    },
  };
}

const editableVerificationStatuses = ["DRAFT", "CHANGES_REQUESTED"] as const;
const requiredDocumentTypes = [
  "IDENTITY_FRONT",
  "DRIVER_LICENSE_FRONT",
  "VEHICLE_REGISTRATION_FRONT",
  "DRIVER_SELFIE",
  "VEHICLE_FRONT",
] as const;
const allowedDriverDocumentMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function isEditableVerificationStatus(status: string) {
  return editableVerificationStatuses.includes(
    status as (typeof editableVerificationStatuses)[number],
  );
}

function maskSensitive(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim();
  if (text.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, text.length - 4))}${text.slice(-4)}`;
}

function parseDateOrNull(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function verificationStatusForProfile(
  status: string,
): "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" {
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "DRAFT" || status === "WITHDRAWN") return "NOT_SUBMITTED";
  return "PENDING";
}

function cleanFileName(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .trim()
      .slice(0, 180) || "document"
  );
}

function applicationInclude() {
  return {
    documents: {
      where: { status: { notIn: ["DELETED", "REPLACED"] } },
      orderBy: { uploadedAt: "desc" },
    },
    reviews: { orderBy: { createdAt: "desc" }, take: 20 },
    events: { orderBy: { createdAt: "desc" }, take: 30 },
    driverProfile: { include: { user: { include: { telegramIdentity: true } } } },
  } satisfies Prisma.DriverVerificationApplicationInclude;
}

function calculateCompletion(application: {
  legalFirstName: string | null;
  legalLastName: string | null;
  birthDate: Date | null;
  phone: string | null;
  personalIdentificationNumber: string | null;
  driverLicenseNumber: string | null;
  driverLicenseExpiresAt: Date | null;
  driverLicenseCategory: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehiclePlateNumber: string | null;
  vehicleSeats: number | null;
  consentAcceptedAt: Date | null;
  documents: { type: string; status: string }[];
}) {
  const documentTypes = new Set(
    application.documents
      .filter((document) => document.status === "UPLOADED" || document.status === "ACCEPTED")
      .map((document) => document.type),
  );
  const sections = {
    personalDataComplete: Boolean(
      application.legalFirstName &&
      application.legalLastName &&
      application.birthDate &&
      application.phone &&
      application.personalIdentificationNumber,
    ),
    identityDocumentsComplete: requiredDocumentTypes
      .slice(0, 1)
      .every((type) => documentTypes.has(type)),
    driverLicenseComplete: Boolean(
      application.driverLicenseNumber &&
      application.driverLicenseExpiresAt &&
      application.driverLicenseCategory &&
      documentTypes.has("DRIVER_LICENSE_FRONT"),
    ),
    vehicleDataComplete: Boolean(
      application.vehicleMake &&
      application.vehicleModel &&
      application.vehicleYear &&
      application.vehiclePlateNumber &&
      application.vehicleSeats,
    ),
    vehiclePhotosComplete: requiredDocumentTypes.slice(2).every((type) => documentTypes.has(type)),
    consentsComplete: Boolean(application.consentAcceptedAt),
  };
  const missing = Object.entries(sections)
    .filter(([, complete]) => !complete)
    .map(([key]) => key);
  const completeCount = Object.values(sections).filter(Boolean).length;
  return {
    ...sections,
    overallPercentage: Math.round((completeCount / Object.keys(sections).length) * 100),
    canSubmit: missing.length === 0,
    missing,
  };
}

async function writeVerificationEvent(
  tx: Prisma.TransactionClient,
  applicationId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  const data: Prisma.DriverVerificationEventUncheckedCreateInput = {
    applicationId,
    actorUserId,
    type,
  };
  if (payload !== undefined) data.payload = payload as Prisma.InputJsonValue;
  await tx.driverVerificationEvent.create({
    data,
  });
}

async function writeVerificationAudit(
  tx: Prisma.TransactionClient,
  action: string,
  applicationId: string,
  actorUserId: string | null,
  requestId?: string,
  payload?: unknown,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId,
    action,
    entityType: "DriverVerificationApplication",
    entityId: applicationId,
    requestId: requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await tx.auditEvent.create({
    data,
  });
}

async function enqueueVerificationNotification(
  tx: Prisma.TransactionClient,
  type: string,
  applicationId: string,
  recipientUserId: string,
  payload: Record<string, unknown> = {},
) {
  await tx.outboxEvent.create({
    data: {
      type,
      payload: { applicationId, recipientUserId, ...payload },
    },
  });
}

async function driverProfileForUser(tx: Prisma.TransactionClient, userId: string) {
  return tx.driverProfile.upsert({
    where: { userId },
    create: { userId, onboardingStatus: "IN_PROGRESS" },
    update: {},
  });
}

async function currentDriverApplication(tx: Prisma.TransactionClient, userId: string) {
  const profile = await driverProfileForUser(tx, userId);
  const current = profile.currentApplicationId
    ? await tx.driverVerificationApplication.findUnique({
        where: { id: profile.currentApplicationId },
        include: applicationInclude(),
      })
    : null;
  if (current) return current;
  const latest = await tx.driverVerificationApplication.findFirst({
    where: { driverProfileId: profile.id },
    orderBy: { version: "desc" },
    include: applicationInclude(),
  });
  if (latest) {
    await tx.driverProfile.update({
      where: { id: profile.id },
      data: { currentApplicationId: latest.id },
    });
    return latest;
  }
  const application = await tx.driverVerificationApplication.create({
    data: {
      driverProfileId: profile.id,
      createdByUserId: userId,
    },
    include: applicationInclude(),
  });
  await tx.driverProfile.update({
    where: { id: profile.id },
    data: {
      currentApplicationId: application.id,
      onboardingStatus: "IN_PROGRESS",
      verificationStatus: "NOT_SUBMITTED",
    },
  });
  await writeVerificationEvent(tx, application.id, userId, "DRIVER_VERIFICATION_CREATED");
  return application;
}

function serializeDriverApplication(
  application: Prisma.DriverVerificationApplicationGetPayload<{
    include: ReturnType<typeof applicationInclude>;
  }>,
  mode: "driver" | "admin" = "driver",
) {
  const completion = calculateCompletion(application);
  const sensitive =
    mode === "admin"
      ? {
          personalIdentificationNumberMasked: maskSensitive(
            application.personalIdentificationNumber,
          ),
          driverLicenseNumberMasked: maskSensitive(application.driverLicenseNumber),
        }
      : {};
  return serializeBigInt({
    ...application,
    personalIdentificationNumber:
      mode === "admin" ? undefined : application.personalIdentificationNumber,
    registeredAddress: mode === "admin" ? undefined : application.registeredAddress,
    residentialAddress: mode === "admin" ? undefined : application.residentialAddress,
    completion,
    ...sensitive,
  });
}

const editableVehicleStatuses = ["DRAFT", "CHANGES_REQUESTED", "REJECTED"] as const;
const requiredVehicleDocumentTypes = ["REGISTRATION_CERTIFICATE"] as const;
const requiredVehiclePhotoTypes = [
  "FRONT",
  "REAR",
  "LEFT_SIDE",
  "RIGHT_SIDE",
  "INTERIOR_FRONT",
  "PLATE",
] as const;
const allowedVehicleDocumentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const allowedVehiclePhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function normalizePlate(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized ? normalized.slice(0, 24) : null;
}

function vehicleInclude() {
  return {
    documents: {
      where: { status: { notIn: ["DELETED", "REPLACED"] } },
      orderBy: { uploadedAt: "desc" },
    },
    photos: {
      where: { status: { notIn: ["DELETED", "REPLACED"] } },
      orderBy: { uploadedAt: "desc" },
    },
    reviews: { orderBy: { createdAt: "desc" }, take: 20 },
    events: { orderBy: { createdAt: "desc" }, take: 30 },
    driverProfile: { include: { user: { include: { telegramIdentity: true } } } },
  } satisfies Prisma.VehicleInclude;
}

function isEditableVehicleStatus(status: string) {
  return editableVehicleStatuses.includes(status as (typeof editableVehicleStatuses)[number]);
}

function calculateVehicleCompletion(vehicle: {
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plateNumber: string | null;
  bodyType: string | null;
  passengerSeatCount: number | null;
  documents: { type: string; status: string }[];
  photos: { type: string; status: string }[];
}) {
  const documentTypes = new Set(
    vehicle.documents
      .filter((document) => document.status === "UPLOADED" || document.status === "ACCEPTED")
      .map((document) => document.type),
  );
  const photoTypes = new Set(
    vehicle.photos
      .filter((photo) => photo.status === "UPLOADED" || photo.status === "ACCEPTED")
      .map((photo) => photo.type),
  );
  const sections = {
    vehicleDataComplete: Boolean(
      vehicle.make &&
      vehicle.model &&
      vehicle.year &&
      vehicle.color &&
      vehicle.plateNumber &&
      vehicle.bodyType &&
      vehicle.passengerSeatCount,
    ),
    documentsComplete: requiredVehicleDocumentTypes.every((type) => documentTypes.has(type)),
    photosComplete: requiredVehiclePhotoTypes.every((type) => photoTypes.has(type)),
  };
  const missing = Object.entries(sections)
    .filter(([, complete]) => !complete)
    .map(([key]) => key);
  const completeCount = Object.values(sections).filter(Boolean).length;
  return {
    ...sections,
    canSubmit: missing.length === 0,
    missing,
    overallPercentage: Math.round((completeCount / Object.keys(sections).length) * 100),
  };
}

async function writeVehicleEvent(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  const data: Prisma.VehicleModerationEventUncheckedCreateInput = {
    vehicleId,
    actorUserId,
    type,
  };
  if (payload !== undefined) data.payload = payload as Prisma.InputJsonValue;
  await tx.vehicleModerationEvent.create({ data });
}

async function writeVehicleAudit(
  tx: Prisma.TransactionClient,
  action: string,
  vehicleId: string,
  actorUserId: string | null,
  requestId?: string,
  payload?: unknown,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId,
    action,
    entityType: "Vehicle",
    entityId: vehicleId,
    requestId: requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await tx.auditEvent.create({ data });
}

async function enqueueVehicleNotification(
  tx: Prisma.TransactionClient,
  type: string,
  vehicleId: string,
  recipientUserId: string,
  payload: Record<string, unknown> = {},
) {
  await tx.outboxEvent.create({
    data: { type, payload: { vehicleId, recipientUserId, ...payload } },
  });
}

async function driverOwnVehicle(tx: Prisma.TransactionClient, userId: string, vehicleId: string) {
  const profile = await driverProfileForUser(tx, userId);
  const vehicle = await tx.vehicle.findFirst({
    where: { id: vehicleId, driverProfileId: profile.id },
    include: vehicleInclude(),
  });
  if (!vehicle) {
    throw Object.assign(new Error("Vehicle not found"), {
      statusCode: 404,
      code: "VEHICLE_NOT_FOUND",
    });
  }
  return vehicle;
}

function serializeVehicle(
  vehicle: Prisma.VehicleGetPayload<{ include: ReturnType<typeof vehicleInclude> }>,
) {
  return serializeBigInt({ ...vehicle, completion: calculateVehicleCompletion(vehicle) });
}

const tripInclude = {
  vehicle: true,
  route: { include: { originCity: true, destinationCity: true } },
  origin: true,
  destination: true,
  stops: { include: { city: true, pickupPoint: true }, orderBy: { order: "asc" as const } },
  seatSnapshot: true,
  timelineEvents: { orderBy: { createdAt: "desc" as const }, take: 20 },
  moderationEvents: { orderBy: { createdAt: "desc" as const }, take: 20 },
} satisfies Prisma.TripInclude;

type TripWithInclude = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

function serializeTrip(trip: TripWithInclude) {
  return serializeBigInt(trip);
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

const publicTripInclude = {
  driverProfile: { include: { user: true } },
  vehicle: true,
  route: true,
  origin: true,
  destination: true,
  stops: { include: { city: true, pickupPoint: true }, orderBy: { order: "asc" as const } },
} satisfies Prisma.TripInclude;

type PublicTripWithInclude = Prisma.TripGetPayload<{ include: typeof publicTripInclude }>;

function citySummary(city: PublicTripWithInclude["origin"]) {
  if (!city) return null;
  return {
    id: city.id,
    code: city.code,
    nameRu: city.nameRu,
    nameUz: city.nameUz,
    nameKaa: city.nameKaa,
    timezone: city.timezone,
  };
}

function publicTripDto(trip: PublicTripWithInclude) {
  return serializeBigInt({
    id: trip.id,
    origin: citySummary(trip.origin),
    destination: citySummary(trip.destination),
    originCity: trip.originCity,
    destinationCity: trip.destinationCity,
    departureAtUtc: trip.departureAtUtc,
    arrivalEstimateAtUtc: trip.arrivalEstimateAtUtc,
    timezone: trip.timezone,
    availableSeatCount: trip.availableSeatCount,
    passengerSeatCapacity: trip.passengerSeatCapacity,
    pricePerSeatMinor: trip.pricePerSeatMinor,
    wholeCarPriceMinor: trip.wholeCarPriceMinor,
    parcelSupported: trip.parcelSupported,
    parcelPriceMinor: trip.parcelPriceMinor,
    currency: trip.currency,
    luggageRules: trip.luggageRules,
    route: trip.route
      ? {
          id: trip.route.id,
          distanceKm: trip.route.distanceKm,
          estimatedDurationMinutes: trip.route.estimatedDurationMinutes,
        }
      : null,
    stops: trip.stops.map((stop) => ({
      id: stop.id,
      city: citySummary(stop.city),
      order: stop.order,
      type: stop.type,
      plannedAtUtc: stop.plannedAtUtc,
      label: stop.label ?? stop.pickupPoint?.name ?? stop.city.nameRu,
      address: stop.address ?? stop.pickupPoint?.address ?? null,
    })),
    driver: {
      displayName: trip.driverProfile.user.displayName ?? "Verified driver",
      verified: trip.driverProfile.verificationStatus === "APPROVED",
      reliabilityScore: trip.driverProfile.reliabilityScore,
    },
    vehicle: {
      make: trip.vehicle.make,
      model: trip.vehicle.model,
      year: trip.vehicle.year,
      color: trip.vehicle.color,
      bodyType: trip.vehicle.bodyType,
      passengerSeatCount: trip.vehicle.passengerSeatCount,
      amenities: trip.vehicle.amenities,
      verified: trip.vehicle.status === "APPROVED",
    },
  });
}

function tashkentDayRange(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, day, -5, 0, 0)),
    end: new Date(Date.UTC(year, month - 1, day + 1, -5, 0, 0)),
  };
}

function departureWindowRange(window: string | undefined) {
  if (window === "morning") return [5, 12] as const;
  if (window === "afternoon") return [12, 17] as const;
  if (window === "evening") return [17, 22] as const;
  if (window === "night") return [22, 29] as const;
  return null;
}

function stableTripSort(sort: string) {
  return (left: PublicTripWithInclude, right: PublicTripWithInclude) => {
    const stable =
      left.departureAtUtc.getTime() - right.departureAtUtc.getTime() ||
      left.id.localeCompare(right.id);
    if (sort === "price_asc") {
      return Number(left.pricePerSeatMinor - right.pricePerSeatMinor) || stable;
    }
    if (sort === "price_desc") {
      return Number(right.pricePerSeatMinor - left.pricePerSeatMinor) || stable;
    }
    if (sort === "available_seats_desc") {
      return right.availableSeatCount - left.availableSeatCount || stable;
    }
    return stable;
  };
}

async function searchPublicTrips(rawQuery: unknown) {
  const query = tripSearchQuerySchema.parse(rawQuery);
  const { start, end } = tashkentDayRange(query.date);
  const now = new Date();
  const trips = await prisma.trip.findMany({
    where: {
      originCityId: query.originCityId,
      destinationCityId: query.destinationCityId,
      status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
      cancelledAt: null,
      blockedAt: null,
      departureAtUtc: { gte: start > now ? start : now, lt: end },
      availableSeatCount: { gte: query.passengers },
      currency: "UZS",
      driverProfile: { verificationStatus: "APPROVED" },
      vehicle: {
        status: "APPROVED",
        archivedAt: null,
        suspendedAt: null,
        ...(query.vehicleBodyType ? { bodyType: query.vehicleBodyType } : {}),
      },
      ...(query.minPriceMinor !== undefined
        ? { pricePerSeatMinor: { gte: query.minPriceMinor } }
        : {}),
      ...(query.maxPriceMinor !== undefined
        ? { pricePerSeatMinor: { lte: query.maxPriceMinor } }
        : {}),
      ...(query.parcelSupported !== undefined ? { parcelSupported: query.parcelSupported } : {}),
      ...(query.wholeCarAvailable ? { wholeCarPriceMinor: { not: null } } : {}),
      ...(query.luggageRequired ? { luggageRules: { not: null } } : {}),
    },
    include: publicTripInclude,
  });
  const windowRange = departureWindowRange(query.departureWindow);
  const filtered = windowRange
    ? trips.filter((trip) => {
        const localHour = (trip.departureAtUtc.getUTCHours() + 5) % 24;
        const expandedHour = localHour < windowRange[0] ? localHour + 24 : localHour;
        return expandedHour >= windowRange[0] && expandedHour < windowRange[1];
      })
    : trips;
  const sorted = [...filtered].sort(stableTripSort(query.sort));
  const startIndex = (query.page - 1) * query.pageSize;
  const pageTrips = sorted.slice(startIndex, startIndex + query.pageSize);
  await prisma.searchEvent.create({
    data: {
      sessionId: query.sessionId ?? null,
      originCityId: query.originCityId,
      destinationCityId: query.destinationCityId,
      queryDate: start,
      passengers: query.passengers,
      sort: query.sort,
      filtersJson: cleanObject({
        departureWindow: query.departureWindow,
        minPriceMinor: query.minPriceMinor?.toString(),
        maxPriceMinor: query.maxPriceMinor?.toString(),
        parcelSupported: query.parcelSupported,
        wholeCarAvailable: query.wholeCarAvailable,
        luggageRequired: query.luggageRequired,
        vehicleBodyType: query.vehicleBodyType,
      }) as Prisma.InputJsonValue,
      resultCount: sorted.length,
    },
  });
  return {
    trips: pageTrips.map(publicTripDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: sorted.length,
      hasMore: startIndex + query.pageSize < sorted.length,
    },
  };
}

async function writeTripTimeline(
  tx: Prisma.TransactionClient,
  tripId: string,
  type: string,
  payload?: unknown,
) {
  await tx.tripTimelineEvent.create({
    data: { tripId, type, payload: payload as Prisma.InputJsonValue },
  });
}

async function writeTripAudit(
  tx: Prisma.TransactionClient,
  action: string,
  tripId: string,
  actorUserId: string | null,
  requestId?: string,
  reason?: string,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId,
    action,
    entityType: "Trip",
    entityId: tripId,
  };
  if (requestId) data.requestId = requestId;
  if (reason) data.reason = reason;
  await tx.auditEvent.create({
    data,
  });
}

type BookingActor = {
  userId: string;
  requestId: string | undefined;
  role: "CLIENT" | "DRIVER" | "ADMIN";
};

const bookingInclude = {
  trip: { include: { origin: true, destination: true, route: true } },
  client: true,
  pickupPoint: true,
  destinationPickupPoint: true,
  holds: { include: { items: true }, orderBy: { createdAt: "desc" as const } },
  passengers: { orderBy: { id: "asc" as const } },
  seats: { orderBy: { seatKey: "asc" as const } },
  baggage: true,
  timelineEvents: { orderBy: { createdAt: "desc" as const }, take: 50 },
  cancellations: { orderBy: { createdAt: "desc" as const }, take: 10 },
} satisfies Prisma.BookingInclude;

type BookingWithInclude = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

function serializeBooking(booking: BookingWithInclude) {
  return serializeBigInt({
    id: booking.id,
    tripId: booking.tripId,
    clientId: booking.clientId,
    type: booking.type,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    currency: booking.currency,
    totalMinor: booking.totalMinor,
    passengerCount: booking.passengerCount,
    pickupPoint: booking.pickupPoint
      ? {
          id: booking.pickupPoint.id,
          name: booking.pickupPoint.name,
          address: booking.pickupPoint.address,
        }
      : null,
    destinationPickupPoint: booking.destinationPickupPoint
      ? {
          id: booking.destinationPickupPoint.id,
          name: booking.destinationPickupPoint.name,
          address: booking.destinationPickupPoint.address,
        }
      : null,
    clientComment: booking.clientComment,
    travelPreferences: booking.travelPreferences,
    pickupLocation: booking.pickupLocation,
    requestedDepartureAtUtc: booking.requestedDepartureAtUtc,
    expiresAt: booking.expiresAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    cancellationReason: booking.cancellationReason,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    trip: {
      id: booking.trip.id,
      originCity: booking.trip.originCity,
      destinationCity: booking.trip.destinationCity,
      departureAtUtc: booking.trip.departureAtUtc,
      pricePerSeatMinor: booking.trip.pricePerSeatMinor,
      wholeCarPriceMinor: booking.trip.wholeCarPriceMinor,
      currency: booking.trip.currency,
    },
    passengers: booking.passengers,
    seats: booking.seats,
    baggage: booking.baggage,
    holds: booking.holds,
    timelineEvents: booking.timelineEvents,
    cancellations: booking.cancellations,
  });
}

function seatDto(seat: {
  id: string;
  seatKey: string;
  label: string;
  row: number;
  column: number;
  seatType: string;
  priceMinor: bigint;
  status: string;
  version: number;
}) {
  return serializeBigInt({
    id: seat.id,
    seatKey: seat.seatKey,
    label: seat.label,
    row: seat.row,
    column: seat.column,
    seatType: seat.seatType,
    priceMinor: seat.priceMinor,
    status: seat.status,
    version: seat.version,
  });
}

function encodeRedisCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join("")}`;
}

function parseRedisReply(buffer: Buffer) {
  const text = buffer.toString("utf8");
  if (text.startsWith("+")) return text.slice(1, text.indexOf("\r\n"));
  if (text.startsWith(":")) return Number(text.slice(1, text.indexOf("\r\n")));
  if (text.startsWith("$-1")) return null;
  if (text.startsWith("$")) {
    const end = text.indexOf("\r\n");
    const length = Number(text.slice(1, end));
    return text.slice(end + 2, end + 2 + length);
  }
  if (text.startsWith("-")) {
    throw new Error(text.slice(1, text.indexOf("\r\n")));
  }
  return text;
}

async function redisCommand(parts: string[]) {
  const url = new URL(env.REDIS_URL);
  const host = url.hostname || "127.0.0.1";
  const port = Number(url.port || 6379);
  return new Promise<string | number | null>((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      socket.destroy(new Error("Redis command timed out"));
    }, 3000);
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.once("close", () => {
      clearTimeout(timeout);
      try {
        resolve(parseRedisReply(Buffer.concat(chunks)));
      } catch (error) {
        reject(error);
      }
    });
    socket.connect(port, host, () => {
      socket.end(encodeRedisCommand(parts));
    });
  });
}

async function withBookingLock<T>(tripId: string, fn: () => Promise<T>) {
  const key = `booking:trip:${tripId}`;
  const token = randomUUID();
  const acquired = await redisCommand(["SET", key, token, "PX", String(bookingLockTtlMs), "NX"]);
  if (acquired !== "OK") {
    throw Object.assign(new Error("Seat inventory is busy"), {
      statusCode: 409,
      code: "SEAT_LOCK_BUSY",
    });
  }
  try {
    return await fn();
  } finally {
    await redisCommand([
      "EVAL",
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      "1",
      key,
      token,
    ]).catch(() => undefined);
  }
}

async function ensureTripSeats(
  tx: Prisma.TransactionClient,
  trip: {
    id: string;
    vehicleId: string;
    passengerSeatCapacity: number;
    pricePerSeatMinor: bigint;
  },
) {
  const existing = await tx.tripSeat.findMany({
    where: { tripId: trip.id },
    orderBy: [{ row: "asc" }, { column: "asc" }, { seatKey: "asc" }],
  });
  if (existing.length >= trip.passengerSeatCapacity) return existing;
  const existingKeys = new Set(existing.map((seat) => seat.seatKey));
  const layout = generateSeatLayout(trip.passengerSeatCapacity);
  await tx.tripSeat.createMany({
    data: layout
      .filter((seat) => !existingKeys.has(seat.seatKey))
      .map((seat) => ({
        tripId: trip.id,
        seatKey: seat.seatKey,
        label: seat.label,
        row: seat.row,
        column: seat.column,
        seatType: seat.seatType,
        priceMinor: trip.pricePerSeatMinor,
        status: "AVAILABLE" as const,
      })),
    skipDuplicates: true,
  });
  const seatLabels = layout.map((seat) => seat.label);
  await tx.tripSeatSnapshot.upsert({
    where: { tripId: trip.id },
    create: {
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      passengerSeatCapacity: trip.passengerSeatCapacity,
      availableSeatCount: trip.passengerSeatCapacity,
      seatLabels,
    },
    update: {
      vehicleId: trip.vehicleId,
      passengerSeatCapacity: trip.passengerSeatCapacity,
      seatLabels,
    },
  });
  return tx.tripSeat.findMany({
    where: { tripId: trip.id },
    orderBy: [{ row: "asc" }, { column: "asc" }, { seatKey: "asc" }],
  });
}

async function writeBookingEvent(
  tx: Prisma.TransactionClient,
  bookingId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  await tx.bookingTimelineEvent.create({
    data: { bookingId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
}

async function writeBookingAudit(
  tx: Prisma.TransactionClient,
  action: string,
  bookingId: string,
  actor: BookingActor,
  payload?: unknown,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId: actor.userId,
    action,
    entityType: "Booking",
    entityId: bookingId,
    requestId: actor.requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await tx.auditEvent.create({ data });
}

async function enqueueBookingEvent(
  tx: Prisma.TransactionClient,
  type: string,
  bookingId: string,
  payload: Record<string, unknown> = {},
) {
  await tx.outboxEvent.create({ data: { type, payload: { bookingId, ...payload } } });
}

async function writeTripOperationEvent(
  tx: Prisma.TransactionClient,
  tripId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  await tx.tripOperationEvent.create({
    data: { tripId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
  await tx.tripTimelineEvent.create({
    data: { tripId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
}

async function writeBookingOperationEvent(
  tx: Prisma.TransactionClient,
  bookingId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  await tx.bookingOperationEvent.create({
    data: { bookingId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
  await writeBookingEvent(tx, bookingId, actorUserId, type, payload);
}

async function writeTripOperationAudit(
  tx: Prisma.TransactionClient,
  action: string,
  tripId: string,
  actor: BookingActor,
  payload?: unknown,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId: actor.userId,
    action,
    entityType: "Trip",
    entityId: tripId,
    requestId: actor.requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await tx.auditEvent.create({ data });
}

async function enqueueTripEvent(
  tx: Prisma.TransactionClient,
  type: string,
  tripId: string,
  payload: Record<string, unknown> = {},
) {
  await tx.outboxEvent.create({ data: { type, payload: { tripId, ...payload } } });
}

function boardingCodePlain(length = boardingCodeLength) {
  const safeLength = Math.max(4, Math.min(6, Math.floor(length)));
  const max = 10 ** safeLength;
  const value = Number.parseInt(randomBytes(4).toString("hex"), 16) % max;
  return value.toString().padStart(safeLength, "0");
}

function serializeBoardingCodeForClient(
  code: {
    id: string;
    bookingId: string;
    status: string;
    codeLength: number;
    expiresAt: Date;
    attemptsCount: number;
    maxAttempts: number;
    lockedAt: Date | null;
    verifiedAt: Date | null;
  },
  plainCode?: string,
) {
  return {
    id: code.id,
    bookingId: code.bookingId,
    code: plainCode,
    status: code.status,
    codeLength: code.codeLength,
    expiresAt: code.expiresAt,
    attemptsRemaining: Math.max(0, code.maxAttempts - code.attemptsCount),
    lockedAt: code.lockedAt,
    verifiedAt: code.verifiedAt,
  };
}

function serializeTripStartPinForClient(
  pin: {
    id: string;
    tripId: string;
    bookingId: string;
    status: string;
    codeLength: number;
    expiresAt: Date;
    attemptsCount: number;
    maxAttempts: number;
    lockedAt: Date | null;
    verifiedAt: Date | null;
  },
  plainCode?: string,
) {
  return {
    id: pin.id,
    tripId: pin.tripId,
    bookingId: pin.bookingId,
    pin: plainCode,
    status: pin.status,
    codeLength: pin.codeLength,
    expiresAt: pin.expiresAt,
    attemptsRemaining: Math.max(0, pin.maxAttempts - pin.attemptsCount),
    lockedAt: pin.lockedAt,
    verifiedAt: pin.verifiedAt,
  };
}

function serializeTripLocationPoint(point: {
  id: string;
  tripId: string;
  bookingId: string | null;
  actorType: string;
  actorUserId: string | null;
  latitude: Prisma.Decimal | number;
  longitude: Prisma.Decimal | number;
  accuracyMeters: Prisma.Decimal | number | null;
  speedMetersPerSecond: Prisma.Decimal | number | null;
  headingDegrees: Prisma.Decimal | number | null;
  source: string;
  reason: string | null;
  recordedAt: Date;
  createdAt: Date;
}) {
  return {
    id: point.id,
    tripId: point.tripId,
    bookingId: point.bookingId,
    actorType: point.actorType,
    actorUserId: point.actorUserId,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    accuracyMeters: point.accuracyMeters == null ? null : Number(point.accuracyMeters),
    speedMetersPerSecond:
      point.speedMetersPerSecond == null ? null : Number(point.speedMetersPerSecond),
    headingDegrees: point.headingDegrees == null ? null : Number(point.headingDegrees),
    source: point.source,
    reason: point.reason,
    recordedAt: point.recordedAt,
    createdAt: point.createdAt,
  };
}

async function createTripStartPin(
  tx: Prisma.TransactionClient,
  booking: { id: string; tripId: string },
  actorUserId: string | null,
  now = new Date(),
) {
  const plain = boardingCodePlain(tripStartPinLength);
  const expiresAt = new Date(now.getTime() + tripStartPinTtlMs);
  await tx.tripStartPin.updateMany({
    where: { bookingId: booking.id, status: "ACTIVE", verifiedAt: null },
    data: { status: "REPLACED" },
  });
  const pin = await tx.tripStartPin.create({
    data: {
      bookingId: booking.id,
      tripId: booking.tripId,
      codeHash: hashSecret(plain),
      codeLength: plain.length,
      expiresAt,
      maxAttempts: tripStartPinMaxAttempts,
    },
  });
  await writeBookingOperationEvent(tx, booking.id, actorUserId, "TRIP_START_PIN_GENERATED", {
    tripId: booking.tripId,
    expiresAt,
  });
  await writeTripOperationEvent(tx, booking.tripId, actorUserId, "TRIP_START_PIN_GENERATED", {
    bookingId: booking.id,
    expiresAt,
  });
  return { pin, plain };
}

async function activeTripStartPinForBooking(
  tx: Prisma.TransactionClient,
  booking: { id: string; tripId: string },
  actorUserId: string | null,
) {
  const now = new Date();
  const existing = await tx.tripStartPin.findFirst({
    where: { bookingId: booking.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (
    existing &&
    boardingCodeCanAttempt({
      status: existing.status,
      expiresAt: existing.expiresAt,
      attemptsCount: existing.attemptsCount,
      maxAttempts: existing.maxAttempts,
      lockedAt: existing.lockedAt,
      verifiedAt: existing.verifiedAt,
      now,
    }).ok
  ) {
    return { pin: existing, plain: undefined };
  }
  return createTripStartPin(tx, booking, actorUserId, now);
}

async function verifyTripStartPinForBooking(
  bookingId: string,
  pin: string,
  actor: BookingActor,
  location?: Omit<ReturnType<typeof tripLocationPointSchema.parse>, "bookingId">,
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { userId: actor.userId } });
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, trip: { driverProfileId: profile?.id ?? "" } },
      include: { trip: true, seats: true },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.trip.status !== "BOARDING" || booking.status !== "BOARDING") {
      throw Object.assign(new Error("Trip start PIN is not available"), {
        statusCode: 409,
        code: "TRIP_START_PIN_NOT_AVAILABLE",
      });
    }
    if (!booking.seats.some((seat) => seat.status === "OCCUPIED")) {
      throw Object.assign(new Error("Passenger must be boarded before PIN verification"), {
        statusCode: 409,
        code: "PASSENGER_NOT_BOARDED",
      });
    }
    const startPin = await tx.tripStartPin.findFirst({
      where: { bookingId: booking.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!startPin) {
      throw Object.assign(new Error("Trip start PIN not found"), {
        statusCode: 404,
        code: "TRIP_START_PIN_NOT_FOUND",
      });
    }
    const guard = boardingCodeCanAttempt({ ...startPin, now: new Date() });
    if (!guard.ok) {
      throw Object.assign(new Error(guard.code), { statusCode: 409, code: guard.code });
    }
    const success = startPin.codeHash === hashSecret(pin);
    const attemptsCount = startPin.attemptsCount + 1;
    if (!success) {
      const failedPinData: Prisma.TripStartPinUpdateInput = {
        attemptsCount,
        status: attemptsCount >= startPin.maxAttempts ? "LOCKED" : "ACTIVE",
      };
      if (attemptsCount >= startPin.maxAttempts) failedPinData.lockedAt = new Date();
      await tx.tripStartPin.update({ where: { id: startPin.id }, data: failedPinData });
      throw Object.assign(new Error("Invalid trip start PIN"), {
        statusCode: 400,
        code: "TRIP_START_PIN_INVALID",
      });
    }
    await tx.tripStartPin.update({
      where: { id: startPin.id },
      data: {
        attemptsCount,
        verifiedAt: new Date(),
        verifiedById: actor.userId,
        status: "VERIFIED",
      },
    });
    await writeBookingOperationEvent(tx, booking.id, actor.userId, "PASSENGER_PIN_VERIFIED", {
      tripId: booking.tripId,
    });
    await writeTripOperationEvent(tx, booking.tripId, actor.userId, "PASSENGER_PIN_VERIFIED", {
      bookingId: booking.id,
    });
    if (location) {
      await recordTripLocationPoint(tx, booking.trip, actor, "DRIVER", {
        ...location,
        bookingId: booking.id,
        source: "PIN_VERIFIED",
      });
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}
async function recordTripLocationPoint(
  tx: Prisma.TransactionClient,
  trip: { id: string; status: string },
  actor: BookingActor,
  actorType: "DRIVER" | "PASSENGER",
  point: ReturnType<typeof tripLocationPointSchema.parse>,
) {
  const recordedAt = point.recordedAt ?? new Date();
  const lastPeriodic =
    point.source === "PERIODIC"
      ? await tx.tripLocationPoint.findFirst({
          where: {
            tripId: trip.id,
            actorUserId: actor.userId,
            actorType,
            source: "PERIODIC",
          },
          orderBy: { recordedAt: "desc" },
        })
      : null;
  const guard = evaluateTripLocationWrite({
    tripStatus: trip.status as Parameters<typeof evaluateTripLocationWrite>[0]["tripStatus"],
    source: point.source,
    lastRecordedAt: lastPeriodic?.recordedAt ?? null,
    now: recordedAt,
    minIntervalMs: periodicTrackingMinIntervalMs,
  });
  if (!guard.ok) {
    throw Object.assign(new Error(guard.code), { statusCode: 409, code: guard.code });
  }
  const saved = await tx.tripLocationPoint.create({
    data: {
      tripId: trip.id,
      bookingId: point.bookingId ?? null,
      actorType,
      actorUserId: actor.userId,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyMeters: point.accuracyMeters ?? null,
      speedMetersPerSecond: point.speedMetersPerSecond ?? null,
      headingDegrees: point.headingDegrees ?? null,
      source: point.source,
      reason: point.reason ?? null,
      recordedAt,
    },
  });
  await writeTripOperationEvent(tx, trip.id, actor.userId, "TRIP_LOCATION_RECORDED", {
    actorType,
    bookingId: point.bookingId ?? null,
    source: point.source,
    critical: guard.critical,
  });
  return saved;
}
async function createBoardingCode(
  tx: Prisma.TransactionClient,
  bookingId: string,
  actorUserId: string | null,
  now = new Date(),
) {
  const plain = boardingCodePlain();
  const expiresAt = new Date(now.getTime() + boardingCodeTtlMs);
  await tx.boardingCode.updateMany({
    where: { bookingId, status: "ACTIVE", verifiedAt: null },
    data: { status: "REPLACED" },
  });
  const code = await tx.boardingCode.create({
    data: {
      bookingId,
      codeHash: hashSecret(plain),
      codeLength: plain.length,
      expiresAt,
      maxAttempts: boardingCodeMaxAttempts,
    },
  });
  await writeBookingOperationEvent(tx, bookingId, actorUserId, "BOARDING_CODE_GENERATED", {
    expiresAt,
  });
  await enqueueBookingEvent(tx, "boarding.code.generated", bookingId, { expiresAt });
  return { code, plain };
}

async function activeBoardingCodeForBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
  actorUserId: string | null,
) {
  const now = new Date();
  const existing = await tx.boardingCode.findFirst({
    where: { bookingId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (
    existing &&
    boardingCodeCanAttempt({
      status: existing.status,
      expiresAt: existing.expiresAt,
      attemptsCount: existing.attemptsCount,
      maxAttempts: existing.maxAttempts,
      lockedAt: existing.lockedAt,
      verifiedAt: existing.verifiedAt,
      now,
    }).ok
  ) {
    return { code: existing, plain: undefined };
  }
  return createBoardingCode(tx, bookingId, actorUserId, now);
}

function activeBookingWhere(): Prisma.BookingWhereInput {
  return {
    status: {
      in: ["PENDING_CONFIRMATION", "CONFIRMED", "BOARDING", "IN_PROGRESS"],
    },
  } as Prisma.BookingWhereInput;
}

async function driverOwnTripForOperation(
  tx: Prisma.TransactionClient,
  userId: string,
  tripId: string,
) {
  const profile = await tx.driverProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile || profile.verificationStatus !== "APPROVED") return null;
  return tx.trip.findFirst({
    where: { id: tripId, driverProfileId: profile.id, vehicle: { status: "APPROVED" } },
    include: { bookings: { include: { seats: true, passengers: true } }, vehicle: true },
  });
}

async function transitionTripStatus(
  tx: Prisma.TransactionClient,
  trip: { id: string; status: string; version: number },
  action: Parameters<typeof evaluateTripTransition>[1],
  actor: BookingActor,
  reason?: string,
) {
  const result = evaluateTripTransition(
    trip.status as Parameters<typeof evaluateTripTransition>[0],
    action,
  );
  if (!result.ok) {
    throw Object.assign(new Error(result.message), { statusCode: 409, code: result.code });
  }
  if (result.idempotent) return { status: result.toStatus, idempotent: true };
  const tripData: Prisma.TripUpdateManyMutationInput = {
    status: result.toStatus,
    version: { increment: 1 },
  };
  if (result.toStatus === "CANCELLED") {
    tripData.cancelledAt = new Date();
    tripData.cancellationReason = reason ?? null;
  }
  const saved = await tx.trip.updateMany({
    where: { id: trip.id, version: trip.version },
    data: tripData,
  });
  if (saved.count !== 1) {
    throw Object.assign(new Error("Trip was modified concurrently"), {
      statusCode: 409,
      code: "TRIP_VERSION_CONFLICT",
    });
  }
  await tx.tripStatusTransition.create({
    data: {
      tripId: trip.id,
      actorUserId: actor.userId,
      fromStatus: trip.status as never,
      toStatus: result.toStatus as never,
      reason: reason ?? null,
    },
  });
  await writeTripOperationEvent(tx, trip.id, actor.userId, `TRIP_${result.toStatus}`, {
    fromStatus: trip.status,
    toStatus: result.toStatus,
    reason,
  });
  await writeTripOperationAudit(tx, `TRIP_${result.toStatus}`, trip.id, actor, { reason });
  await enqueueTripEvent(tx, `trip.${result.toStatus.toLowerCase()}`, trip.id, { reason });
  return { status: result.toStatus, idempotent: false };
}

async function startBoardingTrip(tripId: string, actor: BookingActor) {
  return prisma.$transaction(async (tx) => {
    const trip = await driverOwnTripForOperation(tx, actor.userId, tripId);
    if (!trip) {
      throw Object.assign(new Error("Trip not found"), { statusCode: 404, code: "TRIP_NOT_FOUND" });
    }
    await transitionTripStatus(tx, trip, "START_BOARDING", actor);
    const confirmed = trip.bookings.filter((booking) => booking.status === "CONFIRMED");
    for (const booking of confirmed) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "BOARDING", version: { increment: 1 } },
      });
      await activeBoardingCodeForBooking(tx, booking.id, actor.userId);
      await writeBookingOperationEvent(tx, booking.id, actor.userId, "BOOKING_BOARDING_READY", {
        tripId,
      });
    }
    return tx.trip.findUniqueOrThrow({ where: { id: tripId }, include: tripInclude });
  });
}

async function boardBooking(bookingId: string, code: string, actor: BookingActor) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { userId: actor.userId } });
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, trip: { driverProfileId: profile?.id ?? "" } },
      include: { trip: true, seats: true },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.trip.status !== "BOARDING" || booking.status !== "BOARDING") {
      throw Object.assign(new Error("Booking is not ready for boarding"), {
        statusCode: 409,
        code: "BOARDING_NOT_ALLOWED",
      });
    }
    const boardingCode = await tx.boardingCode.findFirst({
      where: { bookingId: booking.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (!boardingCode) {
      throw Object.assign(new Error("Boarding code not found"), {
        statusCode: 404,
        code: "BOARDING_CODE_NOT_FOUND",
      });
    }
    const guard = boardingCodeCanAttempt({ ...boardingCode, now: new Date() });
    if (!guard.ok) {
      throw Object.assign(new Error(guard.code), { statusCode: 409, code: guard.code });
    }
    const success = boardingCode.codeHash === hashSecret(code);
    const attemptsCount = boardingCode.attemptsCount + 1;
    await tx.boardingAttempt.create({
      data: { boardingCodeId: boardingCode.id, actorUserId: actor.userId, success },
    });
    if (!success) {
      const failedCodeData: Prisma.BoardingCodeUpdateInput = {
        attemptsCount,
        status: attemptsCount >= boardingCode.maxAttempts ? "LOCKED" : "ACTIVE",
      };
      if (attemptsCount >= boardingCode.maxAttempts) failedCodeData.lockedAt = new Date();
      await tx.boardingCode.update({
        where: { id: boardingCode.id },
        data: failedCodeData,
      });
      throw Object.assign(new Error("Invalid boarding code"), {
        statusCode: 400,
        code: "BOARDING_CODE_INVALID",
      });
    }
    await tx.boardingCode.update({
      where: { id: boardingCode.id },
      data: { attemptsCount, verifiedAt: new Date(), status: "VERIFIED" },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "BOARDING", version: { increment: 1 } },
    });
    await tx.tripSeat.updateMany({
      where: { tripId: booking.tripId, seatKey: { in: booking.seats.map((seat) => seat.seatKey) } },
      data: { status: "OCCUPIED", version: { increment: 1 } },
    });
    await tx.bookingSeat.updateMany({
      where: { bookingId: booking.id, status: "BOOKED" },
      data: { status: "OCCUPIED" },
    });
    await writeBookingOperationEvent(tx, booking.id, actor.userId, "BOOKING_BOARDED", {
      tripId: booking.tripId,
    });
    await writeBookingAudit(tx, "BOOKING_BOARDED", booking.id, actor, { tripId: booking.tripId });
    await enqueueBookingEvent(tx, "boarding.confirmed", booking.id, { tripId: booking.tripId });
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
}

async function markClientNoShow(bookingId: string, actor: BookingActor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { userId: actor.userId } });
    const booking = await tx.booking.findFirst({
      where: {
        id: bookingId,
        trip: { driverProfileId: profile?.id ?? "", status: "BOARDING" },
        status: { in: ["CONFIRMED", "PENDING_CONFIRMATION", "BOARDING"] },
      },
      include: { seats: true, trip: true },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.status === "NO_SHOW_CLIENT") {
      return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
    }
    await tx.noShowRecord.create({
      data: {
        tripId: booking.tripId,
        bookingId: booking.id,
        actorUserId: actor.userId,
        actorRole: actor.role,
        type: "CLIENT",
        reason,
      },
    });
    await tx.tripSeat.updateMany({
      where: { tripId: booking.tripId, seatKey: { in: booking.seats.map((seat) => seat.seatKey) } },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
    await tx.bookingSeat.updateMany({
      where: { bookingId: booking.id },
      data: { status: "RELEASED" },
    });
    const saved = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "NO_SHOW_CLIENT", cancellationReason: reason, version: { increment: 1 } },
      include: bookingInclude,
    });
    await writeBookingOperationEvent(tx, booking.id, actor.userId, "BOOKING_NO_SHOW_CLIENT", {
      reason,
    });
    await writeBookingAudit(tx, "BOOKING_NO_SHOW_CLIENT", booking.id, actor, { reason });
    await enqueueBookingEvent(tx, "booking.no_show_client", booking.id, { tripId: booking.tripId });
    return saved;
  });
}

function rewardConfig() {
  return {
    clientTripTickets: env.REWARD_CLIENT_TRIP_TICKETS,
    driverTripTickets: env.REWARD_DRIVER_TRIP_TICKETS,
    clientReferralTickets: env.REWARD_CLIENT_REFERRAL_TICKETS,
    driverReferralTickets: env.REWARD_DRIVER_REFERRAL_TICKETS,
    milestoneTargetCount: env.REWARD_DRIVER_MILESTONE_TARGET,
    milestoneRewardValue: env.REWARD_DRIVER_MILESTONE_VALUE_MINOR,
    minTripDurationMinutes: env.REWARD_MIN_TRIP_DURATION_MINUTES,
    minMovementMeters: env.REWARD_MIN_MOVEMENT_METERS,
    mediumReviewThreshold: env.REWARD_MEDIUM_REVIEW_THRESHOLD,
    highReviewThreshold: env.REWARD_HIGH_REVIEW_THRESHOLD,
  };
}

async function writeRewardReviewAudit(
  tx: Prisma.TransactionClient,
  rewardId: string,
  actor: BookingActor,
  decision: string,
  reason: string,
) {
  await tx.auditEvent.create({
    data: {
      actorUserId: actor.userId,
      action: `REWARD_${decision}`,
      entityType: "RewardTransaction",
      entityId: rewardId,
      reason,
      requestId: actor.requestId ?? null,
    },
  });
}

async function createRewardWithEvaluation(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    driverProfileId?: string | null;
    roleContext: "CLIENT" | "DRIVER";
    type: string;
    amount: number;
    sourceType: string;
    sourceId: string;
    tripId?: string | null;
    referralId?: string | null;
    reason: string;
    fraudContext: Parameters<typeof evaluateRewardFraud>[0];
  },
) {
  const existing = await tx.rewardTransaction.findUnique({
    where: {
      userId_type_sourceType_sourceId: {
        userId: input.userId,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
  });
  if (existing) return existing;
  const fraud = evaluateRewardFraud(input.fraudContext, rewardConfig());
  const status = rewardStatusForFraudStatus(fraud.status);
  const now = new Date();
  const reward = await tx.rewardTransaction.create({
    data: {
      userId: input.userId,
      driverProfileId: input.driverProfileId ?? null,
      roleContext: input.roleContext,
      type: input.type,
      amount: input.amount,
      status,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      tripId: input.tripId ?? null,
      referralId: input.referralId ?? null,
      idempotencyKey: `${input.userId}:${input.type}:${input.sourceType}:${input.sourceId}`,
      reason: input.reason,
      metadata: { movementMeters: fraud.movementMeters } as Prisma.InputJsonValue,
      confirmedAt: status === "CONFIRMED" ? now : null,
      rejectedAt: status === "REJECTED" ? now : null,
    },
  });
  await tx.fraudEvaluation.create({
    data: {
      rewardTransactionId: reward.id,
      tripId: input.tripId ?? null,
      referralId: input.referralId ?? null,
      subjectUserId: input.userId,
      riskLevel: fraud.riskLevel,
      status: fraud.status,
      score: fraud.score,
      reasons: fraud.reasons as Prisma.InputJsonValue,
      metadata: { movementMeters: fraud.movementMeters } as Prisma.InputJsonValue,
    },
  });
  return reward;
}

async function ensureDriverMilestoneDefinition(tx: Prisma.TransactionClient) {
  return tx.rewardMilestoneDefinition.upsert({
    where: { code: "DRIVER_QUALIFYING_TRIPS" },
    create: {
      code: "DRIVER_QUALIFYING_TRIPS",
      title: "Driver qualifying trips milestone",
      targetCount: env.REWARD_DRIVER_MILESTONE_TARGET,
      rewardType: "DRIVER_MILESTONE_BONUS",
      rewardAmount: env.REWARD_DRIVER_MILESTONE_VALUE_MINOR,
      metadata: { currency: "UZS", paymentRequiredLater: true } as Prisma.InputJsonValue,
    },
    update: {
      targetCount: env.REWARD_DRIVER_MILESTONE_TARGET,
      rewardAmount: env.REWARD_DRIVER_MILESTONE_VALUE_MINOR,
    },
  });
}

async function updateDriverMilestoneProgress(
  tx: Prisma.TransactionClient,
  driverProfileId: string,
  driverUserId: string,
) {
  const definition = await ensureDriverMilestoneDefinition(tx);
  const qualifyingTripCount = await tx.rewardTransaction.count({
    where: { driverProfileId, type: "DRIVER_TRIP_TICKET", status: "CONFIRMED" },
  });
  const progress = calculateDriverMilestoneProgress({
    qualifyingTrips: qualifyingTripCount,
    targetCount: definition.targetCount,
  });
  const existing = await tx.driverMilestoneProgress.findUnique({
    where: {
      driverProfileId_milestoneDefinitionId: {
        driverProfileId,
        milestoneDefinitionId: definition.id,
      },
    },
  });
  let rewardTransactionId = existing?.rewardTransactionId ?? null;
  if (progress.reached && !rewardTransactionId) {
    const reward = await createRewardWithEvaluation(tx, {
      userId: driverUserId,
      driverProfileId,
      roleContext: "DRIVER",
      type: "DRIVER_MILESTONE_BONUS",
      amount: definition.rewardAmount,
      sourceType: "MILESTONE",
      sourceId: definition.id,
      reason: `Milestone progress ${progress.completed}/${progress.target}`,
      fraudContext: {
        pinVerified: true,
        gpsPoints: [
          { latitude: 0, longitude: 0, recordedAt: new Date() },
          { latitude: 0.01, longitude: 0.01, recordedAt: new Date(Date.now() + 3600000) },
        ],
        completedTripDurationMinutes: env.REWARD_MIN_TRIP_DURATION_MINUTES,
      },
    });
    rewardTransactionId = reward.id;
  }
  return tx.driverMilestoneProgress.upsert({
    where: {
      driverProfileId_milestoneDefinitionId: {
        driverProfileId,
        milestoneDefinitionId: definition.id,
      },
    },
    create: {
      driverProfileId,
      milestoneDefinitionId: definition.id,
      qualifyingTripCount,
      status: progress.reached ? "REACHED" : "IN_PROGRESS",
      reachedAt: progress.reached ? new Date() : null,
      rewardTransactionId,
    },
    update: {
      qualifyingTripCount,
      status: progress.reached ? "REACHED" : "IN_PROGRESS",
      reachedAt: progress.reached ? (existing?.reachedAt ?? new Date()) : null,
      rewardTransactionId,
    },
  });
}

async function qualifyReferralRewardForUser(
  tx: Prisma.TransactionClient,
  input: {
    referredUserId: string;
    roleContext: "CLIENT" | "DRIVER";
    rewardType: "CLIENT_REFERRAL_TICKET" | "DRIVER_REFERRAL_TICKET";
    amount: number;
    tripId: string;
    fraudContext: Parameters<typeof evaluateRewardFraud>[0];
  },
) {
  const referral = await tx.referral.findFirst({
    where: {
      referredUserId: input.referredUserId,
      roleContext: input.roleContext,
      status: { in: ["INVITED", "REGISTERED", "QUALIFIED"] },
    },
  });
  if (!referral) return null;
  const reverseReferral = await tx.referral.findFirst({
    where: {
      referrerUserId: input.referredUserId,
      referredUserId: referral.referrerUserId,
      roleContext: input.roleContext,
    },
  });
  const reward = await createRewardWithEvaluation(tx, {
    userId: referral.referrerUserId,
    roleContext: input.roleContext,
    type: input.rewardType,
    amount: input.amount,
    sourceType: "REFERRAL",
    sourceId: referral.id,
    tripId: input.tripId,
    referralId: referral.id,
    reason: `${input.roleContext.toLowerCase()} referral qualified by completed trip`,
    fraudContext: {
      ...input.fraudContext,
      referralSelf: referral.referrerUserId === referral.referredUserId,
      referralCycle: Boolean(reverseReferral),
    },
  });
  await tx.referral.update({
    where: { id: referral.id },
    data: {
      status:
        reward.status === "CONFIRMED"
          ? "REWARDED"
          : reward.status === "REJECTED"
            ? "REJECTED"
            : "QUALIFIED",
      qualifiedAt: new Date(),
      rewardedAt: reward.status === "CONFIRMED" ? new Date() : null,
      rejectedAt: reward.status === "REJECTED" ? new Date() : null,
    },
  });
  return reward;
}
async function qualifyRewardsForCompletedTrip(tx: Prisma.TransactionClient, tripId: string) {
  const trip = await tx.trip.findUnique({
    where: { id: tripId },
    include: {
      driverProfile: true,
      bookings: { include: { client: true, startPins: true } },
      locationPoints: { orderBy: { recordedAt: "asc" } },
      operationEvents: { orderBy: { createdAt: "asc" } },
      completionSummary: true,
    },
  });
  if (!trip || trip.status !== "COMPLETED") return [];
  const started = trip.operationEvents.find(
    (event) => event.type === "TRIP_IN_PROGRESS" || event.type === "TRIP_STARTED",
  );
  const completed = trip.operationEvents.findLast((event) => event.type === "TRIP_COMPLETED");
  const gpsPoints = trip.locationPoints.map((point) => ({
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    recordedAt: point.recordedAt,
  }));
  const created: Awaited<ReturnType<typeof createRewardWithEvaluation>>[] = [];
  for (const booking of trip.bookings.filter(
    (item) => item.clientId && item.status === "COMPLETED",
  )) {
    const pinVerified = booking.startPins.some(
      (pin) => pin.status === "VERIFIED" && pin.verifiedAt,
    );
    const pairCount = await tx.booking.count({
      where: {
        clientId: booking.clientId,
        status: "COMPLETED",
        trip: { driverProfileId: trip.driverProfileId, status: "COMPLETED" },
      },
    });
    const fraudContext = {
      pinVerified,
      gpsPoints,
      tripStartedAt: started?.createdAt ?? null,
      tripCompletedAt: completed?.createdAt ?? trip.completionSummary?.completedAt ?? null,
      repeatPairCompletedTrips: pairCount,
    };
    const clientReward = await createRewardWithEvaluation(tx, {
      userId: booking.clientId!,
      roleContext: "CLIENT",
      type: "CLIENT_TRIP_TICKET",
      amount: env.REWARD_CLIENT_TRIP_TICKETS,
      sourceType: "BOOKING",
      sourceId: booking.id,
      tripId: trip.id,
      reason: `Completed qualifying trip ${trip.originCity} → ${trip.destinationCity}`,
      fraudContext,
    });
    created.push(clientReward);
    const referralReward = await qualifyReferralRewardForUser(tx, {
      referredUserId: booking.clientId!,
      roleContext: "CLIENT",
      rewardType: "CLIENT_REFERRAL_TICKET",
      amount: env.REWARD_CLIENT_REFERRAL_TICKETS,
      tripId: trip.id,
      fraudContext,
    });
    if (referralReward) created.push(referralReward);
  }
  const boardedCount = trip.bookings.filter((booking) => booking.status === "COMPLETED").length;
  if (boardedCount > 0) {
    const driverReward = await createRewardWithEvaluation(tx, {
      userId: trip.driverProfile.userId,
      driverProfileId: trip.driverProfileId,
      roleContext: "DRIVER",
      type: "DRIVER_TRIP_TICKET",
      amount: env.REWARD_DRIVER_TRIP_TICKETS,
      sourceType: "TRIP",
      sourceId: trip.id,
      tripId: trip.id,
      reason: `Completed qualifying driver trip ${trip.originCity} → ${trip.destinationCity}`,
      fraudContext: {
        pinVerified: trip.bookings.some((booking) =>
          booking.startPins.some((pin) => pin.status === "VERIFIED" && pin.verifiedAt),
        ),
        gpsPoints,
        tripStartedAt: started?.createdAt ?? null,
        tripCompletedAt: completed?.createdAt ?? trip.completionSummary?.completedAt ?? null,
      },
    });
    created.push(driverReward);
    if (trip.driverProfile.verificationStatus === "APPROVED") {
      const driverReferralReward = await qualifyReferralRewardForUser(tx, {
        referredUserId: trip.driverProfile.userId,
        roleContext: "DRIVER",
        rewardType: "DRIVER_REFERRAL_TICKET",
        amount: env.REWARD_DRIVER_REFERRAL_TICKETS,
        tripId: trip.id,
        fraudContext: {
          pinVerified: trip.bookings.some((booking) =>
            booking.startPins.some((pin) => pin.status === "VERIFIED" && pin.verifiedAt),
          ),
          gpsPoints,
          tripStartedAt: started?.createdAt ?? null,
          tripCompletedAt: completed?.createdAt ?? trip.completionSummary?.completedAt ?? null,
        },
      });
      if (driverReferralReward) created.push(driverReferralReward);
    }
    await updateDriverMilestoneProgress(tx, trip.driverProfileId, trip.driverProfile.userId);
  }
  return created;
}
async function startTripOperation(
  tripId: string,
  actor: BookingActor,
  allowUnresolvedPassengers: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const trip = await driverOwnTripForOperation(tx, actor.userId, tripId);
    if (!trip) {
      throw Object.assign(new Error("Trip not found"), { statusCode: 404, code: "TRIP_NOT_FOUND" });
    }
    const unresolved = trip.bookings.filter((booking) => booking.status === "BOARDING");
    const boarded = trip.bookings.filter((booking) =>
      booking.seats.some((seat) => seat.status === "OCCUPIED"),
    );
    if (!allowUnresolvedPassengers && unresolved.length !== boarded.length) {
      throw Object.assign(new Error("Unresolved passengers must be boarded or marked no-show"), {
        statusCode: 409,
        code: "TRIP_UNRESOLVED_PASSENGERS",
      });
    }
    if (!allowUnresolvedPassengers && boarded.length > 0) {
      const verifiedPins = await tx.tripStartPin.groupBy({
        by: ["bookingId"],
        where: {
          tripId,
          bookingId: { in: boarded.map((booking) => booking.id) },
          status: "VERIFIED",
          verifiedAt: { not: null },
        },
      });
      if (verifiedPins.length !== boarded.length) {
        throw Object.assign(new Error("Trip start PIN must be verified before start"), {
          statusCode: 409,
          code: "TRIP_START_PIN_REQUIRED",
        });
      }
    }
    await transitionTripStatus(tx, trip, "START_TRIP", actor);
    await tx.booking.updateMany({
      where: { tripId, status: "BOARDING", seats: { some: { status: "OCCUPIED" } } },
      data: { status: "IN_PROGRESS", version: { increment: 1 } },
    });
    const handoverParcels = await tx.parcelOrder.findMany({
      where: { tripId, status: "HANDED_TO_DRIVER" },
    });
    for (const parcel of handoverParcels) {
      await transitionParcel(tx, parcel, "START_TRANSIT", actor);
    }
    await tx.tripExecution.upsert({
      where: { tripId },
      create: { tripId, status: "IN_PROGRESS", startedAt: new Date() },
      update: { status: "IN_PROGRESS", startedAt: new Date() },
    });
    await enqueueTripEvent(tx, "trip.started", tripId);
    return tx.trip.findUniqueOrThrow({ where: { id: tripId }, include: tripInclude });
  });
}

async function completeTripOperation(tripId: string, actor: BookingActor, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await driverOwnTripForOperation(tx, actor.userId, tripId);
    if (!trip) {
      throw Object.assign(new Error("Trip not found"), { statusCode: 404, code: "TRIP_NOT_FOUND" });
    }
    await transitionTripStatus(tx, trip, "COMPLETE_TRIP", actor);
    await tx.booking.updateMany({
      where: { tripId, status: { in: ["IN_PROGRESS", "BOARDING"] } },
      data: { status: "COMPLETED", version: { increment: 1 } },
    });
    await tx.tripExecution.upsert({
      where: { tripId },
      create: { tripId, status: "COMPLETED", startedAt: new Date(), endedAt: new Date() },
      update: { status: "COMPLETED", endedAt: new Date() },
    });
    const bookings = await tx.booking.findMany({ where: { tripId } });
    const summaryCreate: Prisma.TripCompletionSummaryUncheckedCreateInput = {
      tripId,
      completedByUserId: actor.userId,
      boardedCount: bookings.filter((booking) => booking.status === "COMPLETED").length,
      noShowClientCount: bookings.filter((booking) => booking.status === "NO_SHOW_CLIENT").length,
      cancelledCount: bookings.filter((booking) => String(booking.status).startsWith("CANCELLED"))
        .length,
      totalBookingsCount: bookings.length,
    };
    if (notes) summaryCreate.notes = notes;
    const summaryUpdate: Prisma.TripCompletionSummaryUncheckedUpdateInput = {
      completedByUserId: actor.userId,
      completedAt: new Date(),
    };
    if (notes) summaryUpdate.notes = notes;
    await tx.tripCompletionSummary.upsert({
      where: { tripId },
      create: summaryCreate,
      update: summaryUpdate,
    });
    await qualifyRewardsForCompletedTrip(tx, tripId);
    await writeTripOperationEvent(tx, tripId, actor.userId, "REWARDS_EVALUATED", {});
    await enqueueTripEvent(tx, "trip.completed", tripId);
    return tx.trip.findUniqueOrThrow({ where: { id: tripId }, include: tripInclude });
  });
}

async function cancelTripOperational(
  tripId: string,
  actor: BookingActor,
  reason: string,
  bookingStatus: "CANCELLED_BY_DRIVER" | "CANCELLED_BY_ADMIN",
) {
  return prisma.$transaction(async (tx) => {
    const trip =
      actor.role === "ADMIN"
        ? await tx.trip.findUnique({
            where: { id: tripId },
            include: { bookings: { include: { seats: true } } },
          })
        : await driverOwnTripForOperation(tx, actor.userId, tripId);
    if (!trip) {
      throw Object.assign(new Error("Trip not found"), { statusCode: 404, code: "TRIP_NOT_FOUND" });
    }
    await transitionTripStatus(tx, trip, "CANCEL_TRIP", actor, reason);
    await tx.tripCancellation.create({
      data: { tripId, actorUserId: actor.userId, actorRole: actor.role, reason },
    });
    await tx.booking.updateMany({
      where: { tripId, ...activeBookingWhere() },
      data: {
        status: bookingStatus,
        cancelledAt: new Date(),
        cancellationReason: reason,
        version: { increment: 1 },
      },
    });
    await cancelActiveParcelsForTrip(tx, tripId, actor, reason);
    await tx.tripSeat.updateMany({
      where: { tripId, status: { in: ["HELD", "BOOKED", "OCCUPIED"] } },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
    await enqueueTripEvent(tx, "trip.cancelled", tripId, { actorRole: actor.role, reason });
    return tx.trip.findUniqueOrThrow({ where: { id: tripId }, include: tripInclude });
  });
}

function requestHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value ?? {}))
    .digest("hex");
}

function idempotencyKey(req: Request) {
  return String(req.headers["idempotency-key"] ?? req.headers["x-idempotency-key"] ?? "").trim();
}

const parcelInclude = {
  category: true,
  trip: { include: { origin: true, destination: true, driverProfile: true, vehicle: true } },
  pickupPoint: true,
  destinationPickupPoint: true,
  attachments: true,
  handoverCodes: { orderBy: { createdAt: "desc" as const }, take: 1 },
  pickupCodes: { orderBy: { createdAt: "desc" as const }, take: 1 },
  timelineEvents: { orderBy: { createdAt: "asc" as const } },
  issues: { orderBy: { createdAt: "desc" as const } },
  cancellations: { orderBy: { createdAt: "desc" as const } },
};

type ParcelWithInclude = Prisma.ParcelOrderGetPayload<{ include: typeof parcelInclude }>;

function serializeParcel(parcel: ParcelWithInclude) {
  return serializeBigInt({
    id: parcel.id,
    tripId: parcel.tripId,
    status: parcel.status,
    category: {
      code: parcel.category.code,
      name: parcel.category.name,
    },
    title: parcel.title,
    description: parcel.description,
    weightGrams: parcel.weightGrams,
    dimensionsCm: {
      length: parcel.lengthCm,
      width: parcel.widthCm,
      height: parcel.heightCm,
    },
    declaredValueMinor: parcel.declaredValueMinor,
    currency: parcel.currency,
    priceMinor: parcel.priceMinor,
    senderName: parcel.senderName,
    senderPhone: parcel.senderPhone,
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    pickupPoint: parcel.pickupPoint
      ? {
          id: parcel.pickupPoint.id,
          name: parcel.pickupPoint.name,
          address: parcel.pickupPoint.address,
        }
      : null,
    destinationPickupPoint: parcel.destinationPickupPoint
      ? {
          id: parcel.destinationPickupPoint.id,
          name: parcel.destinationPickupPoint.name,
          address: parcel.destinationPickupPoint.address,
        }
      : null,
    pickupLabel: parcel.pickupLabel,
    destinationLabel: parcel.destinationLabel,
    trip: parcel.trip
      ? {
          id: parcel.trip.id,
          originCity: parcel.trip.originCity,
          destinationCity: parcel.trip.destinationCity,
          departureAtUtc: parcel.trip.departureAtUtc,
          status: parcel.trip.status,
          parcelSupported: parcel.trip.parcelSupported,
          currency: parcel.trip.currency,
        }
      : null,
    attachments: parcel.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      status: attachment.status,
      createdAt: attachment.createdAt,
    })),
    handoverCode: parcel.handoverCodes[0] ? serializeParcelCode(parcel.handoverCodes[0]) : null,
    pickupCode: parcel.pickupCodes[0] ? serializeParcelCode(parcel.pickupCodes[0]) : null,
    timeline: parcel.timelineEvents,
    issues: parcel.issues,
    cancellations: parcel.cancellations,
    createdAt: parcel.createdAt,
    updatedAt: parcel.updatedAt,
  });
}

function serializeParcelCode(
  code: {
    id: string;
    parcelId: string;
    status: string;
    codeLength: number;
    expiresAt: Date;
    attemptsCount: number;
    maxAttempts: number;
    lockedAt: Date | null;
    verifiedAt: Date | null;
  },
  plainCode?: string,
) {
  return {
    id: code.id,
    parcelId: code.parcelId,
    code: plainCode,
    status: code.status,
    codeLength: code.codeLength,
    expiresAt: code.expiresAt,
    attemptsRemaining: Math.max(0, code.maxAttempts - code.attemptsCount),
    lockedAt: code.lockedAt,
    verifiedAt: code.verifiedAt,
  };
}

async function writeParcelEvent(
  tx: Prisma.TransactionClient,
  parcelId: string,
  actorUserId: string | null,
  type: string,
  payload?: unknown,
) {
  await tx.parcelEvent.create({
    data: { parcelId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
  await tx.parcelTimelineEvent.create({
    data: { parcelId, actorUserId, type, payload: payload as Prisma.InputJsonValue },
  });
}

async function writeParcelAudit(
  tx: Prisma.TransactionClient,
  action: string,
  parcelId: string,
  actor: BookingActor,
  payload?: unknown,
) {
  const data: Prisma.AuditEventUncheckedCreateInput = {
    actorUserId: actor.userId,
    action,
    entityType: "ParcelOrder",
    entityId: parcelId,
    requestId: actor.requestId ?? null,
  };
  if (payload !== undefined) data.newValueJson = payload as Prisma.InputJsonValue;
  await tx.auditEvent.create({ data });
}

async function enqueueParcelEvent(
  tx: Prisma.TransactionClient,
  type: string,
  parcelId: string,
  payload: Record<string, unknown> = {},
) {
  await tx.outboxEvent.create({ data: { type, payload: { parcelId, ...payload } } });
}

function parcelCodePlain(length = parcelCodeLength) {
  const safeLength = Math.max(4, Math.min(6, Math.floor(length)));
  const max = 10 ** safeLength;
  const value = Number.parseInt(randomBytes(4).toString("hex"), 16) % max;
  return value.toString().padStart(safeLength, "0");
}

async function createParcelCode(
  tx: Prisma.TransactionClient,
  parcelId: string,
  type: "HANDOVER" | "PICKUP",
  actorUserId: string | null,
  now = new Date(),
) {
  const plain = parcelCodePlain();
  const expiresAt = new Date(now.getTime() + parcelCodeTtlMs);
  const codeData = {
    parcelId,
    codeHash: hashSecret(plain),
    codeLength: plain.length,
    expiresAt,
    maxAttempts: parcelCodeMaxAttempts,
  };
  const code =
    type === "HANDOVER"
      ? await (async () => {
          await tx.parcelHandoverCode.updateMany({
            where: { parcelId, status: "ACTIVE", verifiedAt: null },
            data: { status: "REPLACED" },
          });
          return tx.parcelHandoverCode.create({ data: codeData });
        })()
      : await (async () => {
          await tx.parcelPickupCode.updateMany({
            where: { parcelId, status: "ACTIVE", verifiedAt: null },
            data: { status: "REPLACED" },
          });
          return tx.parcelPickupCode.create({ data: codeData });
        })();
  await writeParcelEvent(tx, parcelId, actorUserId, `PARCEL_${type}_CODE_GENERATED`, { expiresAt });
  await enqueueParcelEvent(tx, `parcel.${type.toLowerCase()}.code.generated`, parcelId, {
    expiresAt,
  });
  return { code, plain };
}

async function transitionParcel(
  tx: Prisma.TransactionClient,
  parcel: { id: string; status: string; version: number },
  action: Parameters<typeof evaluateParcelTransition>[1],
  actor: BookingActor,
  reason?: string,
) {
  const result = evaluateParcelTransition(
    parcel.status as Parameters<typeof evaluateParcelTransition>[0],
    action,
  );
  if (!result.ok) {
    throw Object.assign(new Error(result.message), { statusCode: 409, code: result.code });
  }
  if (result.idempotent) return { status: result.toStatus, idempotent: true };
  const now = new Date();
  const data: Prisma.ParcelOrderUpdateManyMutationInput = {
    status: result.toStatus,
    version: { increment: 1 },
  };
  if (result.toStatus === "HANDED_TO_DRIVER") data.handoverAt = now;
  if (result.toStatus === "IN_TRANSIT") data.inTransitAt = now;
  if (result.toStatus === "READY_FOR_PICKUP") data.readyForPickupAt = now;
  if (result.toStatus === "DELIVERED") data.deliveredAt = now;
  if (String(result.toStatus).startsWith("CANCELLED")) {
    data.cancelledAt = now;
    data.cancellationReason = reason ?? null;
  }
  const updated = await tx.parcelOrder.updateMany({
    where: { id: parcel.id, version: parcel.version },
    data,
  });
  if (updated.count !== 1) {
    throw Object.assign(new Error("Parcel was modified concurrently"), {
      statusCode: 409,
      code: "PARCEL_VERSION_CONFLICT",
    });
  }
  await writeParcelEvent(tx, parcel.id, actor.userId, `PARCEL_${result.toStatus}`, {
    fromStatus: parcel.status,
    toStatus: result.toStatus,
    reason,
  });
  await writeParcelAudit(tx, `PARCEL_${result.toStatus}`, parcel.id, actor, { reason });
  await enqueueParcelEvent(tx, `parcel.${result.toStatus.toLowerCase()}`, parcel.id, { reason });
  return { status: result.toStatus, idempotent: false };
}

async function cancelActiveParcelsForTrip(
  tx: Prisma.TransactionClient,
  tripId: string,
  actor: BookingActor,
  reason: string,
) {
  const parcels = await tx.parcelOrder.findMany({
    where: {
      tripId,
      status: {
        in: [
          "CREATED",
          "PENDING_DRIVER_ACCEPTANCE",
          "ACCEPTED",
          "HANDED_TO_DRIVER",
          "IN_TRANSIT",
          "READY_FOR_PICKUP",
        ],
      },
    },
  });
  for (const parcel of parcels) {
    await transitionParcel(tx, parcel, "CANCEL_ADMIN", actor, reason);
    await tx.parcelCancellation.create({
      data: { parcelId: parcel.id, actorUserId: actor.userId, actorRole: actor.role, reason },
    });
  }
}

async function parcelAvailability(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { driverProfile: true, vehicle: true },
  });
  const available =
    Boolean(trip) &&
    trip!.parcelSupported &&
    ["PUBLISHED", "BOOKING_OPEN"].includes(trip!.status) &&
    trip!.departureAtUtc > new Date() &&
    trip!.driverProfile.verificationStatus === "APPROVED" &&
    trip!.vehicle.status === "APPROVED";
  return {
    available,
    reason: available ? null : "PARCEL_NOT_AVAILABLE",
    limits: defaultParcelLimits,
    trip: trip
      ? {
          id: trip.id,
          originCity: trip.originCity,
          destinationCity: trip.destinationCity,
          departureAtUtc: trip.departureAtUtc,
          parcelPriceMinor: trip.parcelPriceMinor,
          currency: trip.currency,
        }
      : null,
  };
}

async function clientOwnParcel(tx: Prisma.TransactionClient, userId: string, parcelId: string) {
  return tx.parcelOrder.findFirst({
    where: { id: parcelId, senderUserId: userId },
    include: parcelInclude,
  });
}

async function driverOwnParcel(tx: Prisma.TransactionClient, userId: string, parcelId: string) {
  const profile = await tx.driverProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  return tx.parcelOrder.findFirst({
    where: { id: parcelId, driverProfileId: profile.id },
    include: parcelInclude,
  });
}

const conversationInclude = {
  booking: { include: { trip: true, client: true } },
  parcelOrder: { include: { trip: true, sender: true } },
  participants: { include: { user: true } },
  messages: { orderBy: { sentAt: "desc" as const }, take: 1 },
};

type ConversationWithInclude = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

function publicUser(user: {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    displayName:
      user.displayName ??
      [user.firstName, user.lastName].filter(Boolean).join(" ") ??
      user.username ??
      "Nodex user",
    avatarUrl: user.avatarUrl,
  };
}

function serializeConversation(conversation: ConversationWithInclude, viewerUserId: string) {
  const counterpart = conversation.participants.find(
    (participant) => participant.userId !== viewerUserId,
  );
  return serializeBigInt({
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    bookingId: conversation.bookingId,
    parcelOrderId: conversation.parcelOrderId,
    tripId: conversation.tripId,
    lastMessageAt: conversation.lastMessageAt,
    retentionUntil: conversation.retentionUntil,
    counterpart: counterpart ? publicUser(counterpart.user) : null,
    participants: conversation.participants.map((participant) => ({
      user: publicUser(participant.user),
      role: participant.role,
      lastReadAt: participant.lastReadAt,
    })),
    context: conversation.booking
      ? {
          type: "BOOKING",
          route: `${conversation.booking.trip.originCity} to ${conversation.booking.trip.destinationCity}`,
          status: conversation.booking.status,
        }
      : conversation.parcelOrder
        ? {
            type: "PARCEL",
            title: conversation.parcelOrder.title,
            status: conversation.parcelOrder.status,
          }
        : { type: conversation.type },
    lastMessage: conversation.messages[0]
      ? {
          id: conversation.messages[0].id,
          type: conversation.messages[0].type,
          text: conversation.messages[0].deletedAt ? null : conversation.messages[0].text,
          sentAt: conversation.messages[0].sentAt,
        }
      : null,
  });
}

function serializeMessage(
  message: Prisma.ChatMessageGetPayload<{
    include: { attachments: true; receipts: true; sender: true };
  }>,
) {
  return serializeBigInt({
    id: message.id,
    conversationId: message.conversationId,
    sender: message.sender ? publicUser(message.sender) : null,
    type: message.type,
    status: message.status,
    text: message.deletedAt ? null : message.text,
    locationLat: message.locationLat,
    locationLng: message.locationLng,
    locationLabel: message.locationLabel,
    replyToMessageId: message.replyToMessageId,
    clientMessageId: message.clientMessageId,
    sentAt: message.sentAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    moderationStatus: message.moderationStatus,
    receipts: message.receipts,
    attachments: message.attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.type,
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      status: attachment.status,
    })),
  });
}

async function ensureNotification(
  tx: Prisma.TransactionClient,
  input: {
    recipientUserId: string;
    type: Prisma.NotificationCreateInput["type"];
    title: string;
    body: string;
    deduplicationKey: string;
    entityType?: string | null;
    entityId?: string | null;
    deepLink?: string | null;
    payloadJson?: Prisma.InputJsonValue;
  },
) {
  const notification = await tx.notification.upsert({
    where: { deduplicationKey: input.deduplicationKey },
    create: {
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      deepLink: input.deepLink ?? null,
      deduplicationKey: input.deduplicationKey,
      ...(input.payloadJson === undefined ? {} : { payloadJson: input.payloadJson }),
    },
    update: {},
  });
  await tx.notificationDelivery.upsert({
    where: { notificationId_channel: { notificationId: notification.id, channel: "IN_APP" } },
    create: {
      notificationId: notification.id,
      recipientUserId: input.recipientUserId,
      channel: "IN_APP",
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
    update: {},
  });
  await tx.notificationDelivery.upsert({
    where: { notificationId_channel: { notificationId: notification.id, channel: "TELEGRAM" } },
    create: {
      notificationId: notification.id,
      recipientUserId: input.recipientUserId,
      channel: "TELEGRAM",
      status: "PENDING",
    },
    update: {},
  });
  await tx.outboxEvent.create({
    data: {
      type: "notification.delivery.requested",
      payload: { notificationId: notification.id },
    },
  });
  return notification;
}

async function participantConversation(
  tx: Prisma.TransactionClient,
  userId: string,
  conversationId: string,
) {
  return tx.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId, leftAt: null } } },
    include: conversationInclude,
  });
}

async function createOrGetConversation(
  tx: Prisma.TransactionClient,
  userId: string,
  input: { bookingId?: string; parcelOrderId?: string },
) {
  const retentionUntil = new Date(
    Date.now() + defaultChatLimits.retentionDays * 24 * 60 * 60 * 1000,
  );
  if (input.bookingId) {
    const booking = await tx.booking.findFirst({
      where: { id: input.bookingId },
      include: { trip: { include: { driverProfile: true } } },
    });
    if (!booking || booking.clientId !== userId) {
      throw Object.assign(new Error("Booking is not available for chat"), {
        statusCode: 403,
        code: "CHAT_BOOKING_FORBIDDEN",
      });
    }
    if (!bookingChatEligible(booking.status, retentionUntil)) {
      throw Object.assign(new Error("Booking is not eligible for chat"), {
        statusCode: 409,
        code: "CHAT_BOOKING_NOT_ELIGIBLE",
      });
    }
    const driverUserId = booking.trip.driverProfile.userId;
    const conversation = await tx.conversation.upsert({
      where: { bookingId: booking.id },
      create: {
        type: "BOOKING",
        bookingId: booking.id,
        tripId: booking.tripId,
        retentionUntil,
        participants: {
          create: [
            { userId, role: "CLIENT" },
            { userId: driverUserId, role: "DRIVER" },
          ],
        },
      },
      update: {},
      include: conversationInclude,
    });
    return conversation;
  }
  const parcel = await tx.parcelOrder.findFirst({
    where: { id: input.parcelOrderId ?? "" },
    include: { driverProfile: true, trip: true },
  });
  if (
    !parcel ||
    parcel.senderUserId !== userId ||
    !parcel.driverProfileId ||
    !parcel.driverProfile
  ) {
    throw Object.assign(new Error("Parcel is not available for chat"), {
      statusCode: 403,
      code: "CHAT_PARCEL_FORBIDDEN",
    });
  }
  if (!parcelChatEligible(parcel.status, retentionUntil)) {
    throw Object.assign(new Error("Parcel is not eligible for chat"), {
      statusCode: 409,
      code: "CHAT_PARCEL_NOT_ELIGIBLE",
    });
  }
  return tx.conversation.upsert({
    where: { parcelOrderId: parcel.id },
    create: {
      type: "PARCEL",
      parcelOrderId: parcel.id,
      tripId: parcel.tripId,
      retentionUntil,
      participants: {
        create: [
          { userId, role: "CLIENT" },
          { userId: parcel.driverProfile.userId, role: "DRIVER" },
        ],
      },
    },
    update: {},
    include: conversationInclude,
  });
}

const supportTicketInclude = {
  requester: true,
  assignedTo: true,
  participants: { include: { user: true } },
  messages: { include: { sender: true, attachments: true }, orderBy: { createdAt: "asc" } },
  internalNotes: { include: { author: true }, orderBy: { createdAt: "asc" } },
  assignments: { orderBy: { createdAt: "desc" } },
  statusEvents: { include: { actor: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.SupportTicketInclude;

type SupportTicketWithInclude = Prisma.SupportTicketGetPayload<{
  include: typeof supportTicketInclude;
}>;

function serializeTicketAttachment(attachment: {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
}) {
  return {
    id: attachment.id,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    status: attachment.status,
  };
}

function serializeSupportTicket(
  ticket: SupportTicketWithInclude,
  options: { includeInternal?: boolean } = {},
) {
  return serializeBigInt({
    id: ticket.id,
    type: ticket.type,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    bookingId: ticket.bookingId,
    tripId: ticket.tripId,
    parcelOrderId: ticket.parcelOrderId,
    driverId: ticket.driverId,
    requesterRole: ticket.requesterRole,
    requester: publicUser(ticket.requester),
    assignedTo: ticket.assignedTo ? publicUser(ticket.assignedTo) : null,
    firstResponseAt: ticket.firstResponseAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    slaDueAt: ticket.slaDueAt,
    retentionUntil: ticket.retentionUntil,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    participants: ticket.participants.map((participant) => ({
      user: publicUser(participant.user),
      role: participant.role,
      joinedAt: participant.joinedAt,
    })),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      sender: publicUser(message.sender),
      text: message.deletedAt ? null : message.text,
      status: message.status,
      readAt: message.readAt,
      replyToMessageId: message.replyToMessageId,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      attachments: message.attachments.map(serializeTicketAttachment),
    })),
    internalNotes: options.includeInternal
      ? ticket.internalNotes.map((note) => ({
          id: note.id,
          author: publicUser(note.author),
          text: note.text,
          createdAt: note.createdAt,
        }))
      : undefined,
    assignments: options.includeInternal ? ticket.assignments : undefined,
    statusEvents: ticket.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      actor: event.actor ? publicUser(event.actor) : null,
      createdAt: event.createdAt,
    })),
  });
}

async function userCanAccessSupportTicket(
  tx: Prisma.TransactionClient,
  userId: string,
  ticketId: string,
) {
  return tx.supportTicket.findFirst({
    where: {
      id: ticketId,
      OR: [{ requesterUserId: userId }, { participants: { some: { userId, leftAt: null } } }],
    },
    include: supportTicketInclude,
  });
}

async function ensureSupportEntityAccess(
  tx: Prisma.TransactionClient,
  userId: string,
  input: { bookingId?: string | null; tripId?: string | null; parcelOrderId?: string | null },
) {
  if (input.bookingId) {
    const booking = await tx.booking.findFirst({
      where: { id: input.bookingId, clientId: userId },
    });
    if (!booking)
      throw Object.assign(new Error("Booking is not available for support"), {
        statusCode: 403,
        code: "SUPPORT_BOOKING_FORBIDDEN",
      });
  }
  if (input.parcelOrderId) {
    const parcel = await tx.parcelOrder.findFirst({
      where: { id: input.parcelOrderId, senderUserId: userId },
    });
    if (!parcel)
      throw Object.assign(new Error("Parcel is not available for support"), {
        statusCode: 403,
        code: "SUPPORT_PARCEL_FORBIDDEN",
      });
  }
  if (input.tripId) {
    const trip = await tx.trip.findFirst({
      where: {
        id: input.tripId,
        OR: [
          { driverProfile: { userId } },
          { bookings: { some: { clientId: userId } } },
          { parcelOrders: { some: { senderUserId: userId } } },
        ],
      },
    });
    if (!trip)
      throw Object.assign(new Error("Trip is not available for support"), {
        statusCode: 403,
        code: "SUPPORT_TRIP_FORBIDDEN",
      });
  }
}

function supportActionForStatus(status: Prisma.SupportTicketCreateInput["status"]) {
  if (status === "IN_PROGRESS") return "START_PROGRESS";
  if (status === "WAITING_FOR_USER") return "WAIT_FOR_USER";
  if (status === "UNDER_REVIEW") return "REVIEW";
  if (status === "RESOLVED") return "RESOLVE";
  if (status === "CLOSED") return "CLOSE";
  if (status === "REJECTED") return "REJECT";
  return "START_PROGRESS";
}

const reviewInclude = {
  scores: { include: { criterion: true } },
  moderation: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.ReviewInclude;

function serializeReview(review: Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>) {
  return serializeBigInt({
    id: review.id,
    type: review.type,
    reviewerUserId: review.reviewerUserId,
    revieweeUserId: review.revieweeUserId,
    bookingId: review.bookingId,
    tripId: review.tripId,
    parcelOrderId: review.parcelOrderId,
    overallRating: review.overallRating,
    text: review.status === "PUBLISHED" || review.status === "UNDER_REVIEW" ? review.text : null,
    status: review.status,
    submittedAt: review.submittedAt,
    publishedAt: review.publishedAt,
    editedAt: review.editedAt,
    createdAt: review.createdAt,
    scores: review.scores.map((score) => ({
      code: score.criterion.code,
      score: score.score,
    })),
  });
}

function serializeRatingAggregate(aggregate: {
  userId: string;
  scope: string;
  averageRating: unknown;
  ratingCount: number;
  ratingDistribution: Prisma.JsonValue;
  lastCalculatedAt: Date;
}) {
  return serializeBigInt({
    userId: aggregate.userId,
    scope: aggregate.scope,
    averageRating: Number(aggregate.averageRating),
    ratingCount: aggregate.ratingCount,
    ratingDistribution: aggregate.ratingDistribution,
    lastCalculatedAt: aggregate.lastCalculatedAt,
  });
}

function serializeReliabilityProfile(profile: {
  userId: string;
  completedTripsCount: number;
  completedBookingsCount: number;
  parcelDeliveredCount: number;
  reliabilityLevel: string;
  lastCalculatedAt: Date;
}) {
  return serializeBigInt({
    userId: profile.userId,
    completedTripsCount: profile.completedTripsCount,
    completedBookingsCount: profile.completedBookingsCount,
    parcelDeliveredCount: profile.parcelDeliveredCount,
    reliabilityLevel: profile.reliabilityLevel,
    lastCalculatedAt: profile.lastCalculatedAt,
  });
}

type AccountRestrictionTypeCode =
  | "CHAT_RESTRICTED"
  | "BOOKING_RESTRICTED"
  | "DRIVER_TRIP_CREATION_RESTRICTED"
  | "PARCEL_RESTRICTED"
  | "TEMPORARY_SUSPENSION"
  | "FULL_SUSPENSION";

const suspensionRestrictionTypes = ["TEMPORARY_SUSPENSION", "FULL_SUSPENSION"] as const;

async function activeAccountRestriction(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  types: AccountRestrictionTypeCode[],
) {
  const now = new Date();
  return tx.accountRestriction.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      type: { in: types },
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

async function assertNoActiveAccountRestriction(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  operationCode: string,
  types: AccountRestrictionTypeCode[],
) {
  const restriction = await activeAccountRestriction(tx, userId, [
    ...types,
    ...suspensionRestrictionTypes,
  ]);
  if (!restriction) return;
  const suspended =
    restriction.type === "TEMPORARY_SUSPENSION" || restriction.type === "FULL_SUSPENSION";
  throw Object.assign(new Error("Account restriction blocks this action"), {
    statusCode: 403,
    code: suspended ? "ACCOUNT_SUSPENDED" : operationCode,
    details: { restrictionId: restriction.id, restrictionType: restriction.type },
  });
}

async function ensureIdempotency<T>(
  tx: Prisma.TransactionClient,
  scope: string,
  key: string,
  payload: unknown,
  create: () => Promise<T>,
) {
  const hash = requestHash(payload);
  const existing = await tx.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
  if (existing) {
    if (existing.requestHash !== hash) {
      throw Object.assign(new Error("Idempotency key payload mismatch"), {
        statusCode: 409,
        code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
      });
    }
    return existing.responseJson as T;
  }
  const result = await create();
  await tx.idempotencyRecord.create({
    data: {
      scope,
      key,
      requestHash: hash,
      responseJson: result as Prisma.InputJsonValue,
      status: "COMPLETED",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return result;
}

async function recomputeRatingAggregate(
  tx: Prisma.TransactionClient,
  userId: string,
  scope = "OVERALL",
) {
  const reviews = await tx.review.findMany({
    where: { revieweeUserId: userId, status: "PUBLISHED" },
    select: { overallRating: true },
  });
  const aggregate = calculateRatingAggregate(reviews.map((review) => review.overallRating));
  return tx.ratingAggregate.upsert({
    where: { userId_scope: { userId, scope } },
    create: {
      userId,
      scope,
      averageRating: aggregate.averageRating,
      ratingCount: aggregate.ratingCount,
      ratingDistribution: aggregate.ratingDistribution,
      lastCalculatedAt: new Date(),
    },
    update: {
      averageRating: aggregate.averageRating,
      ratingCount: aggregate.ratingCount,
      ratingDistribution: aggregate.ratingDistribution,
      lastCalculatedAt: new Date(),
      version: { increment: 1 },
    },
  });
}

async function recomputeReliabilityProfile(tx: Prisma.TransactionClient, userId: string) {
  const events = await tx.reliabilityEvent.findMany({ where: { userId } });
  const counts = {
    completedTripsCount: events.filter((event) => event.type === "TRIP_COMPLETED").length,
    completedBookingsCount: events.filter((event) => event.type === "BOOKING_COMPLETED").length,
    clientCancellationCount: events.filter((event) => event.type === "CLIENT_CANCELLED").length,
    driverCancellationCount: events.filter((event) => event.type === "DRIVER_CANCELLED").length,
    clientNoShowCount: events.filter((event) => event.type === "CLIENT_NO_SHOW").length,
    driverNoShowCount: events.filter((event) => event.type === "DRIVER_NO_SHOW").length,
    parcelDeliveredCount: events.filter((event) => event.type === "PARCEL_DELIVERED").length,
    parcelIssueCount: events.filter((event) =>
      ["PARCEL_LOST", "PARCEL_DAMAGED"].includes(event.type),
    ).length,
    accountRestrictionCount: events.filter((event) => event.type === "RESTRICTION_APPLIED").length,
  };
  const reliabilityLevel = calculateReliabilityLevel(counts);
  return tx.reliabilityProfile.upsert({
    where: { userId },
    create: { userId, reliabilityLevel, ...counts },
    update: {
      reliabilityLevel,
      ...counts,
      lastCalculatedAt: new Date(),
      version: { increment: 1 },
    },
  });
}

async function reviewEligibilityContext(
  tx: Prisma.TransactionClient,
  reviewerUserId: string,
  input: {
    type: string;
    bookingId?: string | null | undefined;
    tripId?: string | null | undefined;
    parcelOrderId?: string | null | undefined;
    revieweeUserId: string;
  },
) {
  if (input.type === "DRIVER_BY_CLIENT" || input.type === "CLIENT_BY_DRIVER") {
    const booking = await tx.booking.findFirst({
      where: { id: input.bookingId ?? "" },
      include: { trip: { include: { driverProfile: true } } },
    });
    if (!booking)
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    const driverUserId = booking.trip.driverProfile.userId;
    const reviewerParticipated =
      input.type === "DRIVER_BY_CLIENT"
        ? booking.clientId === reviewerUserId
        : driverUserId === reviewerUserId;
    const revieweeIsCounterpart =
      input.type === "DRIVER_BY_CLIENT"
        ? input.revieweeUserId === driverUserId
        : input.revieweeUserId === booking.clientId;
    return {
      entityStatus: booking.status,
      completedAt: booking.updatedAt,
      reviewerParticipated,
      revieweeIsCounterpart,
      tripId: booking.tripId,
      bookingId: booking.id,
      parcelOrderId: null,
    };
  }
  const parcel = await tx.parcelOrder.findFirst({
    where: { id: input.parcelOrderId ?? "" },
    include: { driverProfile: true },
  });
  if (!parcel || !parcel.driverProfile) {
    throw Object.assign(new Error("Parcel not found"), {
      statusCode: 404,
      code: "PARCEL_NOT_FOUND",
    });
  }
  const driverUserId = parcel.driverProfile.userId;
  const reviewerParticipated =
    input.type === "PARCEL_DRIVER_BY_SENDER"
      ? parcel.senderUserId === reviewerUserId
      : driverUserId === reviewerUserId;
  const revieweeIsCounterpart =
    input.type === "PARCEL_DRIVER_BY_SENDER"
      ? input.revieweeUserId === driverUserId
      : input.revieweeUserId === parcel.senderUserId;
  return {
    entityStatus: parcel.status,
    completedAt: parcel.deliveredAt ?? parcel.updatedAt,
    reviewerParticipated,
    revieweeIsCounterpart,
    tripId: parcel.tripId,
    bookingId: null,
    parcelOrderId: parcel.id,
  };
}

function publicShareToken() {
  return randomBytes(32).toString("base64url");
}

function safeTripShareProjection(
  share: Prisma.TripShareGetPayload<{ include: { accessEvents: true } }>,
  trip: TripWithInclude | null,
) {
  return serializeBigInt({
    id: share.id,
    tripId: share.tripId,
    bookingId: share.bookingId,
    label: share.label,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    trip: trip
      ? {
          origin: trip.origin?.nameRu ?? trip.originCity,
          destination: trip.destination?.nameRu ?? trip.destinationCity,
          departureAtUtc: trip.departureAtUtc,
          status: trip.status,
          driverVerified: true,
          vehicleVerified: Boolean(trip.vehicleId),
        }
      : null,
  });
}

type SeatHoldWithItems = Prisma.SeatHoldGetPayload<{ include: { items: true } }>;

async function releaseActiveSeatHold(
  tx: Prisma.TransactionClient,
  hold: SeatHoldWithItems,
  status: "EXPIRED" | "RELEASED",
  now = new Date(),
) {
  const claimed = await tx.seatHold.updateMany({
    where: { id: hold.id, status: "ACTIVE", version: hold.version },
    data: { status, releasedAt: now, version: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;

  const tripSeatIds = hold.items
    .map((item) => item.tripSeatId)
    .filter((id): id is string => Boolean(id));
  if (tripSeatIds.length) {
    await tx.tripSeat.updateMany({
      where: { id: { in: tripSeatIds }, status: "HELD" },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
  }
  if (hold.bookingId) {
    await tx.bookingSeat.updateMany({
      where: { bookingId: hold.bookingId, tripSeatId: { in: tripSeatIds }, status: "HELD" },
      data: { status: "RELEASED" },
    });
  }
  return true;
}

async function expireSeatHolds(tx: Prisma.TransactionClient, tripId?: string) {
  const now = new Date();
  const holds = await tx.seatHold.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now }, ...(tripId ? { tripId } : {}) },
    include: { items: true, booking: true },
    take: 100,
  });
  let expired = 0;
  for (const hold of holds) {
    const released = await releaseActiveSeatHold(tx, hold, "EXPIRED", now);
    if (!released) continue;
    expired += 1;
    if (!hold.bookingId) continue;
    await tx.booking.update({
      where: { id: hold.bookingId },
      data: { status: "EXPIRED", expiresAt: hold.expiresAt, version: { increment: 1 } },
    });
    await writeBookingEvent(tx, hold.bookingId, null, "BOOKING_HOLD_EXPIRED", {
      seatKeys: hold.items.map((item) => item.seatKey),
    });
    await enqueueBookingEvent(tx, "booking.hold.expired", hold.bookingId, {
      tripId: hold.tripId,
    });
  }
  return expired;
}

function assertSeatSelection(type: string, seatKeys: string[], passengerCount: number) {
  if (type === "SEAT" && seatKeys.length !== 1) {
    throw Object.assign(new Error("Single seat booking requires one seat"), {
      statusCode: 400,
      code: "SEAT_SELECTION_INVALID",
    });
  }
  if (type === "MULTI_SEAT" && seatKeys.length !== passengerCount) {
    throw Object.assign(new Error("Multi-seat booking must match passenger count"), {
      statusCode: 400,
      code: "SEAT_SELECTION_INVALID",
    });
  }
}

async function cancelBooking(bookingId: string, actor: BookingActor, reason: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { seats: true, holds: { include: { items: true } }, trip: true },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (actor.role === "CLIENT" && booking.clientId !== actor.userId) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    const targetStatus =
      actor.role === "DRIVER"
        ? "CANCELLED_BY_DRIVER"
        : actor.role === "ADMIN"
          ? "CANCELLED_BY_ADMIN"
          : "CANCELLED_BY_CLIENT";
    if (
      booking.status === "CANCELLED_BY_CLIENT" ||
      booking.status === "CANCELLED_BY_DRIVER" ||
      booking.status === "CANCELLED_BY_ADMIN" ||
      booking.status === "EXPIRED"
    ) {
      return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
    }
    const heldOrBooked = booking.seats.filter(
      (seat) => seat.status === "HELD" || seat.status === "BOOKED",
    );
    const bookedCount = booking.seats.filter((seat) => seat.status === "BOOKED").length;
    await tx.tripSeat.updateMany({
      where: {
        tripId: booking.tripId,
        seatKey: { in: heldOrBooked.map((seat) => seat.seatKey) },
        status: { in: ["HELD", "BOOKED"] },
      },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
    await tx.bookingSeat.updateMany({
      where: { bookingId: booking.id, status: { in: ["HELD", "BOOKED"] } },
      data: { status: "CANCELLED" },
    });
    await tx.seatHold.updateMany({
      where: { bookingId: booking.id, status: "ACTIVE" },
      data: { status: "CANCELLED", releasedAt: new Date(), version: { increment: 1 } },
    });
    if (bookedCount > 0) {
      await tx.trip.update({
        where: { id: booking.tripId },
        data: { availableSeatCount: { increment: bookedCount }, version: { increment: 1 } },
      });
    }
    await tx.bookingCancellation.create({
      data: { bookingId: booking.id, actorUserId: actor.userId, actorRole: actor.role, reason },
    });
    const saved = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: targetStatus,
        cancelledAt: new Date(),
        cancellationReason: reason,
        version: { increment: 1 },
      },
      include: bookingInclude,
    });
    await writeBookingEvent(tx, saved.id, actor.userId, "BOOKING_CANCELLED", {
      actorRole: actor.role,
      reason,
    });
    await writeBookingAudit(tx, "BOOKING_CANCELLED", saved.id, actor, {
      actorRole: actor.role,
      reason,
    });
    await enqueueBookingEvent(tx, "booking.cancelled", saved.id, {
      tripId: booking.tripId,
      actorRole: actor.role,
    });
    return saved;
  });
}

async function driverDecideBooking(
  bookingId: string,
  driverUserId: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string,
  requestId?: string,
) {
  if (decision === "REJECTED") {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: driverUserId } });
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, trip: { driverProfileId: profile?.id ?? "" } },
      select: { id: true },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    return cancelBooking(
      booking.id,
      { userId: driverUserId, role: "DRIVER", requestId },
      reason ?? "Rejected by driver",
    );
  }
  return prisma.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { userId: driverUserId } });
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, trip: { driverProfileId: profile?.id ?? "" } },
      include: bookingInclude,
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (booking.status === "CONFIRMED") return booking;
    if (booking.status !== "PENDING_CONFIRMATION") {
      throw Object.assign(new Error("Booking cannot be approved"), {
        statusCode: 409,
        code: "BOOKING_TRANSITION_INVALID",
      });
    }
    const saved = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", confirmedAt: new Date(), version: { increment: 1 } },
      include: bookingInclude,
    });
    await writeBookingEvent(tx, saved.id, driverUserId, "BOOKING_DRIVER_APPROVED", { reason });
    await writeBookingAudit(
      tx,
      "BOOKING_DRIVER_APPROVED",
      saved.id,
      { userId: driverUserId, role: "DRIVER", requestId },
      { reason },
    );
    await enqueueBookingEvent(tx, "booking.driver.approved", saved.id, { tripId: booking.tripId });
    return saved;
  });
}

async function driverOwnTrip(userId: string, tripId: string) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  return prisma.trip.findFirst({
    where: { id: tripId, driverProfileId: profile.id },
    include: tripInclude,
  });
}

async function validateTripPublication(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      driverProfile: true,
      vehicle: true,
      route: { include: { originCity: true, destinationCity: true } },
      origin: true,
      destination: true,
      stops: true,
    },
  });
  const errors: Array<{ code: string; field?: string; message: string }> = [];
  if (!trip)
    return { canPublish: false, errors: [{ code: "TRIP_NOT_FOUND", message: "Trip not found" }] };
  if (trip.driverProfile.verificationStatus !== "APPROVED") {
    errors.push({
      code: "DRIVER_NOT_APPROVED",
      field: "driverProfileId",
      message: "Driver must be approved",
    });
  }
  if (trip.vehicle.status !== "APPROVED" || trip.vehicle.archivedAt || trip.vehicle.suspendedAt) {
    errors.push({
      code: "VEHICLE_NOT_APPROVED",
      field: "vehicleId",
      message: "Vehicle must be approved and active",
    });
  }
  if (trip.vehicle.driverProfileId !== trip.driverProfileId) {
    errors.push({
      code: "VEHICLE_OWNERSHIP_MISMATCH",
      field: "vehicleId",
      message: "Vehicle must belong to driver",
    });
  }
  if (!trip.routeId || !trip.route?.isActive) {
    errors.push({ code: "ROUTE_INACTIVE", field: "routeId", message: "Active route is required" });
  }
  if (
    !trip.originCityId ||
    !trip.destinationCityId ||
    !trip.origin?.isActive ||
    !trip.destination?.isActive
  ) {
    errors.push({
      code: "CITY_INACTIVE",
      field: "originCityId",
      message: "Active origin and destination cities are required",
    });
  }
  if (trip.originCityId === trip.destinationCityId) {
    errors.push({
      code: "SAME_CITY",
      field: "destinationCityId",
      message: "Origin and destination must differ",
    });
  }
  if (trip.departureAtUtc <= new Date()) {
    errors.push({
      code: "DEPARTURE_IN_PAST",
      field: "departureAtUtc",
      message: "Departure must be in the future",
    });
  }
  if (
    trip.passengerSeatCapacity < 1 ||
    trip.passengerSeatCapacity > trip.vehicle.passengerSeatCount
  ) {
    errors.push({
      code: "CAPACITY_INVALID",
      field: "passengerSeatCapacity",
      message: "Capacity must fit approved vehicle",
    });
  }
  if (trip.currency !== "UZS" || trip.pricePerSeatMinor <= 0n) {
    errors.push({
      code: "PRICE_INVALID",
      field: "pricePerSeatMinor",
      message: "Positive UZS minor-unit price is required",
    });
  }
  if (trip.stops.length < 2) {
    errors.push({
      code: "STOPS_INCOMPLETE",
      field: "stops",
      message: "Origin and destination stops are required",
    });
  }
  return { canPublish: errors.length === 0, errors };
}

async function applyTripStops(
  tx: Prisma.TransactionClient,
  tripId: string,
  stops?: Array<unknown>,
) {
  if (!stops) return;
  await tx.tripStop.deleteMany({ where: { tripId } });
  for (const stop of stops) {
    const parsed = tripStopSchema.parse(stop);
    await tx.tripStop.create({
      data: cleanObject({ tripId, ...parsed }) as Prisma.TripStopUncheckedCreateInput,
    });
  }
}

function matchingDayRange(date: Date) {
  const iso = date.toISOString().slice(0, 10);
  return tashkentDayRange(iso);
}

function canTripServeWaitlist(
  trip: Parameters<typeof canMatchWaitlistEntryToTrip>[0],
  entry: Parameters<typeof canMatchWaitlistEntryToTrip>[1],
) {
  return canMatchWaitlistEntryToTrip(trip, entry, {
    defaultTimeWindowHours: env.MATCHING_TIME_WINDOW_HOURS,
  });
}

async function evaluateWaitlistMatchesForTrip(tx: Prisma.TransactionClient, tripId: string) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.originCityId || !trip.destinationCityId) return [];
  if (!["PUBLISHED", "BOOKING_OPEN"].includes(trip.status)) return [];
  const { start, end } = matchingDayRange(trip.departureAtUtc);
  const entries = await tx.waitlistEntry.findMany({
    where: {
      originCityId: trip.originCityId,
      destinationCityId: trip.destinationCityId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      requestedDate: { gte: start, lt: end },
      passengerCount: { lte: trip.passengerSeatCapacity },
    },
    include: { user: { include: { preferences: true } } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  const created = [];
  for (const entry of entries) {
    if (!canTripServeWaitlist(trip, entry)) continue;
    const match = await tx.waitlistMatch.upsert({
      where: { waitlistId_tripId: { waitlistId: entry.id, tripId: trip.id } },
      create: {
        waitlistId: entry.id,
        tripId: trip.id,
        reason: entry.wholeCar ? "WHOLE_CAR_ROUTE_TIME_AVAILABLE" : "ROUTE_TIME_SEATS_AVAILABLE",
        notifiedAt: new Date(),
      },
      update: {},
    });
    await tx.waitlistEntry.updateMany({
      where: { id: entry.id, status: "ACTIVE" },
      data: { status: "MATCHED", matchedAt: new Date() },
    });
    if (entry.user.preferences?.notificationsEnabled !== false) {
      await ensureNotification(tx, {
        recipientUserId: entry.userId,
        type: "WAITLIST_MATCH_FOUND",
        title: "Поездка найдена",
        body: `${trip.originCity} → ${trip.destinationCity}: есть подходящий рейс`,
        entityType: "WaitlistMatch",
        entityId: match.id,
        deepLink: `/trips/${trip.id}`,
        deduplicationKey: `waitlist:${entry.id}:trip:${trip.id}`,
        payloadJson: { waitlistId: entry.id, tripId: trip.id } as Prisma.InputJsonValue,
      });
    }
    created.push(match);
  }
  return created;
}

async function notifyFavoriteDriversForTrip(tx: Prisma.TransactionClient, tripId: string) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.originCityId || !trip.destinationCityId) return 0;
  const favorites = await tx.favoriteDriver.findMany({
    where: { driverId: trip.driverProfileId, notificationsEnabled: true },
    include: { client: { include: { preferences: true } } },
    take: 100,
  });
  let count = 0;
  for (const favorite of favorites) {
    if (favorite.client.preferences?.notificationsEnabled === false) continue;
    const recentInterest = await tx.savedRoute.findFirst({
      where: {
        userId: favorite.clientUserId,
        originCityId: trip.originCityId,
        destinationCityId: trip.destinationCityId,
      },
    });
    if (!recentInterest) continue;
    await ensureNotification(tx, {
      recipientUserId: favorite.clientUserId,
      type: "FAVORITE_DRIVER_ROUTE_AVAILABLE",
      title: "Любимый водитель на маршруте",
      body: `${trip.originCity} → ${trip.destinationCity}: водитель из избранного опубликовал рейс`,
      entityType: "Trip",
      entityId: trip.id,
      deepLink: `/trips/${trip.id}`,
      deduplicationKey: `favorite-driver:${favorite.clientUserId}:${trip.id}`,
      payloadJson: { driverId: trip.driverProfileId, tripId: trip.id } as Prisma.InputJsonValue,
    });
    count += 1;
  }
  return count;
}

async function createReturnTripDraft(
  tx: Prisma.TransactionClient,
  originalTripId: string,
  createdById: string,
  departureAtUtc: Date,
) {
  const original = await tx.trip.findUniqueOrThrow({ where: { id: originalTripId } });
  const draft = await tx.trip.create({
    data: {
      driverProfileId: original.driverProfileId,
      vehicleId: original.vehicleId,
      originCityId: original.destinationCityId,
      destinationCityId: original.originCityId,
      originCity: original.destinationCity,
      destinationCity: original.originCity,
      departureAtUtc,
      timezone: original.timezone,
      passengerSeatCapacity: original.passengerSeatCapacity,
      availableSeatCount: original.passengerSeatCapacity,
      pricePerSeatMinor: original.pricePerSeatMinor,
      wholeCarPriceMinor: original.wholeCarPriceMinor,
      parcelSupported: original.parcelSupported,
      parcelPriceMinor: original.parcelPriceMinor,
      currency: original.currency,
      luggageRules: original.luggageRules,
      comment: original.comment,
      status: "DRAFT",
    },
  });
  await tx.returnRouteRelation.create({
    data: { originalTripId: original.id, returnTripId: draft.id, createdById },
  });
  await writeTripTimeline(tx, draft.id, "RETURN_TRIP_DRAFT_CREATED", {
    originalTripId: original.id,
  });
  return draft;
}
async function registerTripSupplyRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/regions", async (_req, res) => {
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ regions });
  });

  http.get("/api/v1/cities", async (req, res) => {
    const regionId = cleanText(req.query.regionId, 80);
    const cities = await prisma.city.findMany({
      where: { isActive: true, ...(regionId ? { regionId } : {}) },
      include: { region: true },
      orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }],
    });
    res.json({ cities });
  });

  http.get("/api/v1/cities/:cityId", async (req, res) => {
    const city = await prisma.city.findUnique({
      where: { id: String(req.params.cityId) },
      include: { region: true },
    });
    if (!city || !city.isActive) {
      res.status(404).json(errorBody("CITY_NOT_FOUND", "City not found", req));
      return;
    }
    res.json({ city });
  });

  http.get("/api/v1/cities/:cityId/pickup-points", async (req, res) => {
    const pickupPoints = await prisma.pickupPoint.findMany({
      where: { cityId: String(req.params.cityId), isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ pickupPoints });
  });

  http.get("/api/v1/routes", async (req, res) => {
    const originCityId = cleanText(req.query.originCityId, 80);
    const destinationCityId = cleanText(req.query.destinationCityId, 80);
    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
        ...(originCityId ? { originCityId } : {}),
        ...(destinationCityId ? { destinationCityId } : {}),
      },
      include: { originCity: true, destinationCity: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json({ routes });
  });

  http.get("/api/v1/routes/:routeId", async (req, res) => {
    const route = await prisma.route.findUnique({
      where: { id: String(req.params.routeId) },
      include: {
        originCity: true,
        destinationCity: true,
        stops: { include: { city: true }, orderBy: { order: "asc" } },
      },
    });
    if (!route || !route.isActive) {
      res.status(404).json(errorBody("ROUTE_NOT_FOUND", "Route not found", req));
      return;
    }
    res.json({ route });
  });

  http.get("/api/v1/trips/search", async (req, res) => {
    try {
      res.json(await searchPublicTrips(req.query));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/trips/public/:tripId", async (req, res) => {
    const trip = await prisma.trip.findFirst({
      where: {
        id: String(req.params.tripId),
        status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
        cancelledAt: null,
        blockedAt: null,
        departureAtUtc: { gt: new Date() },
        availableSeatCount: { gt: 0 },
        driverProfile: { verificationStatus: "APPROVED" },
        vehicle: { status: "APPROVED", archivedAt: null, suspendedAt: null },
      },
      include: publicTripInclude,
    });
    if (!trip) {
      res.status(404).json(errorBody("PUBLIC_TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ trip: publicTripDto(trip) });
  });

  http.post("/api/v1/search-events", async (req, res) => {
    try {
      const parsed = searchEventSchema.parse(req.body ?? {});
      await prisma.searchEvent.create({
        data: {
          sessionId: parsed.sessionId ?? null,
          tripId: parsed.tripId ?? null,
          originCityId: parsed.originCityId ?? null,
          destinationCityId: parsed.destinationCityId ?? null,
          queryDate: parsed.queryDate ?? null,
          passengers: parsed.passengers,
          sort: parsed.sort ?? null,
          selectedResultRank: parsed.selectedResultRank ?? null,
          type: parsed.type,
          filtersJson: (parsed.filters ?? {}) as Prisma.InputJsonValue,
        },
      });
      res.status(202).json({ accepted: true });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/trips/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!profile) {
      res.status(403).json(errorBody("DRIVER_PROFILE_REQUIRED", "Driver profile required", req));
      return;
    }
    const status = cleanText(req.query.status, 40);
    const where: Prisma.TripWhereInput = { driverProfileId: profile.id };
    if (status) where.status = status as NonNullable<Prisma.TripWhereInput["status"]>;
    const trips = await prisma.trip.findMany({
      where,
      include: tripInclude,
      orderBy: { departureAtUtc: "asc" },
      take: 100,
    });
    res.json({ trips: serializeBigInt(trips) });
  });

  http.post("/api/v1/trips", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!profile || profile.verificationStatus !== "APPROVED") {
      res.status(403).json(errorBody("DRIVER_NOT_APPROVED", "Driver must be approved", req));
      return;
    }
    const parsed = tripDraftSchema.parse(req.body ?? {});
    const vehicle = parsed.vehicleId
      ? await prisma.vehicle.findFirst({
          where: {
            id: parsed.vehicleId,
            driverProfileId: profile.id,
            status: "APPROVED",
            archivedAt: null,
          },
        })
      : await prisma.vehicle.findFirst({
          where: { driverProfileId: profile.id, status: "APPROVED", archivedAt: null },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        });
    if (!vehicle) {
      res
        .status(400)
        .json(errorBody("APPROVED_VEHICLE_REQUIRED", "Approved vehicle required", req));
      return;
    }
    const trip = await prisma.$transaction(async (tx) => {
      let route = parsed.routeId
        ? await tx.route.findUnique({
            where: { id: parsed.routeId },
            include: { originCity: true, destinationCity: true },
          })
        : null;
      if (!route && parsed.originCityId && parsed.destinationCityId) {
        route = await tx.route.findUnique({
          where: {
            originCityId_destinationCityId: {
              originCityId: parsed.originCityId,
              destinationCityId: parsed.destinationCityId,
            },
          },
          include: { originCity: true, destinationCity: true },
        });
      }
      const origin =
        route?.originCity ??
        (parsed.originCityId
          ? await tx.city.findUnique({ where: { id: parsed.originCityId } })
          : null);
      const destination =
        route?.destinationCity ??
        (parsed.destinationCityId
          ? await tx.city.findUnique({ where: { id: parsed.destinationCityId } })
          : null);
      const departureAtUtc = parsed.departureAtUtc ?? new Date(Date.now() + 86_400_000);
      const capacity = parsed.passengerSeatCapacity ?? Math.min(vehicle.passengerSeatCount, 4);
      const createData = cleanObject({
        driverProfileId: profile.id,
        vehicleId: vehicle.id,
        routeId: route?.id ?? parsed.routeId ?? null,
        originCityId: origin?.id ?? parsed.originCityId ?? null,
        destinationCityId: destination?.id ?? parsed.destinationCityId ?? null,
        originCity: origin?.nameRu ?? "Draft origin",
        destinationCity: destination?.nameRu ?? "Draft destination",
        departureAtUtc,
        arrivalEstimateAtUtc:
          parsed.arrivalEstimateAtUtc ??
          (route?.estimatedDurationMinutes
            ? new Date(departureAtUtc.getTime() + route.estimatedDurationMinutes * 60_000)
            : null),
        timezone: parsed.timezone,
        passengerSeatCapacity: capacity,
        availableSeatCount: capacity,
        pricePerSeatMinor: parsed.pricePerSeatMinor ?? 0n,
        wholeCarPriceMinor: parsed.wholeCarPriceMinor,
        parcelSupported: parsed.parcelSupported ?? false,
        parcelPriceMinor: parsed.parcelPriceMinor,
        currency: "UZS",
        luggageRules: parsed.luggageRules,
        comment: parsed.comment,
      }) as Prisma.TripUncheckedCreateInput;
      const created = await tx.trip.create({
        data: createData,
      });
      await applyTripStops(tx, created.id, parsed.stops);
      await writeTripTimeline(tx, created.id, "TRIP_CREATED", { status: created.status });
      await writeTripAudit(tx, "TRIP_CREATED", created.id, req.auth!.userId, req.requestId);
      return tx.trip.findUniqueOrThrow({ where: { id: created.id }, include: tripInclude });
    });
    res.status(201).json({ trip: serializeTrip(trip) });
  });

  http.get("/api/v1/trips/:tripId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ trip: serializeTrip(trip) });
  });

  http.patch("/api/v1/trips/:tripId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status !== "DRAFT" && trip.status !== "UNPUBLISHED") {
      res
        .status(409)
        .json(errorBody("TRIP_LOCKED", "Unpublish trip before editing critical fields", req));
      return;
    }
    const parsed = tripDraftSchema.parse(req.body ?? {});
    const updated = await prisma.$transaction(async (tx) => {
      const data: Prisma.TripUncheckedUpdateInput = {
        version: { increment: 1 },
        ...(parsed.departureAtUtc ? { departureAtUtc: parsed.departureAtUtc } : {}),
        ...(parsed.arrivalEstimateAtUtc !== undefined
          ? { arrivalEstimateAtUtc: parsed.arrivalEstimateAtUtc }
          : {}),
        ...(parsed.passengerSeatCapacity
          ? {
              passengerSeatCapacity: parsed.passengerSeatCapacity,
              availableSeatCount: parsed.passengerSeatCapacity,
            }
          : {}),
        ...(parsed.pricePerSeatMinor !== undefined
          ? { pricePerSeatMinor: parsed.pricePerSeatMinor }
          : {}),
        ...(parsed.wholeCarPriceMinor !== undefined
          ? { wholeCarPriceMinor: parsed.wholeCarPriceMinor }
          : {}),
        ...(parsed.parcelSupported !== undefined
          ? { parcelSupported: parsed.parcelSupported }
          : {}),
        ...(parsed.parcelPriceMinor !== undefined
          ? { parcelPriceMinor: parsed.parcelPriceMinor }
          : {}),
        ...(parsed.luggageRules !== undefined ? { luggageRules: parsed.luggageRules } : {}),
        ...(parsed.comment !== undefined ? { comment: parsed.comment } : {}),
      };
      const saved = await tx.trip.update({ where: { id: trip.id }, data });
      await applyTripStops(tx, saved.id, parsed.stops);
      await writeTripTimeline(tx, saved.id, "TRIP_UPDATED", {});
      await writeTripAudit(tx, "TRIP_UPDATED", saved.id, req.auth!.userId, req.requestId);
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated) });
  });

  http.post("/api/v1/trips/:tripId/publish", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status === "PUBLISHED") {
      res.json({ trip: serializeTrip(trip), validation: { canPublish: true, errors: [] } });
      return;
    }
    const restriction = await activeAccountRestriction(prisma, req.auth!.userId, [
      "DRIVER_TRIP_CREATION_RESTRICTED",
      ...suspensionRestrictionTypes,
    ]);
    if (restriction) {
      res
        .status(403)
        .json(
          errorBody(
            restriction.type === "FULL_SUSPENSION" || restriction.type === "TEMPORARY_SUSPENSION"
              ? "ACCOUNT_SUSPENDED"
              : "DRIVER_TRIP_CREATION_RESTRICTED",
            "Account restriction blocks this action",
            req,
          ),
        );
      return;
    }
    const validation = await validateTripPublication(trip.id);
    if (!validation.canPublish) {
      res.status(422).json({
        ...errorBody("TRIP_PUBLICATION_INVALID", "Trip cannot be published", req),
        validation,
      });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          unpublishedAt: null,
          availableSeatCount: trip.passengerSeatCapacity,
          publicationValidationSnapshot: validation as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      await ensureTripSeats(tx, saved);
      await tx.tripSeatSnapshot.upsert({
        where: { tripId: saved.id },
        create: {
          tripId: saved.id,
          vehicleId: saved.vehicleId,
          passengerSeatCapacity: saved.passengerSeatCapacity,
          availableSeatCount: saved.passengerSeatCapacity,
        },
        update: {
          vehicleId: saved.vehicleId,
          passengerSeatCapacity: saved.passengerSeatCapacity,
          availableSeatCount: saved.passengerSeatCapacity,
        },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_PUBLISHED", validation);
      await writeTripAudit(tx, "TRIP_PUBLISHED", saved.id, req.auth!.userId, req.requestId);
      await tx.outboxEvent.create({
        data: { type: "trip.published", payload: { tripId: saved.id } },
      });
      const waitlistMatches = await evaluateWaitlistMatchesForTrip(tx, saved.id);
      const favoriteNotifications = await notifyFavoriteDriversForTrip(tx, saved.id);
      await writeTripTimeline(tx, saved.id, "MATCHING_EVALUATED", {
        waitlistMatches: waitlistMatches.length,
        favoriteNotifications,
      });
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated), validation });
  });

  http.post("/api/v1/trips/:tripId/unpublish", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status === "UNPUBLISHED") {
      res.json({ trip: serializeTrip(trip) });
      return;
    }
    if (trip.status !== "PUBLISHED") {
      res
        .status(409)
        .json(errorBody("TRIP_NOT_PUBLISHED", "Only published trips can be unpublished", req));
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.trip.update({
        where: { id: trip.id },
        data: { status: "UNPUBLISHED", unpublishedAt: new Date(), version: { increment: 1 } },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_UNPUBLISHED", {});
      await writeTripAudit(tx, "TRIP_UNPUBLISHED", saved.id, req.auth!.userId, req.requestId);
      await tx.outboxEvent.create({
        data: { type: "trip.unpublished", payload: { tripId: saved.id } },
      });
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated) });
  });

  http.post("/api/v1/trips/:tripId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const parsed = tripCancelSchema.parse(req.body ?? {});
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status === "CANCELLED") {
      res.json({ trip: serializeTrip(trip) });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: parsed.reason,
          version: { increment: 1 },
        },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_CANCELLED", { reason: parsed.reason });
      await writeTripAudit(
        tx,
        "TRIP_CANCELLED",
        saved.id,
        req.auth!.userId,
        req.requestId,
        parsed.reason,
      );
      await tx.outboxEvent.create({
        data: { type: "trip.cancelled", payload: { tripId: saved.id, reason: parsed.reason } },
      });
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated) });
  });

  http.get("/api/v1/trips/:tripId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ timeline: trip.timelineEvents, moderation: trip.moderationEvents });
  });

  http.post("/api/v1/waitlist", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = waitlistEntryCreateSchema.parse(req.body ?? {});
      const expiresAt =
        parsed.expiresAt ?? new Date(Date.now() + env.WAITLIST_EXPIRATION_DAYS * 86400000);
      const entry = await prisma.waitlistEntry.create({
        data: cleanObject({
          userId: req.auth!.userId,
          originCityId: parsed.originCityId,
          destinationCityId: parsed.destinationCityId,
          requestedDate: parsed.requestedDate,
          preferredDepartureAtUtc: parsed.preferredDepartureAtUtc ?? null,
          timeWindowHours: parsed.timeWindowHours ?? null,
          passengerCount: parsed.passengerCount,
          wholeCar: parsed.wholeCar === true,
          expiresAt,
        }) as Prisma.WaitlistEntryUncheckedCreateInput,
      });
      const matches = await prisma.$transaction(async (tx) => {
        const trips = await tx.trip.findMany({
          where: {
            originCityId: entry.originCityId,
            destinationCityId: entry.destinationCityId,
            status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
            departureAtUtc: { gt: new Date() },
            availableSeatCount: {
              gte: entry.wholeCar ? entry.passengerCount : entry.passengerCount,
            },
          },
          take: 20,
          orderBy: { departureAtUtc: "asc" },
        });
        const created = [];
        for (const trip of trips) {
          if (!canTripServeWaitlist(trip, entry)) continue;
          created.push(...(await evaluateWaitlistMatchesForTrip(tx, trip.id)));
        }
        return created;
      });
      res.status(201).json({ entry, matchesCreated: matches.length });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/waitlist/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const entries = await prisma.waitlistEntry.findMany({
      where: { userId: req.auth!.userId },
      include: { originCity: true, destinationCity: true, matches: { include: { trip: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ entries: serializeBigInt(entries) });
  });

  http.delete("/api/v1/waitlist/:entryId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    await prisma.waitlistEntry.updateMany({
      where: { id: String(req.params.entryId), userId: req.auth!.userId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    res.json({ ok: true });
  });

  http.get("/api/v1/matches/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const matches = await prisma.waitlistMatch.findMany({
      where: { waitlist: { userId: req.auth!.userId } },
      include: { waitlist: true, trip: { include: publicTripInclude } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ matches: serializeBigInt(matches) });
  });

  http.post("/api/v1/matches/:matchId/acted", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const match = await prisma.waitlistMatch.updateMany({
      where: { id: String(req.params.matchId), waitlist: { userId: req.auth!.userId } },
      data: { actedAt: new Date() },
    });
    res.json({ ok: match.count === 1 });
  });

  http.get("/api/v1/favorite-drivers", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const favorites = await prisma.favoriteDriver.findMany({
      where: { clientUserId: req.auth!.userId },
      include: { driver: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ favorites: serializeBigInt(favorites) });
  });

  http.post("/api/v1/favorite-drivers/:driverId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const driver = await prisma.driverProfile.findUnique({
      where: { id: String(req.params.driverId) },
    });
    if (!driver) {
      res.status(404).json(errorBody("DRIVER_NOT_FOUND", "Driver not found", req));
      return;
    }
    const favorite = await prisma.favoriteDriver.upsert({
      where: { clientUserId_driverId: { clientUserId: req.auth!.userId, driverId: driver.id } },
      create: { clientUserId: req.auth!.userId, driverId: driver.id },
      update: { notificationsEnabled: req.body?.notificationsEnabled !== false },
    });
    res.status(201).json({ favorite });
  });

  http.delete("/api/v1/favorite-drivers/:driverId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    await prisma.favoriteDriver.deleteMany({
      where: { clientUserId: req.auth!.userId, driverId: String(req.params.driverId) },
    });
    res.json({ ok: true });
  });

  http.get("/api/v1/saved-routes", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const routes = await prisma.savedRoute.findMany({
      where: { userId: req.auth!.userId },
      include: { originCity: true, destinationCity: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ routes });
  });

  http.post("/api/v1/saved-routes", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = savedRouteCreateSchema.parse(req.body ?? {});
      const route = await prisma.savedRoute.upsert({
        where: {
          userId_originCityId_destinationCityId_preferredDepartureWindow: {
            userId: req.auth!.userId,
            originCityId: parsed.originCityId,
            destinationCityId: parsed.destinationCityId,
            preferredDepartureWindow: parsed.preferredDepartureWindow ?? "any",
          },
        },
        create: {
          ...parsed,
          userId: req.auth!.userId,
          preferredDepartureWindow: parsed.preferredDepartureWindow ?? "any",
        },
        update: {},
      });
      res.status(201).json({ route });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/saved-routes/:routeId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    await prisma.savedRoute.deleteMany({
      where: { id: String(req.params.routeId), userId: req.auth!.userId },
    });
    res.json({ ok: true });
  });

  http.get("/api/v1/trips/:tripId/fill-matches", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip || !["PUBLISHED", "BOOKING_OPEN"].includes(trip.status)) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Active trip not found", req));
      return;
    }
    const matches = await prisma.waitlistMatch.findMany({
      where: { tripId: trip.id, dismissedAt: null },
      include: { waitlist: { include: { originCity: true, destinationCity: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    res.json({
      summary: { count: matches.length, availableSeatCount: trip.availableSeatCount },
      matches: serializeBigInt(matches),
    });
  });

  http.get("/api/v1/trips/:tripId/return-draft", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({
      draft: {
        originCityId: trip.destinationCityId,
        destinationCityId: trip.originCityId,
        originCity: trip.destinationCity,
        destinationCity: trip.originCity,
        vehicleId: trip.vehicleId,
        driverProfileId: trip.driverProfileId,
      },
    });
  });

  http.post("/api/v1/trips/:tripId/return-draft", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = returnTripDraftSchema.parse(req.body ?? {});
      const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
      if (!trip) {
        res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
        return;
      }
      const created = await prisma.$transaction((tx) =>
        createReturnTripDraft(tx, trip.id, req.auth!.userId, parsed.departureAtUtc),
      );
      res.status(201).json({ trip: serializeBigInt(created) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/matching/waitlist", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const entries = await prisma.waitlistEntry.findMany({
      include: { user: true, originCity: true, destinationCity: true, matches: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ entries: serializeBigInt(entries) });
  });

  http.get("/api/v1/admin/matching/matches", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const matches = await prisma.waitlistMatch.findMany({
      include: { waitlist: { include: { user: true } }, trip: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ matches: serializeBigInt(matches) });
  });

  http.get("/api/v1/admin/matching/retention-summary", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const [waitlistActive, waitlistMatched, favorites, savedRoutes] = await Promise.all([
      prisma.waitlistEntry.count({ where: { status: "ACTIVE" } }),
      prisma.waitlistEntry.count({ where: { status: "MATCHED" } }),
      prisma.favoriteDriver.count(),
      prisma.savedRoute.count(),
    ]);
    res.json({ waitlistActive, waitlistMatched, favorites, savedRoutes });
  });
  http.get("/api/v1/admin/regions", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    res.json({
      regions: await prisma.region.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    });
  });
  http.post("/api/v1/admin/regions", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = regionSchema.parse(req.body ?? {});
    const region = await prisma.region.create({
      data: cleanObject(parsed) as Prisma.RegionUncheckedCreateInput,
    });
    await writeAudit("REGION_CREATED", "Region", region.id, req.auth!.userId, req.requestId);
    res.status(201).json({ region });
  });
  http.patch("/api/v1/admin/regions/:regionId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = regionSchema.partial().parse(req.body ?? {});
    const region = await prisma.region.update({
      where: { id: String(req.params.regionId) },
      data: cleanObject(parsed) as Prisma.RegionUncheckedUpdateInput,
    });
    await writeAudit("REGION_UPDATED", "Region", region.id, req.auth!.userId, req.requestId);
    res.json({ region });
  });

  http.get("/api/v1/admin/cities", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    res.json({
      cities: await prisma.city.findMany({
        include: { region: true },
        orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }],
      }),
    });
  });
  http.post("/api/v1/admin/cities", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = citySchema.parse(req.body ?? {});
    const city = await prisma.city.create({
      data: cleanObject(parsed) as Prisma.CityUncheckedCreateInput,
    });
    await writeAudit("CITY_CREATED", "City", city.id, req.auth!.userId, req.requestId);
    res.status(201).json({ city });
  });
  http.patch("/api/v1/admin/cities/:cityId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = citySchema.partial().parse(req.body ?? {});
    const city = await prisma.city.update({
      where: { id: String(req.params.cityId) },
      data: cleanObject(parsed) as Prisma.CityUncheckedUpdateInput,
    });
    await writeAudit("CITY_UPDATED", "City", city.id, req.auth!.userId, req.requestId);
    res.json({ city });
  });

  http.get("/api/v1/admin/pickup-points", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    res.json({
      pickupPoints: await prisma.pickupPoint.findMany({
        include: { city: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    });
  });
  http.post("/api/v1/admin/pickup-points", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = pickupPointSchema.parse(req.body ?? {});
    const pickupPoint = await prisma.pickupPoint.create({
      data: cleanObject(parsed) as Prisma.PickupPointUncheckedCreateInput,
    });
    await writeAudit(
      "PICKUP_POINT_CREATED",
      "PickupPoint",
      pickupPoint.id,
      req.auth!.userId,
      req.requestId,
    );
    res.status(201).json({ pickupPoint });
  });
  http.patch("/api/v1/admin/pickup-points/:pickupPointId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = pickupPointSchema.partial().parse(req.body ?? {});
    const pickupPoint = await prisma.pickupPoint.update({
      where: { id: String(req.params.pickupPointId) },
      data: cleanObject(parsed) as Prisma.PickupPointUncheckedUpdateInput,
    });
    await writeAudit(
      "PICKUP_POINT_UPDATED",
      "PickupPoint",
      pickupPoint.id,
      req.auth!.userId,
      req.requestId,
    );
    res.json({ pickupPoint });
  });

  http.get("/api/v1/admin/routes", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    res.json({
      routes: await prisma.route.findMany({
        include: { originCity: true, destinationCity: true },
        take: 200,
      }),
    });
  });
  http.post("/api/v1/admin/routes", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = routeSchema.parse(req.body ?? {});
    if (parsed.originCityId === parsed.destinationCityId) {
      res
        .status(400)
        .json(errorBody("ROUTE_CITY_INVALID", "Origin and destination must differ", req));
      return;
    }
    const route = await prisma.route.create({
      data: cleanObject(parsed) as Prisma.RouteUncheckedCreateInput,
    });
    await writeAudit("ROUTE_CREATED", "Route", route.id, req.auth!.userId, req.requestId);
    res.status(201).json({ route });
  });
  http.patch("/api/v1/admin/routes/:routeId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = routeSchema.partial().parse(req.body ?? {});
    const route = await prisma.route.update({
      where: { id: String(req.params.routeId) },
      data: cleanObject(parsed) as Prisma.RouteUncheckedUpdateInput,
    });
    await writeAudit("ROUTE_UPDATED", "Route", route.id, req.auth!.userId, req.requestId);
    res.json({ route });
  });

  http.get("/api/v1/admin/trips", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status = cleanText(req.query.status, 40);
    const where: Prisma.TripWhereInput = {};
    if (status) where.status = status as NonNullable<Prisma.TripWhereInput["status"]>;
    const trips = await prisma.trip.findMany({
      where,
      include: { ...tripInclude, driverProfile: { include: { user: true } } },
      orderBy: { departureAtUtc: "asc" },
      take: 100,
    });
    res.json({ trips: serializeBigInt(trips) });
  });
  http.get("/api/v1/admin/trips/:tripId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: { ...tripInclude, driverProfile: { include: { user: true } } },
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ trip: serializeBigInt(trip) });
  });

  http.post("/api/v1/admin/trips/:tripId/block", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parsed = tripAdminActionSchema.parse(req.body ?? {});
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: tripInclude,
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status === "BLOCKED") {
      res.json({ trip: serializeTrip(trip) });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: "BLOCKED",
          blockedAt: new Date(),
          blockReason: parsed.reason,
          version: { increment: 1 },
        },
      });
      await tx.tripModerationEvent.create({
        data: {
          tripId: saved.id,
          actorUserId: req.auth!.userId,
          action: "BLOCK",
          reason: parsed.reason,
        },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_BLOCKED", { reason: parsed.reason });
      await writeTripAudit(
        tx,
        "TRIP_BLOCKED",
        saved.id,
        req.auth!.userId,
        req.requestId,
        parsed.reason,
      );
      await tx.outboxEvent.create({
        data: { type: "trip.blocked", payload: { tripId: saved.id, reason: parsed.reason } },
      });
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated) });
  });

  http.post("/api/v1/admin/trips/:tripId/unblock", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: tripInclude,
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    if (trip.status !== "BLOCKED") {
      res.json({ trip: serializeTrip(trip) });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: trip.publishedAt ? "UNPUBLISHED" : "DRAFT",
          blockedAt: null,
          blockReason: null,
          version: { increment: 1 },
        },
      });
      await tx.tripModerationEvent.create({
        data: { tripId: saved.id, actorUserId: req.auth!.userId, action: "UNBLOCK" },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_UNBLOCKED", {});
      await writeTripAudit(tx, "TRIP_UNBLOCKED", saved.id, req.auth!.userId, req.requestId);
      return tx.trip.findUniqueOrThrow({ where: { id: saved.id }, include: tripInclude });
    });
    res.json({ trip: serializeTrip(updated) });
  });

  http.post("/api/v1/admin/trips/:tripId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = tripAdminActionSchema.parse(req.body ?? {});
      const trip = await cancelTripOperational(
        String(req.params.tripId),
        { userId: req.auth!.userId, role: "ADMIN", requestId: req.requestId },
        parsed.reason,
        "CANCELLED_BY_ADMIN",
      );
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/trips/:tripId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: tripInclude,
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ timeline: trip.timelineEvents, moderation: trip.moderationEvents });
  });
}

function rewardSummary(transactions: Array<{ amount: number; status: string }>) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.status === "CONFIRMED") summary.confirmed += transaction.amount;
      if (transaction.status === "PENDING" || transaction.status === "PENDING_REVIEW") {
        summary.pending += transaction.amount;
      }
      if (transaction.status === "REJECTED") summary.rejected += transaction.amount;
      return summary;
    },
    { confirmed: 0, pending: 0, rejected: 0 },
  );
}

function serializeRewardTransaction(
  reward: Prisma.RewardTransactionGetPayload<{
    include: { fraudEvaluation: true; trip: true; referral: true };
  }>,
) {
  return serializeBigInt({
    id: reward.id,
    userId: reward.userId,
    driverProfileId: reward.driverProfileId,
    roleContext: reward.roleContext,
    type: reward.type,
    amount: reward.amount,
    status: reward.status,
    sourceType: reward.sourceType,
    sourceId: reward.sourceId,
    reason: reward.reason,
    createdAt: reward.createdAt,
    confirmedAt: reward.confirmedAt,
    rejectedAt: reward.rejectedAt,
    reviewedAt: reward.reviewedAt,
    trip: reward.trip
      ? {
          id: reward.trip.id,
          originCity: reward.trip.originCity,
          destinationCity: reward.trip.destinationCity,
          status: reward.trip.status,
        }
      : null,
    referral: reward.referral
      ? {
          id: reward.referral.id,
          roleContext: reward.referral.roleContext,
          status: reward.referral.status,
        }
      : null,
    fraud: reward.fraudEvaluation
      ? {
          riskLevel: reward.fraudEvaluation.riskLevel,
          status: reward.fraudEvaluation.status,
          score: reward.fraudEvaluation.score,
          reasons: reward.fraudEvaluation.reasons,
        }
      : null,
  });
}

async function registerRewardRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/rewards/me", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const rewards = await prisma.rewardTransaction.findMany({
      where: { userId: req.auth!.userId },
      include: { fraudEvaluation: true, trip: true, referral: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const referrals = await prisma.referral.findMany({
      where: { OR: [{ referrerUserId: req.auth!.userId }, { referredUserId: req.auth!.userId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      summary: rewardSummary(rewards),
      rewards: rewards.map(serializeRewardTransaction),
      referrals: serializeBigInt(referrals),
    });
  });

  http.get("/api/v1/driver/rewards", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!profile) {
      res.status(404).json(errorBody("DRIVER_PROFILE_NOT_FOUND", "Driver profile not found", req));
      return;
    }
    const rewards = await prisma.rewardTransaction.findMany({
      where: { OR: [{ userId: req.auth!.userId }, { driverProfileId: profile.id }] },
      include: { fraudEvaluation: true, trip: true, referral: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const milestones = await prisma.driverMilestoneProgress.findMany({
      where: { driverProfileId: profile.id },
      include: { milestoneDefinition: true, rewardTransaction: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json({
      summary: rewardSummary(rewards),
      rewards: rewards.map(serializeRewardTransaction),
      milestones: serializeBigInt(milestones),
    });
  });

  http.post("/api/v1/referrals", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = referralCreateSchema.parse(req.body ?? {});
      if (parsed.referredUserId === req.auth!.userId) {
        res
          .status(400)
          .json(errorBody("REFERRAL_SELF_NOT_ALLOWED", "Self referral is not allowed", req));
        return;
      }
      const referred = await prisma.user.findUnique({ where: { id: parsed.referredUserId } });
      if (!referred) {
        res.status(404).json(errorBody("REFERRED_USER_NOT_FOUND", "Referred user not found", req));
        return;
      }
      const referral = await prisma.referral.upsert({
        where: {
          referredUserId_roleContext: {
            referredUserId: parsed.referredUserId,
            roleContext: parsed.roleContext,
          },
        },
        create: {
          referrerUserId: req.auth!.userId,
          referredUserId: parsed.referredUserId,
          roleContext: parsed.roleContext,
          code: parsed.code ?? null,
          status: "REGISTERED",
          registeredAt: new Date(),
        },
        update: {
          ...(parsed.code ? { code: parsed.code } : {}),
          status: "REGISTERED",
          registeredAt: new Date(),
        },
      });
      await writeAudit(
        "REFERRAL_REGISTERED",
        "Referral",
        referral.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ referral: serializeBigInt(referral) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/rewards", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const status = cleanText(req.query.status, 40);
    const where: Prisma.RewardTransactionWhereInput = status ? { status } : {};
    const rewards = await prisma.rewardTransaction.findMany({
      where,
      include: { fraudEvaluation: true, trip: true, referral: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ summary: rewardSummary(rewards), rewards: rewards.map(serializeRewardTransaction) });
  });

  http.post("/api/v1/admin/rewards/:rewardId/review", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = rewardReviewDecisionSchema.parse(req.body ?? {});
      const reward = await prisma.$transaction(async (tx) => {
        const status = parsed.decision === "APPROVE" ? "CONFIRMED" : "REJECTED";
        const now = new Date();
        const saved = await tx.rewardTransaction.update({
          where: { id: String(req.params.rewardId ?? "") },
          data: {
            status,
            reviewedAt: now,
            reviewedById: req.auth!.userId,
            confirmedAt: status === "CONFIRMED" ? now : null,
            rejectedAt: status === "REJECTED" ? now : null,
          },
          include: { fraudEvaluation: true, trip: true, referral: true },
        });
        await tx.fraudEvaluation.updateMany({
          where: { rewardTransactionId: saved.id },
          data: {
            status: parsed.decision === "APPROVE" ? "APPROVED" : "REJECTED",
            decision: parsed.reason,
            reviewedAt: now,
            reviewedById: req.auth!.userId,
          },
        });
        await writeRewardReviewAudit(
          tx,
          saved.id,
          { userId: req.auth!.userId, role: "ADMIN", requestId: req.requestId },
          parsed.decision,
          parsed.reason,
        );
        return saved;
      });
      res.json({ reward: serializeRewardTransaction(reward) });
    } catch (error) {
      handleError(res, req, error);
    }
  });
}
async function registerParcelRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/parcel-categories", async (_req, res) => {
    const categories = await prisma.parcelCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ categories });
  });

  http.get("/api/v1/parcel-rules", async (_req, res) => {
    const prohibited = await prisma.prohibitedParcelCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ limits: defaultParcelLimits, prohibited });
  });

  http.get("/api/v1/trips/public/:tripId/parcel-availability", async (req, res) => {
    res.json(await parcelAvailability(String(req.params.tripId ?? "")));
  });

  http.post("/api/v1/parcels", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = parcelDraftSchema.parse(req.body ?? {});
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "PARCEL_RESTRICTED", [
        "PARCEL_RESTRICTED",
      ]);
      const headerKey = idempotencyKey(req) || randomUUID();
      const response = await prisma.$transaction(async (tx) => {
        const prior = await tx.idempotencyRecord.findUnique({
          where: { scope_key: { scope: `parcel.create:${req.auth!.userId}`, key: headerKey } },
        });
        if (prior) return prior.responseJson as Prisma.JsonObject;
        const category = await tx.parcelCategory.findUnique({
          where: { code: parsed.categoryCode },
        });
        if (!category?.isActive) {
          throw Object.assign(new Error("Parcel category is not available"), {
            statusCode: 400,
            code: "PARCEL_CATEGORY_UNAVAILABLE",
          });
        }
        const trip = parsed.tripId
          ? await tx.trip.findUnique({
              where: { id: parsed.tripId },
              include: { driverProfile: true, vehicle: true },
            })
          : null;
        if (parsed.tripId) {
          const available =
            trip &&
            trip.parcelSupported &&
            ["PUBLISHED", "BOOKING_OPEN"].includes(trip.status) &&
            trip.departureAtUtc > new Date() &&
            trip.driverProfile.verificationStatus === "APPROVED" &&
            trip.vehicle.status === "APPROVED" &&
            trip.driverProfile.userId !== req.auth!.userId;
          if (!available) {
            throw Object.assign(new Error("Trip cannot accept parcels"), {
              statusCode: 409,
              code: "PARCEL_TRIP_UNAVAILABLE",
            });
          }
        }
        const priceInput: { baseParcelPriceMinor?: bigint | null; weightGrams: number } = {
          weightGrams: parsed.weightGrams,
        };
        if (trip) priceInput.baseParcelPriceMinor = trip.parcelPriceMinor;
        const priceMinor = calculateParcelPriceMinor(priceInput);
        const parcelData: Prisma.ParcelOrderUncheckedCreateInput = {
          senderUserId: req.auth!.userId,
          tripId: trip?.id ?? null,
          driverProfileId: trip?.driverProfileId ?? null,
          vehicleId: trip?.vehicleId ?? null,
          categoryId: category.id,
          title: parsed.title,
          description: parsed.description,
          weightGrams: parsed.weightGrams,
          lengthCm: parsed.lengthCm,
          widthCm: parsed.widthCm,
          heightCm: parsed.heightCm,
          declaredValueMinor: parsed.declaredValueMinor,
          priceMinor,
          senderName: parsed.senderName,
          senderPhone: parsed.senderPhone ?? null,
          recipientName: parsed.recipientName,
          recipientPhone: parsed.recipientPhone,
          pickupPointId: parsed.pickupPointId ?? null,
          destinationPickupPointId: parsed.destinationPickupPointId ?? null,
          pickupLabel: parsed.pickupLabel,
          destinationLabel: parsed.destinationLabel,
          senderComment: parsed.senderComment ?? null,
          recipientComment: parsed.recipientComment ?? null,
          contentDeclarationAcceptedAt: parsed.contentDeclarationAccepted ? new Date() : null,
          packagingDeclarationAcceptedAt: parsed.packagingDeclarationAccepted ? new Date() : null,
          termsSnapshot: { version: env.TERMS_VERSION },
          pricingSnapshot: { priceMinor: priceMinor.toString(), currency: "UZS" },
        };
        if (trip) {
          parcelData.tripSnapshot = {
            tripId: trip.id,
            originCity: trip.originCity,
            destinationCity: trip.destinationCity,
            departureAtUtc: trip.departureAtUtc.toISOString(),
          };
        }
        const parcel = await tx.parcelOrder.create({
          data: parcelData,
        });
        await writeParcelEvent(tx, parcel.id, req.auth!.userId, "PARCEL_DRAFT_CREATED");
        const saved = await tx.parcelOrder.findUniqueOrThrow({
          where: { id: parcel.id },
          include: parcelInclude,
        });
        const body = serializeBigInt({
          parcel: serializeParcel(saved),
        }) as unknown as Prisma.JsonObject;
        await tx.idempotencyRecord.create({
          data: {
            scope: `parcel.create:${req.auth!.userId}`,
            key: headerKey,
            requestHash: requestHash(req.body ?? {}),
            responseJson: body,
            status: "COMPLETED",
            expiresAt: new Date(Date.now() + durationToMs("1d")),
          },
        });
        return body;
      });
      res.status(201).json(response);
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/parcels/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const parcels = await prisma.parcelOrder.findMany({
      where: { senderUserId: req.auth!.userId },
      include: parcelInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ parcels: parcels.map(serializeParcel) });
  });

  http.get("/api/v1/parcels/:parcelId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const parcel = await prisma.parcelOrder.findFirst({
      where: { id: String(req.params.parcelId ?? ""), senderUserId: req.auth!.userId },
      include: parcelInclude,
    });
    if (!parcel) {
      res.status(404).json(errorBody("PARCEL_NOT_FOUND", "Parcel not found", req));
      return;
    }
    res.json({ parcel: serializeParcel(parcel) });
  });

  http.post("/api/v1/parcels/:parcelId/submit", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      parcelSubmitSchema.parse(req.body ?? {});
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await clientOwnParcel(
          tx,
          req.auth!.userId,
          String(req.params.parcelId ?? ""),
        );
        if (!current)
          throw Object.assign(new Error("Parcel not found"), {
            statusCode: 404,
            code: "PARCEL_NOT_FOUND",
          });
        await transitionParcel(tx, current, "SUBMIT", {
          userId: req.auth!.userId,
          role: "CLIENT",
          requestId: req.requestId,
        });
        await createParcelCode(tx, current.id, "HANDOVER", req.auth!.userId);
        return tx.parcelOrder.findUniqueOrThrow({
          where: { id: current.id },
          include: parcelInclude,
        });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/parcels/:parcelId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = parcelReasonSchema.parse(req.body ?? {});
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await clientOwnParcel(
          tx,
          req.auth!.userId,
          String(req.params.parcelId ?? ""),
        );
        if (!current)
          throw Object.assign(new Error("Parcel not found"), {
            statusCode: 404,
            code: "PARCEL_NOT_FOUND",
          });
        const actor = {
          userId: req.auth!.userId,
          role: "CLIENT" as const,
          requestId: req.requestId,
        };
        await transitionParcel(tx, current, "CANCEL_SENDER", actor, parsed.reason);
        await tx.parcelCancellation.create({
          data: {
            parcelId: current.id,
            actorUserId: actor.userId,
            actorRole: actor.role,
            reason: parsed.reason,
          },
        });
        return tx.parcelOrder.findUniqueOrThrow({
          where: { id: current.id },
          include: parcelInclude,
        });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/parcels/:parcelId/photos", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = parcelPhotoSchema.parse(req.body ?? {});
      const attachment = await prisma.$transaction(async (tx) => {
        const current = await clientOwnParcel(
          tx,
          req.auth!.userId,
          String(req.params.parcelId ?? ""),
        );
        if (!current)
          throw Object.assign(new Error("Parcel not found"), {
            statusCode: 404,
            code: "PARCEL_NOT_FOUND",
          });
        if (current.attachments.length >= defaultParcelLimits.maxPhotos) {
          throw Object.assign(new Error("Too many parcel photos"), {
            statusCode: 400,
            code: "PARCEL_PHOTO_LIMIT",
          });
        }
        const fileObject = await tx.fileObject.upsert({
          where: { key: parsed.storageKey },
          create: {
            bucket: "parcel-photos",
            key: parsed.storageKey,
            contentType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
            scanStatus: "APPROVED",
          },
          update: {
            contentType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
            scanStatus: "APPROVED",
          },
        });
        const created = await tx.parcelAttachment.create({
          data: { parcelId: current.id, fileObjectId: fileObject.id, ...parsed },
        });
        await writeParcelEvent(tx, current.id, req.auth!.userId, "PARCEL_PHOTO_ADDED", {
          attachmentId: created.id,
        });
        return created;
      });
      res.status(201).json({ attachment });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/parcels/:parcelId/photos/:photoId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const deleted = await prisma.parcelAttachment.deleteMany({
      where: {
        id: String(req.params.photoId ?? ""),
        parcelId: String(req.params.parcelId ?? ""),
        parcel: { senderUserId: req.auth!.userId, status: { in: ["DRAFT", "CREATED"] } },
      },
    });
    res.json({ deleted: deleted.count });
  });

  http.post("/api/v1/parcels/:parcelId/handover-code/regenerate", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const current = await clientOwnParcel(
          tx,
          req.auth!.userId,
          String(req.params.parcelId ?? ""),
        );
        if (!current || current.status !== "ACCEPTED") {
          throw Object.assign(new Error("Handover code unavailable"), {
            statusCode: 409,
            code: "PARCEL_CODE_UNAVAILABLE",
          });
        }
        return createParcelCode(tx, current.id, "HANDOVER", req.auth!.userId);
      });
      res.json({ handoverCode: serializeParcelCode(result.code, result.plain) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/parcels/:parcelId/pickup-code", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const parcel = await prisma.parcelOrder.findFirst({
      where: { id: String(req.params.parcelId ?? ""), senderUserId: req.auth!.userId },
      include: { pickupCodes: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!parcel) {
      res.status(404).json(errorBody("PARCEL_NOT_FOUND", "Parcel not found", req));
      return;
    }
    res.json({
      pickupCode: parcel.pickupCodes[0] ? serializeParcelCode(parcel.pickupCodes[0]) : null,
    });
  });

  http.get("/api/v1/driver/trips/:tripId/parcels", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const parcels = profile
      ? await prisma.parcelOrder.findMany({
          where: { tripId: String(req.params.tripId ?? ""), driverProfileId: profile.id },
          include: parcelInclude,
          orderBy: { createdAt: "desc" },
        })
      : [];
    res.json({ parcels: parcels.map(serializeParcel) });
  });

  http.get("/api/v1/driver/parcels/:parcelId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const parcel = await prisma.$transaction((tx) =>
      driverOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? "")),
    );
    if (!parcel) {
      res.status(404).json(errorBody("PARCEL_NOT_FOUND", "Parcel not found", req));
      return;
    }
    res.json({ parcel: serializeParcel(parcel) });
  });

  async function driverParcelAction(
    req: AuthenticatedRequest,
    res: Response,
    action: Parameters<typeof evaluateParcelTransition>[1],
  ) {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed =
        action === "HANDOVER" || action === "DELIVER"
          ? parcelCodeVerifySchema.parse(req.body ?? {})
          : null;
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await driverOwnParcel(
          tx,
          req.auth!.userId,
          String(req.params.parcelId ?? ""),
        );
        if (!current)
          throw Object.assign(new Error("Parcel not found"), {
            statusCode: 404,
            code: "PARCEL_NOT_FOUND",
          });
        if (action === "HANDOVER" || action === "DELIVER") {
          const code = (action === "HANDOVER" ? current.handoverCodes : current.pickupCodes)[0];
          if (!code)
            throw Object.assign(new Error("Parcel code not found"), {
              statusCode: 404,
              code: "PARCEL_CODE_NOT_FOUND",
            });
          const guard = parcelCodeCanAttempt({ ...code, now: new Date() });
          if (!guard.ok)
            throw Object.assign(new Error(guard.code), { statusCode: 409, code: guard.code });
          const success = code.codeHash === hashSecret(parsed!.code);
          const attemptsCount = code.attemptsCount + 1;
          if (action === "HANDOVER") {
            await tx.parcelHandoverCode.update({
              where: { id: code.id },
              data: success
                ? { attemptsCount, verifiedAt: new Date(), status: "VERIFIED" }
                : {
                    attemptsCount,
                    status: attemptsCount >= code.maxAttempts ? "LOCKED" : "ACTIVE",
                    lockedAt: attemptsCount >= code.maxAttempts ? new Date() : null,
                  },
            });
          } else {
            await tx.parcelPickupCode.update({
              where: { id: code.id },
              data: success
                ? { attemptsCount, verifiedAt: new Date(), status: "VERIFIED" }
                : {
                    attemptsCount,
                    status: attemptsCount >= code.maxAttempts ? "LOCKED" : "ACTIVE",
                    lockedAt: attemptsCount >= code.maxAttempts ? new Date() : null,
                  },
            });
          }
          if (!success)
            throw Object.assign(new Error("Invalid parcel code"), {
              statusCode: 400,
              code: "PARCEL_CODE_INVALID",
            });
        }
        const actor = {
          userId: req.auth!.userId,
          role: "DRIVER" as const,
          requestId: req.requestId,
        };
        await transitionParcel(tx, current, action, actor);
        if (action === "READY_FOR_PICKUP")
          await createParcelCode(tx, current.id, "PICKUP", req.auth!.userId);
        return tx.parcelOrder.findUniqueOrThrow({
          where: { id: current.id },
          include: parcelInclude,
        });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/driver/parcels/:parcelId/accept", (req, res) =>
    driverParcelAction(req, res, "DRIVER_ACCEPT"),
  );
  http.post("/api/v1/driver/parcels/:parcelId/reject", (req, res) =>
    driverParcelAction(req, res, "DRIVER_REJECT"),
  );
  http.post("/api/v1/driver/parcels/:parcelId/handover", (req, res) =>
    driverParcelAction(req, res, "HANDOVER"),
  );
  http.post("/api/v1/driver/parcels/:parcelId/ready-for-pickup", (req, res) =>
    driverParcelAction(req, res, "READY_FOR_PICKUP"),
  );
  http.post("/api/v1/driver/parcels/:parcelId/deliver", (req, res) =>
    driverParcelAction(req, res, "DELIVER"),
  );

  http.post("/api/v1/driver/parcels/:parcelId/report-issue", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = parcelReasonSchema.parse(req.body ?? {});
      const issue = await prisma.parcelIssue.create({
        data: {
          parcelId: String(req.params.parcelId ?? ""),
          actorUserId: req.auth!.userId,
          actorRole: "DRIVER",
          type: "DRIVER_REPORTED",
          reason: parsed.reason,
        },
      });
      res.status(201).json({ issue });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/parcels", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status =
      typeof req.query.status === "string" && parcelStatuses.includes(req.query.status as never)
        ? req.query.status
        : undefined;
    const parcels = await prisma.parcelOrder.findMany({
      where: status ? { status: status as never } : {},
      include: parcelInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ parcels: parcels.map(serializeParcel) });
  });

  http.get("/api/v1/admin/parcels/:parcelId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parcel = await prisma.parcelOrder.findUnique({
      where: { id: String(req.params.parcelId ?? "") },
      include: parcelInclude,
    });
    if (!parcel) {
      res.status(404).json(errorBody("PARCEL_NOT_FOUND", "Parcel not found", req));
      return;
    }
    res.json({ parcel: serializeParcel(parcel) });
  });

  http.get("/api/v1/admin/parcels/:parcelId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const parcelId = String(req.params.parcelId ?? "");
    const [events, timeline, issues, cancellations] = await Promise.all([
      prisma.parcelEvent.findMany({ where: { parcelId }, orderBy: { createdAt: "asc" } }),
      prisma.parcelTimelineEvent.findMany({ where: { parcelId }, orderBy: { createdAt: "asc" } }),
      prisma.parcelIssue.findMany({ where: { parcelId }, orderBy: { createdAt: "desc" } }),
      prisma.parcelCancellation.findMany({ where: { parcelId }, orderBy: { createdAt: "desc" } }),
    ]);
    res.json({ events, timeline, issues, cancellations });
  });

  async function adminParcelAction(
    req: AuthenticatedRequest,
    res: Response,
    action: "CANCEL_ADMIN" | "MARK_LOST" | "MARK_DAMAGED" | "DISPUTE",
  ) {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = parcelReasonSchema.parse(req.body ?? {});
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await tx.parcelOrder.findUnique({
          where: { id: String(req.params.parcelId ?? "") },
          include: parcelInclude,
        });
        if (!current)
          throw Object.assign(new Error("Parcel not found"), {
            statusCode: 404,
            code: "PARCEL_NOT_FOUND",
          });
        const actor = {
          userId: req.auth!.userId,
          role: "ADMIN" as const,
          requestId: req.requestId,
        };
        await transitionParcel(tx, current, action, actor, parsed.reason);
        if (action === "CANCEL_ADMIN") {
          await tx.parcelCancellation.create({
            data: {
              parcelId: current.id,
              actorUserId: actor.userId,
              actorRole: actor.role,
              reason: parsed.reason,
            },
          });
        } else {
          await tx.parcelIssue.create({
            data: {
              parcelId: current.id,
              actorUserId: actor.userId,
              actorRole: actor.role,
              type: action,
              reason: parsed.reason,
            },
          });
        }
        return tx.parcelOrder.findUniqueOrThrow({
          where: { id: current.id },
          include: parcelInclude,
        });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/admin/parcels/:parcelId/cancel", (req, res) =>
    adminParcelAction(req, res, "CANCEL_ADMIN"),
  );
  http.post("/api/v1/admin/parcels/:parcelId/mark-lost", (req, res) =>
    adminParcelAction(req, res, "MARK_LOST"),
  );
  http.post("/api/v1/admin/parcels/:parcelId/mark-damaged", (req, res) =>
    adminParcelAction(req, res, "MARK_DAMAGED"),
  );
  http.post("/api/v1/admin/parcels/:parcelId/dispute", (req, res) =>
    adminParcelAction(req, res, "DISPUTE"),
  );
}

async function registerCommunicationRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.post("/api/v1/conversations", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = createConversationSchema.parse(req.body ?? {});
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "CHAT_RESTRICTED", [
        "CHAT_RESTRICTED",
      ]);
      const conversation = await prisma.$transaction((tx) =>
        createOrGetConversation(tx, req.auth!.userId, {
          ...(parsed.bookingId ? { bookingId: parsed.bookingId } : {}),
          ...(parsed.parcelOrderId ? { parcelOrderId: parsed.parcelOrderId } : {}),
        }),
      );
      res.status(201).json({ conversation: serializeConversation(conversation, req.auth!.userId) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/conversations", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.auth!.userId, leftAt: null, isArchived: false } },
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    res.json({
      conversations: conversations.map((item) => serializeConversation(item, req.auth!.userId)),
    });
  });

  http.get("/api/v1/conversations/:conversationId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const conversation = await prisma.$transaction((tx) =>
      participantConversation(tx, req.auth!.userId, String(req.params.conversationId ?? "")),
    );
    if (!conversation) {
      res.status(404).json(errorBody("CONVERSATION_NOT_FOUND", "Conversation not found", req));
      return;
    }
    res.json({ conversation: serializeConversation(conversation, req.auth!.userId) });
  });

  http.get("/api/v1/conversations/:conversationId/messages", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: String(req.params.conversationId ?? ""),
        participants: { some: { userId: req.auth!.userId } },
      },
    });
    if (!conversation) {
      res.status(404).json(errorBody("CONVERSATION_NOT_FOUND", "Conversation not found", req));
      return;
    }
    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      include: { attachments: true, receipts: true, sender: true },
      orderBy: { sentAt: "asc" },
      take: 100,
    });
    res.json({ messages: messages.map(serializeMessage) });
  });

  http.post("/api/v1/conversations/:conversationId/messages", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = chatMessageSchema.parse(req.body ?? {});
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "CHAT_RESTRICTED", [
        "CHAT_RESTRICTED",
      ]);
      const message = await prisma.$transaction(async (tx) => {
        const conversation = await participantConversation(
          tx,
          req.auth!.userId,
          String(req.params.conversationId ?? ""),
        );
        if (!conversation || conversation.status !== "ACTIVE") {
          throw Object.assign(new Error("Conversation not found"), {
            statusCode: 404,
            code: "CONVERSATION_NOT_FOUND",
          });
        }
        const existing = await tx.chatMessage.findUnique({
          where: {
            conversationId_clientMessageId: {
              conversationId: conversation.id,
              clientMessageId: parsed.clientMessageId,
            },
          },
          include: { attachments: true, receipts: true, sender: true },
        });
        if (existing) return existing;
        const created = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderUserId: req.auth!.userId,
            clientMessageId: parsed.clientMessageId,
            type: parsed.type,
            text: parsed.text ?? null,
            locationLat: parsed.locationLat ?? null,
            locationLng: parsed.locationLng ?? null,
            locationLabel: parsed.locationLabel ?? null,
            replyToMessageId: parsed.replyToMessageId ?? null,
          },
          include: { attachments: true, receipts: true, sender: true },
        });
        const recipients = conversation.participants.filter(
          (participant) => participant.userId !== req.auth!.userId,
        );
        for (const participant of recipients) {
          await tx.chatMessageReceipt.create({
            data: {
              messageId: created.id,
              recipientUserId: participant.userId,
              status: "SENT",
              deliveredAt: new Date(),
            },
          });
          await ensureNotification(tx, {
            recipientUserId: participant.userId,
            type: "CHAT_MESSAGE",
            title: "New message",
            body:
              parsed.type === "TEXT"
                ? (parsed.text ?? "New message")
                : `New ${parsed.type.toLowerCase()} message`,
            entityType: "Conversation",
            entityId: conversation.id,
            deepLink: `/messages/${conversation.id}`,
            deduplicationKey: `chat:${created.id}:${participant.userId}`,
          });
        }
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: created.sentAt, version: { increment: 1 } },
        });
        await tx.communicationTimelineEvent.create({
          data: {
            conversationId: conversation.id,
            actorUserId: req.auth!.userId,
            type: "CHAT_MESSAGE_SENT",
            payload: { messageId: created.id },
          },
        });
        return tx.chatMessage.findUniqueOrThrow({
          where: { id: created.id },
          include: { attachments: true, receipts: true, sender: true },
        });
      });
      res.status(201).json({ message: serializeMessage(message) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/conversations/:conversationId/read", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const conversationId = String(req.params.conversationId ?? "");
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const conversation = await participantConversation(tx, req.auth!.userId, conversationId);
      if (!conversation)
        throw Object.assign(new Error("Conversation not found"), {
          statusCode: 404,
          code: "CONVERSATION_NOT_FOUND",
        });
      const latest = await tx.chatMessage.findFirst({
        where: { conversationId },
        orderBy: { sentAt: "desc" },
      });
      await tx.chatMessageReceipt.updateMany({
        where: { recipientUserId: req.auth!.userId, message: { conversationId } },
        data: { status: "READ", readAt: now },
      });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: req.auth!.userId } },
        data: { lastReadAt: now, lastReadMessageId: latest?.id ?? null },
      });
    });
    res.json({ readAt: now });
  });

  http.patch("/api/v1/messages/:messageId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = chatMessageEditSchema.parse(req.body ?? {});
      const existing = await prisma.chatMessage.findFirst({
        where: { id: String(req.params.messageId ?? ""), senderUserId: req.auth!.userId },
      });
      if (!existing) {
        res.status(404).json(errorBody("MESSAGE_NOT_FOUND", "Message not found", req));
        return;
      }
      const message = await prisma.chatMessage.update({
        where: { id: existing.id },
        data: { text: parsed.text, editedAt: new Date() },
        include: { attachments: true, receipts: true, sender: true },
      });
      res.json({ message: serializeMessage(message) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/messages/:messageId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const existing = await prisma.chatMessage.findFirst({
      where: { id: String(req.params.messageId ?? ""), senderUserId: req.auth!.userId },
    });
    if (!existing) {
      res.status(404).json(errorBody("MESSAGE_NOT_FOUND", "Message not found", req));
      return;
    }
    const message = await prisma.chatMessage.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), status: "DELETED" },
      include: { attachments: true, receipts: true, sender: true },
    });
    res.json({ message: serializeMessage(message) });
  });

  http.post("/api/v1/messages/:messageId/report", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = messageReportSchema.parse(req.body ?? {});
      const report = await prisma.$transaction(async (tx) => {
        const message = await tx.chatMessage.findFirst({
          where: {
            id: String(req.params.messageId ?? ""),
            conversation: { participants: { some: { userId: req.auth!.userId } } },
          },
        });
        if (!message)
          throw Object.assign(new Error("Message not found"), {
            statusCode: 404,
            code: "MESSAGE_NOT_FOUND",
          });
        await tx.chatMessage.update({
          where: { id: message.id },
          data: { status: "REPORTED", moderationStatus: "REPORTED" },
        });
        return tx.messageReport.create({
          data: {
            conversationId: message.conversationId,
            messageId: message.id,
            reporterUserId: req.auth!.userId,
            reason: parsed.reason,
          },
        });
      });
      res.status(201).json({ report });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/bookings/:bookingId/conversation", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "CHAT_RESTRICTED", [
        "CHAT_RESTRICTED",
      ]);
      const conversation = await prisma.$transaction((tx) =>
        createOrGetConversation(tx, req.auth!.userId, {
          bookingId: String(req.params.bookingId ?? ""),
        }),
      );
      res.json({ conversation: serializeConversation(conversation, req.auth!.userId) });
    } catch (error) {
      handleError(res, req, error);
    }
    return;
  });

  http.get("/api/v1/parcels/:parcelId/conversation", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "CHAT_RESTRICTED", [
        "CHAT_RESTRICTED",
      ]);
      const conversation = await prisma.$transaction((tx) =>
        createOrGetConversation(tx, req.auth!.userId, {
          parcelOrderId: String(req.params.parcelId ?? ""),
        }),
      );
      res.json({ conversation: serializeConversation(conversation, req.auth!.userId) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/notifications", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const notifications = await prisma.notification.findMany({
      where: { recipientUserId: req.auth!.userId, archivedAt: null },
      include: { deliveries: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ notifications });
  });

  http.get("/api/v1/notifications/unread-count", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const count = await prisma.notification.count({
      where: { recipientUserId: req.auth!.userId, status: "UNREAD" },
    });
    res.json({ count });
  });

  http.post("/api/v1/notifications/:id/read", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const existing = await prisma.notification.findFirst({
      where: { id: String(req.params.id ?? ""), recipientUserId: req.auth!.userId },
    });
    if (!existing) {
      res.status(404).json(errorBody("NOTIFICATION_NOT_FOUND", "Notification not found", req));
      return;
    }
    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { status: "READ", readAt: new Date() },
    });
    res.json({ notification });
  });

  http.post("/api/v1/notifications/read-all", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const result = await prisma.notification.updateMany({
      where: { recipientUserId: req.auth!.userId, status: "UNREAD" },
      data: { status: "READ", readAt: new Date() },
    });
    res.json({ updated: result.count });
  });

  http.post("/api/v1/notifications/:id/archive", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const existing = await prisma.notification.findFirst({
      where: { id: String(req.params.id ?? ""), recipientUserId: req.auth!.userId },
    });
    if (!existing) {
      res.status(404).json(errorBody("NOTIFICATION_NOT_FOUND", "Notification not found", req));
      return;
    }
    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    res.json({ notification });
  });

  http.post("/api/v1/admin/notifications", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = notificationCreateSchema.parse(req.body ?? {});
      const notification = await prisma.$transaction((tx) =>
        ensureNotification(tx, {
          recipientUserId: parsed.recipientUserId,
          type: parsed.type,
          title: parsed.title,
          body: parsed.body,
          entityType: parsed.entityType ?? null,
          entityId: parsed.entityId ?? null,
          deepLink: parsed.deepLink ?? null,
          deduplicationKey: parsed.deduplicationKey,
        }),
      );
      await writeAudit(
        "NOTIFICATION_CREATED",
        "Notification",
        notification.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ notification });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/support/tickets", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = supportTicketCreateSchema.parse(req.body ?? {});
      const ticket = await prisma.$transaction(async (tx) => {
        await ensureSupportEntityAccess(tx, req.auth!.userId, {
          bookingId: parsed.bookingId ?? null,
          tripId: parsed.tripId ?? null,
          parcelOrderId: parsed.parcelOrderId ?? null,
        });
        const created = await tx.supportTicket.create({
          data: {
            requesterUserId: req.auth!.userId,
            type: parsed.type,
            subject: parsed.subject,
            description: parsed.description,
            priority: parsed.priority,
            requesterRole:
              parsed.requesterRole ?? (req.auth!.roles.includes("DRIVER") ? "DRIVER" : "CLIENT"),
            bookingId: parsed.bookingId ?? null,
            tripId: parsed.tripId ?? null,
            parcelOrderId: parsed.parcelOrderId ?? null,
            slaDueAt: calculateSlaDueAt(parsed.priority),
            retentionUntil: new Date(
              Date.now() + defaultChatLimits.retentionDays * 24 * 60 * 60 * 1000,
            ),
            participants: { create: { userId: req.auth!.userId, role: "REQUESTER" } },
            messages: { create: { senderUserId: req.auth!.userId, text: parsed.description } },
            statusEvents: {
              create: { actorUserId: req.auth!.userId, toStatus: "NEW", reason: "Ticket opened" },
            },
          },
          include: supportTicketInclude,
        });
        await tx.communicationTimelineEvent.create({
          data: {
            ticketId: created.id,
            actorUserId: req.auth!.userId,
            type: "SUPPORT_TICKET_CREATED",
            payload: { priority: parsed.priority, type: parsed.type },
          },
        });
        return created;
      });
      await writeAudit(
        "SUPPORT_TICKET_CREATED",
        "SupportTicket",
        ticket.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ ticket: serializeSupportTicket(ticket) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/support/tickets", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const tickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { requesterUserId: req.auth!.userId },
          { participants: { some: { userId: req.auth!.userId, leftAt: null } } },
        ],
      },
      include: supportTicketInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json({ tickets: tickets.map((ticket) => serializeSupportTicket(ticket)) });
  });

  http.get("/api/v1/support/tickets/:ticketId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const ticket = await prisma.$transaction((tx) =>
      userCanAccessSupportTicket(tx, req.auth!.userId, String(req.params.ticketId ?? "")),
    );
    if (!ticket) {
      res.status(404).json(errorBody("SUPPORT_TICKET_NOT_FOUND", "Support ticket not found", req));
      return;
    }
    res.json({ ticket: serializeSupportTicket(ticket) });
  });

  http.post("/api/v1/support/tickets/:ticketId/messages", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = supportTicketMessageSchema.parse(req.body ?? {});
      const ticket = await prisma.$transaction(async (tx) => {
        const current = await userCanAccessSupportTicket(
          tx,
          req.auth!.userId,
          String(req.params.ticketId ?? ""),
        );
        if (!current)
          throw Object.assign(new Error("Support ticket not found"), {
            statusCode: 404,
            code: "SUPPORT_TICKET_NOT_FOUND",
          });
        if (["RESOLVED", "CLOSED", "REJECTED"].includes(current.status)) {
          throw Object.assign(new Error("Support ticket is closed"), {
            statusCode: 409,
            code: "SUPPORT_TICKET_CLOSED",
          });
        }
        if (parsed.replyToMessageId) {
          const replyTo = await tx.ticketMessage.findFirst({
            where: { id: parsed.replyToMessageId, ticketId: current.id, deletedAt: null },
          });
          if (!replyTo) {
            throw Object.assign(new Error("Reply target is not available"), {
              statusCode: 404,
              code: "SUPPORT_REPLY_NOT_FOUND",
            });
          }
        }
        await tx.ticketMessage.create({
          data: {
            ticketId: current.id,
            senderUserId: req.auth!.userId,
            text: parsed.text,
            replyToMessageId: parsed.replyToMessageId ?? null,
          },
        });
        const transition =
          current.status === "WAITING_FOR_USER"
            ? evaluateSupportTransition(current.status, "USER_REPLY")
            : null;
        if (transition?.ok && !transition.idempotent) {
          await tx.supportTicket.update({
            where: { id: current.id },
            data: { status: transition.toStatus, version: { increment: 1 } },
          });
          await tx.ticketStatusEvent.create({
            data: {
              ticketId: current.id,
              actorUserId: req.auth!.userId,
              fromStatus: current.status,
              toStatus: transition.toStatus,
              reason: "User replied",
            },
          });
        } else {
          await tx.supportTicket.update({
            where: { id: current.id },
            data: { updatedAt: new Date(), version: { increment: 1 } },
          });
        }
        await tx.communicationTimelineEvent.create({
          data: {
            ticketId: current.id,
            actorUserId: req.auth!.userId,
            type: "SUPPORT_MESSAGE_SENT",
          },
        });
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: current.id },
          include: supportTicketInclude,
        });
      });
      res.status(201).json({ ticket: serializeSupportTicket(ticket) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/support/tickets/:ticketId/attachments", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = supportAttachmentMetadataSchema.parse(req.body ?? {});
      const attachment = await prisma.$transaction(async (tx) => {
        const current = await userCanAccessSupportTicket(
          tx,
          req.auth!.userId,
          String(req.params.ticketId ?? ""),
        );
        if (!current) {
          throw Object.assign(new Error("Support ticket not found"), {
            statusCode: 404,
            code: "SUPPORT_TICKET_NOT_FOUND",
          });
        }
        if (["RESOLVED", "CLOSED", "REJECTED"].includes(current.status)) {
          throw Object.assign(new Error("Support ticket is closed"), {
            statusCode: 409,
            code: "SUPPORT_TICKET_CLOSED",
          });
        }
        if (parsed.messageId) {
          const message = await tx.ticketMessage.findFirst({
            where: { id: parsed.messageId, ticketId: current.id, deletedAt: null },
          });
          if (!message) {
            throw Object.assign(new Error("Ticket message not found"), {
              statusCode: 404,
              code: "SUPPORT_MESSAGE_NOT_FOUND",
            });
          }
        }
        const fileObject = parsed.fileObjectId
          ? await tx.fileObject.findFirst({ where: { id: parsed.fileObjectId } })
          : parsed.storageKey
            ? await tx.fileObject.upsert({
                where: { key: parsed.storageKey },
                create: {
                  bucket: "support-attachments",
                  key: parsed.storageKey,
                  contentType: parsed.mimeType,
                  sizeBytes: parsed.sizeBytes,
                  scanStatus: "APPROVED",
                },
                update: {
                  contentType: parsed.mimeType,
                  sizeBytes: parsed.sizeBytes,
                  scanStatus: "APPROVED",
                },
              })
            : null;
        if (parsed.fileObjectId && !fileObject) {
          throw Object.assign(new Error("File object not found"), {
            statusCode: 404,
            code: "SUPPORT_FILE_NOT_FOUND",
          });
        }
        const created = await tx.ticketAttachment.create({
          data: {
            ticketId: current.id,
            messageId: parsed.messageId ?? null,
            fileObjectId: fileObject?.id ?? null,
            originalFileName: parsed.originalFileName,
            mimeType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
            checksum: parsed.checksum,
          },
        });
        await tx.communicationTimelineEvent.create({
          data: {
            ticketId: current.id,
            actorUserId: req.auth!.userId,
            type: "SUPPORT_ATTACHMENT_ADDED",
            payload: { mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes },
          },
        });
        return created;
      });
      res.status(201).json({ attachment: serializeTicketAttachment(attachment) });
    } catch (error) {
      handleError(res, req, error);
    }
  });
  http.get("/api/v1/admin/support/tickets", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const tickets = await prisma.supportTicket.findMany({
      include: supportTicketInclude,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    res.json({
      tickets: tickets.map((ticket) => serializeSupportTicket(ticket, { includeInternal: true })),
    });
  });

  http.get("/api/v1/admin/support/tickets/:ticketId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: String(req.params.ticketId ?? "") },
      include: supportTicketInclude,
    });
    if (!ticket) {
      res.status(404).json(errorBody("SUPPORT_TICKET_NOT_FOUND", "Support ticket not found", req));
      return;
    }
    res.json({ ticket: serializeSupportTicket(ticket, { includeInternal: true }) });
  });

  http.post("/api/v1/admin/support/tickets/:ticketId/reply", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = supportTicketMessageSchema.parse(req.body ?? {});
      const ticket = await prisma.$transaction(async (tx) => {
        const current = await tx.supportTicket.findUnique({
          where: { id: String(req.params.ticketId ?? "") },
        });
        if (!current)
          throw Object.assign(new Error("Support ticket not found"), {
            statusCode: 404,
            code: "SUPPORT_TICKET_NOT_FOUND",
          });
        if (parsed.replyToMessageId) {
          const replyTo = await tx.ticketMessage.findFirst({
            where: { id: parsed.replyToMessageId, ticketId: current.id, deletedAt: null },
          });
          if (!replyTo) {
            throw Object.assign(new Error("Reply target is not available"), {
              statusCode: 404,
              code: "SUPPORT_REPLY_NOT_FOUND",
            });
          }
        }
        await tx.ticketMessage.create({
          data: {
            ticketId: current.id,
            senderUserId: req.auth!.userId,
            text: parsed.text,
            replyToMessageId: parsed.replyToMessageId ?? null,
          },
        });
        await tx.supportTicket.update({
          where: { id: current.id },
          data: {
            firstResponseAt: current.firstResponseAt ?? new Date(),
            updatedAt: new Date(),
            version: { increment: 1 },
          },
        });
        await tx.communicationTimelineEvent.create({
          data: {
            ticketId: current.id,
            actorUserId: req.auth!.userId,
            type: "SUPPORT_AGENT_REPLIED",
          },
        });
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: current.id },
          include: supportTicketInclude,
        });
      });
      await writeAudit(
        "SUPPORT_TICKET_REPLIED",
        "SupportTicket",
        ticket.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ ticket: serializeSupportTicket(ticket, { includeInternal: true }) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/support/tickets/:ticketId/internal-notes", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = supportTicketMessageSchema.parse(req.body ?? {});
      const note = await prisma.ticketInternalNote.create({
        data: {
          ticketId: String(req.params.ticketId ?? ""),
          authorUserId: req.auth!.userId,
          text: parsed.text,
        },
      });
      await writeAudit(
        "SUPPORT_INTERNAL_NOTE_CREATED",
        "SupportTicket",
        String(req.params.ticketId ?? ""),
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ note });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/support/tickets/:ticketId/assign", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = supportAssignmentSchema.parse(req.body ?? {});
      const ticket = await prisma.$transaction(async (tx) => {
        const current = await tx.supportTicket.findUnique({
          where: { id: String(req.params.ticketId ?? "") },
        });
        if (!current)
          throw Object.assign(new Error("Support ticket not found"), {
            statusCode: 404,
            code: "SUPPORT_TICKET_NOT_FOUND",
          });
        await tx.ticketAssignment.create({
          data: {
            ticketId: current.id,
            assigneeUserId: parsed.assigneeUserId ?? null,
            assignedByUserId: req.auth!.userId,
            reason: parsed.reason ?? null,
          },
        });
        if (parsed.assigneeUserId) {
          await tx.supportTicketParticipant.upsert({
            where: { ticketId_userId: { ticketId: current.id, userId: parsed.assigneeUserId } },
            create: { ticketId: current.id, userId: parsed.assigneeUserId, role: "ASSIGNEE" },
            update: { leftAt: null },
          });
        }
        await tx.supportTicket.update({
          where: { id: current.id },
          data: { assignedToUserId: parsed.assigneeUserId ?? null, version: { increment: 1 } },
        });
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: current.id },
          include: supportTicketInclude,
        });
      });
      await writeAudit(
        "SUPPORT_TICKET_ASSIGNED",
        "SupportTicket",
        ticket.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.json({ ticket: serializeSupportTicket(ticket, { includeInternal: true }) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/support/tickets/:ticketId/status", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = supportTicketStatusSchema.parse(req.body ?? {});
      const ticket = await prisma.$transaction(async (tx) => {
        const current = await tx.supportTicket.findUnique({
          where: { id: String(req.params.ticketId ?? "") },
        });
        if (!current)
          throw Object.assign(new Error("Support ticket not found"), {
            statusCode: 404,
            code: "SUPPORT_TICKET_NOT_FOUND",
          });
        const transition = evaluateSupportTransition(
          current.status,
          supportActionForStatus(parsed.status),
        );
        if (!transition.ok)
          throw Object.assign(new Error(transition.message), {
            statusCode: 409,
            code: transition.code,
          });
        if (!transition.idempotent) {
          await tx.supportTicket.update({
            where: { id: current.id },
            data: {
              status: transition.toStatus,
              resolvedAt: transition.toStatus === "RESOLVED" ? new Date() : current.resolvedAt,
              closedAt: transition.toStatus === "CLOSED" ? new Date() : current.closedAt,
              version: { increment: 1 },
            },
          });
          await tx.ticketStatusEvent.create({
            data: {
              ticketId: current.id,
              actorUserId: req.auth!.userId,
              fromStatus: current.status,
              toStatus: transition.toStatus,
              reason: parsed.reason ?? null,
            },
          });
          await tx.communicationTimelineEvent.create({
            data: {
              ticketId: current.id,
              actorUserId: req.auth!.userId,
              type: "SUPPORT_STATUS_CHANGED",
              payload: { fromStatus: current.status, toStatus: transition.toStatus },
            },
          });
        }
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: current.id },
          include: supportTicketInclude,
        });
      });
      await writeAudit(
        "SUPPORT_TICKET_STATUS_CHANGED",
        "SupportTicket",
        ticket.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.json({ ticket: serializeSupportTicket(ticket, { includeInternal: true }) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/support/tickets/:ticketId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const ticketId = String(req.params.ticketId ?? "");
    const [statusEvents, timeline] = await Promise.all([
      prisma.ticketStatusEvent.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" } }),
      prisma.communicationTimelineEvent.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    res.json({ statusEvents, timeline });
  });
}

async function registerTrustSafetyRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/reviews/eligibility", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = reviewSchema
        .pick({
          type: true,
          bookingId: true,
          tripId: true,
          parcelOrderId: true,
          revieweeUserId: true,
          overallRating: true,
        })
        .parse({ ...req.query, overallRating: 5 });
      const context = await prisma.$transaction((tx) =>
        reviewEligibilityContext(tx, req.auth!.userId, parsed),
      );
      const eligibility = evaluateReviewEligibility({
        type: parsed.type,
        reviewerUserId: req.auth!.userId,
        revieweeUserId: parsed.revieweeUserId,
        entityStatus: context.entityStatus,
        reviewerParticipated: context.reviewerParticipated,
        revieweeIsCounterpart: context.revieweeIsCounterpart,
        completedAt: context.completedAt,
      });
      res.json({ eligibility });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/reviews", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = reviewSchema.parse(req.body ?? {});
      const key = idempotencyKey(req) || `review:${req.auth!.userId}:${requestHash(parsed)}`;
      const result = await prisma.$transaction(async (tx) =>
        ensureIdempotency(tx, "review:create", key, parsed, async () => {
          const context = await reviewEligibilityContext(tx, req.auth!.userId, parsed);
          const eligibility = evaluateReviewEligibility({
            type: parsed.type,
            reviewerUserId: req.auth!.userId,
            revieweeUserId: parsed.revieweeUserId,
            entityStatus: context.entityStatus,
            reviewerParticipated: context.reviewerParticipated,
            revieweeIsCounterpart: context.revieweeIsCounterpart,
            completedAt: context.completedAt,
          });
          if (!eligibility.ok) {
            throw Object.assign(new Error(eligibility.message), {
              statusCode: 409,
              code: eligibility.code,
            });
          }
          const criteria = await tx.reviewCriterion.findMany({
            where: { type: parsed.type, isActive: true },
          });
          const existingReview = await tx.review.findFirst({
            where: {
              type: parsed.type,
              reviewerUserId: req.auth!.userId,
              revieweeUserId: parsed.revieweeUserId,
              bookingId: context.bookingId,
              parcelOrderId: context.parcelOrderId,
            },
          });
          const created = existingReview
            ? await tx.review.update({
                where: { id: existingReview.id },
                data: {
                  overallRating: parsed.overallRating,
                  text: stripUnsafeReviewText(parsed.text),
                  editedAt: new Date(),
                  version: { increment: 1 },
                },
              })
            : await tx.review.create({
                data: {
                  type: parsed.type,
                  reviewerUserId: req.auth!.userId,
                  revieweeUserId: parsed.revieweeUserId,
                  bookingId: context.bookingId,
                  tripId: context.tripId,
                  parcelOrderId: context.parcelOrderId,
                  overallRating: parsed.overallRating,
                  text: stripUnsafeReviewText(parsed.text),
                  status: "PUBLISHED",
                  submittedAt: new Date(),
                  publishedAt: new Date(),
                },
              });
          for (const score of parsed.criteria) {
            const criterion = criteria.find((item) => item.code === score.code);
            if (!criterion) continue;
            await tx.reviewCriterionScore.upsert({
              where: { reviewId_criterionId: { reviewId: created.id, criterionId: criterion.id } },
              create: { reviewId: created.id, criterionId: criterion.id, score: score.score },
              update: { score: score.score },
            });
          }
          await recomputeRatingAggregate(tx, parsed.revieweeUserId);
          await ensureNotification(tx, {
            recipientUserId: parsed.revieweeUserId,
            type: "REVIEW_RECEIVED",
            title: "New review received",
            body: "You received a new Nodex review.",
            entityType: "Review",
            entityId: created.id,
            deduplicationKey: `review:received:${created.id}`,
          });
          await tx.outboxEvent.create({
            data: { type: "review.published", payload: { reviewId: created.id } },
          });
          return { reviewId: created.id };
        }),
      );
      const review = await prisma.review.findUniqueOrThrow({
        where: { id: result.reviewId },
        include: reviewInclude,
      });
      await writeAudit("REVIEW_SUBMITTED", "Review", review.id, req.auth!.userId, req.requestId);
      res.status(201).json({ review: serializeReview(review) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/reviews/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const reviews = await prisma.review.findMany({
      where: { reviewerUserId: req.auth!.userId },
      include: reviewInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ reviews: reviews.map(serializeReview) });
  });

  http.get("/api/v1/reviews/received", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const reviews = await prisma.review.findMany({
      where: { revieweeUserId: req.auth!.userId, status: { in: ["PUBLISHED", "UNDER_REVIEW"] } },
      include: reviewInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ reviews: reviews.map(serializeReview) });
  });

  http.get("/api/v1/reviews/:reviewId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const review = await prisma.review.findFirst({
      where: {
        id: String(req.params.reviewId ?? ""),
        OR: [
          { reviewerUserId: req.auth!.userId },
          { revieweeUserId: req.auth!.userId },
          ...(req.auth!.roles.some((role) => role === "ADMIN" || role === "SUPPORT") ? [{}] : []),
        ],
      },
      include: reviewInclude,
    });
    if (!review) {
      res.status(404).json(errorBody("REVIEW_NOT_FOUND", "Review not found", req));
      return;
    }
    res.json({ review: serializeReview(review) });
  });

  http.patch("/api/v1/reviews/:reviewId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = reviewEditSchema.parse(req.body ?? {});
      const existing = await prisma.review.findFirst({
        where: { id: String(req.params.reviewId ?? ""), reviewerUserId: req.auth!.userId },
      });
      if (!existing || !["DRAFT", "PUBLISHED"].includes(existing.status)) {
        res.status(404).json(errorBody("REVIEW_NOT_EDITABLE", "Review not editable", req));
        return;
      }
      const review = await prisma.$transaction(async (tx) => {
        const updated = await tx.review.update({
          where: { id: existing.id },
          data: {
            ...(parsed.overallRating ? { overallRating: parsed.overallRating } : {}),
            ...(parsed.text !== undefined ? { text: stripUnsafeReviewText(parsed.text) } : {}),
            editedAt: new Date(),
            version: { increment: 1 },
          },
          include: reviewInclude,
        });
        await recomputeRatingAggregate(tx, updated.revieweeUserId);
        return updated;
      });
      res.json({ review: serializeReview(review) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/reviews/:reviewId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const existing = await prisma.review.findFirst({
      where: { id: String(req.params.reviewId ?? ""), reviewerUserId: req.auth!.userId },
    });
    if (!existing) {
      res.status(404).json(errorBody("REVIEW_NOT_FOUND", "Review not found", req));
      return;
    }
    const review = await prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: existing.id },
        data: { status: "DELETED_BY_AUTHOR", version: { increment: 1 } },
        include: reviewInclude,
      });
      await recomputeRatingAggregate(tx, updated.revieweeUserId);
      return updated;
    });
    res.json({ review: serializeReview(review) });
  });

  http.post("/api/v1/reviews/:reviewId/report", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = reviewReportSchema.parse(req.body ?? {});
      const key = idempotencyKey(req) || `review-report:${req.auth!.userId}:${req.params.reviewId}`;
      const result = await prisma.$transaction((tx) =>
        ensureIdempotency(tx, "review:report", key, parsed, async () => {
          const review = await tx.review.findUnique({
            where: { id: String(req.params.reviewId ?? "") },
          });
          if (!review)
            throw Object.assign(new Error("Review not found"), {
              statusCode: 404,
              code: "REVIEW_NOT_FOUND",
            });
          await tx.review.update({
            where: { id: review.id },
            data: {
              status: "UNDER_REVIEW",
              reportedCount: { increment: 1 },
              version: { increment: 1 },
            },
          });
          const report = await tx.safetyReport.create({
            data: {
              reporterUserId: req.auth!.userId,
              reportedUserId: review.reviewerUserId,
              reviewId: review.id,
              type: "INAPPROPRIATE_CONTENT",
              severity: "MEDIUM",
              description: parsed.reason,
            },
          });
          await tx.moderationCase.upsert({
            where: { sourceType_sourceId: { sourceType: "Review", sourceId: review.id } },
            create: {
              sourceType: "Review",
              sourceId: review.id,
              subjectUserId: review.reviewerUserId,
              severity: "MEDIUM",
            },
            update: { status: "OPEN" },
          });
          return { reportId: report.id };
        }),
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/users/:userId/rating-summary", async (req, res) => {
    const aggregate = await prisma.ratingAggregate.findUnique({
      where: { userId_scope: { userId: String(req.params.userId ?? ""), scope: "OVERALL" } },
    });
    res.json({ rating: aggregate ? serializeRatingAggregate(aggregate) : null });
  });

  http.get("/api/v1/drivers/:driverId/public-reliability", async (req, res) => {
    const driver = await prisma.driverProfile.findUnique({
      where: { id: String(req.params.driverId ?? "") },
    });
    if (!driver) {
      res.status(404).json(errorBody("DRIVER_NOT_FOUND", "Driver not found", req));
      return;
    }
    const [rating, profile] = await Promise.all([
      prisma.ratingAggregate.findUnique({
        where: { userId_scope: { userId: driver.userId, scope: "OVERALL" } },
      }),
      prisma.reliabilityProfile.findUnique({ where: { userId: driver.userId } }),
    ]);
    res.json({
      reliability: {
        rating: rating ? serializeRatingAggregate(rating) : null,
        profile: profile ? serializeReliabilityProfile(profile) : null,
        verifiedDriver: driver.verificationStatus === "APPROVED",
      },
    });
  });

  http.post("/api/v1/users/:userId/block", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = userBlockSchema.parse(req.body ?? {});
      const blockedUserId = String(req.params.userId ?? "");
      const allowed = canCreateUserBlock(req.auth!.userId, blockedUserId);
      if (!allowed.ok)
        throw Object.assign(new Error(allowed.message), { statusCode: 400, code: allowed.code });
      const existing = await prisma.userBlock.findFirst({
        where: { blockerUserId: req.auth!.userId, blockedUserId, removedAt: null },
      });
      const block =
        existing ??
        (await prisma.userBlock.create({
          data: { blockerUserId: req.auth!.userId, blockedUserId, reason: parsed.reason ?? null },
        }));
      res.status(201).json({ block });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/users/:userId/block", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const block = await prisma.userBlock.findFirst({
      where: {
        blockerUserId: req.auth!.userId,
        blockedUserId: String(req.params.userId ?? ""),
        removedAt: null,
      },
    });
    if (!block) {
      res.status(404).json(errorBody("USER_BLOCK_NOT_FOUND", "Block not found", req));
      return;
    }
    const removed = await prisma.userBlock.update({
      where: { id: block.id },
      data: { removedAt: new Date(), version: { increment: 1 } },
    });
    res.json({ block: removed });
  });

  http.get("/api/v1/blocks/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const blocks = await prisma.userBlock.findMany({
      where: { blockerUserId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ blocks });
  });

  http.post("/api/v1/safety/reports", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = safetyReportSchema.parse(req.body ?? {});
      const key = idempotencyKey(req) || `safety:${req.auth!.userId}:${requestHash(parsed)}`;
      const result = await prisma.$transaction((tx) =>
        ensureIdempotency(tx, "safety:report", key, parsed, async () => {
          const report = await tx.safetyReport.create({
            data: {
              reporterUserId: req.auth!.userId,
              type: parsed.type,
              severity: parsed.severity,
              description: parsed.description,
              tripId: parsed.tripId ?? null,
              bookingId: parsed.bookingId ?? null,
              parcelOrderId: parsed.parcelOrderId ?? null,
              conversationId: parsed.conversationId ?? null,
              messageId: parsed.messageId ?? null,
              reviewId: parsed.reviewId ?? null,
              reportedUserId: parsed.reportedUserId ?? null,
            },
          });
          await tx.safetyIncidentEvent.create({
            data: {
              reportId: report.id,
              actorUserId: req.auth!.userId,
              type: "SAFETY_REPORT_SUBMITTED",
              payload: { severity: parsed.severity },
            },
          });
          await tx.moderationCase.upsert({
            where: { sourceType_sourceId: { sourceType: "SafetyReport", sourceId: report.id } },
            create: {
              sourceType: "SafetyReport",
              sourceId: report.id,
              subjectUserId: parsed.reportedUserId ?? null,
              severity: parsed.severity,
            },
            update: {},
          });
          if (parsed.severity === "HIGH" || parsed.severity === "CRITICAL") {
            await tx.outboxEvent.create({
              data: {
                type: "safety.alert",
                payload: { reportId: report.id, severity: parsed.severity },
              },
            });
          }
          return { reportId: report.id };
        }),
      );
      const report = await prisma.safetyReport.findUniqueOrThrow({
        where: { id: result.reportId },
      });
      await writeAudit(
        "SAFETY_REPORT_CREATED",
        "SafetyReport",
        report.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ report });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/safety/reports/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const reports = await prisma.safetyReport.findMany({
      where: { reporterUserId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ reports });
  });

  http.get("/api/v1/safety/reports/:reportId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const report = await prisma.safetyReport.findFirst({
      where: {
        id: String(req.params.reportId ?? ""),
        OR: [
          { reporterUserId: req.auth!.userId },
          ...(req.auth!.roles.some((role) => role === "ADMIN" || role === "SUPPORT") ? [{}] : []),
        ],
      },
      include: { attachments: true },
    });
    if (!report) {
      res.status(404).json(errorBody("SAFETY_REPORT_NOT_FOUND", "Safety report not found", req));
      return;
    }
    res.json({ report });
  });

  http.post("/api/v1/trusted-contacts", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = trustedContactSchema.parse(req.body ?? {});
      const count = await prisma.trustedContact.count({
        where: { ownerUserId: req.auth!.userId, deletedAt: null },
      });
      if (count >= 5)
        throw Object.assign(new Error("Trusted contact limit reached"), {
          statusCode: 409,
          code: "TRUSTED_CONTACT_LIMIT",
        });
      const contact = await prisma.trustedContact.create({
        data: {
          ownerUserId: req.auth!.userId,
          displayName: parsed.displayName,
          phone: parsed.phone,
          relationship: parsed.relationship ?? null,
        },
      });
      res.status(201).json({ contact });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/trusted-contacts", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const contacts = await prisma.trustedContact.findMany({
      where: { ownerUserId: req.auth!.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json({ contacts });
  });

  http.patch("/api/v1/trusted-contacts/:contactId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = trustedContactSchema.partial().parse(req.body ?? {});
      const data: Prisma.TrustedContactUpdateManyMutationInput = {};
      if (parsed.displayName !== undefined) data.displayName = parsed.displayName;
      if (parsed.phone !== undefined) data.phone = parsed.phone;
      if (parsed.relationship !== undefined) data.relationship = parsed.relationship;
      const contact = await prisma.trustedContact.updateMany({
        where: {
          id: String(req.params.contactId ?? ""),
          ownerUserId: req.auth!.userId,
          deletedAt: null,
        },
        data,
      });
      res.json({ updated: contact.count });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/trusted-contacts/:contactId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const result = await prisma.trustedContact.updateMany({
      where: {
        id: String(req.params.contactId ?? ""),
        ownerUserId: req.auth!.userId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    res.json({ deleted: result.count });
  });

  http.post("/api/v1/trips/:tripId/shares", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = tripShareCreateSchema.parse(req.body ?? {});
      const tripId = String(req.params.tripId ?? "");
      const trip = await prisma.trip.findFirst({
        where: {
          id: tripId,
          OR: [
            { driverProfile: { userId: req.auth!.userId } },
            { bookings: { some: { id: parsed.bookingId ?? "", clientId: req.auth!.userId } } },
          ],
        },
      });
      if (!trip)
        throw Object.assign(new Error("Trip is not shareable"), {
          statusCode: 403,
          code: "TRIP_SHARE_FORBIDDEN",
        });
      const token = publicShareToken();
      const share = await prisma.tripShare.create({
        data: {
          ownerUserId: req.auth!.userId,
          tripId,
          bookingId: parsed.bookingId ?? null,
          label: parsed.label ?? null,
          tokenHash: hashSecret(token),
          expiresAt: parsed.expiresAt ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });
      res.status(201).json({ share: serializeBigInt(share), token });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/trips/:tripId/shares", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const shares = await prisma.tripShare.findMany({
      where: { ownerUserId: req.auth!.userId, tripId: String(req.params.tripId ?? "") },
      orderBy: { createdAt: "desc" },
    });
    res.json({ shares: serializeBigInt(shares) });
  });

  http.delete("/api/v1/trip-shares/:shareId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const result = await prisma.tripShare.updateMany({
      where: {
        id: String(req.params.shareId ?? ""),
        ownerUserId: req.auth!.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    res.json({ revoked: result.count });
  });

  http.get("/api/v1/public/trip-shares/:token", async (req, res) => {
    const tokenHash = hashSecret(String(req.params.token ?? ""));
    const share = await prisma.tripShare.findUnique({
      where: { tokenHash },
      include: { accessEvents: true },
    });
    if (!share || share.revokedAt || share.expiresAt <= new Date()) {
      res.status(404).json(errorBody("TRIP_SHARE_NOT_FOUND", "Trip share not found", req));
      return;
    }
    await prisma.tripShareAccessEvent.create({
      data: { tripShareId: share.id, userAgent: req.headers["user-agent"] ?? null },
    });
    const trip = await prisma.trip.findUnique({
      where: { id: share.tripId },
      include: tripInclude,
    });
    res.json({ share: safeTripShareProjection(share, trip) });
  });

  http.post("/api/v1/emergency/actions", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = emergencyActionSchema.parse(req.body ?? {});
      const action = await prisma.emergencyAction.create({
        data: {
          actorUserId: req.auth!.userId,
          type: parsed.type,
          tripId: parsed.tripId ?? null,
          bookingId: parsed.bookingId ?? null,
          parcelOrderId: parsed.parcelOrderId ?? null,
          safetyReportId: parsed.safetyReportId ?? null,
          metadata: (parsed.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      await writeAudit(
        "EMERGENCY_ACTION_CREATED",
        "EmergencyAction",
        action.id,
        req.auth!.userId,
        req.requestId,
        { type: parsed.type },
      );
      res.status(201).json({ action });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/safety/reports", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const reports = await prisma.safetyReport.findMany({
      include: { attachments: true, internalNotes: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ reports });
  });

  http.post("/api/v1/admin/safety/reports/:reportId/assign", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = safetyAssignmentSchema.parse(req.body ?? {});
      const report = await prisma.safetyReport.update({
        where: { id: String(req.params.reportId ?? "") },
        data: { assignedToUserId: parsed.assigneeUserId ?? null, version: { increment: 1 } },
      });
      await writeAudit(
        "SAFETY_REPORT_ASSIGNED",
        "SafetyReport",
        report.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.json({ report });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/safety/reports/:reportId/status", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = safetyReportStatusSchema.parse(req.body ?? {});
      const current = await prisma.safetyReport.findUnique({
        where: { id: String(req.params.reportId ?? "") },
      });
      if (!current)
        throw Object.assign(new Error("Safety report not found"), {
          statusCode: 404,
          code: "SAFETY_REPORT_NOT_FOUND",
        });
      const action =
        parsed.status === "TRIAGED"
          ? "TRIAGE"
          : parsed.status === "UNDER_REVIEW"
            ? "START_REVIEW"
            : parsed.status === "ACTION_REQUIRED"
              ? "REQUEST_ACTION"
              : parsed.status === "RESOLVED"
                ? "RESOLVE"
                : parsed.status === "REJECTED"
                  ? "REJECT"
                  : parsed.status === "DUPLICATE"
                    ? "DUPLICATE"
                    : "CLOSE";
      const transition = evaluateSafetyTransition(current.status, action);
      if (!transition.ok)
        throw Object.assign(new Error(transition.message), {
          statusCode: 409,
          code: transition.code,
        });
      const report = await prisma.safetyReport.update({
        where: { id: current.id },
        data: {
          status: transition.toStatus,
          resolutionCode: parsed.resolutionCode ?? current.resolutionCode,
          resolutionSummary: parsed.resolutionSummary ?? current.resolutionSummary,
          resolvedAt: ["RESOLVED", "REJECTED", "DUPLICATE", "CLOSED"].includes(transition.toStatus)
            ? new Date()
            : current.resolvedAt,
          version: { increment: 1 },
        },
      });
      await prisma.safetyIncidentEvent.create({
        data: {
          reportId: report.id,
          actorUserId: req.auth!.userId,
          type: `SAFETY_REPORT_${transition.toStatus}`,
          payload: { reason: parsed.reason ?? null },
        },
      });
      await writeAudit(
        "SAFETY_REPORT_STATUS_CHANGED",
        "SafetyReport",
        report.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.json({ report });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/safety/reports/:reportId/internal-notes", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = safetyInternalNoteSchema.parse(req.body ?? {});
      const note = await prisma.safetyReportInternalNote.create({
        data: {
          reportId: String(req.params.reportId ?? ""),
          authorUserId: req.auth!.userId,
          text: parsed.text,
        },
      });
      res.status(201).json({ note });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/users/:userId/restrictions", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = accountRestrictionSchema.parse(req.body ?? {});
      const restriction = await prisma.accountRestriction.create({
        data: {
          userId: String(req.params.userId ?? ""),
          createdByUserId: req.auth!.userId,
          type: parsed.type,
          reason: parsed.reason,
          startsAt: parsed.startsAt ?? new Date(),
          endsAt: parsed.endsAt ?? null,
        },
      });
      await prisma.reliabilityEvent.create({
        data: {
          userId: restriction.userId,
          type: "RESTRICTION_APPLIED",
          restrictionId: restriction.id,
          dedupeKey: `restriction:${restriction.id}:applied`,
        },
      });
      await prisma.$transaction((tx) => recomputeReliabilityProfile(tx, restriction.userId));
      await writeAudit(
        "ACCOUNT_RESTRICTION_APPLIED",
        "AccountRestriction",
        restriction.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.status(201).json({ restriction });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/restrictions/:restrictionId/revoke", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = restrictionRevokeSchema.parse(req.body ?? {});
      const restriction = await prisma.accountRestriction.update({
        where: { id: String(req.params.restrictionId ?? "") },
        data: {
          status: "REVOKED",
          removedByUserId: req.auth!.userId,
          removedReason: parsed.reason,
        },
      });
      await writeAudit(
        "ACCOUNT_RESTRICTION_REVOKED",
        "AccountRestriction",
        restriction.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.json({ restriction });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/moderation/queue", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const [cases, messageReports, reviewReports] = await Promise.all([
      prisma.moderationCase.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.messageReport.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.safetyReport.findMany({
        where: { reviewId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    res.json({ cases, messageReports, reviewReports });
  });
}

const paymentInclude = {
  intents: { orderBy: { createdAt: "desc" as const }, include: { attempts: true } },
  refunds: { orderBy: { createdAt: "desc" as const }, include: { attempts: true } },
  platformFees: true,
  driverEarnings: true,
  ledgerEntries: true,
} satisfies Prisma.PaymentInclude;

type PaymentWithInclude = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

function serializePayment(payment: PaymentWithInclude) {
  return serializeBigInt(payment);
}

async function financeTarget(
  tx: Prisma.TransactionClient,
  userId: string,
  input: { targetType: "BOOKING" | "PARCEL_ORDER"; targetId: string },
) {
  if (input.targetType === "BOOKING") {
    const booking = await tx.booking.findFirst({
      where: { id: input.targetId, clientId: userId },
      include: { trip: { select: { driverProfileId: true } } },
    });
    if (!booking) {
      throw Object.assign(new Error("Booking not found"), {
        statusCode: 404,
        code: "BOOKING_NOT_FOUND",
      });
    }
    if (
      ["CANCELLED_BY_CLIENT", "CANCELLED_BY_DRIVER", "CANCELLED_BY_ADMIN", "EXPIRED"].includes(
        booking.status,
      )
    ) {
      throw Object.assign(new Error("Booking is not payable"), {
        statusCode: 409,
        code: "BOOKING_NOT_PAYABLE",
      });
    }
    return {
      targetType: input.targetType,
      targetId: booking.id,
      bookingId: booking.id,
      parcelOrderId: null,
      driverProfileId: booking.trip.driverProfileId,
      amountMinor: booking.totalMinor,
      currency: booking.currency as CurrencyCode,
    };
  }
  const parcel = await tx.parcelOrder.findFirst({
    where: { id: input.targetId, senderUserId: userId },
  });
  if (!parcel) {
    throw Object.assign(new Error("Parcel not found"), {
      statusCode: 404,
      code: "PARCEL_NOT_FOUND",
    });
  }
  if (["CANCELLED", "EXPIRED"].includes(parcel.status)) {
    throw Object.assign(new Error("Parcel is not payable"), {
      statusCode: 409,
      code: "PARCEL_NOT_PAYABLE",
    });
  }
  return {
    targetType: input.targetType,
    targetId: parcel.id,
    bookingId: null,
    parcelOrderId: parcel.id,
    driverProfileId: parcel.driverProfileId,
    amountMinor: parcel.priceMinor,
    currency: parcel.currency as CurrencyCode,
  };
}

async function financialAudit(
  tx: Prisma.TransactionClient,
  type: string,
  entityType: string,
  entityId: string,
  actorUserId?: string | null,
  reason?: string | null,
  payload?: unknown,
) {
  const data: Prisma.FinancialAuditEventCreateInput = {
    type,
    entityType,
    entityId,
    actorUserId: actorUserId ?? null,
    reason: reason ?? null,
  };
  if (payload !== undefined) {
    data.payload = payload as Prisma.InputJsonValue;
  }
  await tx.financialAuditEvent.create({
    data,
  });
}

async function ledgerPost(
  tx: Prisma.TransactionClient,
  input: {
    type: Prisma.FinancialTransactionCreateInput["type"];
    referenceType: string;
    referenceId: string;
    currency: CurrencyCode;
    idempotencyKey: string;
    paymentId?: string | null;
    entries: Array<{ account: string; entryType: "DEBIT" | "CREDIT"; amountMinor: bigint }>;
  },
) {
  const existing = await tx.financialTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;
  const entries = input.entries.filter((entry) => entry.amountMinor > 0n);
  assertBalancedLedger(entries.map((entry) => ({ ...entry, currency: input.currency })));
  return tx.financialTransaction.create({
    data: {
      type: input.type,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      currency: input.currency,
      amountMinor: entries
        .filter((entry) => entry.entryType === "DEBIT")
        .reduce((sum, entry) => sum + entry.amountMinor, 0n),
      idempotencyKey: input.idempotencyKey,
      entries: {
        create: entries.map((entry) => ({
          paymentId: input.paymentId ?? null,
          account: entry.account,
          entryType: entry.entryType,
          currency: input.currency,
          amountMinor: entry.amountMinor,
        })),
      },
    },
  });
}

async function driverProfileIdForPayment(
  tx: Prisma.TransactionClient,
  payment: { bookingId: string | null; parcelOrderId: string | null },
) {
  if (payment.bookingId) {
    const booking = await tx.booking.findUnique({
      where: { id: payment.bookingId },
      include: { trip: true },
    });
    return booking?.trip.driverProfileId ?? null;
  }
  if (payment.parcelOrderId) {
    const parcel = await tx.parcelOrder.findUnique({ where: { id: payment.parcelOrderId } });
    return parcel?.driverProfileId ?? null;
  }
  return null;
}

async function markPaymentSucceeded(
  tx: Prisma.TransactionClient,
  paymentId: string,
  actorUserId?: string | null,
) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)) return payment;
  transitionPaymentStatus(payment.status, "SUCCEEDED");
  const pricing = calculatePricing({
    targetType: payment.targetType,
    baseMinor: payment.amountMinor,
    currency: payment.currency as CurrencyCode,
    feeRateBps: 1_000,
  });
  const feeMinor = pricing.feeMinor > payment.amountMinor ? payment.amountMinor : pricing.feeMinor;
  const netMinor = payment.amountMinor - feeMinor;
  const saved = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCEEDED",
      paidMinor: payment.amountMinor,
      succeededAt: new Date(),
      version: { increment: 1 },
    },
  });
  await tx.platformFee.create({
    data: {
      paymentId: payment.id,
      currency: payment.currency,
      amountMinor: feeMinor,
      rateBps: 1_000,
      ruleSnapshot: pricing.ruleSnapshot,
    },
  });
  const driverProfileId = await driverProfileIdForPayment(tx, payment);
  if (driverProfileId && netMinor > 0n) {
    await tx.driverEarning.create({
      data: {
        driverProfileId,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        parcelOrderId: payment.parcelOrderId,
        currency: payment.currency,
        grossMinor: payment.amountMinor,
        feeMinor,
        netMinor,
        availableAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }
  await ledgerPost(tx, {
    type: "PAYMENT",
    referenceType: "Payment",
    referenceId: payment.id,
    currency: payment.currency as CurrencyCode,
    idempotencyKey: `payment:${payment.id}:success`,
    paymentId: payment.id,
    entries: [
      {
        account: payment.method === "CASH" ? "cash_receivable" : "provider_clearing",
        entryType: "DEBIT",
        amountMinor: payment.amountMinor,
      },
      { account: "platform_fee_revenue", entryType: "CREDIT", amountMinor: feeMinor },
      { account: "driver_earnings_payable", entryType: "CREDIT", amountMinor: netMinor },
    ],
  });
  if (payment.bookingId) {
    await tx.booking.updateMany({
      where: {
        id: payment.bookingId,
        status: { in: ["PAYMENT_PENDING", "PENDING_CONFIRMATION", "HOLD", "DRAFT"] },
      },
      data: {
        status: "CONFIRMED",
        paymentMethod: payment.method,
        confirmedAt: new Date(),
        version: { increment: 1 },
      },
    });
    await tx.bookingSeat.updateMany({
      where: { bookingId: payment.bookingId, status: "HELD" },
      data: { status: "BOOKED" },
    });
    await tx.seatHold.updateMany({
      where: { bookingId: payment.bookingId, status: "ACTIVE" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await tx.bookingTimelineEvent.create({
      data: {
        bookingId: payment.bookingId,
        actorUserId: actorUserId ?? null,
        type: "PAYMENT_SUCCEEDED",
        payload: { paymentId: payment.id },
      },
    });
  }
  await tx.analyticsEvent.create({
    data: {
      type: "PAYMENT_SUCCEEDED",
      actorUserId: payment.payerUserId,
      entityType: "Payment",
      entityId: payment.id,
    },
  });
  await tx.outboxEvent.create({
    data: { type: "payment.succeeded", payload: { paymentId: payment.id } },
  });
  await financialAudit(tx, "PAYMENT_SUCCEEDED", "Payment", payment.id, actorUserId ?? null);
  return saved;
}

async function registerFinanceRoutes(http: {
  get: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void> | void,
  ) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void> | void,
  ) => void;
}) {
  http.post("/api/v1/payments/intents", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = paymentIntentCreateSchema.parse(req.body ?? {});
      const providerGuard = providerAllowedInProduction(
        parsed.provider,
        process.env.NODE_ENV === "production",
      );
      if (!providerGuard.ok)
        throw Object.assign(new Error(providerGuard.message), {
          statusCode: 409,
          code: providerGuard.code,
        });
      const explicitKey = idempotencyKey(req) || undefined;
      const implicitKey = `payment:${req.auth!.userId}:${requestHash(parsed)}`;
      const key = explicitKey ?? implicitKey;
      const activePaymentStatuses = [
        "CREATED",
        "REQUIRES_ACTION",
        "PROCESSING",
        "AUTHORIZED",
        "SUCCEEDED",
      ] as const;
      const createPaymentIntent = async (
        tx: Prisma.TransactionClient,
        paymentIdempotencyKey: string,
      ) => {
        const target = await financeTarget(tx, req.auth!.userId, parsed);
        const existing = await tx.payment.findFirst({
          where: {
            targetType: target.targetType,
            bookingId: target.bookingId,
            parcelOrderId: target.parcelOrderId,
            status: { in: [...activePaymentStatuses] },
          },
          include: paymentInclude,
        });
        if (existing) return { paymentId: existing.id };
        const payment = await tx.payment.create({
          data: {
            targetType: target.targetType,
            bookingId: target.bookingId,
            parcelOrderId: target.parcelOrderId,
            payerUserId: req.auth!.userId,
            method: parsed.method,
            provider: parsed.method === "ONLINE" ? parsed.provider : "MANUAL",
            status: parsed.method === "CASH" ? "PROCESSING" : "CREATED",
            currency: target.currency,
            amountMinor: target.amountMinor,
            idempotencyKey: paymentIdempotencyKey,
            expiresAt: new Date(Date.now() + bookingHoldTtlMs),
          },
        });
        if (target.bookingId) {
          await tx.booking.update({
            where: { id: target.bookingId },
            data: {
              paymentMethod: parsed.method,
              status: parsed.method === "ONLINE" ? "PAYMENT_PENDING" : "CONFIRMED",
              version: { increment: 1 },
            },
          });
        }
        if (parsed.method === "CASH") {
          await tx.cashPaymentDeclaration.create({
            data: {
              paymentId: payment.id,
              bookingId: target.bookingId,
              parcelOrderId: target.parcelOrderId,
              declaredByUserId: req.auth!.userId,
              currency: target.currency,
              amountMinor: target.amountMinor,
            },
          });
          await tx.cashSettlement.create({
            data: {
              paymentId: payment.id,
              driverProfileId: target.driverProfileId ?? "unassigned",
              bookingId: target.bookingId,
              parcelOrderId: target.parcelOrderId,
              status: "DECLARED",
              currency: target.currency,
              expectedMinor: target.amountMinor,
            },
          });
        } else {
          const providerIntent = await paymentRegistry
            .get(parsed.provider as PaymentProviderCode)
            .createIntent({
              paymentId: payment.id,
              amountMinor: target.amountMinor,
              currency: target.currency,
              idempotencyKey: paymentIdempotencyKey,
            });
          const intent = await tx.paymentIntent.create({
            data: {
              paymentId: payment.id,
              provider: parsed.provider,
              status: providerIntent.status,
              amountMinor: target.amountMinor,
              currency: target.currency,
              providerReference: providerIntent.providerReference,
              clientAction: (providerIntent.clientAction ?? {}) as Prisma.InputJsonValue,
              idempotencyKey: paymentIdempotencyKey,
            },
          });
          await tx.paymentAttempt.create({
            data: {
              paymentIntentId: intent.id,
              provider: parsed.provider,
              status: "SENT_TO_PROVIDER",
              providerReference: providerIntent.providerReference,
              responsePayload: providerIntent as unknown as Prisma.InputJsonValue,
            },
          });
        }
        await tx.analyticsEvent.create({
          data: {
            type: "PAYMENT_INTENT_CREATED",
            actorUserId: req.auth!.userId,
            entityType: "Payment",
            entityId: payment.id,
          },
        });
        await tx.outboxEvent.create({
          data: { type: "payment.intent.created", payload: { paymentId: payment.id } },
        });
        return { paymentId: payment.id };
      };
      const result = await prisma.$transaction(async (tx) => {
        if (explicitKey) {
          return ensureIdempotency(tx, "payment:intent", key, parsed, () =>
            createPaymentIntent(tx, key),
          );
        }

        const scope = "payment:intent";
        const hash = requestHash(parsed);
        const existingRecord = await tx.idempotencyRecord.findUnique({
          where: { scope_key: { scope, key } },
        });
        if (existingRecord) {
          if (existingRecord.requestHash !== hash) {
            throw Object.assign(new Error("Idempotency key payload mismatch"), {
              statusCode: 409,
              code: "IDEMPOTENCY_PAYLOAD_MISMATCH",
            });
          }
          const response = existingRecord.responseJson as { paymentId?: unknown };
          if (typeof response.paymentId === "string") {
            const existingPayment = await tx.payment.findUnique({
              where: { id: response.paymentId },
              select: { id: true, status: true },
            });
            if (
              existingPayment &&
              activePaymentStatuses.includes(
                existingPayment.status as (typeof activePaymentStatuses)[number],
              )
            ) {
              return { paymentId: existingPayment.id };
            }
          }
          await tx.idempotencyRecord.update({
            where: { id: existingRecord.id },
            data: { status: "PROCESSING" },
          });
        }

        const response = await createPaymentIntent(tx, `${key}:${randomUUID()}`);
        const record = {
          requestHash: hash,
          responseJson: response as Prisma.InputJsonValue,
          status: "COMPLETED",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };
        if (existingRecord) {
          await tx.idempotencyRecord.update({ where: { id: existingRecord.id }, data: record });
        } else {
          await tx.idempotencyRecord.create({ data: { scope, key, ...record } });
        }
        return response;
      });
      const payment = await prisma.payment.findUniqueOrThrow({
        where: { id: result.paymentId },
        include: paymentInclude,
      });
      await writeAudit(
        "PAYMENT_INTENT_CREATED",
        "Payment",
        payment.id,
        req.auth!.userId,
        req.requestId,
      );
      res.status(201).json({ payment: serializePayment(payment) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/payments/:paymentId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    const isAdmin = req.auth!.roles.some((role) => role === "ADMIN" || role === "SUPPORT");
    const payment = await prisma.payment.findFirst({
      where: {
        id: String(req.params.paymentId ?? ""),
        ...(isAdmin ? {} : { payerUserId: req.auth!.userId }),
      },
      include: paymentInclude,
    });
    if (!payment) {
      res.status(404).json(errorBody("PAYMENT_NOT_FOUND", "Payment not found", req));
      return;
    }
    res.json({ payment: serializePayment(payment) });
  });

  http.post("/api/v1/payments/mock/webhook", async (req, res) => {
    try {
      const parsed = mockWebhookSchema.parse(req.body ?? {});
      const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
      const verified = new MockPaymentProviderAdapter().verify({
        headers: req.headers,
        rawBody,
        secret: process.env.MOCK_PAYMENT_WEBHOOK_SECRET ?? "local-mock-secret",
      });
      const event = await prisma.paymentWebhookEvent.upsert({
        where: { provider_eventId: { provider: "MOCK", eventId: parsed.eventId } },
        create: {
          provider: "MOCK",
          eventId: parsed.eventId,
          eventType: verified.eventType ?? "payment.updated",
          signatureValid: verified.ok,
          payload: verified.payload as Prisma.InputJsonValue,
        },
        update: { signatureValid: verified.ok, payload: verified.payload as Prisma.InputJsonValue },
      });
      if (!verified.ok) {
        res
          .status(401)
          .json(errorBody("PAYMENT_WEBHOOK_SIGNATURE_INVALID", "Invalid webhook signature", req));
        return;
      }
      const intent = await prisma.paymentIntent.findFirst({
        where: { provider: "MOCK", providerReference: parsed.providerReference },
      });
      if (!intent) {
        await prisma.paymentWebhookEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), processingError: "IGNORED_NO_MATCHING_INTENT" },
        });
        res.status(202).json({ accepted: true, matched: false });
        return;
      }
      if (event.processedAt && event.paymentIntentId === intent.id) {
        res.json({ accepted: true, matched: true, duplicate: true });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.paymentWebhookEvent.update({
          where: { id: event.id },
          data: { paymentIntentId: intent.id, processedAt: new Date() },
        });
        const nextStatus = transitionIntentStatus(intent.status, parsed.status);
        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: { status: nextStatus, version: { increment: 1 } },
        });
        if (parsed.status === "SUCCEEDED") await markPaymentSucceeded(tx, intent.paymentId);
      });
      res.json({ accepted: true, matched: true });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/payments/:paymentId/refunds", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = refundRequestSchema.parse({
        ...(req.body ?? {}),
        paymentId: req.params.paymentId,
      });
      const key = idempotencyKey(req) || `refund:${req.auth!.userId}:${requestHash(parsed)}`;
      const result = await prisma.$transaction((tx) =>
        ensureIdempotency(tx, "payment:refund", key, parsed, async () => {
          const isAdmin = req.auth!.roles.some((role) => role === "ADMIN" || role === "SUPPORT");
          const payment = await tx.payment.findFirst({
            where: { id: parsed.paymentId, ...(isAdmin ? {} : { payerUserId: req.auth!.userId }) },
          });
          if (!payment)
            throw Object.assign(new Error("Payment not found"), {
              statusCode: 404,
              code: "PAYMENT_NOT_FOUND",
            });
          const amountMinor =
            parsed.amountMinor === undefined
              ? refundableAmount(payment)
              : normalizeMinorUnit(parsed.amountMinor);
          assertRefundAllowed(payment, amountMinor);
          const refund = await tx.paymentRefund.create({
            data: {
              paymentId: payment.id,
              requestedByUserId: req.auth!.userId,
              reason: parsed.reason,
              amountMinor,
              currency: payment.currency,
              idempotencyKey: key,
            },
          });
          await tx.outboxEvent.create({
            data: { type: "payment.refund.requested", payload: { refundId: refund.id } },
          });
          return { refundId: refund.id };
        }),
      );
      const refund = await prisma.paymentRefund.findUniqueOrThrow({
        where: { id: result.refundId },
        include: { attempts: true },
      });
      await writeAudit(
        "PAYMENT_REFUND_REQUESTED",
        "PaymentRefund",
        refund.id,
        req.auth!.userId,
        req.requestId,
        parsed,
      );
      res.status(201).json({ refund: serializeBigInt(refund) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/payments/cash-confirmations", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = cashConfirmationSchema.parse(req.body ?? {});
      const profile = await prisma.driverProfile.findUnique({
        where: { userId: req.auth!.userId },
      });
      const settlement = await prisma.cashSettlement.findFirst({
        where: { paymentId: parsed.paymentId, driverProfileId: profile?.id ?? "" },
      });
      if (!settlement)
        throw Object.assign(new Error("Cash settlement not found"), {
          statusCode: 404,
          code: "CASH_SETTLEMENT_NOT_FOUND",
        });
      if (settlement.status === "CONFIRMED" && parsed.received) {
        const existingPayment = await prisma.payment.findUniqueOrThrow({
          where: { id: parsed.paymentId },
          include: paymentInclude,
        });
        res.json({ payment: serializePayment(existingPayment), duplicate: true });
        return;
      }
      if (!["OPEN", "DECLARED"].includes(settlement.status)) {
        throw Object.assign(new Error("Cash settlement cannot be changed"), {
          statusCode: 409,
          code: "CASH_SETTLEMENT_ALREADY_FINALIZED",
        });
      }
      const payment = await prisma.$transaction(async (tx) => {
        await tx.cashSettlement.update({
          where: { id: settlement.id },
          data: {
            status: parsed.received ? "CONFIRMED" : "DISPUTED",
            receivedMinor: parsed.received ? settlement.expectedMinor : 0n,
            confirmedByUserId: req.auth!.userId,
            reason: parsed.reason ?? null,
          },
        });
        if (parsed.received) await markPaymentSucceeded(tx, parsed.paymentId, req.auth!.userId);
        return tx.payment.findUniqueOrThrow({
          where: { id: parsed.paymentId },
          include: paymentInclude,
        });
      });
      res.json({ payment: serializePayment(payment) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/driver/earnings", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const earnings = await prisma.driverEarning.findMany({
      where: { driverProfileId: profile?.id ?? "" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ earnings: serializeBigInt(earnings) });
  });

  http.get("/api/v1/admin/finance/payments", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const payments = await prisma.payment.findMany({
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ payments: serializeBigInt(payments) });
  });

  http.get("/api/v1/admin/finance/ledger", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const transactions = await prisma.financialTransaction.findMany({
      include: { entries: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ transactions: serializeBigInt(transactions) });
  });

  http.post("/api/v1/admin/finance/payouts", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = payoutCreateSchema.parse(req.body ?? {});
      const uniqueEarningIds = [...new Set(parsed.earningIds)];
      if (uniqueEarningIds.length !== parsed.earningIds.length) {
        throw Object.assign(new Error("Duplicate earning selected"), {
          statusCode: 409,
          code: "DUPLICATE_EARNING_SELECTED",
        });
      }
      const payout = await prisma.$transaction(async (tx) => {
        const locked = await tx.driverEarning.updateMany({
          where: {
            id: { in: uniqueEarningIds },
            driverProfileId: parsed.driverProfileId,
            status: "AVAILABLE",
            payoutId: null,
          },
          data: { status: "ON_HOLD" },
        });
        if (locked.count !== uniqueEarningIds.length) {
          throw Object.assign(new Error("Some earnings are not payable"), {
            statusCode: 409,
            code: "EARNING_NOT_PAYABLE",
          });
        }
        const earnings = await tx.driverEarning.findMany({
          where: { id: { in: uniqueEarningIds }, driverProfileId: parsed.driverProfileId },
        });
        const grossMinor = earnings.reduce((sum, earning) => sum + earning.netMinor, 0n);
        const saved = await tx.driverPayout.create({
          data: {
            driverProfileId: parsed.driverProfileId,
            status: "READY",
            currency: "UZS",
            grossMinor,
            itemCount: earnings.length,
            requestedByUserId: req.auth!.userId,
            items: {
              create: earnings.map((earning) => ({
                earningId: earning.id,
                currency: earning.currency,
                amountMinor: earning.netMinor,
              })),
            },
          },
        });
        await tx.driverEarning.updateMany({
          where: { id: { in: earnings.map((earning) => earning.id) } },
          data: { payoutId: saved.id },
        });
        await financialAudit(
          tx,
          "DRIVER_PAYOUT_CREATED",
          "DriverPayout",
          saved.id,
          req.auth!.userId,
        );
        return saved;
      });
      res.status(201).json({ payout: serializeBigInt(payout) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/finance/payouts/:payoutId/status", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = payoutStatusSchema.parse(req.body ?? {});
      const payout = await prisma.$transaction(async (tx) => {
        const payoutData: Prisma.DriverPayoutUpdateInput = {
          status: parsed.status,
          failureReason: parsed.reason ?? null,
        };
        if (parsed.status === "PAID") payoutData.paidAt = new Date();
        if (parsed.status === "FAILED") payoutData.failedAt = new Date();
        const saved = await tx.driverPayout.update({
          where: { id: String(req.params.payoutId ?? "") },
          data: payoutData,
        });
        if (parsed.status === "PAID") {
          await tx.driverEarning.updateMany({
            where: { payoutId: saved.id },
            data: { status: "PAID", paidAt: new Date() },
          });
          await ledgerPost(tx, {
            type: "PAYOUT",
            referenceType: "DriverPayout",
            referenceId: saved.id,
            currency: saved.currency as CurrencyCode,
            idempotencyKey: `payout:${saved.id}:paid`,
            entries: [
              {
                account: "driver_earnings_payable",
                entryType: "DEBIT",
                amountMinor: saved.grossMinor,
              },
              { account: "cash_or_bank", entryType: "CREDIT", amountMinor: saved.grossMinor },
            ],
          });
        }
        await financialAudit(
          tx,
          "DRIVER_PAYOUT_STATUS_CHANGED",
          "DriverPayout",
          saved.id,
          req.auth!.userId,
          parsed.reason,
        );
        return saved;
      });
      res.json({ payout: serializeBigInt(payout) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/admin/finance/reconciliation-runs", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = reconciliationRunSchema.parse(req.body ?? {});
      const key =
        idempotencyKey(req) ||
        `reconciliation:${req.auth!.userId}:${parsed.provider}:${parsed.from.toISOString()}:${parsed.to.toISOString()}`;
      const result = await prisma.$transaction((tx) =>
        ensureIdempotency(tx, "finance:reconciliation", key, parsed, async () => {
          const run = await tx.reconciliationRun.create({
            data: {
              provider: parsed.provider,
              status: "MATCHED",
              idempotencyKey: key,
              completedAt: new Date(),
              createdByUserId: req.auth!.userId,
              summary: {
                from: parsed.from.toISOString(),
                to: parsed.to.toISOString(),
                adapter: "mock/manual",
                idempotencyKey: key,
              },
            },
          });
          return { runId: run.id };
        }),
      );
      const run = await prisma.reconciliationRun.findUniqueOrThrow({
        where: { id: result.runId },
      });
      res.status(201).json({ run: serializeBigInt(run) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/analytics/events", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN", "SUPPORT"]))) return;
    try {
      const parsed = analyticsEventSchema.parse(req.body ?? {});
      const dedupeKey = parsed.dedupeKey ?? `analytics:${req.auth!.userId}:${requestHash(parsed)}`;
      const event = await prisma.analyticsEvent.upsert({
        where: { dedupeKey },
        create: {
          type: parsed.type,
          actorUserId: req.auth!.userId,
          sessionId: parsed.sessionId ?? null,
          entityType: parsed.entityType ?? null,
          entityId: parsed.entityId ?? null,
          dedupeKey,
          payload: (parsed.payload ?? {}) as Prisma.InputJsonValue,
        },
        update: {},
      });
      res.status(201).json({ event });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/analytics/metrics", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN", "SUPPORT"]))) return;
    const [metrics, funnels, exports] = await Promise.all([
      prisma.dailyMetric.findMany({ orderBy: { metricDate: "desc" }, take: 100 }),
      prisma.funnelSnapshot.findMany({ orderBy: { snapshotDate: "desc" }, take: 20 }),
      prisma.reportExport.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    res.json({ metrics: serializeBigInt(metrics), funnels, exports });
  });
}

async function registerBookingRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/trips/public/:tripId/seats", async (req, res) => {
    try {
      const tripId = String(req.params.tripId);
      const seats = await prisma.$transaction(async (tx) => {
        await expireSeatHolds(tx, tripId);
        const trip = await tx.trip.findFirst({
          where: {
            id: tripId,
            status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
            cancelledAt: null,
            blockedAt: null,
            departureAtUtc: { gt: new Date() },
            driverProfile: { verificationStatus: "APPROVED" },
            vehicle: { status: "APPROVED", archivedAt: null, suspendedAt: null },
          },
        });
        if (!trip) {
          throw Object.assign(new Error("Trip not found"), {
            statusCode: 404,
            code: "PUBLIC_TRIP_NOT_FOUND",
          });
        }
        return ensureTripSeats(tx, trip);
      });
      res.json({ seats: seats.map(seatDto) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/bookings/holds", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = bookingHoldSchema.parse(req.body ?? {});
      await assertNoActiveAccountRestriction(prisma, req.auth!.userId, "BOOKING_RESTRICTED", [
        "BOOKING_RESTRICTED",
      ]);
      const headerKey = idempotencyKey(req) || randomUUID();
      const actor: BookingActor = {
        userId: req.auth!.userId,
        requestId: req.requestId,
        role: "CLIENT",
      };
      const result = await withBookingLock(parsed.tripId, async () =>
        prisma.$transaction(async (tx) => {
          await expireSeatHolds(tx, parsed.tripId);
          const scope = `booking.hold:${req.auth!.userId}`;
          const hash = requestHash(parsed);
          const prior = await tx.idempotencyRecord.findUnique({
            where: { scope_key: { scope, key: headerKey } },
          });
          if (prior) {
            if (prior.requestHash !== hash) {
              throw Object.assign(new Error("Idempotency key payload mismatch"), {
                statusCode: 409,
                code: "IDEMPOTENCY_KEY_REUSED",
              });
            }
            return prior.responseJson as Prisma.JsonObject;
          }
          const trip = await tx.trip.findFirst({
            where: {
              id: parsed.tripId,
              status: { in: ["PUBLISHED", "BOOKING_OPEN"] },
              cancelledAt: null,
              blockedAt: null,
              departureAtUtc: { gt: new Date() },
              driverProfile: { verificationStatus: "APPROVED" },
              vehicle: { status: "APPROVED", archivedAt: null, suspendedAt: null },
            },
            include: { driverProfile: true, origin: true, destination: true, route: true },
          });
          if (!trip) {
            throw Object.assign(new Error("Trip is not available"), {
              statusCode: 404,
              code: "TRIP_NOT_AVAILABLE",
            });
          }
          if (trip.driverProfile.userId === req.auth!.userId) {
            throw Object.assign(new Error("Drivers cannot book their own trip"), {
              statusCode: 403,
              code: "OWN_TRIP_BOOKING_FORBIDDEN",
            });
          }
          const allSeats = await ensureTripSeats(tx, trip);
          const requestedKeys =
            parsed.type === "WHOLE_CAR"
              ? allSeats.map((seat) => seat.seatKey)
              : [...new Set(parsed.seatKeys)];
          assertSeatSelection(parsed.type, requestedKeys, parsed.passengerCount);
          const availableSeats = allSeats.filter(
            (seat) => requestedKeys.includes(seat.seatKey) && seat.status === "AVAILABLE",
          );
          if (availableSeats.length !== requestedKeys.length) {
            throw Object.assign(new Error("One or more seats are not available"), {
              statusCode: 409,
              code: "SEAT_NOT_AVAILABLE",
            });
          }
          const expiresAt = new Date(Date.now() + bookingHoldTtlMs);
          const totalMinor =
            parsed.type === "WHOLE_CAR" && trip.wholeCarPriceMinor
              ? trip.wholeCarPriceMinor
              : availableSeats.reduce((sum, seat) => sum + seat.priceMinor, 0n);
          const booking = await tx.booking.create({
            data: {
              tripId: trip.id,
              clientId: req.auth!.userId,
              type: parsed.type,
              status: "HOLD",
              paymentMethod: parsed.paymentMethod,
              currency: "UZS",
              totalMinor,
              passengerCount: parsed.passengerCount,
              pickupPointId: parsed.pickupPointId ?? null,
              destinationPickupPointId: parsed.destinationPickupPointId ?? null,
              requestedDepartureAtUtc: parsed.requestedDepartureAtUtc ?? null,
              pricingSnapshot: {
                currency: "UZS",
                totalMinor: totalMinor.toString(),
                pricePerSeatMinor: trip.pricePerSeatMinor.toString(),
              },
              tripSnapshot: {
                tripId: trip.id,
                originCity: trip.originCity,
                destinationCity: trip.destinationCity,
                departureAtUtc: trip.departureAtUtc.toISOString(),
                requestedDepartureAtUtc: parsed.requestedDepartureAtUtc?.toISOString() ?? null,
              },
              termsSnapshot: { version: env.TERMS_VERSION },
              expiresAt,
            },
          });
          const hold = await tx.seatHold.create({
            data: {
              tripId: trip.id,
              clientId: req.auth!.userId,
              bookingId: booking.id,
              status: "ACTIVE",
              expiresAt,
              idempotencyKey: headerKey,
              items: {
                create: availableSeats.map((seat) => ({
                  tripSeatId: seat.id,
                  seatKey: seat.seatKey,
                })),
              },
            },
            include: { items: true },
          });
          await tx.tripSeat.updateMany({
            where: { id: { in: availableSeats.map((seat) => seat.id) }, status: "AVAILABLE" },
            data: { status: "HELD", version: { increment: 1 } },
          });
          await tx.bookingSeat.createMany({
            data: availableSeats.map((seat) => ({
              bookingId: booking.id,
              tripSeatId: seat.id,
              seatKey: seat.seatKey,
              priceMinor: seat.priceMinor,
              status: "HELD",
            })),
          });
          await writeBookingEvent(tx, booking.id, req.auth!.userId, "BOOKING_HOLD_CREATED", {
            seatKeys: requestedKeys,
            expiresAt,
          });
          await writeBookingAudit(tx, "BOOKING_HOLD_CREATED", booking.id, actor, {
            seatKeys: requestedKeys,
          });
          await enqueueBookingEvent(tx, "booking.hold.created", booking.id, {
            tripId: trip.id,
            expiresAt: expiresAt.toISOString(),
          });
          const saved = await tx.booking.findUniqueOrThrow({
            where: { id: booking.id },
            include: bookingInclude,
          });
          const response = serializeBigInt({ hold, booking: serializeBooking(saved) });
          await tx.idempotencyRecord.create({
            data: {
              scope,
              key: headerKey,
              requestHash: hash,
              responseJson: response as unknown as Prisma.InputJsonValue,
              status: "COMPLETED",
              expiresAt,
            },
          });
          return response as unknown as Prisma.JsonObject;
        }),
      );
      res.status(201).json(result);
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/bookings/holds/:holdId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const hold = await prisma.seatHold.findFirst({
      where: { id: String(req.params.holdId), clientId: req.auth!.userId },
      include: { items: true, booking: { include: bookingInclude } },
    });
    if (!hold) {
      res.status(404).json(errorBody("SEAT_HOLD_NOT_FOUND", "Seat hold not found", req));
      return;
    }
    res.json({ hold: serializeBigInt(hold) });
  });

  http.post("/api/v1/bookings/holds/:holdId/confirm", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = bookingConfirmSchema.parse(req.body ?? {});
      const actor: BookingActor = {
        userId: req.auth!.userId,
        requestId: req.requestId,
        role: "CLIENT",
      };
      const booking = await prisma.$transaction(async (tx) => {
        const hold = await tx.seatHold.findFirst({
          where: { id: String(req.params.holdId), clientId: req.auth!.userId },
          include: { items: true, booking: { include: { seats: true } } },
        });
        if (!hold || !hold.bookingId || !hold.booking) {
          throw Object.assign(new Error("Seat hold not found"), {
            statusCode: 404,
            code: "SEAT_HOLD_NOT_FOUND",
          });
        }
        if (hold.status === "CONFIRMED" || hold.booking.status === "CONFIRMED") {
          return tx.booking.findUniqueOrThrow({
            where: { id: hold.bookingId },
            include: bookingInclude,
          });
        }
        if (hold.status !== "ACTIVE" || hold.expiresAt <= new Date()) {
          await expireSeatHolds(tx, hold.tripId);
          throw Object.assign(new Error("Seat hold expired"), {
            statusCode: 409,
            code: "SEAT_HOLD_EXPIRED",
          });
        }
        if (parsed.passengers.length !== hold.booking.passengerCount) {
          throw Object.assign(new Error("Passenger count must match held seats"), {
            statusCode: 400,
            code: "PASSENGER_COUNT_MISMATCH",
          });
        }
        const seatKeys = hold.items.map((item) => item.seatKey);
        const tripSeatIds = hold.items
          .map((item) => item.tripSeatId)
          .filter((id): id is string => Boolean(id));
        await tx.bookingPassenger.deleteMany({ where: { bookingId: hold.bookingId } });
        await tx.bookingPassenger.createMany({
          data: parsed.passengers.map((passenger, index) => ({
            bookingId: hold.bookingId!,
            firstName: passenger.firstName,
            lastName: passenger.lastName ?? null,
            phone: passenger.phone ?? null,
            ageCategory: passenger.ageCategory,
            isPrimary: index === 0,
            seatKey: passenger.seatKey ?? seatKeys[index] ?? null,
            notes: passenger.notes ?? null,
          })),
        });
        await tx.bookingBaggage.deleteMany({ where: { bookingId: hold.bookingId } });
        if (parsed.baggage?.length) {
          await tx.bookingBaggage.createMany({
            data: parsed.baggage.map((item) => ({
              bookingId: hold.bookingId!,
              type: item.type,
              quantity: item.quantity,
              ...(item.weightKg !== undefined ? { weightKg: item.weightKg } : {}),
              notes: item.notes ?? null,
            })),
          });
        }
        const bookedSeats = await tx.tripSeat.updateMany({
          where: { id: { in: tripSeatIds }, status: "HELD" },
          data: { status: "BOOKED", version: { increment: 1 } },
        });
        if (bookedSeats.count !== tripSeatIds.length) {
          throw Object.assign(new Error("Seat hold can no longer be confirmed"), {
            statusCode: 409,
            code: "SEAT_HOLD_OWNERSHIP_CONFLICT",
          });
        }
        const bookedBookingSeats = await tx.bookingSeat.updateMany({
          where: { bookingId: hold.bookingId, tripSeatId: { in: tripSeatIds }, status: "HELD" },
          data: { status: "BOOKED" },
        });
        if (bookedBookingSeats.count !== tripSeatIds.length) {
          throw Object.assign(new Error("Seat hold booking rows can no longer be confirmed"), {
            statusCode: 409,
            code: "SEAT_HOLD_OWNERSHIP_CONFLICT",
          });
        }
        await tx.seatHold.update({
          where: { id: hold.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), version: { increment: 1 } },
        });
        await tx.trip.update({
          where: { id: hold.tripId },
          data: { availableSeatCount: { decrement: seatKeys.length }, version: { increment: 1 } },
        });
        const saved = await tx.booking.update({
          where: { id: hold.bookingId },
          data: {
            status: "CONFIRMED",
            paymentMethod: parsed.paymentMethod,
            clientComment: parsed.clientComment ?? parsed.preferences.driverComment ?? null,
            travelPreferences: parsed.preferences as Prisma.InputJsonValue,
            ...(parsed.pickupLocation
              ? { pickupLocation: parsed.pickupLocation as Prisma.InputJsonValue }
              : {}),
            requestedDepartureAtUtc:
              parsed.schedule.requestedDepartureAtUtc ??
              hold.booking.requestedDepartureAtUtc ??
              null,
            confirmedAt: new Date(),
            version: { increment: 1 },
          },
          include: bookingInclude,
        });
        await writeBookingEvent(tx, saved.id, req.auth!.userId, "BOOKING_CONFIRMED", {
          seatKeys,
          paymentMethod: parsed.paymentMethod,
          preferences: parsed.preferences,
          pickupLocation: parsed.pickupLocation,
          schedule: parsed.schedule,
        });
        await writeBookingAudit(tx, "BOOKING_CONFIRMED", saved.id, actor, { seatKeys });
        await enqueueBookingEvent(tx, "booking.confirmed", saved.id, { tripId: hold.tripId });
        await tx.waitlistMatch.updateMany({
          where: { tripId: hold.tripId, waitlist: { userId: req.auth!.userId } },
          data: { actedAt: new Date() },
        });
        await tx.waitlistEntry.updateMany({
          where: {
            userId: req.auth!.userId,
            status: "MATCHED",
            matches: { some: { tripId: hold.tripId } },
          },
          data: { status: "BOOKED" },
        });
        return saved;
      });
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/bookings/holds/:holdId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const booking = await prisma.$transaction(async (tx) => {
        const hold = await tx.seatHold.findFirst({
          where: { id: String(req.params.holdId), clientId: req.auth!.userId },
          include: { items: true, booking: true },
        });
        if (!hold || !hold.bookingId) {
          throw Object.assign(new Error("Seat hold not found"), {
            statusCode: 404,
            code: "SEAT_HOLD_NOT_FOUND",
          });
        }
        if (hold.status !== "ACTIVE") {
          return tx.booking.findUniqueOrThrow({
            where: { id: hold.bookingId },
            include: bookingInclude,
          });
        }
        const seatKeys = hold.items.map((item) => item.seatKey);
        const released = await releaseActiveSeatHold(tx, hold, "RELEASED");
        if (!released) {
          return tx.booking.findUniqueOrThrow({
            where: { id: hold.bookingId },
            include: bookingInclude,
          });
        }
        const saved = await tx.booking.update({
          where: { id: hold.bookingId },
          data: { status: "EXPIRED", version: { increment: 1 } },
          include: bookingInclude,
        });
        await writeBookingEvent(tx, saved.id, req.auth!.userId, "BOOKING_HOLD_RELEASED", {
          seatKeys,
        });
        await enqueueBookingEvent(tx, "booking.hold.released", saved.id, { tripId: hold.tripId });
        return saved;
      });
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/bookings/mine", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const bookings = await prisma.booking.findMany({
      where: { clientId: req.auth!.userId },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ bookings: bookings.map(serializeBooking) });
  });

  http.get("/api/v1/bookings/:bookingId", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
      include: bookingInclude,
    });
    if (!booking) {
      res.status(404).json(errorBody("BOOKING_NOT_FOUND", "Booking not found", req));
      return;
    }
    res.json({ booking: serializeBooking(booking) });
  });

  http.get("/api/v1/bookings/:bookingId/boarding-code", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
          include: { trip: true },
        });
        if (!booking) {
          throw Object.assign(new Error("Booking not found"), {
            statusCode: 404,
            code: "BOOKING_NOT_FOUND",
          });
        }
        if (booking.trip.status !== "BOARDING" || booking.status !== "BOARDING") {
          throw Object.assign(new Error("Boarding code is not available"), {
            statusCode: 409,
            code: "BOARDING_CODE_NOT_AVAILABLE",
          });
        }
        const code = await activeBoardingCodeForBooking(tx, booking.id, req.auth!.userId);
        return code;
      });
      res.json({ boardingCode: serializeBoardingCodeForClient(result.code, result.plain) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/bookings/:bookingId/boarding-code/regenerate", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      boardingCodeRegenerateSchema.parse(req.body ?? {});
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
          include: { trip: true },
        });
        if (!booking) {
          throw Object.assign(new Error("Booking not found"), {
            statusCode: 404,
            code: "BOOKING_NOT_FOUND",
          });
        }
        if (booking.trip.status !== "BOARDING" || booking.status !== "BOARDING") {
          throw Object.assign(new Error("Boarding code cannot be regenerated"), {
            statusCode: 409,
            code: "BOARDING_CODE_REGENERATE_NOT_ALLOWED",
          });
        }
        return createBoardingCode(tx, booking.id, req.auth!.userId);
      });
      res.json({ boardingCode: serializeBoardingCodeForClient(result.code, result.plain) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/bookings/:bookingId/start-pin", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
          include: { trip: true, seats: true },
        });
        if (!booking) {
          throw Object.assign(new Error("Booking not found"), {
            statusCode: 404,
            code: "BOOKING_NOT_FOUND",
          });
        }
        if (booking.trip.status !== "BOARDING" || booking.status !== "BOARDING") {
          throw Object.assign(new Error("Trip start PIN is not available"), {
            statusCode: 409,
            code: "TRIP_START_PIN_NOT_AVAILABLE",
          });
        }
        return activeTripStartPinForBooking(tx, booking, req.auth!.userId);
      });
      res.json({ startPin: serializeTripStartPinForClient(result.pin, result.plain) });
    } catch (error) {
      handleError(res, req, error);
    }
  });
  http.get("/api/v1/bookings/:bookingId/operation-status", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
      include: {
        trip: true,
        seats: true,
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 20 },
        boardingCodes: { orderBy: { createdAt: "desc" }, take: 1 },
        startPins: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!booking) {
      res.status(404).json(errorBody("BOOKING_NOT_FOUND", "Booking not found", req));
      return;
    }
    res.json(
      serializeBigInt({
        status: {
          bookingId: booking.id,
          tripId: booking.tripId,
          tripStatus: booking.trip.status,
          bookingStatus: booking.status,
          seats: booking.seats,
          boardingCode: booking.boardingCodes[0]
            ? serializeBoardingCodeForClient(booking.boardingCodes[0])
            : null,
          startPin: booking.startPins[0]
            ? serializeTripStartPinForClient(booking.startPins[0])
            : null,
          timeline: booking.timelineEvents,
        },
      }),
    );
  });

  http.post("/api/v1/bookings/:bookingId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    try {
      const parsed = bookingCancelSchema.parse(req.body ?? {});
      const actor: BookingActor = {
        userId: req.auth!.userId,
        requestId: req.requestId,
        role: "CLIENT",
      };
      const booking = await cancelBooking(String(req.params.bookingId), actor, parsed.reason);
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/trips/:tripId/location", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    try {
      const parsed = tripLocationPointSchema.parse(req.body ?? {});
      const tripId = String(req.params.tripId);
      const saved = await prisma.$transaction(async (tx) => {
        const isDriver = req.auth!.roles.includes("DRIVER");
        if (isDriver) {
          const profile = await tx.driverProfile.findUnique({
            where: { userId: req.auth!.userId },
          });
          const trip = await tx.trip.findFirst({
            where: { id: tripId, driverProfileId: profile?.id ?? "" },
          });
          if (!trip) {
            throw Object.assign(new Error("Trip not found"), {
              statusCode: 404,
              code: "TRIP_NOT_FOUND",
            });
          }
          return recordTripLocationPoint(
            tx,
            trip,
            { userId: req.auth!.userId, role: "DRIVER", requestId: req.requestId },
            "DRIVER",
            parsed,
          );
        }
        const bookingWhere: Prisma.BookingWhereInput = {
          tripId,
          clientId: req.auth!.userId,
          status: { in: ["BOARDING", "IN_PROGRESS", "COMPLETED"] },
        };
        if (parsed.bookingId) bookingWhere.id = parsed.bookingId;
        const booking = await tx.booking.findFirst({
          where: bookingWhere,
          include: { trip: true },
        });
        if (!booking) {
          throw Object.assign(new Error("Trip not found"), {
            statusCode: 404,
            code: "TRIP_NOT_FOUND",
          });
        }
        return recordTripLocationPoint(
          tx,
          booking.trip,
          { userId: req.auth!.userId, role: "CLIENT", requestId: req.requestId },
          "PASSENGER",
          { ...parsed, bookingId: booking.id },
        );
      });
      res.json({ location: serializeTripLocationPoint(saved) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/trips/:tripId/location/latest", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER"]))) return;
    const tripId = String(req.params.tripId);
    const isDriver = req.auth!.roles.includes("DRIVER");
    const allowed = isDriver
      ? await prisma.driverProfile
          .findUnique({ where: { userId: req.auth!.userId } })
          .then((profile) =>
            profile
              ? prisma.trip.findFirst({ where: { id: tripId, driverProfileId: profile.id } })
              : null,
          )
      : await prisma.booking.findFirst({ where: { tripId, clientId: req.auth!.userId } });
    if (!allowed) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { etaSnapshot: true },
    });
    const shareRealtime = trip?.status === "BOARDING" || trip?.status === "IN_PROGRESS";
    const driver = await prisma.tripLocationPoint.findFirst({
      where: { tripId, actorType: "DRIVER" },
      orderBy: { recordedAt: "desc" },
    });
    const passenger = await prisma.tripLocationPoint.findFirst({
      where: {
        tripId,
        actorType: "PASSENGER",
        ...(isDriver ? {} : { actorUserId: req.auth!.userId }),
      },
      orderBy: { recordedAt: "desc" },
    });
    res.json({
      latest: {
        tripId,
        tripStatus: trip?.status ?? null,
        realtimeShared: shareRealtime,
        driver: shareRealtime && driver ? serializeTripLocationPoint(driver) : null,
        passenger: shareRealtime && passenger ? serializeTripLocationPoint(passenger) : null,
        eta: trip?.etaSnapshot
          ? serializeBigInt({
              driverEtaToPickupSeconds: trip.etaSnapshot.driverEtaToPickupSeconds,
              driverEtaToDropoffSeconds: trip.etaSnapshot.driverEtaToDropoffSeconds,
              delaySeconds: trip.etaSnapshot.delaySeconds,
              status: trip.etaSnapshot.status,
              source: trip.etaSnapshot.source,
              updatedAt: trip.etaSnapshot.updatedAt,
            })
          : { status: "UNKNOWN", source: "MANUAL_MAPS_ADAPTER" },
      },
    });
  });

  http.get("/api/v1/trips/:tripId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT", "DRIVER", "ADMIN"]))) return;
    const tripId = String(req.params.tripId);
    const isAdmin = req.auth!.roles.includes("ADMIN");
    const isDriver = req.auth!.roles.includes("DRIVER");
    const allowed = isAdmin
      ? await prisma.trip.findUnique({ where: { id: tripId } })
      : isDriver
        ? await prisma.driverProfile
            .findUnique({ where: { userId: req.auth!.userId } })
            .then((profile) =>
              profile
                ? prisma.trip.findFirst({ where: { id: tripId, driverProfileId: profile.id } })
                : null,
            )
        : await prisma.booking.findFirst({ where: { tripId, clientId: req.auth!.userId } });
    if (!allowed) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    const history = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        timelineEvents: { orderBy: { createdAt: "asc" }, take: 200 },
        operationEvents: { orderBy: { createdAt: "asc" }, take: 200 },
        locationPoints: { orderBy: { recordedAt: "asc" }, take: 500 },
        etaSnapshot: true,
      },
    });
    if (!history) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json(
      serializeBigInt({
        history: {
          tripId: history.id,
          status: history.status,
          timeline: history.timelineEvents,
          operations: history.operationEvents,
          locations: history.locationPoints.map(serializeTripLocationPoint),
          eta: history.etaSnapshot
            ? {
                driverEtaToPickupSeconds: history.etaSnapshot.driverEtaToPickupSeconds,
                driverEtaToDropoffSeconds: history.etaSnapshot.driverEtaToDropoffSeconds,
                delaySeconds: history.etaSnapshot.delaySeconds,
                status: history.etaSnapshot.status,
                source: history.etaSnapshot.source,
                updatedAt: history.etaSnapshot.updatedAt,
              }
            : { status: "UNKNOWN", source: "MANUAL_MAPS_ADAPTER" },
        },
      }),
    );
  });
  http.get("/api/v1/driver/trips/:tripId/bookings", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const trip = await driverOwnTrip(req.auth!.userId, String(req.params.tripId));
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    const bookings = await prisma.booking.findMany({
      where: { tripId: trip.id },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ bookings: bookings.map(serializeBooking) });
  });

  http.get("/api/v1/driver/trips/:tripId/passengers", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const trip = await prisma.trip.findFirst({
      where: { id: String(req.params.tripId), driverProfileId: profile?.id ?? "" },
      include: { bookings: { include: bookingInclude } },
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ trip: serializeBigInt(trip), passengers: trip.bookings.map(serializeBooking) });
  });

  http.get("/api/v1/driver/trips/:tripId/boarding", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const trip = await prisma.trip.findFirst({
      where: { id: String(req.params.tripId), driverProfileId: profile?.id ?? "" },
      include: {
        bookings: {
          include: {
            passengers: true,
            seats: true,
            boardingCodes: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({
      trip: serializeBigInt(trip),
      boarding: trip.bookings.map((booking) => ({
        bookingId: booking.id,
        status: booking.status,
        passengers: booking.passengers,
        seats: booking.seats,
        codeStatus: booking.boardingCodes[0]?.status ?? null,
      })),
    });
  });

  http.post("/api/v1/driver/trips/:tripId/start-boarding", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const trip = await startBoardingTrip(String(req.params.tripId), {
        userId: req.auth!.userId,
        role: "DRIVER",
        requestId: req.requestId,
      });
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/bookings/:bookingId/board", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = boardingCodeVerifySchema.parse(req.body ?? {});
      const booking = await boardBooking(String(req.params.bookingId), parsed.code, {
        userId: req.auth!.userId,
        role: "DRIVER",
        requestId: req.requestId,
      });
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/bookings/:bookingId/start-pin/verify", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = tripStartPinVerifySchema.parse(req.body ?? {});
      const booking = await verifyTripStartPinForBooking(
        String(req.params.bookingId),
        parsed.pin,
        {
          userId: req.auth!.userId,
          role: "DRIVER",
          requestId: req.requestId,
        },
        parsed.location,
      );
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });
  http.post("/api/v1/driver/bookings/:bookingId/no-show", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = operationReasonSchema.parse(req.body ?? {});
      const booking = await markClientNoShow(
        String(req.params.bookingId),
        {
          userId: req.auth!.userId,
          role: "DRIVER",
          requestId: req.requestId,
        },
        parsed.reason,
      );
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/trips/:tripId/start", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = tripStartSchema.parse(req.body ?? {});
      const trip = await startTripOperation(
        String(req.params.tripId),
        {
          userId: req.auth!.userId,
          role: "DRIVER",
          requestId: req.requestId,
        },
        parsed.allowUnresolvedPassengers,
      );
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/trips/:tripId/complete", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = tripCompleteSchema.parse(req.body ?? {});
      const trip = await completeTripOperation(
        String(req.params.tripId),
        {
          userId: req.auth!.userId,
          role: "DRIVER",
          requestId: req.requestId,
        },
        parsed.notes,
      );
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/trips/:tripId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = operationReasonSchema.parse(req.body ?? {});
      const trip = await cancelTripOperational(
        String(req.params.tripId),
        {
          userId: req.auth!.userId,
          role: "DRIVER",
          requestId: req.requestId,
        },
        parsed.reason,
        "CANCELLED_BY_DRIVER",
      );
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/driver/trips/:tripId/operations", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const trip = await prisma.trip.findFirst({
      where: { id: String(req.params.tripId), driverProfileId: profile?.id ?? "" },
      include: {
        operationEvents: { orderBy: { createdAt: "desc" }, take: 50 },
        statusTransitions: { orderBy: { createdAt: "desc" }, take: 50 },
        completionSummary: true,
      },
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ operations: serializeBigInt(trip) });
  });

  http.get("/api/v1/driver/bookings/:bookingId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.bookingId), trip: { driverProfileId: profile?.id ?? "" } },
      include: bookingInclude,
    });
    if (!booking) {
      res.status(404).json(errorBody("BOOKING_NOT_FOUND", "Booking not found", req));
      return;
    }
    res.json({ booking: serializeBooking(booking) });
  });

  http.post("/api/v1/driver/bookings/:bookingId/approve", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = driverBookingDecisionSchema.parse(req.body ?? {});
      const booking = await driverDecideBooking(
        String(req.params.bookingId),
        req.auth!.userId,
        "APPROVED",
        parsed.reason,
        req.requestId,
      );
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/bookings/:bookingId/reject", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = driverBookingDecisionSchema.parse(req.body ?? {});
      const booking = await driverDecideBooking(
        String(req.params.bookingId),
        req.auth!.userId,
        "REJECTED",
        parsed.reason,
        req.requestId,
      );
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/bookings", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status = cleanText(req.query.status, 40);
    const where: Prisma.BookingWhereInput = {};
    if (status) where.status = status as NonNullable<Prisma.BookingWhereInput["status"]>;
    const bookings = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ bookings: bookings.map(serializeBooking) });
  });

  http.get("/api/v1/admin/bookings/:bookingId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.params.bookingId) },
      include: bookingInclude,
    });
    if (!booking) {
      res.status(404).json(errorBody("BOOKING_NOT_FOUND", "Booking not found", req));
      return;
    }
    res.json({ booking: serializeBooking(booking) });
  });

  http.post("/api/v1/admin/bookings/:bookingId/cancel", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = bookingCancelSchema.parse(req.body ?? {});
      const actor: BookingActor = {
        userId: req.auth!.userId,
        requestId: req.requestId,
        role: "ADMIN",
      };
      const booking = await cancelBooking(String(req.params.bookingId), actor, parsed.reason);
      res.json({ booking: serializeBooking(booking) });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/bookings/:bookingId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.params.bookingId) },
      include: { timelineEvents: { orderBy: { createdAt: "desc" } }, cancellations: true },
    });
    if (!booking) {
      res.status(404).json(errorBody("BOOKING_NOT_FOUND", "Booking not found", req));
      return;
    }
    res.json({ timeline: booking.timelineEvents, cancellations: booking.cancellations });
  });

  http.get("/api/v1/admin/trips/:tripId/operations", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: {
        driverProfile: { include: { user: true } },
        vehicle: true,
        bookings: true,
        operationEvents: { orderBy: { createdAt: "desc" }, take: 100 },
        statusTransitions: { orderBy: { createdAt: "desc" }, take: 100 },
        noShowRecords: { orderBy: { createdAt: "desc" }, take: 100 },
        cancellations: { orderBy: { createdAt: "desc" }, take: 20 },
        completionSummary: true,
      },
    });
    if (!trip) {
      res.status(404).json(errorBody("TRIP_NOT_FOUND", "Trip not found", req));
      return;
    }
    res.json({ operations: serializeBigInt(trip) });
  });

  http.post("/api/v1/admin/trips/:tripId/no-show-driver", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = operationReasonSchema.parse(req.body ?? {});
      const trip = await prisma.$transaction(async (tx) => {
        const existing = await tx.trip.findUnique({
          where: { id: String(req.params.tripId) },
          include: { bookings: true },
        });
        if (!existing) {
          throw Object.assign(new Error("Trip not found"), {
            statusCode: 404,
            code: "TRIP_NOT_FOUND",
          });
        }
        if (existing.status !== "CANCELLED") {
          await tx.trip.update({
            where: { id: existing.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              cancellationReason: parsed.reason,
              version: { increment: 1 },
            },
          });
        }
        await tx.noShowRecord.create({
          data: {
            tripId: existing.id,
            actorUserId: req.auth!.userId,
            actorRole: "ADMIN",
            type: "DRIVER",
            reason: parsed.reason,
          },
        });
        await tx.booking.updateMany({
          where: { tripId: existing.id, ...activeBookingWhere() },
          data: {
            status: "NO_SHOW_DRIVER",
            cancellationReason: parsed.reason,
            version: { increment: 1 },
          },
        });
        await tx.tripSeat.updateMany({
          where: { tripId: existing.id, status: { in: ["HELD", "BOOKED", "OCCUPIED"] } },
          data: { status: "AVAILABLE", version: { increment: 1 } },
        });
        await writeTripOperationEvent(tx, existing.id, req.auth!.userId, "TRIP_NO_SHOW_DRIVER", {
          reason: parsed.reason,
        });
        await writeTripOperationAudit(
          tx,
          "TRIP_NO_SHOW_DRIVER",
          existing.id,
          {
            userId: req.auth!.userId,
            role: "ADMIN",
            requestId: req.requestId,
          },
          { reason: parsed.reason },
        );
        await enqueueTripEvent(tx, "trip.no_show_driver", existing.id, { reason: parsed.reason });
        return tx.trip.findUniqueOrThrow({ where: { id: existing.id }, include: tripInclude });
      });
      res.json({ trip: serializeBigInt(trip) });
    } catch (error) {
      handleError(res, req, error);
    }
  });
}

async function registerVehicleRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/vehicles", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const vehicles = profile
      ? await prisma.vehicle.findMany({
          where: { driverProfileId: profile.id, status: { not: "ARCHIVED" } },
          include: vehicleInclude(),
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        })
      : [];
    res.json({ vehicles: vehicles.map(serializeVehicle) });
  });

  http.post("/api/v1/vehicles", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = vehicleDraftSchema.parse(req.body ?? {});
      const vehicle = await prisma.$transaction(async (tx) => {
        const profile = await driverProfileForUser(tx, req.auth!.userId);
        const normalizedPlate =
          normalizePlate(parsed.plateNumber) ?? `DRAFT${randomUUID().slice(0, 8)}`;
        const duplicate = parsed.plateNumber
          ? await tx.vehicle.findFirst({
              where: { normalizedPlate, status: { not: "ARCHIVED" }, archivedAt: null },
            })
          : null;
        if (duplicate) {
          throw Object.assign(new Error("Vehicle plate already exists"), {
            statusCode: 409,
            code: "VEHICLE_PLATE_DUPLICATE",
          });
        }
        const created = await tx.vehicle.create({
          data: {
            driverProfileId: profile.id,
            make: cleanText(parsed.make, 80) ?? "",
            model: cleanText(parsed.model, 80) ?? "",
            year: parsed.year ?? null,
            color: cleanText(parsed.color, 80),
            plateNumber: cleanText(parsed.plateNumber, 40) ?? normalizedPlate,
            normalizedPlate,
            bodyType: cleanText(parsed.bodyType, 80),
            passengerSeatCount: parsed.passengerSeatCount ?? 4,
            passengerSeats: parsed.passengerSeatCount ?? 4,
            luggageCapacity: cleanText(parsed.luggageCapacity, 120),
            amenities: parsed.amenities as Prisma.InputJsonValue,
          },
          include: vehicleInclude(),
        });
        await writeVehicleEvent(tx, created.id, req.auth!.userId, "VEHICLE_CREATED");
        await writeVehicleAudit(tx, "VEHICLE_CREATED", created.id, req.auth!.userId, req.requestId);
        return created;
      });
      res.status(201).json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/vehicles/:vehicleId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction((tx) =>
        driverOwnVehicle(tx, req.auth!.userId, String(req.params.vehicleId ?? "")),
      );
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.patch("/api/v1/vehicles/:vehicleId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = vehicleDraftSchema.parse(req.body ?? {});
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        if (!isEditableVehicleStatus(current.status)) {
          throw Object.assign(new Error("Vehicle is not editable"), {
            statusCode: 409,
            code: "VEHICLE_NOT_EDITABLE",
          });
        }
        const normalizedPlate = parsed.plateNumber
          ? normalizePlate(parsed.plateNumber)
          : current.normalizedPlate;
        if (normalizedPlate && normalizedPlate !== current.normalizedPlate) {
          const duplicate = await tx.vehicle.findFirst({
            where: {
              id: { not: current.id },
              normalizedPlate,
              status: { not: "ARCHIVED" },
              archivedAt: null,
            },
          });
          if (duplicate) {
            throw Object.assign(new Error("Vehicle plate already exists"), {
              statusCode: 409,
              code: "VEHICLE_PLATE_DUPLICATE",
            });
          }
        }
        const updated = await tx.vehicle.update({
          where: { id: current.id },
          data: {
            make: cleanText(parsed.make, 80) ?? current.make,
            model: cleanText(parsed.model, 80) ?? current.model,
            year: parsed.year ?? current.year,
            color: cleanText(parsed.color, 80),
            plateNumber: cleanText(parsed.plateNumber, 40) ?? current.plateNumber,
            normalizedPlate: normalizedPlate ?? current.normalizedPlate,
            bodyType: cleanText(parsed.bodyType, 80),
            passengerSeatCount: parsed.passengerSeatCount ?? current.passengerSeatCount,
            passengerSeats: parsed.passengerSeatCount ?? current.passengerSeatCount,
            luggageCapacity: cleanText(parsed.luggageCapacity, 120),
            amenities: parsed.amenities as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          include: vehicleInclude(),
        });
        await writeVehicleEvent(tx, updated.id, req.auth!.userId, "VEHICLE_UPDATED");
        await writeVehicleAudit(tx, "VEHICLE_UPDATED", updated.id, req.auth!.userId, req.requestId);
        return updated;
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  async function submitVehicle(req: AuthenticatedRequest, res: Response, resubmit = false) {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        const allowed = resubmit
          ? ["CHANGES_REQUESTED", "REJECTED"].includes(current.status)
          : isEditableVehicleStatus(current.status);
        if (!allowed) {
          throw Object.assign(new Error("Vehicle cannot be submitted from current status"), {
            statusCode: 409,
            code: "VEHICLE_STATUS_INVALID",
          });
        }
        const profile = await tx.driverProfile.findUniqueOrThrow({
          where: { id: current.driverProfileId },
        });
        if (profile.verificationStatus !== "APPROVED") {
          throw Object.assign(new Error("Driver must be approved before submitting vehicles"), {
            statusCode: 403,
            code: "VEHICLE_DRIVER_NOT_APPROVED",
          });
        }
        const completion = calculateVehicleCompletion(current);
        if (!completion.canSubmit) {
          throw Object.assign(new Error("Vehicle is incomplete"), {
            statusCode: 400,
            code: "VEHICLE_INCOMPLETE",
          });
        }
        const updated = await tx.vehicle.update({
          where: { id: current.id },
          data: {
            status: "SUBMITTED",
            moderationStatus: "SUBMITTED",
            submittedAt: new Date(),
            version: { increment: 1 },
          },
          include: vehicleInclude(),
        });
        const eventType = resubmit ? "VEHICLE_RESUBMITTED" : "VEHICLE_SUBMITTED";
        await writeVehicleEvent(tx, updated.id, req.auth!.userId, eventType);
        await writeVehicleAudit(tx, eventType, updated.id, req.auth!.userId, req.requestId);
        await enqueueVehicleNotification(tx, eventType, updated.id, req.auth!.userId);
        return updated;
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/vehicles/:vehicleId/submit", (req, res) => submitVehicle(req, res));
  http.post("/api/v1/vehicles/:vehicleId/resubmit", (req, res) => submitVehicle(req, res, true));

  http.post("/api/v1/vehicles/:vehicleId/set-primary", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        if (current.status !== "APPROVED") {
          throw Object.assign(new Error("Only approved vehicles can be primary"), {
            statusCode: 409,
            code: "VEHICLE_STATUS_INVALID",
          });
        }
        await tx.vehicle.updateMany({
          where: { driverProfileId: current.driverProfileId, id: { not: current.id } },
          data: { isPrimary: false },
        });
        const updated = await tx.vehicle.update({
          where: { id: current.id },
          data: { isPrimary: true, version: { increment: 1 } },
          include: vehicleInclude(),
        });
        await writeVehicleEvent(tx, updated.id, req.auth!.userId, "VEHICLE_PRIMARY_SET");
        await writeVehicleAudit(
          tx,
          "VEHICLE_PRIMARY_SET",
          updated.id,
          req.auth!.userId,
          req.requestId,
        );
        return updated;
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/vehicles/:vehicleId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        const activeTrip = await tx.trip.findFirst({
          where: {
            vehicleId: current.id,
            status: { in: ["PUBLISHED", "BOOKING_OPEN", "FULL", "BOARDING", "IN_PROGRESS"] },
          },
        });
        if (activeTrip) {
          throw Object.assign(new Error("Vehicle is used by an active trip"), {
            statusCode: 409,
            code: "VEHICLE_ACTIVE_TRIP",
          });
        }
        const updated = await tx.vehicle.update({
          where: { id: current.id },
          data: {
            status: "ARCHIVED",
            moderationStatus: "ARCHIVED",
            archivedAt: new Date(),
            isPrimary: false,
            version: { increment: 1 },
          },
          include: vehicleInclude(),
        });
        await writeVehicleEvent(tx, updated.id, req.auth!.userId, "VEHICLE_ARCHIVED");
        await writeVehicleAudit(
          tx,
          "VEHICLE_ARCHIVED",
          updated.id,
          req.auth!.userId,
          req.requestId,
        );
        return updated;
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  async function addAsset(req: AuthenticatedRequest, res: Response, kind: "document" | "photo") {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed =
        kind === "document"
          ? vehicleDocumentCompleteSchema.parse(req.body ?? {})
          : vehiclePhotoCompleteSchema.parse(req.body ?? {});
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        if (!isEditableVehicleStatus(current.status)) {
          throw Object.assign(new Error("Vehicle assets cannot be changed after submission"), {
            statusCode: 409,
            code: "VEHICLE_NOT_EDITABLE",
          });
        }
        const allowed =
          kind === "document" ? allowedVehicleDocumentMimeTypes : allowedVehiclePhotoMimeTypes;
        if (!allowed.includes(parsed.mimeType)) {
          throw Object.assign(new Error("Unsupported file type"), {
            statusCode: 400,
            code: "VEHICLE_FILE_MIME_INVALID",
          });
        }
        if (!parsed.storageKey.startsWith(`vehicles/${current.id}/`)) {
          throw Object.assign(new Error("Storage key does not belong to vehicle"), {
            statusCode: 403,
            code: "VEHICLE_FILE_ACCESS_FORBIDDEN",
          });
        }
        const file = await tx.fileObject.upsert({
          where: { key: parsed.storageKey },
          create: {
            bucket:
              kind === "document" ? "nodex-vehicle-documents-local" : "nodex-vehicle-photos-local",
            key: parsed.storageKey,
            contentType: parsed.mimeType,
            sizeBytes: parsed.size,
            scanStatus: "PENDING",
          },
          update: { contentType: parsed.mimeType, sizeBytes: parsed.size },
        });
        if (kind === "document") {
          await tx.vehicleDocument.updateMany({
            where: { vehicleId: current.id, type: parsed.type as never, status: "UPLOADED" },
            data: { status: "REPLACED" },
          });
          await tx.vehicleDocument.create({
            data: {
              vehicleId: current.id,
              type: parsed.type as never,
              storageKey: parsed.storageKey,
              fileObjectId: file.id,
              originalFileName: cleanFileName(parsed.originalFileName),
              mimeType: parsed.mimeType,
              size: parsed.size,
              checksum: parsed.checksum,
            },
          });
        } else {
          await tx.vehiclePhoto.updateMany({
            where: { vehicleId: current.id, type: parsed.type as never, status: "UPLOADED" },
            data: { status: "REPLACED" },
          });
          await tx.vehiclePhoto.create({
            data: {
              vehicleId: current.id,
              type: parsed.type as never,
              storageKey: parsed.storageKey,
              fileObjectId: file.id,
              originalFileName: cleanFileName(parsed.originalFileName),
              mimeType: parsed.mimeType,
              size: parsed.size,
              checksum: parsed.checksum,
            },
          });
        }
        await writeVehicleEvent(
          tx,
          current.id,
          req.auth!.userId,
          kind === "document" ? "VEHICLE_DOCUMENT_ADDED" : "VEHICLE_PHOTO_ADDED",
          { type: parsed.type },
        );
        return tx.vehicle.findUniqueOrThrow({
          where: { id: current.id },
          include: vehicleInclude(),
        });
      });
      res.status(201).json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/vehicles/:vehicleId/documents/presign", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = vehicleDocumentPresignSchema.parse(req.body ?? {});
      const vehicle = await prisma.$transaction((tx) =>
        driverOwnVehicle(tx, req.auth!.userId, String(req.params.vehicleId ?? "")),
      );
      const storageKey = `vehicles/${vehicle.id}/documents/${parsed.type}/${randomUUID()}-${cleanFileName(parsed.originalFileName)}`;
      res.json({
        uploadUrl: `local-private-upload://${storageKey}`,
        storageKey,
        expiresIn: env.DRIVER_DOCUMENT_SIGNED_URL_TTL,
      });
    } catch (error) {
      handleError(res, req, error);
    }
  });
  http.post("/api/v1/vehicles/:vehicleId/documents", (req, res) => addAsset(req, res, "document"));

  http.post("/api/v1/vehicles/:vehicleId/photos/presign", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = vehiclePhotoPresignSchema.parse(req.body ?? {});
      const vehicle = await prisma.$transaction((tx) =>
        driverOwnVehicle(tx, req.auth!.userId, String(req.params.vehicleId ?? "")),
      );
      const storageKey = `vehicles/${vehicle.id}/photos/${parsed.type}/${randomUUID()}-${cleanFileName(parsed.originalFileName)}`;
      res.json({
        uploadUrl: `local-private-upload://${storageKey}`,
        storageKey,
        expiresIn: env.DRIVER_DOCUMENT_SIGNED_URL_TTL,
      });
    } catch (error) {
      handleError(res, req, error);
    }
  });
  http.post("/api/v1/vehicles/:vehicleId/photos", (req, res) => addAsset(req, res, "photo"));

  http.delete("/api/v1/vehicles/:vehicleId/documents/:documentId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        if (!isEditableVehicleStatus(current.status)) {
          throw Object.assign(new Error("Vehicle documents cannot be removed after submission"), {
            statusCode: 409,
            code: "VEHICLE_NOT_EDITABLE",
          });
        }
        await tx.vehicleDocument.updateMany({
          where: { id: String(req.params.documentId ?? ""), vehicleId: current.id },
          data: { status: "DELETED" },
        });
        await writeVehicleEvent(tx, current.id, req.auth!.userId, "VEHICLE_DOCUMENT_REMOVED");
        return tx.vehicle.findUniqueOrThrow({
          where: { id: current.id },
          include: vehicleInclude(),
        });
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/vehicles/:vehicleId/photos/:photoId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await driverOwnVehicle(
          tx,
          req.auth!.userId,
          String(req.params.vehicleId ?? ""),
        );
        if (!isEditableVehicleStatus(current.status)) {
          throw Object.assign(new Error("Vehicle photos cannot be removed after submission"), {
            statusCode: 409,
            code: "VEHICLE_NOT_EDITABLE",
          });
        }
        await tx.vehiclePhoto.updateMany({
          where: { id: String(req.params.photoId ?? ""), vehicleId: current.id },
          data: { status: "DELETED" },
        });
        await writeVehicleEvent(tx, current.id, req.auth!.userId, "VEHICLE_PHOTO_REMOVED");
        return tx.vehicle.findUniqueOrThrow({
          where: { id: current.id },
          include: vehicleInclude(),
        });
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/vehicles/:vehicleId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const vehicle = await prisma.$transaction((tx) =>
        driverOwnVehicle(tx, req.auth!.userId, String(req.params.vehicleId ?? "")),
      );
      res.json({ reviews: vehicle.reviews, events: vehicle.events });
    } catch (error) {
      handleError(res, req, error);
    }
  });
}

async function registerAdminVehicleRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/admin/vehicles", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status = cleanText(req.query.status, 40);
    const q = cleanText(req.query.q, 80);
    const where: Prisma.VehicleWhereInput = {};
    if (
      status &&
      [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "CHANGES_REQUESTED",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
        "ARCHIVED",
      ].includes(status)
    ) {
      where.status = status as NonNullable<Prisma.VehicleWhereInput["status"]>;
    }
    if (q) {
      where.OR = [
        { make: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { plateNumber: { contains: q, mode: "insensitive" } },
        { normalizedPlate: { contains: normalizePlate(q) ?? q, mode: "insensitive" } },
        {
          driverProfile: {
            user: { telegramIdentity: { username: { contains: q, mode: "insensitive" } } },
          },
        },
      ];
    }
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: vehicleInclude(),
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    res.json({ vehicles: vehicles.map(serializeVehicle) });
  });

  http.get("/api/v1/admin/vehicles/:vehicleId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: String(req.params.vehicleId ?? "") },
      include: vehicleInclude(),
    });
    if (!vehicle) {
      res.status(404).json(errorBody("VEHICLE_NOT_FOUND", "Vehicle not found", req));
      return;
    }
    res.json(serializeVehicle(vehicle));
  });

  http.get("/api/v1/admin/vehicles/:vehicleId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const vehicleId = String(req.params.vehicleId ?? "");
    const [reviews, events, audit] = await Promise.all([
      prisma.vehicleModerationReview.findMany({
        where: { vehicleId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vehicleModerationEvent.findMany({
        where: { vehicleId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditEvent.findMany({
        where: { entityType: "Vehicle", entityId: vehicleId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    res.json({ reviews, events, audit });
  });

  async function adminVehicleDecision(
    req: AuthenticatedRequest,
    res: Response,
    action: "START_REVIEW" | "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "SUSPEND" | "RESTORE",
  ) {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = vehicleModerationDecisionSchema.parse(req.body ?? {});
      if (["REJECT", "REQUEST_CHANGES", "SUSPEND"].includes(action) && !parsed.reasonCode) {
        throw Object.assign(new Error("Vehicle moderation reason is required"), {
          statusCode: 400,
          code: "VEHICLE_REASON_REQUIRED",
        });
      }
      if (parsed.reasonCode === "OTHER" && !parsed.comment) {
        throw Object.assign(new Error("Comment is required for OTHER reason"), {
          statusCode: 400,
          code: "VEHICLE_REASON_REQUIRED",
        });
      }
      const vehicle = await prisma.$transaction(async (tx) => {
        const current = await tx.vehicle.findUnique({
          where: { id: String(req.params.vehicleId ?? "") },
          include: vehicleInclude(),
        });
        if (!current) {
          throw Object.assign(new Error("Vehicle not found"), {
            statusCode: 404,
            code: "VEHICLE_NOT_FOUND",
          });
        }
        if (parsed.version && parsed.version !== current.version) {
          throw Object.assign(new Error("Vehicle version conflict"), {
            statusCode: 409,
            code: "VEHICLE_VERSION_CONFLICT",
          });
        }
        const now = new Date();
        const data: Prisma.VehicleUpdateInput = {
          version: { increment: 1 },
        };
        if (action === "START_REVIEW" && current.status === "SUBMITTED") {
          data.status = "UNDER_REVIEW";
          data.moderationStatus = "UNDER_REVIEW";
          data.reviewStartedAt = now;
        } else if (action === "APPROVE" && ["UNDER_REVIEW", "SUSPENDED"].includes(current.status)) {
          data.status = "APPROVED";
          data.moderationStatus = "APPROVED";
          data.reviewedAt = now;
          data.approvedAt = now;
          data.suspendedAt = null;
        } else if (action === "REJECT" && current.status === "UNDER_REVIEW") {
          data.status = "REJECTED";
          data.moderationStatus = "REJECTED";
          data.reviewedAt = now;
          data.rejectedAt = now;
        } else if (action === "REQUEST_CHANGES" && current.status === "UNDER_REVIEW") {
          data.status = "CHANGES_REQUESTED";
          data.moderationStatus = "CHANGES_REQUESTED";
          data.changesRequestedAt = now;
        } else if (action === "SUSPEND" && current.status === "APPROVED") {
          data.status = "SUSPENDED";
          data.moderationStatus = "SUSPENDED";
          data.suspendedAt = now;
          data.isPrimary = false;
        } else if (action === "RESTORE" && current.status === "SUSPENDED") {
          data.status = "UNDER_REVIEW";
          data.moderationStatus = "UNDER_REVIEW";
          data.reviewStartedAt = now;
        } else {
          throw Object.assign(new Error("Invalid vehicle status transition"), {
            statusCode: 409,
            code: "VEHICLE_STATUS_INVALID",
          });
        }
        const updated = await tx.vehicle.update({
          where: { id: current.id },
          data,
          include: vehicleInclude(),
        });
        await tx.vehicleModerationReview.create({
          data: {
            vehicleId: current.id,
            reviewerUserId: req.auth!.userId,
            action,
            reasonCode: parsed.reasonCode ?? null,
            comment: parsed.comment ?? null,
            metadata: { fromStatus: current.status, toStatus: updated.status },
          },
        });
        const eventType =
          action === "START_REVIEW"
            ? "VEHICLE_REVIEW_STARTED"
            : action === "APPROVE"
              ? "VEHICLE_APPROVED"
              : action === "REJECT"
                ? "VEHICLE_REJECTED"
                : action === "REQUEST_CHANGES"
                  ? "VEHICLE_CHANGES_REQUESTED"
                  : action === "SUSPEND"
                    ? "VEHICLE_SUSPENDED"
                    : "VEHICLE_RESTORED";
        await writeVehicleEvent(tx, current.id, req.auth!.userId, eventType, {
          reasonCode: parsed.reasonCode,
        });
        await writeVehicleAudit(tx, eventType, current.id, req.auth!.userId, req.requestId, {
          reasonCode: parsed.reasonCode,
        });
        await enqueueVehicleNotification(tx, eventType, current.id, current.driverProfile.userId, {
          reasonCode: parsed.reasonCode,
        });
        return updated;
      });
      res.json(serializeVehicle(vehicle));
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/admin/vehicles/:vehicleId/start-review", (req, res) =>
    adminVehicleDecision(req, res, "START_REVIEW"),
  );
  http.post("/api/v1/admin/vehicles/:vehicleId/approve", (req, res) =>
    adminVehicleDecision(req, res, "APPROVE"),
  );
  http.post("/api/v1/admin/vehicles/:vehicleId/request-changes", (req, res) =>
    adminVehicleDecision(req, res, "REQUEST_CHANGES"),
  );
  http.post("/api/v1/admin/vehicles/:vehicleId/reject", (req, res) =>
    adminVehicleDecision(req, res, "REJECT"),
  );
  http.post("/api/v1/admin/vehicles/:vehicleId/suspend", (req, res) =>
    adminVehicleDecision(req, res, "SUSPEND"),
  );
  http.post("/api/v1/admin/vehicles/:vehicleId/restore", (req, res) =>
    adminVehicleDecision(req, res, "RESTORE"),
  );
}

async function registerDriverVerificationRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  patch: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
  delete: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/driver/verification", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const application = await prisma.$transaction((tx) =>
      currentDriverApplication(tx, req.auth!.userId),
    );
    res.json(serializeDriverApplication(application));
  });

  http.post("/api/v1/driver/verification", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const application = await prisma.$transaction(async (tx) => {
      const current = await currentDriverApplication(tx, req.auth!.userId);
      if (!["DRAFT", "CHANGES_REQUESTED", "REJECTED", "WITHDRAWN"].includes(current.status)) {
        throw Object.assign(new Error("Verification application already exists"), {
          statusCode: 409,
          code: "DRIVER_VERIFICATION_ALREADY_EXISTS",
        });
      }
      return current;
    });
    res.status(201).json(serializeDriverApplication(application));
  });

  http.patch("/api/v1/driver/verification", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = driverVerificationDraftSchema.parse(req.body ?? {});
      const application = await prisma.$transaction(async (tx) => {
        const current = await currentDriverApplication(tx, req.auth!.userId);
        if (!isEditableVerificationStatus(current.status)) {
          throw Object.assign(new Error("Verification application is not editable"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_NOT_EDITABLE",
          });
        }
        const data: Prisma.DriverVerificationApplicationUpdateInput = {
          legalFirstName: cleanText(parsed.legalFirstName),
          legalLastName: cleanText(parsed.legalLastName),
          legalMiddleName: cleanText(parsed.legalMiddleName),
          birthDate: parseDateOrNull(parsed.birthDate),
          gender: cleanText(parsed.gender, 40),
          citizenship: cleanText(parsed.citizenship, 80),
          personalIdentificationNumber: cleanText(parsed.personalIdentificationNumber, 80),
          registeredAddress: cleanText(parsed.registeredAddress, 240),
          residentialAddress: cleanText(parsed.residentialAddress, 240),
          phone: normalizePhone(parsed.phone),
          emergencyContactName: cleanText(parsed.emergencyContactName, 120),
          emergencyContactPhone: normalizePhone(parsed.emergencyContactPhone),
          driverLicenseNumber: cleanText(parsed.driverLicenseNumber, 80),
          driverLicenseIssuedAt: parseDateOrNull(parsed.driverLicenseIssuedAt),
          driverLicenseExpiresAt: parseDateOrNull(parsed.driverLicenseExpiresAt),
          driverLicenseCategory: cleanText(parsed.driverLicenseCategory, 40),
          driverExperienceSince: parseDateOrNull(parsed.driverExperienceSince),
          vehicleMake: cleanText(parsed.vehicleMake, 80),
          vehicleModel: cleanText(parsed.vehicleModel, 80),
          vehicleYear: parsed.vehicleYear ?? null,
          vehicleColor: cleanText(parsed.vehicleColor, 80),
          vehiclePlateNumber: cleanText(parsed.vehiclePlateNumber, 40),
          vehicleRegistrationNumber: cleanText(parsed.vehicleRegistrationNumber, 80),
          vehicleSeats: parsed.vehicleSeats ?? null,
        };
        if (parsed.consentAccepted) {
          data.consentAcceptedAt = new Date();
          data.consentVersion = env.DRIVER_VERIFICATION_CONSENT_VERSION;
          data.privacyVersion = env.PRIVACY_VERSION;
          data.verificationPolicyVersion = env.DRIVER_VERIFICATION_POLICY_VERSION;
        }
        const updated = await tx.driverVerificationApplication.update({
          where: { id: current.id },
          data: { ...data, version: { increment: 1 } },
          include: applicationInclude(),
        });
        await writeVerificationEvent(
          tx,
          updated.id,
          req.auth!.userId,
          "DRIVER_VERIFICATION_UPDATED",
        );
        await writeVerificationAudit(
          tx,
          "DRIVER_VERIFICATION_UPDATED",
          updated.id,
          req.auth!.userId,
          req.requestId,
        );
        return updated;
      });
      res.json(serializeDriverApplication(application));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/driver/verification/completion", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const application = await prisma.$transaction((tx) =>
      currentDriverApplication(tx, req.auth!.userId),
    );
    res.json(calculateCompletion(application));
  });

  http.post("/api/v1/driver/verification/submit", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const application = await prisma.$transaction(async (tx) => {
        const current = await currentDriverApplication(tx, req.auth!.userId);
        if (!isEditableVerificationStatus(current.status)) {
          throw Object.assign(new Error("Verification application is already submitted"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_ALREADY_SUBMITTED",
          });
        }
        const completion = calculateCompletion(current);
        if (!completion.canSubmit) {
          throw Object.assign(new Error("Verification application is incomplete"), {
            statusCode: 400,
            code: "DRIVER_VERIFICATION_INCOMPLETE",
          });
        }
        const duplicate = env.DRIVER_VERIFICATION_DUPLICATE_CHECK_ENABLED
          ? await tx.driverVerificationApplication.findFirst({
              where: {
                id: { not: current.id },
                OR: [
                  current.personalIdentificationNumber
                    ? { personalIdentificationNumber: current.personalIdentificationNumber }
                    : {},
                  current.driverLicenseNumber
                    ? { driverLicenseNumber: current.driverLicenseNumber }
                    : {},
                  current.phone ? { phone: current.phone } : {},
                ].filter((entry) => Object.keys(entry).length > 0),
              },
            })
          : null;
        const updated = await tx.driverVerificationApplication.update({
          where: { id: current.id },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
            lastSubmittedByUserId: req.auth!.userId,
            duplicateWarning: Boolean(duplicate),
            duplicateReason: duplicate ? "Potential exact identifier duplicate" : null,
            version: { increment: 1 },
          },
          include: applicationInclude(),
        });
        await tx.driverProfile.update({
          where: { id: current.driverProfileId },
          data: { onboardingStatus: "IN_PROGRESS", verificationStatus: "PENDING" },
        });
        await writeVerificationEvent(
          tx,
          updated.id,
          req.auth!.userId,
          "DRIVER_VERIFICATION_SUBMITTED",
        );
        await writeVerificationAudit(
          tx,
          "DRIVER_VERIFICATION_SUBMITTED",
          updated.id,
          req.auth!.userId,
          req.requestId,
        );
        await enqueueVerificationNotification(
          tx,
          "DRIVER_VERIFICATION_SUBMITTED",
          updated.id,
          req.auth!.userId,
        );
        return updated;
      });
      res.json(serializeDriverApplication(application));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/verification/withdraw", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const application = await prisma.$transaction(async (tx) => {
        const current = await currentDriverApplication(tx, req.auth!.userId);
        if (current.status !== "SUBMITTED") {
          throw Object.assign(new Error("Only submitted applications can be withdrawn"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_STATUS_INVALID",
          });
        }
        const updated = await tx.driverVerificationApplication.update({
          where: { id: current.id },
          data: { status: "WITHDRAWN", version: { increment: 1 } },
          include: applicationInclude(),
        });
        await tx.driverProfile.update({
          where: { id: current.driverProfileId },
          data: { verificationStatus: "NOT_SUBMITTED" },
        });
        await writeVerificationEvent(
          tx,
          updated.id,
          req.auth!.userId,
          "DRIVER_VERIFICATION_WITHDRAWN",
        );
        return updated;
      });
      res.json(serializeDriverApplication(application));
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/driver/verification/history", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const applications = profile
      ? await prisma.driverVerificationApplication.findMany({
          where: { driverProfileId: profile.id },
          include: applicationInclude(),
          orderBy: [{ version: "desc" }],
        })
      : [];
    res.json({
      applications: applications.map((application) => serializeDriverApplication(application)),
    });
  });

  http.post("/api/v1/driver/verification/documents/presign", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = driverDocumentPresignSchema.parse(req.body ?? {});
      if (!allowedDriverDocumentMimeTypes.includes(parsed.mimeType)) {
        throw Object.assign(new Error("Document MIME type is not allowed"), {
          statusCode: 400,
          code: "DRIVER_DOCUMENT_MIME_INVALID",
        });
      }
      const maxSize =
        parsed.mimeType === "application/pdf"
          ? env.DRIVER_DOCUMENT_MAX_PDF_SIZE
          : env.DRIVER_DOCUMENT_MAX_IMAGE_SIZE;
      if (parsed.size > maxSize) {
        throw Object.assign(new Error("Document is too large"), {
          statusCode: 400,
          code: "DRIVER_DOCUMENT_TOO_LARGE",
        });
      }
      const current = await prisma.$transaction((tx) =>
        currentDriverApplication(tx, req.auth!.userId),
      );
      if (!isEditableVerificationStatus(current.status)) {
        throw Object.assign(new Error("Verification application is not editable"), {
          statusCode: 409,
          code: "DRIVER_VERIFICATION_NOT_EDITABLE",
        });
      }
      const safeName = cleanFileName(parsed.originalFileName);
      const storageKey = `driver-verification/${current.id}/${parsed.type}/${randomUUID()}-${safeName}`;
      res.json({
        uploadUrl: `http://127.0.0.1:${env.API_PORT}/api/v1/local-upload/${encodeURIComponent(storageKey)}`,
        storageKey,
        expiresIn: env.DRIVER_DOCUMENT_SIGNED_URL_TTL,
        headers: { "content-type": parsed.mimeType },
      });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/verification/documents/complete", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = driverDocumentCompleteSchema.parse(req.body ?? {});
      const document = await prisma.$transaction(async (tx) => {
        const current = await currentDriverApplication(tx, req.auth!.userId);
        if (!isEditableVerificationStatus(current.status)) {
          throw Object.assign(new Error("Verification application is not editable"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_NOT_EDITABLE",
          });
        }
        if (!parsed.storageKey.startsWith(`driver-verification/${current.id}/`)) {
          throw Object.assign(new Error("Document access is forbidden"), {
            statusCode: 403,
            code: "DRIVER_DOCUMENT_ACCESS_FORBIDDEN",
          });
        }
        const fileObject = await tx.fileObject.upsert({
          where: { key: parsed.storageKey },
          create: {
            bucket: env.DRIVER_DOCUMENT_BUCKET,
            key: parsed.storageKey,
            contentType: parsed.mimeType,
            sizeBytes: parsed.size,
            scanStatus: "APPROVED",
          },
          update: {
            contentType: parsed.mimeType,
            sizeBytes: parsed.size,
            scanStatus: "APPROVED",
          },
        });
        await tx.driverVerificationDocument.updateMany({
          where: { applicationId: current.id, type: parsed.type, status: "UPLOADED" },
          data: { status: "REPLACED" },
        });
        const created = await tx.driverVerificationDocument.create({
          data: {
            applicationId: current.id,
            type: parsed.type,
            storageKey: parsed.storageKey,
            fileObjectId: fileObject.id,
            originalFileName: cleanFileName(parsed.originalFileName),
            mimeType: parsed.mimeType,
            size: parsed.size,
            checksum: parsed.checksum,
          },
        });
        await writeVerificationEvent(tx, current.id, req.auth!.userId, "DRIVER_DOCUMENT_UPLOADED", {
          documentId: created.id,
          type: created.type,
        });
        return created;
      });
      res.status(201).json(document);
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.delete("/api/v1/driver/verification/documents/:documentId", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const document = await prisma.$transaction(async (tx) => {
        const current = await currentDriverApplication(tx, req.auth!.userId);
        if (!isEditableVerificationStatus(current.status)) {
          throw Object.assign(new Error("Verification application is not editable"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_NOT_EDITABLE",
          });
        }
        const existing = await tx.driverVerificationDocument.findFirst({
          where: { id: String(req.params.documentId ?? ""), applicationId: current.id },
        });
        if (!existing) {
          throw Object.assign(new Error("Document not found"), {
            statusCode: 404,
            code: "DRIVER_DOCUMENT_NOT_FOUND",
          });
        }
        const updated = await tx.driverVerificationDocument.update({
          where: { id: existing.id },
          data: { status: "DELETED" },
        });
        await writeVerificationEvent(tx, current.id, req.auth!.userId, "DRIVER_DOCUMENT_DELETED", {
          documentId: updated.id,
        });
        return updated;
      });
      res.json(document);
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/driver/verification/documents/:documentId/replace", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    req.body = { ...(req.body ?? {}), replacesDocumentId: req.params.documentId };
    res.status(202).json({
      replaceBy: "documents/presign and documents/complete",
      documentId: req.params.documentId,
    });
  });

  http.get("/api/v1/driver/verification/documents/:documentId/download", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    const profile = await prisma.driverProfile.findUnique({ where: { userId: req.auth!.userId } });
    const document = profile
      ? await prisma.driverVerificationDocument.findFirst({
          where: {
            id: String(req.params.documentId ?? ""),
            application: { driverProfileId: profile.id },
          },
        })
      : null;
    if (!document || document.status === "DELETED" || document.status === "REPLACED") {
      res.status(404).json(errorBody("DRIVER_DOCUMENT_NOT_FOUND", "Document not found", req));
      return;
    }
    await writeAudit(
      "DRIVER_DOCUMENT_VIEWED",
      "DriverVerificationDocument",
      document.id,
      req.auth!.userId,
      req.requestId,
    );
    res.json({
      downloadUrl: `local-private://${document.storageKey}`,
      expiresIn: env.DRIVER_DOCUMENT_SIGNED_URL_TTL,
    });
  });
}

async function registerAdminDriverVerificationRoutes(http: {
  get: (path: string, handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) => void;
  post: (
    path: string,
    handler: (req: AuthenticatedRequest, res: Response) => Promise<void>,
  ) => void;
}) {
  http.get("/api/v1/admin/driver-verifications", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status = cleanText(req.query.status, 40);
    const q = cleanText(req.query.q, 80);
    const where: Prisma.DriverVerificationApplicationWhereInput = {};
    if (
      status &&
      [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "CHANGES_REQUESTED",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
        "SUSPENDED",
      ].includes(status)
    ) {
      where.status = status as
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "CHANGES_REQUESTED"
        | "APPROVED"
        | "REJECTED"
        | "WITHDRAWN"
        | "SUSPENDED";
    }
    if (q) {
      where.OR = [
        { legalFirstName: { contains: q, mode: "insensitive" } },
        { legalLastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { driverLicenseNumber: { contains: q, mode: "insensitive" } },
        { vehiclePlateNumber: { contains: q, mode: "insensitive" } },
        {
          driverProfile: {
            user: { telegramIdentity: { username: { contains: q, mode: "insensitive" } } },
          },
        },
      ];
    }
    const applications = await prisma.driverVerificationApplication.findMany({
      where,
      include: applicationInclude(),
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    res.json({
      applications: applications.map((application) =>
        serializeDriverApplication(application, "admin"),
      ),
    });
  });

  http.get("/api/v1/admin/driver-verifications/:applicationId", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const application = await prisma.driverVerificationApplication.findUnique({
      where: { id: String(req.params.applicationId ?? "") },
      include: applicationInclude(),
    });
    if (!application) {
      res
        .status(404)
        .json(errorBody("DRIVER_VERIFICATION_NOT_FOUND", "Application not found", req));
      return;
    }
    res.json(serializeDriverApplication(application, "admin"));
  });

  http.get("/api/v1/admin/driver-verifications/:applicationId/history", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const applicationId = String(req.params.applicationId ?? "");
    const [reviews, events] = await Promise.all([
      prisma.driverVerificationReview.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.driverVerificationEvent.findMany({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({ reviews, events });
  });

  async function adminDecision(
    req: AuthenticatedRequest,
    res: Response,
    action: "START_REVIEW" | "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "SUSPEND" | "RESTORE",
  ) {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = driverReviewDecisionSchema.parse(req.body ?? {});
      if (["REJECT", "REQUEST_CHANGES", "SUSPEND"].includes(action) && !parsed.reasonCode) {
        throw Object.assign(new Error("Review reason is required"), {
          statusCode: 400,
          code: "DRIVER_VERIFICATION_REASON_REQUIRED",
        });
      }
      if (parsed.reasonCode === "OTHER" && !parsed.comment) {
        throw Object.assign(new Error("Comment is required for OTHER reason"), {
          statusCode: 400,
          code: "DRIVER_VERIFICATION_REASON_REQUIRED",
        });
      }
      const application = await prisma.$transaction(async (tx) => {
        const current = await tx.driverVerificationApplication.findUnique({
          where: { id: String(req.params.applicationId ?? "") },
          include: applicationInclude(),
        });
        if (!current) {
          throw Object.assign(new Error("Application not found"), {
            statusCode: 404,
            code: "DRIVER_VERIFICATION_NOT_FOUND",
          });
        }
        if (parsed.version && parsed.version !== current.version) {
          throw Object.assign(new Error("Application version conflict"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_VERSION_CONFLICT",
          });
        }
        const now = new Date();
        const data: Prisma.DriverVerificationApplicationUpdateInput = { version: { increment: 1 } };
        if (action === "START_REVIEW" && current.status === "SUBMITTED") {
          data.status = "UNDER_REVIEW";
          data.reviewStartedAt = now;
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else if (action === "APPROVE" && ["UNDER_REVIEW", "SUSPENDED"].includes(current.status)) {
          data.status = "APPROVED";
          data.reviewedAt = now;
          data.approvedAt = now;
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else if (action === "REJECT" && current.status === "UNDER_REVIEW") {
          data.status = "REJECTED";
          data.reviewedAt = now;
          data.rejectedAt = now;
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else if (action === "REQUEST_CHANGES" && current.status === "UNDER_REVIEW") {
          data.status = "CHANGES_REQUESTED";
          data.changesRequestedAt = now;
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else if (action === "SUSPEND" && current.status === "APPROVED") {
          data.status = "SUSPENDED";
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else if (action === "RESTORE" && current.status === "SUSPENDED") {
          data.status = "UNDER_REVIEW";
          data.reviewStartedAt = now;
          data.reviewedByUser = { connect: { id: req.auth!.userId } };
        } else {
          throw Object.assign(new Error("Invalid verification status transition"), {
            statusCode: 409,
            code: "DRIVER_VERIFICATION_STATUS_INVALID",
          });
        }
        const updated = await tx.driverVerificationApplication.update({
          where: { id: current.id },
          data,
          include: applicationInclude(),
        });
        await tx.driverVerificationReview.create({
          data: {
            applicationId: current.id,
            reviewerUserId: req.auth!.userId,
            action,
            reasonCode: parsed.reasonCode ?? null,
            comment: parsed.comment ?? null,
            metadata: { fromStatus: current.status, toStatus: updated.status },
          },
        });
        const profileData: Prisma.DriverProfileUpdateInput = {
          verificationStatus: verificationStatusForProfile(updated.status),
        };
        if (updated.status === "APPROVED") {
          profileData.verifiedAt = now;
          profileData.suspendedAt = null;
          profileData.suspensionReason = null;
        }
        if (updated.status === "SUSPENDED") {
          profileData.suspendedAt = now;
          profileData.suspensionReason = parsed.comment ?? parsed.reasonCode ?? null;
        }
        await tx.driverProfile.update({
          where: { id: current.driverProfileId },
          data: profileData,
        });
        const eventType =
          action === "START_REVIEW"
            ? "DRIVER_VERIFICATION_REVIEW_STARTED"
            : action === "APPROVE"
              ? "DRIVER_VERIFICATION_APPROVED"
              : action === "REJECT"
                ? "DRIVER_VERIFICATION_REJECTED"
                : action === "REQUEST_CHANGES"
                  ? "DRIVER_VERIFICATION_CHANGES_REQUESTED"
                  : action === "SUSPEND"
                    ? "DRIVER_VERIFICATION_SUSPENDED"
                    : "DRIVER_VERIFICATION_RESTORED";
        await writeVerificationEvent(tx, current.id, req.auth!.userId, eventType, {
          reasonCode: parsed.reasonCode,
        });
        await writeVerificationAudit(tx, eventType, current.id, req.auth!.userId, req.requestId, {
          reasonCode: parsed.reasonCode,
        });
        await enqueueVerificationNotification(tx, eventType, current.id, current.createdByUserId, {
          reasonCode: parsed.reasonCode,
        });
        return updated;
      });
      res.json(serializeDriverApplication(application, "admin"));
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/admin/driver-verifications/:applicationId/start-review", (req, res) =>
    adminDecision(req, res, "START_REVIEW"),
  );
  http.post("/api/v1/admin/driver-verifications/:applicationId/approve", (req, res) =>
    adminDecision(req, res, "APPROVE"),
  );
  http.post("/api/v1/admin/driver-verifications/:applicationId/reject", (req, res) =>
    adminDecision(req, res, "REJECT"),
  );
  http.post("/api/v1/admin/driver-verifications/:applicationId/request-changes", (req, res) =>
    adminDecision(req, res, "REQUEST_CHANGES"),
  );
  http.post("/api/v1/admin/driver-verifications/:applicationId/suspend", (req, res) =>
    adminDecision(req, res, "SUSPEND"),
  );
  http.post("/api/v1/admin/driver-verifications/:applicationId/restore", (req, res) =>
    adminDecision(req, res, "RESTORE"),
  );

  http.get(
    "/api/v1/admin/driver-verifications/:applicationId/documents/:documentId",
    async (req, res) => {
      if (!(await authenticate(req, res, ["ADMIN"]))) return;
      const document = await prisma.driverVerificationDocument.findFirst({
        where: {
          id: String(req.params.documentId ?? ""),
          applicationId: String(req.params.applicationId ?? ""),
        },
      });
      if (!document || document.status === "DELETED" || document.status === "REPLACED") {
        res.status(404).json(errorBody("DRIVER_DOCUMENT_NOT_FOUND", "Document not found", req));
        return;
      }
      await writeAudit(
        "DRIVER_DOCUMENT_VIEWED",
        "DriverVerificationDocument",
        document.id,
        req.auth!.userId,
        req.requestId,
      );
      res.json({
        document,
        downloadUrl: `local-private://${document.storageKey}`,
        expiresIn: env.DRIVER_DOCUMENT_SIGNED_URL_TTL,
      });
    },
  );
}

async function upsertAuthenticatedUser(
  telegramUser: TelegramUserPayload,
  appContext: AppContext,
  req: AuthenticatedRequest,
) {
  const role = appContextRoles[appContext];
  const locale = normalizeLocale(telegramUser.language_code);
  const displayName =
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") ||
    telegramUser.username ||
    "Nodex user";
  const telegramUserData = {
    username: telegramUser.username ?? null,
    firstName: telegramUser.first_name ?? null,
    lastName: telegramUser.last_name ?? null,
    displayName,
    avatarUrl: telegramUser.photo_url ?? null,
    locale,
  };
  return prisma.$transaction(async (tx) => {
    const identity = await tx.telegramIdentity.findUnique({
      where: { telegramUserId: BigInt(telegramUser.id) },
      include: { user: true },
    });
    const user = identity
      ? await tx.user.update({
          where: { id: identity.userId },
          data: {
            telegramId: BigInt(telegramUser.id),
            ...telegramUserData,
            lastSeenAt: new Date(),
          },
        })
      : await tx.user.create({
          data: {
            telegramId: BigInt(telegramUser.id),
            ...telegramUserData,
            lastSeenAt: new Date(),
          },
        });
    await tx.telegramIdentity.upsert({
      where: { telegramUserId: BigInt(telegramUser.id) },
      create: {
        userId: user.id,
        telegramUserId: BigInt(telegramUser.id),
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        languageCode: telegramUser.language_code ?? null,
        isPremium: Boolean(telegramUser.is_premium),
        photoUrl: telegramUser.photo_url ?? null,
        allowsWriteToPm: telegramUser.allows_write_to_pm ?? null,
      },
      update: {
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        languageCode: telegramUser.language_code ?? null,
        isPremium: Boolean(telegramUser.is_premium),
        photoUrl: telegramUser.photo_url ?? null,
        allowsWriteToPm: telegramUser.allows_write_to_pm ?? null,
        lastAuthenticatedAt: new Date(),
      },
    });
    const roleRow = await tx.role.upsert({
      where: { code: role },
      create: { code: role, name: role },
      update: {},
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
      create: { userId: user.id, roleId: roleRow.id },
      update: {},
    });
    await tx.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, locale, theme: "TELEGRAM" },
      update: {},
    });
    if (role === "CLIENT") {
      await tx.clientProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }
    if (role === "DRIVER") {
      await tx.driverProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }
    await tx.auditEvent.create({
      data: {
        actorUserId: user.id,
        action: "AUTH_LOGIN_SUCCEEDED",
        entityType: "User",
        entityId: user.id,
        requestId: req.requestId ?? null,
        newValueJson: { appContext, role, telegramUserId: String(telegramUser.id) },
      },
    });
    return user;
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks();
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, env.NODE_ENV !== "production" || allowedOrigins.includes(origin));
    },
    credentials: true,
  });
  app.use(
    json({
      limit: "16kb",
      verify(req, _res, buffer) {
        const request = req as AuthenticatedRequest;
        if (request.originalUrl === "/api/v1/payments/mock/webhook") {
          request.rawBody = buffer.toString("utf8");
        }
      },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https://*.telegram.org", "https://t.me"],
          frameAncestors: ["'self'", "https://*.telegram.org", "https://web.telegram.org"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      hsts: env.NODE_ENV === "production" ? { maxAge: 15552000, includeSubDomains: true } : false,
      noSniff: true,
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use(
    (
      req: AuthenticatedRequest,
      res: { setHeader: (key: string, value: string) => void },
      next: () => void,
    ) => {
      const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
      req.requestId = requestId;
      res.setHeader("x-request-id", requestId);
      next();
    },
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const http = app.getHttpAdapter().getInstance();
  http.get("/api/v1/health", (_req: unknown, res: Response) => res.json({ status: "ok" }));
  http.get("/api/v1/health/live", (_req: unknown, res: Response) => res.json({ status: "live" }));
  http.get("/api/v1/health/ready", (_req: unknown, res: Response) => res.json({ status: "ready" }));
  http.get("/api/v1/meta", (_req: unknown, res: Response) =>
    res.json({
      service: "nodex-api",
      version: "0.1.0",
      environment: env.APP_ENV,
      locales: supportedLocales,
      currency: "UZS",
    }),
  );

  http.post("/api/v1/auth/telegram", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appContext = appContextFromBody(req.body?.appContext);
      const token = botTokenForContext(appContext);
      const validation = validateTelegramInitData(String(req.body?.initData ?? ""), token, {
        maxAgeSeconds: env.AUTH_INIT_DATA_MAX_AGE,
      });
      if (!validation.ok || !validation.user) {
        await writeAudit("AUTH_LOGIN_FAILED", "Auth", appContext, undefined, req.requestId, {
          appContext,
          category: validation.error,
        });
        res
          .status(validation.error === "AUTH_INIT_DATA_EXPIRED" ? 401 : 400)
          .json(
            errorBody(
              validation.error ?? "AUTH_INIT_DATA_INVALID",
              "Telegram authentication failed",
              req,
            ),
          );
        return;
      }
      const user = await upsertAuthenticatedUser(validation.user, appContext, req);
      const session = await createSession(user.id, appContext, req);
      setRefreshCookie(res, session.refreshToken, session.session.expiresAt);
      res.json({
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: await serializeUser(user.id),
        roles: await userRoles(user.id),
        profileCompletion: (await serializeUser(user.id)).profileCompletion,
        appContext,
      });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/auth/mock", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (env.NODE_ENV === "production" || !env.AUTH_MOCK_ENABLED) {
        res.status(403).json(errorBody("AUTH_MOCK_DISABLED", "Mock auth is disabled", req));
        return;
      }
      const appContext = appContextFromBody(req.body?.appContext ?? "CLIENT_APP");
      const role = appContextRoles[appContext];
      const requestedMockId = Number(req.body?.telegramUserId);
      const mockId =
        Number.isSafeInteger(requestedMockId) && requestedMockId > 0
          ? requestedMockId
          : role === "ADMIN"
            ? 900000001
            : role === "DRIVER"
              ? 900000002
              : 900000003;
      const user = await upsertAuthenticatedUser(
        {
          id: mockId,
          username: `nodex_${role.toLowerCase()}`,
          first_name: role === "DRIVER" ? "Driver" : role === "ADMIN" ? "Admin" : "Client",
          last_name: "Mock",
          language_code: "ru",
        },
        appContext,
        req,
      );
      if (role === "ADMIN") await ensureRole(user.id, "ADMIN", req.requestId);
      const session = await createSession(user.id, appContext, req);
      setRefreshCookie(res, session.refreshToken, session.session.expiresAt);
      res.json({
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        user: await serializeUser(user.id),
        roles: await userRoles(user.id),
        profileCompletion: (await serializeUser(user.id)).profileCompletion,
        appContext,
      });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.post("/api/v1/auth/refresh", async (req: AuthenticatedRequest, res: Response) => {
    const refreshToken = getCookie(req, refreshCookieName);
    if (!refreshToken) {
      res.status(401).json(errorBody("AUTH_REFRESH_INVALID", "Refresh token is missing", req));
      return;
    }
    const hash = hashSecret(refreshToken);
    const session = await prisma.authSession.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      if (session) {
        await prisma.authSession.updateMany({
          where: { sessionFamilyId: session.sessionFamilyId },
          data: { revokedAt: new Date(), revokeReason: "REFRESH_REUSED" },
        });
      }
      res.status(401).json(errorBody("AUTH_REFRESH_REUSED", "Refresh token is invalid", req));
      return;
    }
    const refreshTokenNew = randomBytes(48).toString("base64url");
    const refreshed = await prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashSecret(refreshTokenNew), lastUsedAt: new Date() },
    });
    const accessTokenExpiresAt = new Date(Date.now() + durationToMs(env.AUTH_ACCESS_TOKEN_TTL));
    const accessToken = await signSessionToken(
      { sub: refreshed.userId, sid: refreshed.id, appContext: refreshed.appContext },
      accessTokenSecret,
      env.AUTH_ACCESS_TOKEN_TTL,
    );
    await writeAudit(
      "AUTH_REFRESHED",
      "AuthSession",
      refreshed.id,
      refreshed.userId,
      req.requestId,
    );
    setRefreshCookie(res, refreshTokenNew, refreshed.expiresAt);
    res.json({ accessToken, accessTokenExpiresAt, user: await serializeUser(refreshed.userId) });
  });

  http.post("/api/v1/auth/logout", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    await prisma.authSession.update({
      where: { id: req.auth!.sessionId },
      data: { revokedAt: new Date(), revokeReason: "LOGOUT" },
    });
    await writeAudit(
      "AUTH_LOGOUT",
      "AuthSession",
      req.auth!.sessionId,
      req.auth!.userId,
      req.requestId,
    );
    clearRefreshCookie(res);
    res.json({ ok: true });
  });

  http.post("/api/v1/auth/logout-all", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    await prisma.authSession.updateMany({
      where: { userId: req.auth!.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "LOGOUT_ALL" },
    });
    await writeAudit("AUTH_LOGOUT_ALL", "User", req.auth!.userId, req.auth!.userId, req.requestId);
    clearRefreshCookie(res);
    res.json({ ok: true });
  });

  http.get("/api/v1/auth/session", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    res.json({
      sessionId: req.auth!.sessionId,
      appContext: req.auth!.appContext,
      roles: req.auth!.roles,
    });
  });

  http.get("/api/v1/me", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    res.json(await serializeUser(req.auth!.userId));
  });

  http.patch("/api/v1/me", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const data: Prisma.UserUpdateInput = {};
    if ("firstName" in body) data.firstName = cleanText(body.firstName);
    if ("lastName" in body) data.lastName = cleanText(body.lastName);
    if ("displayName" in body) data.displayName = cleanText(body.displayName);
    if ("phone" in body) data.phone = normalizePhone(body.phone);
    await prisma.user.update({ where: { id: req.auth!.userId }, data });
    if (req.auth!.roles.includes("CLIENT")) {
      const clientUpdate: Prisma.ClientProfileUpdateInput = {};
      if ("city" in body) clientUpdate.city = cleanText(body.city);
      if ("emergencyContactName" in body) {
        clientUpdate.emergencyContactName = cleanText(body.emergencyContactName);
      }
      if ("emergencyContactPhone" in body) {
        clientUpdate.emergencyContactPhone = normalizePhone(body.emergencyContactPhone);
      }
      await prisma.clientProfile.upsert({
        where: { userId: req.auth!.userId },
        create: {
          userId: req.auth!.userId,
          city: cleanText(body.city),
          emergencyContactName: cleanText(body.emergencyContactName),
          emergencyContactPhone: normalizePhone(body.emergencyContactPhone),
        },
        update: clientUpdate,
      });
    }
    if (req.auth!.roles.includes("DRIVER")) {
      const driverUpdate: Prisma.DriverProfileUpdateInput = {};
      if ("city" in body) driverUpdate.city = cleanText(body.city);
      if ("bio" in body) driverUpdate.bio = cleanText(body.bio, 500);
      await prisma.driverProfile.upsert({
        where: { userId: req.auth!.userId },
        create: {
          userId: req.auth!.userId,
          city: cleanText(body.city),
          bio: cleanText(body.bio, 500),
        },
        update: driverUpdate,
      });
    }
    await writeAudit("PROFILE_UPDATED", "User", req.auth!.userId, req.auth!.userId, req.requestId);
    res.json(await serializeUser(req.auth!.userId));
  });

  http.patch("/api/v1/me/preferences", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    const locale = normalizeLocale(req.body?.locale);
    const theme = normalizeTheme(req.body?.theme);
    await prisma.userPreference.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        locale,
        theme,
        notificationsEnabled: req.body?.notificationsEnabled !== false,
        marketingEnabled: req.body?.marketingEnabled === true,
      },
      update: {
        locale,
        theme,
        notificationsEnabled: req.body?.notificationsEnabled !== false,
        marketingEnabled: req.body?.marketingEnabled === true,
      },
    });
    await prisma.user.update({ where: { id: req.auth!.userId }, data: { locale, theme } });
    await writeAudit(
      "PREFERENCES_UPDATED",
      "User",
      req.auth!.userId,
      req.auth!.userId,
      req.requestId,
    );
    res.json(await serializeUser(req.auth!.userId));
  });

  http.post("/api/v1/me/accept-terms", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        acceptedTermsAt: new Date(),
        termsVersion: env.TERMS_VERSION,
        privacyVersion: env.PRIVACY_VERSION,
      },
    });
    await writeAudit("TERMS_ACCEPTED", "User", req.auth!.userId, req.auth!.userId, req.requestId, {
      termsVersion: env.TERMS_VERSION,
      privacyVersion: env.PRIVACY_VERSION,
    });
    res.json(await serializeUser(req.auth!.userId));
  });

  http.get("/api/v1/me/sessions", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res))) return;
    const sessions = await prisma.authSession.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        appContext: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    res.json({ sessions });
  });

  http.delete(
    "/api/v1/me/sessions/:sessionId",
    async (req: AuthenticatedRequest, res: Response) => {
      if (!(await authenticate(req, res))) return;
      const sessionId = String(req.params.sessionId ?? "");
      const session = await prisma.authSession.findFirst({
        where: { id: sessionId, userId: req.auth!.userId },
      });
      if (!session) {
        res.status(404).json(errorBody("SESSION_NOT_FOUND", "Session not found", req));
        return;
      }
      if (session.revokedAt) {
        res.status(409).json(errorBody("SESSION_ALREADY_REVOKED", "Session already revoked", req));
        return;
      }
      await prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokeReason: "USER_REVOKED" },
      });
      await writeAudit(
        "SESSION_REVOKED",
        "AuthSession",
        session.id,
        req.auth!.userId,
        req.requestId,
      );
      res.json({ ok: true });
    },
  );

  http.get("/api/v1/admin/users", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const q = cleanText(req.query.q, 80);
    const role = cleanText(req.query.role, 20);
    const status = cleanText(req.query.status, 20);
    const where: Prisma.UserWhereInput = {};
    if (status && ["ACTIVE", "BLOCKED", "DELETED"].includes(status))
      where.status = status as "ACTIVE" | "BLOCKED" | "DELETED";
    if (role) where.roles = { some: { role: { code: role } } };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      include: {
        roles: { include: { role: true } },
        telegramIdentity: true,
        sessions: true,
        clientProfile: true,
        driver: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    res.json({
      users: serializeBigInt(
        users.map((user) => ({
          id: user.id,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          status: user.status,
          telegramUserId: user.telegramIdentity?.telegramUserId,
          username: user.telegramIdentity?.username ?? user.username,
          roles: user.roles.map(({ role }) => role.code),
          profileCompletion: {
            client: Boolean(user.clientProfile),
            driver: user.driver?.onboardingStatus ?? null,
            acceptedTerms: Boolean(user.acceptedTermsAt),
          },
          sessionsCount: user.sessions.length,
          lastSeenAt: user.lastSeenAt,
          createdAt: user.createdAt,
        })),
      ),
    });
  });

  http.get("/api/v1/admin/users/:userId", async (req: AuthenticatedRequest, res: Response) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const user = await prisma.user.findUnique({ where: { id: String(req.params.userId ?? "") } });
    if (!user) {
      res.status(404).json(errorBody("SESSION_NOT_FOUND", "User not found", req));
      return;
    }
    res.json(await serializeUser(user.id));
  });

  await registerTripSupplyRoutes(http);
  await registerParcelRoutes(http);
  await registerCommunicationRoutes(http);
  await registerTrustSafetyRoutes(http);
  await registerRewardRoutes(http);
  await registerFinanceRoutes(http);
  await registerBookingRoutes(http);
  await registerVehicleRoutes(http);
  await registerAdminVehicleRoutes(http);
  await registerDriverVerificationRoutes(http);
  await registerAdminDriverVerificationRoutes(http);

  const config = new DocumentBuilder()
    .setTitle("Nodex Intercity API")
    .setDescription("Foundation and Phase 1 authentication OpenAPI contract")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });
  document.paths = {
    ...document.paths,
    ...(phase1OpenApiPaths() as typeof document.paths),
    ...(phase2OpenApiPaths() as typeof document.paths),
    ...(phase3OpenApiPaths() as typeof document.paths),
    ...(phase4OpenApiPaths() as typeof document.paths),
    ...(phase5OpenApiPaths() as typeof document.paths),
    ...(phase6OpenApiPaths() as typeof document.paths),
    ...(phase7OpenApiPaths() as typeof document.paths),
    ...(phase8OpenApiPaths() as typeof document.paths),
    ...(phase9OpenApiPaths() as typeof document.paths),
    ...(phase10OpenApiPaths() as typeof document.paths),
    ...(phase11OpenApiPaths() as typeof document.paths),
  };
  SwaggerModule.setup("docs", app, document);
  http.get("/openapi.json", (_req: unknown, res: Response) => res.json(document));

  if (openApiOutputPath) {
    const outputPath = resolve(process.cwd(), openApiOutputPath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(document, null, 2));
    await app.close();
    return;
  }

  await app.listen(Number(env.API_PORT));
}

void bootstrap();

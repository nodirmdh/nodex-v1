import "reflect-metadata";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Socket } from "node:net";
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
import { PrismaClient, serializeBigInt, type Prisma } from "@nodex/database";
import {
  bookingCancelSchema,
  bookingConfirmSchema,
  bookingHoldSchema,
  boardingCodeCanAttempt,
  boardingCodeRegenerateSchema,
  boardingCodeVerifySchema,
  driverBookingDecisionSchema,
  driverDocumentCompleteSchema,
  driverDocumentPresignSchema,
  driverReviewDecisionSchema,
  driverVerificationDraftSchema,
  citySchema,
  generateSeatLayout,
  pickupPointSchema,
  regionSchema,
  operationReasonSchema,
  calculateParcelPriceMinor,
  defaultParcelLimits,
  evaluateParcelTransition,
  parcelCodeCanAttempt,
  parcelCodeVerifySchema,
  parcelDraftSchema,
  parcelPhotoSchema,
  parcelReasonSchema,
  parcelSubmitSchema,
  parcelStatuses,
  routeSchema,
  searchEventSchema,
  tripAdminActionSchema,
  tripCancelSchema,
  tripCompleteSchema,
  tripDraftSchema,
  tripStartSchema,
  evaluateTripTransition,
  tripSearchQuerySchema,
  tripStopSchema,
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
  auth?: { userId: string; sessionId: string; roles: RoleCode[]; appContext: AppContext };
};

const prisma = new PrismaClient();
const env = parseAppEnv(process.env);
const accessTokenSecret = env.AUTH_ACCESS_TOKEN_SECRET || env.JWT_SECRET;
const refreshCookieName = "nodex_refresh";
const bookingHoldTtlMs = durationToMs(process.env.BOOKING_HOLD_TTL ?? "10m");
const bookingLockTtlMs = durationToMs(process.env.BOOKING_LOCK_TTL ?? "15s");
const boardingCodeTtlMs = durationToMs(process.env.BOARDING_CODE_TTL ?? "2h");
const boardingCodeLength = Number(process.env.BOARDING_CODE_LENGTH ?? 6);
const boardingCodeMaxAttempts = Number(process.env.BOARDING_CODE_MAX_ATTEMPTS ?? 5);
const parcelCodeTtlMs = durationToMs(process.env.PARCEL_CODE_TTL ?? "24h");
const parcelCodeLength = Number(process.env.PARCEL_CODE_LENGTH ?? 6);
const parcelCodeMaxAttempts = Number(process.env.PARCEL_CODE_MAX_ATTEMPTS ?? 5);
const appContextRoles: Record<AppContext, RoleCode> = {
  CLIENT_APP: "CLIENT",
  DRIVER_APP: "DRIVER",
  ADMIN_WEB: "ADMIN",
  LOCAL_MOCK: "CLIENT",
};

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
        responses: { 200: { description: "Parcel limits and prohibited categories", content: json } },
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
    data: { tripId, type, payload: payload as Prisma.InputJsonValue },
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
      ? { id: parcel.pickupPoint.id, name: parcel.pickupPoint.name, address: parcel.pickupPoint.address }
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
  await enqueueParcelEvent(tx, `parcel.${type.toLowerCase()}.code.generated`, parcelId, { expiresAt });
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

async function expireSeatHolds(tx: Prisma.TransactionClient, tripId?: string) {
  const now = new Date();
  const holds = await tx.seatHold.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now }, ...(tripId ? { tripId } : {}) },
    include: { items: true, booking: true },
    take: 100,
  });
  for (const hold of holds) {
    await tx.tripSeat.updateMany({
      where: {
        tripId: hold.tripId,
        seatKey: { in: hold.items.map((item) => item.seatKey) },
        status: "HELD",
      },
      data: { status: "AVAILABLE", version: { increment: 1 } },
    });
    await tx.bookingSeat.updateMany({
      where: { bookingId: hold.bookingId ?? "", status: "HELD" },
      data: { status: "RELEASED" },
    });
    await tx.seatHold.update({
      where: { id: hold.id },
      data: { status: "EXPIRED", releasedAt: now, version: { increment: 1 } },
    });
    if (hold.bookingId) {
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
  }
  return holds.length;
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
      const headerKey = idempotencyKey(req) || randomUUID();
      const response = await prisma.$transaction(async (tx) => {
        const prior = await tx.idempotencyRecord.findUnique({
          where: { scope_key: { scope: `parcel.create:${req.auth!.userId}`, key: headerKey } },
        });
        if (prior) return prior.responseJson as Prisma.JsonObject;
        const category = await tx.parcelCategory.findUnique({ where: { code: parsed.categoryCode } });
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
        const saved = await tx.parcelOrder.findUniqueOrThrow({ where: { id: parcel.id }, include: parcelInclude });
        const body = serializeBigInt({ parcel: serializeParcel(saved) }) as unknown as Prisma.JsonObject;
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
        const current = await clientOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? ""));
        if (!current) throw Object.assign(new Error("Parcel not found"), { statusCode: 404, code: "PARCEL_NOT_FOUND" });
        await transitionParcel(tx, current, "SUBMIT", { userId: req.auth!.userId, role: "CLIENT", requestId: req.requestId });
        await createParcelCode(tx, current.id, "HANDOVER", req.auth!.userId);
        return tx.parcelOrder.findUniqueOrThrow({ where: { id: current.id }, include: parcelInclude });
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
        const current = await clientOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? ""));
        if (!current) throw Object.assign(new Error("Parcel not found"), { statusCode: 404, code: "PARCEL_NOT_FOUND" });
        const actor = { userId: req.auth!.userId, role: "CLIENT" as const, requestId: req.requestId };
        await transitionParcel(tx, current, "CANCEL_SENDER", actor, parsed.reason);
        await tx.parcelCancellation.create({ data: { parcelId: current.id, actorUserId: actor.userId, actorRole: actor.role, reason: parsed.reason } });
        return tx.parcelOrder.findUniqueOrThrow({ where: { id: current.id }, include: parcelInclude });
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
        const current = await clientOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? ""));
        if (!current) throw Object.assign(new Error("Parcel not found"), { statusCode: 404, code: "PARCEL_NOT_FOUND" });
        if (current.attachments.length >= defaultParcelLimits.maxPhotos) {
          throw Object.assign(new Error("Too many parcel photos"), { statusCode: 400, code: "PARCEL_PHOTO_LIMIT" });
        }
        const fileObject = await tx.fileObject.upsert({
          where: { key: parsed.storageKey },
          create: { bucket: "parcel-photos", key: parsed.storageKey, contentType: parsed.mimeType, sizeBytes: parsed.sizeBytes, scanStatus: "APPROVED" },
          update: { contentType: parsed.mimeType, sizeBytes: parsed.sizeBytes, scanStatus: "APPROVED" },
        });
        const created = await tx.parcelAttachment.create({ data: { parcelId: current.id, fileObjectId: fileObject.id, ...parsed } });
        await writeParcelEvent(tx, current.id, req.auth!.userId, "PARCEL_PHOTO_ADDED", { attachmentId: created.id });
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
        const current = await clientOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? ""));
        if (!current || current.status !== "ACCEPTED") {
          throw Object.assign(new Error("Handover code unavailable"), { statusCode: 409, code: "PARCEL_CODE_UNAVAILABLE" });
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
    res.json({ pickupCode: parcel.pickupCodes[0] ? serializeParcelCode(parcel.pickupCodes[0]) : null });
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
    const parcel = await prisma.$transaction((tx) => driverOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? "")));
    if (!parcel) {
      res.status(404).json(errorBody("PARCEL_NOT_FOUND", "Parcel not found", req));
      return;
    }
    res.json({ parcel: serializeParcel(parcel) });
  });

  async function driverParcelAction(req: AuthenticatedRequest, res: Response, action: Parameters<typeof evaluateParcelTransition>[1]) {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = action === "HANDOVER" || action === "DELIVER" ? parcelCodeVerifySchema.parse(req.body ?? {}) : null;
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await driverOwnParcel(tx, req.auth!.userId, String(req.params.parcelId ?? ""));
        if (!current) throw Object.assign(new Error("Parcel not found"), { statusCode: 404, code: "PARCEL_NOT_FOUND" });
        if (action === "HANDOVER" || action === "DELIVER") {
          const code = (action === "HANDOVER" ? current.handoverCodes : current.pickupCodes)[0];
          if (!code) throw Object.assign(new Error("Parcel code not found"), { statusCode: 404, code: "PARCEL_CODE_NOT_FOUND" });
          const guard = parcelCodeCanAttempt({ ...code, now: new Date() });
          if (!guard.ok) throw Object.assign(new Error(guard.code), { statusCode: 409, code: guard.code });
          const success = code.codeHash === hashSecret(parsed!.code);
          const attemptsCount = code.attemptsCount + 1;
          if (action === "HANDOVER") {
            await tx.parcelHandoverCode.update({ where: { id: code.id }, data: success ? { attemptsCount, verifiedAt: new Date(), status: "VERIFIED" } : { attemptsCount, status: attemptsCount >= code.maxAttempts ? "LOCKED" : "ACTIVE", lockedAt: attemptsCount >= code.maxAttempts ? new Date() : null } });
          } else {
            await tx.parcelPickupCode.update({ where: { id: code.id }, data: success ? { attemptsCount, verifiedAt: new Date(), status: "VERIFIED" } : { attemptsCount, status: attemptsCount >= code.maxAttempts ? "LOCKED" : "ACTIVE", lockedAt: attemptsCount >= code.maxAttempts ? new Date() : null } });
          }
          if (!success) throw Object.assign(new Error("Invalid parcel code"), { statusCode: 400, code: "PARCEL_CODE_INVALID" });
        }
        const actor = { userId: req.auth!.userId, role: "DRIVER" as const, requestId: req.requestId };
        await transitionParcel(tx, current, action, actor);
        if (action === "READY_FOR_PICKUP") await createParcelCode(tx, current.id, "PICKUP", req.auth!.userId);
        return tx.parcelOrder.findUniqueOrThrow({ where: { id: current.id }, include: parcelInclude });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/driver/parcels/:parcelId/accept", (req, res) => driverParcelAction(req, res, "DRIVER_ACCEPT"));
  http.post("/api/v1/driver/parcels/:parcelId/reject", (req, res) => driverParcelAction(req, res, "DRIVER_REJECT"));
  http.post("/api/v1/driver/parcels/:parcelId/handover", (req, res) => driverParcelAction(req, res, "HANDOVER"));
  http.post("/api/v1/driver/parcels/:parcelId/ready-for-pickup", (req, res) => driverParcelAction(req, res, "READY_FOR_PICKUP"));
  http.post("/api/v1/driver/parcels/:parcelId/deliver", (req, res) => driverParcelAction(req, res, "DELIVER"));

  http.post("/api/v1/driver/parcels/:parcelId/report-issue", async (req, res) => {
    if (!(await authenticate(req, res, ["DRIVER"]))) return;
    try {
      const parsed = parcelReasonSchema.parse(req.body ?? {});
      const issue = await prisma.parcelIssue.create({
        data: { parcelId: String(req.params.parcelId ?? ""), actorUserId: req.auth!.userId, actorRole: "DRIVER", type: "DRIVER_REPORTED", reason: parsed.reason },
      });
      res.status(201).json({ issue });
    } catch (error) {
      handleError(res, req, error);
    }
  });

  http.get("/api/v1/admin/parcels", async (req, res) => {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    const status = typeof req.query.status === "string" && parcelStatuses.includes(req.query.status as never) ? req.query.status : undefined;
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
    const parcel = await prisma.parcelOrder.findUnique({ where: { id: String(req.params.parcelId ?? "") }, include: parcelInclude });
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

  async function adminParcelAction(req: AuthenticatedRequest, res: Response, action: "CANCEL_ADMIN" | "MARK_LOST" | "MARK_DAMAGED" | "DISPUTE") {
    if (!(await authenticate(req, res, ["ADMIN"]))) return;
    try {
      const parsed = parcelReasonSchema.parse(req.body ?? {});
      const parcel = await prisma.$transaction(async (tx) => {
        const current = await tx.parcelOrder.findUnique({ where: { id: String(req.params.parcelId ?? "") }, include: parcelInclude });
        if (!current) throw Object.assign(new Error("Parcel not found"), { statusCode: 404, code: "PARCEL_NOT_FOUND" });
        const actor = { userId: req.auth!.userId, role: "ADMIN" as const, requestId: req.requestId };
        await transitionParcel(tx, current, action, actor, parsed.reason);
        if (action === "CANCEL_ADMIN") {
          await tx.parcelCancellation.create({ data: { parcelId: current.id, actorUserId: actor.userId, actorRole: actor.role, reason: parsed.reason } });
        } else {
          await tx.parcelIssue.create({ data: { parcelId: current.id, actorUserId: actor.userId, actorRole: actor.role, type: action, reason: parsed.reason } });
        }
        return tx.parcelOrder.findUniqueOrThrow({ where: { id: current.id }, include: parcelInclude });
      });
      res.json({ parcel: serializeParcel(parcel) });
    } catch (error) {
      handleError(res, req, error);
    }
  }

  http.post("/api/v1/admin/parcels/:parcelId/cancel", (req, res) => adminParcelAction(req, res, "CANCEL_ADMIN"));
  http.post("/api/v1/admin/parcels/:parcelId/mark-lost", (req, res) => adminParcelAction(req, res, "MARK_LOST"));
  http.post("/api/v1/admin/parcels/:parcelId/mark-damaged", (req, res) => adminParcelAction(req, res, "MARK_DAMAGED"));
  http.post("/api/v1/admin/parcels/:parcelId/dispute", (req, res) => adminParcelAction(req, res, "DISPUTE"));
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
        await tx.tripSeat.updateMany({
          where: { tripId: hold.tripId, seatKey: { in: seatKeys }, status: "HELD" },
          data: { status: "BOOKED", version: { increment: 1 } },
        });
        await tx.bookingSeat.updateMany({
          where: { bookingId: hold.bookingId, status: "HELD" },
          data: { status: "BOOKED" },
        });
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
            clientComment: parsed.clientComment ?? null,
            confirmedAt: new Date(),
            version: { increment: 1 },
          },
          include: bookingInclude,
        });
        await writeBookingEvent(tx, saved.id, req.auth!.userId, "BOOKING_CONFIRMED", {
          seatKeys,
          paymentMethod: parsed.paymentMethod,
        });
        await writeBookingAudit(tx, "BOOKING_CONFIRMED", saved.id, actor, { seatKeys });
        await enqueueBookingEvent(tx, "booking.confirmed", saved.id, { tripId: hold.tripId });
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
        await tx.tripSeat.updateMany({
          where: { tripId: hold.tripId, seatKey: { in: seatKeys }, status: "HELD" },
          data: { status: "AVAILABLE", version: { increment: 1 } },
        });
        await tx.bookingSeat.updateMany({
          where: { bookingId: hold.bookingId, status: "HELD" },
          data: { status: "RELEASED" },
        });
        await tx.seatHold.update({
          where: { id: hold.id },
          data: { status: "RELEASED", releasedAt: new Date(), version: { increment: 1 } },
        });
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

  http.get("/api/v1/bookings/:bookingId/operation-status", async (req, res) => {
    if (!(await authenticate(req, res, ["CLIENT"]))) return;
    const booking = await prisma.booking.findFirst({
      where: { id: String(req.params.bookingId), clientId: req.auth!.userId },
      include: {
        trip: true,
        seats: true,
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 20 },
        boardingCodes: { orderBy: { createdAt: "desc" }, take: 1 },
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
  app.enableCors({ origin: true, credentials: true });
  app.use(json({ limit: "16kb" }));
  app.use(helmet());
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
      const mockId = role === "ADMIN" ? 900000001 : role === "DRIVER" ? 900000002 : 900000003;
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
  };
  SwaggerModule.setup("docs", app, document);
  http.get("/openapi.json", (_req: unknown, res: Response) => res.json(document));

  await app.listen(Number(env.API_PORT));
}

void bootstrap();

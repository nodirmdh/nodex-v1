import "reflect-metadata";
import { createHash, randomBytes, randomUUID } from "node:crypto";
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
  driverDocumentCompleteSchema,
  driverDocumentPresignSchema,
  driverReviewDecisionSchema,
  driverVerificationDraftSchema,
  citySchema,
  pickupPointSchema,
  regionSchema,
  routeSchema,
  tripAdminActionSchema,
  tripCancelSchema,
  tripDraftSchema,
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
    const parsed = tripAdminActionSchema.parse(req.body ?? {});
    const trip = await prisma.trip.findUnique({
      where: { id: String(req.params.tripId) },
      include: tripInclude,
    });
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
      await tx.tripModerationEvent.create({
        data: {
          tripId: saved.id,
          actorUserId: req.auth!.userId,
          action: "CANCEL",
          reason: parsed.reason,
        },
      });
      await writeTripTimeline(tx, saved.id, "TRIP_CANCELLED_BY_ADMIN", { reason: parsed.reason });
      await writeTripAudit(
        tx,
        "TRIP_CANCELLED_BY_ADMIN",
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
  };
  SwaggerModule.setup("docs", app, document);
  http.get("/openapi.json", (_req: unknown, res: Response) => res.json(document));

  await app.listen(Number(env.API_PORT));
}

void bootstrap();

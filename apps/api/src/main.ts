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
  };
  SwaggerModule.setup("docs", app, document);
  http.get("/openapi.json", (_req: unknown, res: Response) => res.json(document));

  await app.listen(Number(env.API_PORT));
}

void bootstrap();

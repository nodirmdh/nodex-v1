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

  const config = new DocumentBuilder()
    .setTitle("Nodex Intercity API")
    .setDescription("Foundation and Phase 1 authentication OpenAPI contract")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });
  document.paths = { ...document.paths, ...(phase1OpenApiPaths() as typeof document.paths) };
  SwaggerModule.setup("docs", app, document);
  http.get("/openapi.json", (_req: unknown, res: Response) => res.json(document));

  await app.listen(Number(env.API_PORT));
}

void bootstrap();

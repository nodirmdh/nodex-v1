import { createHmac, timingSafeEqual } from "node:crypto";
import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { SignJWT, jwtVerify } from "jose";

export type TelegramValidationError =
  | "AUTH_INIT_DATA_MISSING"
  | "AUTH_INIT_DATA_INVALID"
  | "AUTH_INIT_DATA_EXPIRED";

export interface TelegramUserPayload {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

export interface TelegramInitDataValidation {
  ok: boolean;
  error?: TelegramValidationError;
  user?: TelegramUserPayload;
  authDate?: Date;
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  options: { now?: number; maxAgeSeconds?: number; maxLength?: number } = {},
): TelegramInitDataValidation {
  if (!initData || !botToken) return { ok: false, error: "AUTH_INIT_DATA_MISSING" };
  if (initData.length > (options.maxLength ?? 4096)) {
    return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }

  for (const key of ["hash", "auth_date", "user"]) {
    if (params.getAll(key).length !== 1) return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }

  const hash = params.get("hash");
  const authDate = params.get("auth_date");
  const userJson = params.get("user");
  if (!hash || !authDate || !userJson) return { ok: false, error: "AUTH_INIT_DATA_MISSING" };

  const authDateSeconds = Number(authDate);
  if (!Number.isInteger(authDateSeconds) || authDateSeconds <= 0) {
    return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const ageSeconds = nowSeconds - authDateSeconds;
  if (ageSeconds < 0 || ageSeconds > (options.maxAgeSeconds ?? 86400)) {
    return { ok: false, error: "AUTH_INIT_DATA_EXPIRED" };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const calculatedBuffer = Buffer.from(calculated, "hex");
  const hashBuffer = Buffer.from(hash, "hex");
  if (
    calculatedBuffer.length !== hashBuffer.length ||
    !timingSafeEqual(calculatedBuffer, hashBuffer)
  ) {
    return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }

  try {
    const user = JSON.parse(userJson) as TelegramUserPayload;
    if (!Number.isSafeInteger(user.id) || user.id <= 0) {
      return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
    }
    return { ok: true, user, authDate: new Date(authDateSeconds * 1000) };
  } catch {
    return { ok: false, error: "AUTH_INIT_DATA_INVALID" };
  }
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  now = Date.now(),
): boolean {
  return validateTelegramInitData(initData, botToken, { now }).ok;
}

export async function signSessionToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn = "7d",
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySessionToken(token: string, secret: string) {
  return jwtVerify(token, new TextEncoder().encode(secret));
}

export function defineAbilityFor(roles: string[]) {
  const { can, build } = new AbilityBuilder(createMongoAbility);
  if (roles.includes("SUPER_ADMIN")) can("manage", "all");
  if (roles.includes("ADMIN")) {
    can("read", "User");
    can("read", "AuditEvent");
    can("review", "DriverApplication");
    can("list", "DriverVerification");
    can("read", "DriverVerification");
    can("review", "DriverVerification");
    can("approve", "DriverVerification");
    can("reject", "DriverVerification");
    can("requestChanges", "DriverVerification");
    can("suspend", "DriverVerification");
    can("read", "DriverDocument");
  }
  if (roles.includes("DRIVER")) {
    can("create", "Trip");
    can("readOwn", "DriverVerification");
    can("updateOwn", "DriverVerification");
    can("submitOwn", "DriverVerification");
    can("withdrawOwn", "DriverVerification");
    can("uploadOwn", "DriverDocument");
    can("readOwn", "DriverDocument");
  }
  if (roles.includes("CLIENT")) can("create", "Booking");
  return build();
}

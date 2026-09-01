import { z } from "zod";

export const supportedLocales = ["ru", "uz", "kaa"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const durationSchema = z.string().regex(/^\d+[smhd]$/, "Use duration like 15m, 7d, 3600s, or 24h");

export const appEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://nodex:nodex@localhost:15432/nodex?schema=public"),
  REDIS_URL: z.string().url().default("redis://localhost:6387"),
  JWT_ISSUER: z.string().default("nodex-local"),
  JWT_AUDIENCE: z.string().default("nodex"),
  JWT_SECRET: z.string().min(16).default("replace-with-local-secret"),
  TELEGRAM_CLIENT_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_DRIVER_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_SUPPORT_BOT_TOKEN: z.string().optional().default(""),
  AUTH_ACCESS_TOKEN_SECRET: z.string().optional().default(""),
  AUTH_ACCESS_TOKEN_TTL: durationSchema.default("15m"),
  AUTH_REFRESH_TOKEN_TTL: durationSchema.default("30d"),
  AUTH_INIT_DATA_MAX_AGE: z.coerce.number().int().positive().default(86400),
  AUTH_MOCK_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  AUTH_COOKIE_DOMAIN: z.string().optional().default(""),
  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
  TERMS_VERSION: z.string().default("0.1-local"),
  PRIVACY_VERSION: z.string().default("0.1-local"),
  ADMIN_TELEGRAM_USER_IDS: z.string().optional().default(""),
  DRIVER_DOCUMENT_BUCKET: z.string().default("nodex-driver-documents-local"),
  DRIVER_DOCUMENT_MAX_IMAGE_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  DRIVER_DOCUMENT_MAX_PDF_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  DRIVER_DOCUMENT_SIGNED_URL_TTL: durationSchema.default("10m"),
  DRIVER_DOCUMENT_ALLOWED_MIME_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp,application/pdf"),
  DRIVER_VERIFICATION_CONSENT_VERSION: z.string().default("0.1-local"),
  DRIVER_VERIFICATION_POLICY_VERSION: z.string().default("0.1-local"),
  DRIVER_VERIFICATION_DUPLICATE_CHECK_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .transform((value) => value === "true"),
  REWARD_CLIENT_TRIP_TICKETS: z.coerce.number().int().positive().default(1),
  REWARD_DRIVER_TRIP_TICKETS: z.coerce.number().int().positive().default(1),
  REWARD_CLIENT_REFERRAL_TICKETS: z.coerce.number().int().positive().default(1),
  REWARD_DRIVER_REFERRAL_TICKETS: z.coerce.number().int().positive().default(1),
  REWARD_DRIVER_MILESTONE_TARGET: z.coerce.number().int().positive().default(50),
  REWARD_DRIVER_MILESTONE_VALUE_MINOR: z.coerce.number().int().nonnegative().default(20000000),
  REWARD_MIN_TRIP_DURATION_MINUTES: z.coerce.number().int().positive().default(20),
  REWARD_MIN_MOVEMENT_METERS: z.coerce.number().int().nonnegative().default(500),
  REWARD_MEDIUM_REVIEW_THRESHOLD: z.coerce.number().int().nonnegative().default(2),
  REWARD_HIGH_REVIEW_THRESHOLD: z.coerce.number().int().nonnegative().default(3),
  MATCHING_TIME_WINDOW_HOURS: z.coerce.number().int().positive().default(3),
  WAITLIST_EXPIRATION_DAYS: z.coerce.number().int().positive().default(14),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export function parseAppEnv(input: NodeJS.ProcessEnv): AppEnv {
  const env = appEnvSchema.parse(input);
  if (env.NODE_ENV === "production") {
    const missing = [
      ["AUTH_ACCESS_TOKEN_SECRET", env.AUTH_ACCESS_TOKEN_SECRET],
      ["TELEGRAM_CLIENT_BOT_TOKEN", env.TELEGRAM_CLIENT_BOT_TOKEN],
      ["TELEGRAM_DRIVER_BOT_TOKEN", env.TELEGRAM_DRIVER_BOT_TOKEN],
    ].filter(([, value]) => !value);
    if (missing.length > 0) {
      throw new Error(
        `Missing production auth configuration: ${missing.map(([key]) => key).join(", ")}`,
      );
    }
  }
  return env;
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

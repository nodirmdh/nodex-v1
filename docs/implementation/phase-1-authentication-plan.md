# Phase 1 Authentication Plan

Status: in progress

## Reused Foundation Components

- `packages/database`: existing Prisma client, `User`, `Role`, `UserRole`, `UserSession`, `UserLegalAcceptance`, `AuditEvent`, seed, and migration structure.
- `packages/auth`: existing Telegram init data verifier, JWT helpers, and CASL ability foundation.
- `packages/telegram`: existing Telegram package remains the only place for Telegram bot integration.
- `packages/config`: central environment parsing and supported locales.
- `apps/api`: existing Nest bootstrap, global prefix `/api/v1`, OpenAPI setup, request ID middleware, logging redaction, throttling, and health routes.
- Mini Apps and Admin Web: existing foundation shells, layout, theme, UI primitives, and mock preview surfaces.
- `packages/api-client`: existing Orval setup using `artifacts/openapi.json`.

## Prisma Changes

- Extend `User` with display name, avatar, theme, last seen, accepted terms, terms/privacy versions, and soft delete fields.
- Keep a single identity model and add `TelegramIdentity` linked one-to-one with `User`.
- Keep many-to-many roles through `UserRole`, using role codes `CLIENT`, `DRIVER`, `ADMIN`, `SUPPORT`.
- Replace the minimal session table with `AuthSession` fields for app context, refresh token hash, user agent, IP hash, expiration, revoke metadata, and token family.
- Add `ClientProfile`, extend `DriverProfile` with basic onboarding and verification fields, and add `UserPreference`.
- Keep `AuditEvent` append-only and use action strings for auth/profile events.

## Auth Flow

1. Client or Driver Mini App sends Telegram `initData` with server-side app context.
2. API validates hash, data-check-string, bot-token secret, auth date freshness, malformed payloads, duplicate critical params, and Telegram user JSON.
3. API upserts `TelegramIdentity` and `User`, assigns the app role, creates the matching profile and preferences, and writes audit events.
4. API returns a short-lived access token and safe user/session summary.
5. Admin access is role based and read-only in this phase.

## Session Flow

- Access token is short-lived and sent by `Authorization: Bearer`.
- Refresh token is generated per session, stored only as a hash, and transported with an HttpOnly cookie.
- Refresh rotates the hash transactionally; replay of an old refresh token revokes the session family.
- Logout revokes the current session; logout-all revokes all active sessions for the user.

## Mock Flow

- Mock auth is available only when `NODE_ENV !== production` and `AUTH_MOCK_ENABLED=true`.
- Mock auth uses a dedicated endpoint and deterministic identities for `CLIENT`, `DRIVER`, and `ADMIN`.
- Production must fail closed for mock auth.

## API Endpoints

- `POST /api/v1/auth/telegram`
- `POST /api/v1/auth/mock`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/session`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `PATCH /api/v1/me/preferences`
- `POST /api/v1/me/accept-terms`
- `GET /api/v1/me/sessions`
- `DELETE /api/v1/me/sessions/:sessionId`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:userId`

## Security Assumptions

- Bot context is resolved server-side from the requested app context and configured bot token.
- Roles are never accepted from client payload.
- Blocked/deleted users cannot use product endpoints.
- Tokens, hashes, bot tokens, and raw `initData` are never logged or returned.
- Production startup fails without required auth secrets.
- Rate limits remain enabled for auth/profile/admin search without blocking local E2E.

## Test Plan

- Unit: Telegram validation, expiry, malformed data, role/profile upsert, locale fallback, refresh rotation/replay, logout, blocked user, production mock block.
- Integration: auth transaction, repeated login, concurrent login, session creation/revoke, admin users query, Prisma constraints, audit events.
- E2E API/UI: client, driver, and admin mock login flows; current user; profile/preferences/terms; refresh/logout; forbidden admin; admin users list and detail.
- Accessibility: login/loading/error/profile/settings/terms/admin table/detail states.

## Migration Plan

- Add a new Prisma migration named `phase_1_identity_authentication`.
- Apply it over the foundation schema and verify it also works on a clean database.
- Regenerate Prisma client, update seed with mock client, driver, and admin identities.

## Files Expected To Change

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/*`
- `packages/database/prisma/seed.ts`
- `packages/auth/src/*`
- `packages/config/src/index.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/*`
- `packages/api-client/src/generated/*`
- `apps/client-mini-app/src/app/*`
- `apps/driver-mini-app/src/app/*`
- `apps/admin-web/src/app/*`
- `.env.example`
- `README.md`
- `docs/architecture/authentication.md`
- `docs/security/telegram-authentication.md`
- `docs/security/session-management.md`
- `docs/api/authentication.md`
- `docs/runbooks/auth-troubleshooting.md`
- `docs/implementation/phase-1-authentication-report.md`

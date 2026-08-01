# Nodex Intercity

Telegram Mini App foundation for intercity passenger trips and small parcel delivery.

## Requirements

- Node.js `24.13.1`
- pnpm `11.9.0`
- Docker `29.x` or compatible Compose v2

## Setup

```bash
pnpm install
cp .env.example .env
pnpm doctor
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

PostgreSQL is exposed on `localhost:15432`.

## Apps

- Client Mini App: `http://localhost:3000`
- Driver Mini App: `http://localhost:3001`
- Admin Web: `http://localhost:3002`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`
- Storybook: `http://localhost:6006`
- Mailpit: `http://localhost:18025`

## Common Commands

```bash
pnpm check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:a11y
pnpm screenshots
pnpm storybook
pnpm storybook:build
pnpm api:generate
pnpm build
pnpm analyze
pnpm audit:production
pnpm audit:all
pnpm licenses:check
```

## Acceptance Artifacts

- Screenshots: `artifacts/screenshots/`
- Playwright report: `artifacts/playwright-report/`
- Bundle reports: `artifacts/bundle/`
- Dependency audit policy: `docs/security/dependency-audit.md`

Foundation currently uses mock data only. Real booking, trip management, payments, chat, and support workflows are intentionally not implemented yet.

## Phase 1 Authentication

Phase 1 adds Telegram identity, short-lived access tokens, refresh sessions, basic client/driver profiles, preferences, terms acceptance, and read-only admin users.

Local mock auth is available only with:

```bash
AUTH_MOCK_ENABLED=true
NODE_ENV=development
```

Production must provide real secrets and bot tokens:

```bash
TELEGRAM_CLIENT_BOT_TOKEN
TELEGRAM_DRIVER_BOT_TOKEN
TELEGRAM_SUPPORT_BOT_TOKEN
AUTH_ACCESS_TOKEN_SECRET
AUTH_ACCESS_TOKEN_TTL
AUTH_REFRESH_TOKEN_TTL
AUTH_INIT_DATA_MAX_AGE
TERMS_VERSION
PRIVACY_VERSION
ADMIN_TELEGRAM_USER_IDS
```

See:

- `docs/architecture/authentication.md`
- `docs/security/telegram-authentication.md`
- `docs/security/session-management.md`
- `docs/api/authentication.md`
- `docs/runbooks/auth-troubleshooting.md`

## Phase 2 Driver Verification

Phase 2 adds driver verification drafts, document metadata upload flow, server-side completion checks, admin moderation, review reasons, suspension/restore, audit history, and notification outbox placeholders.

New local settings:

```bash
DRIVER_DOCUMENT_BUCKET
DRIVER_DOCUMENT_MAX_IMAGE_SIZE
DRIVER_DOCUMENT_MAX_PDF_SIZE
DRIVER_DOCUMENT_SIGNED_URL_TTL
DRIVER_DOCUMENT_ALLOWED_MIME_TYPES
DRIVER_VERIFICATION_CONSENT_VERSION
DRIVER_VERIFICATION_POLICY_VERSION
DRIVER_VERIFICATION_DUPLICATE_CHECK_ENABLED
```

See:

- `docs/architecture/driver-verification.md`
- `docs/security/driver-documents.md`
- `docs/api/driver-verification.md`
- `docs/runbooks/driver-verification-troubleshooting.md`

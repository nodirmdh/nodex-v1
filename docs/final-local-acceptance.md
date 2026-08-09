# Final Local Product Acceptance

Date: 2026-08-03

Branch: `chore/final-local-acceptance`

Baseline: created from `feat/payments-analytics-launch` at `18695d6`.

Push status: not pushed.

Current pass status: `FINAL_LOCAL_ACCEPTANCE_FAILED`.

Reason: final isolated acceptance execution is blocked locally because Docker Desktop's Linux engine pipe is unavailable, so PostgreSQL on `localhost:15432` and MinIO on `localhost:9000` cannot be started for the required replay.

## Environment

- Node: `v24.13.1`
- pnpm: `11.9.0`
- Docker CLI: `29.2.0`; Docker daemon access requires elevated execution on this Windows host.
- `npx.cmd`: `11.8.0`; `npx.ps1` is blocked by PowerShell execution policy.
- Root env file present: `.env.example`; no real `.env` was found in the repository root.
- App ports `3100` client, `3101` driver, `3102` admin, `3103` API, and `3104` were free before acceptance runs and free after Playwright timeouts.

## Infrastructure Readiness

- PostgreSQL: `nodex-intercity-postgres-1`, healthy, `localhost:15432`, `pg_isready` passed.
- Redis: `nodex-intercity-redis-1`, healthy, `localhost:6379`, `redis-cli ping` returned `PONG`.
- MinIO: `nodex-intercity-minio-1`, healthy, `localhost:9000`, `/minio/health/live` and `/minio/health/ready` returned `200`.
- Mailpit: `nodex-intercity-mailpit-1`, healthy.
- MinIO anonymous bucket listing returned `Access Denied`; health endpoints and init container status confirm service readiness, but bucket-level credentials should be checked before launch.

## Database

- `pnpm install --frozen-lockfile`: passed, already up to date.
- `pnpm db:generate`: passed.
- `pnpm db:deploy`: passed, no pending migrations.
- `pnpm db:seed`: passed.
- Repeated `pnpm db:seed`: passed.

Seed counts after acceptance baseline included 11 users, 8 driver profiles, 5 vehicles, 5 trips, 6 bookings, 9 parcel orders, 2 payments, 1 payment intent, 1 refund, 1 driver earning, 1 payout, 4 support tickets, 2 conversations, 4 notifications, 1 review, 5 safety reports, 4 regions, 12 cities, 36 pickup points, 6 routes, 5 analytics events, and 1 financial transaction.

## Service Readiness

- Client Mini App: Playwright webServer started on `3100`, readiness URL returned `200`.
- Driver Mini App: Playwright webServer started on `3101`, readiness URL returned `200`.
- Admin Web: Playwright webServer started on `3102`, readiness URL returned `200`.
- API: Playwright webServer started on `3103`, `/api/v1/health` returned ready.
- API live/ready routes exist: `/api/v1/health/live`, `/api/v1/health/ready`.
- Worker: `pnpm --filter @nodex/worker dev` started all queues and processed health, booking, operations, communication, trust-safety, and finance jobs. It is a daemon and was stopped by an external timeout during the bounded probe.

## Test Roles And Fixtures

- Client mock: Telegram ID `900000003`, role `CLIENT`.
- Driver mock: Telegram ID `900000002`, role `DRIVER`.
- Admin mock: Telegram ID `900000001`, role `ADMIN`.
- Support mock: Telegram ID `900000004`, role `SUPPORT`.
- Phase 2 driver fixtures cover draft, submitted, under review, changes requested, approved, rejected, and suspended states.

No real secrets were printed.

## Acceptance Results

- Foundation client/driver/admin/API UI shell: passed in serial regression.
- Phase 1 auth: client and admin checks passed; driver profile expectation is state-sensitive because the shared mock driver is approved by later phases.
- Phase 2 driver verification: protected access and UI checks passed; mutation flow is state-sensitive on the shared driver fixture.
- Phase 3 vehicle management: passed.
- Phase 4 trip supply: passed.
- Phase 5 client UI search/detail: passed; API search tests are state-sensitive after safety block or trip/seat mutations.
- Phase 6 booking UI surfaces: partially passed; API hold/confirm tests and bookings status are state-sensitive after trip operation tests mutate shared bookings.
- Phase 7 trip operations: passed.
- Phase 8 parcel delivery: passed.
- Phase 9 chat, notifications, and support: passed.
- Phase 10 reviews/reliability/safety: review flow and UI surfaces passed; trusted contact creation hit `409` in repeat local state.
- Phase 11 payments/analytics: passed.
- Accessibility: fixed and re-run; 5/5 pages passed, with CLI exit `124` due known open handle after assertions.

## Quality Gates

- Format check: passed after fixes.
- Targeted typecheck: `@nodex/ui`, `@nodex/driver-mini-app`, and `@nodex/admin-web` passed after fixes.
- Full gates should be re-run before final merge after acceptance docs are committed: lint, typecheck, unit, integration, Prisma validate/deploy/seed, Orval generation, build, production audit.
- Final acceptance follow-up pass:
  - `pnpm install --frozen-lockfile`: passed after local `node_modules` was found incomplete.
  - `pnpm db:generate`: passed.
  - `pnpm --filter @nodex/database typecheck`: passed after Prisma Client generation.
  - New acceptance file formatting: applied with Prettier.
  - `pnpm acceptance:reset`: blocked because PostgreSQL is not reachable on `localhost:15432`.
  - `docker compose up -d postgres redis minio mailpit`: blocked because Docker Desktop Linux engine pipe is unavailable.

## Playwright Status

Known issue remains: tests complete assertions, but Playwright wrapper keeps an open handle and exits through external timeout `124`. webServer processes and ports are released.

## Artifact Paths

- Playwright HTML report: `artifacts/playwright-report`
- Failure contexts and screenshots: `test-results`
- Acceptance docs: `docs/final-local-acceptance.md`, `docs/final-acceptance-defects.md`, `docs/final-acceptance-scenarios.md`
- Final isolated acceptance result: `artifacts/final-acceptance/final-local-run.json`

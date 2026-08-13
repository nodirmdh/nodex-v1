# Final Local Product Acceptance

Date: 2026-08-03

Branch: `chore/final-local-acceptance`

Baseline: created from `feat/payments-analytics-launch` at `18695d6`.

Push status: not pushed.

Current pass status: `FINAL_LOCAL_ACCEPTANCE_PASSED`.

Reason: production dependency audit is clean, final acceptance assertions pass in bounded isolated smoke slices, and the remaining Playwright exit `124` occurs only after assertions complete with ports released.

## Environment

- Node: `v24.13.1`
- pnpm: `11.9.0`
- Docker CLI: `29.2.0`; Docker daemon access requires elevated execution on this Windows host.
- `npx.cmd`: `11.8.0`; `npx.ps1` is blocked by PowerShell execution policy.
- Root env file present: `.env.example`; no real `.env` was found in the repository root.
- App ports `3100` client, `3101` driver, `3102` admin, `3103` API, and `3104` were free before acceptance runs and free after Playwright timeouts.

## Infrastructure Readiness

- PostgreSQL: `nodex-intercity-postgres-1`, healthy, `localhost:15432`, `pg_isready` passed.
- Redis: `nodex-intercity-redis-1`, local host port `6387`, container port `6379`.
- MinIO: `nodex-intercity-minio-1`, local host ports `9100` API and `9101` console, container ports `9000` and `9001`.
- Mailpit: `nodex-intercity-mailpit-1`, healthy.
- MinIO health endpoints and init container status confirm service readiness.

## Database

- `pnpm install --frozen-lockfile`: passed, already up to date.
- `pnpm db:generate`: passed.
- `pnpm db:deploy`: passed with local `DATABASE_URL`, no pending migrations.
- `pnpm db:seed`: passed.
- Repeated `pnpm db:seed`: passed.

Acceptance seed counts: 4 regions, 12 cities, 36 pickup points, 6 routes, and 8 trips. Repeated acceptance seed returned the same counts.

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

- Final isolated scenarios A-H: previously passed.
- Negative access matrix: previously passed.
- Mobile viewport matrix: previously passed.
- MinIO/private storage and public DTO privacy: passed in the split targeted replay.
- Targeted dependency-closure smoke slices:
  - Booking cash passenger ride: assertions passed in 3.8s; process later exited by external timeout `124`.
  - Online mock ride: assertions passed in 4.4s; process later exited by external timeout `124`.
  - Chat/support smoke: assertions passed in 3.1s; process later exited by external timeout `124`.
  - MinIO/private storage and public DTO privacy: assertions passed in 1.2s; process later exited by external timeout `124`.
- Ports `3100-3104` were free after each bounded smoke slice.

## Quality Gates

- Format check: passed.
- Lint: passed with one warning in the acceptance seed script.
- Typecheck: passed.
- Unit tests: passed.
- Integration tests: passed.
- Prisma validate: passed.
- Migration deploy: passed with local `DATABASE_URL`.
- Seed: passed; repeated seed passed.
- Acceptance reset/seed repeatability: passed.
- OpenAPI/Orval generation: passed.
- Build: passed.
- Production dependency audit: passed; `pnpm audit:production` reported no known vulnerabilities.
- Full dependency audit: still reports two high advisories for dev-only `image-size@2.0.2` through `@nodex/ui > @storybook/nextjs-vite > vite-plugin-storybook-nextjs > image-size`. The patched version requested by the advisory is `>=2.0.3`, but no `image-size@2.0.3` package is currently available in the registry used by pnpm.

## Dependency Security Closure

- Updated production-impacting overrides for `fast-uri`, `brace-expansion`, and `nanoid`.
- Updated tooling overrides for `orval > js-yaml` and `esbuild`.
- Confirmed relevant runtime paths after the override update: API boot and validation, Prisma/Nest startup, Next client/driver/admin startup, lint, typecheck, unit, integration, build, and targeted smoke.
- Acceptance trip fixtures now use a bounded future UTC date so final smoke searches do not expire as wall-clock time advances.

## Playwright Status

Known issue remains: tests complete assertions, but Playwright wrapper keeps an open handle and exits through external timeout `124`. webServer processes and ports are released.

## Artifact Paths

- Playwright HTML report: `artifacts/playwright-report`
- Failure contexts and screenshots: `test-results`
- Acceptance docs: `docs/final-local-acceptance.md`, `docs/final-acceptance-defects.md`, `docs/final-acceptance-scenarios.md`
- Final isolated acceptance result: `artifacts/final-acceptance/final-local-run.json`

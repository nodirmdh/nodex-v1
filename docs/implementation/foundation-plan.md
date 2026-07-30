# Foundation Implementation Plan

Date: 2026-07-29

## Repository State

The repository starts from documentation-only architecture artifacts. No application code, package manager files, lockfile, CI, Docker Compose, or generated client exist yet.

## Selected Starters and Generators

- Turborepo workspace structure: adapted from official Turborepo monorepo pattern, not copied as a full starter.
- Next.js App Router apps: hand-scaffolded with standard Next.js file conventions to avoid unrelated template code.
- NestJS API/worker structure: hand-scaffolded using standard NestJS modules and providers.
- Prisma: schema and seed foundation in `packages/database`.
- Storybook: configured for `packages/ui`.
- Orval: configured for OpenAPI-generated client in `packages/api-client`.

## CLI/Generator Usage

- `pnpm install` for dependency resolution and lockfile.
- `prisma generate`, `prisma migrate`, `prisma db seed` through package scripts.
- `orval` for API client generation.
- Storybook builder for component workshop.
- Docker Compose for local infrastructure and optional app containers.

## Reused Components and Libraries

- shadcn/Radix-style accessible primitives implemented in `packages/ui`.
- Tailwind CSS tokens and utility styling.
- TanStack Query and Table.
- React Hook Form + Zod.
- Sonner, Vaul, cmdk, Lucide, React Day Picker, Embla.
- NestJS, Pino, Swagger, Helmet, Throttler.
- Prisma, PostgreSQL, Redis, BullMQ.
- grammY, jose, CASL.
- Uppy, MapLibre behind lazy/demo boundaries.
- Vitest, Testing Library, Playwright, MSW, Storybook.

## Adapted Work

- Nodex visual language and design tokens.
- Client, driver, and admin visual shells with mock data.
- API error format, request ID, health endpoints, OpenAPI setup.
- Prisma system/anchor models.
- Bot disabled-local mode when tokens are missing.
- Outbox, queue, storage, maps, auth interfaces.

## Manually Created Work

- Nodex-specific mock data and shell composition.
- Domain-oriented contracts, statuses, and seed defaults.
- Documentation, runbooks, ADRs, and quality gates.

## Stage Checks

1. Root/workspace: `pnpm install`, `pnpm format:check`.
2. UI packages/apps: `pnpm lint`, `pnpm typecheck`, `pnpm storybook:build`.
3. API/client generation: `pnpm api:generate`, `pnpm test:unit`.
4. Database/worker: `pnpm db:generate`, `pnpm test:integration`.
5. Docker: `docker compose config`, `docker compose up`.
6. Final: `pnpm check`, `pnpm build`, `pnpm audit`, `pnpm licenses:check`.

## Acceptance Addendum

- `pnpm doctor` validates Node, pnpm, environment files, Docker Compose, lockfile, ports, and Prisma Client availability.
- `pnpm format:check` runs the local Prettier binary through a direct Node wrapper.
- `pnpm audit:production` is the release gate for runtime vulnerabilities.
- `pnpm audit:all` includes dev tooling and may report the documented ESLint/minimatch/brace-expansion exception.
- `pnpm test:e2e` runs Playwright smoke, API, a11y, and screenshot tests against local web servers.
- `pnpm analyze` creates bundle reports under `artifacts/bundle`.

## Implementation Guardrails

- No real booking/trip/payment/chat business logic in foundation.
- Mock data is separated from future production database logic.
- Heavy libraries are not imported into Mini App routes unless lazy-loaded demo needs them.
- Architecture documents remain untouched except for approved implementation updates.

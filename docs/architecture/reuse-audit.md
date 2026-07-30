# Nodex Intercity Reuse Audit

Date: 2026-07-29

Architecture baseline: `docs/architecture/architecture-review.md`.

## 1. Existing Repository Analysis

The repository currently contains architecture documentation only:

- `docs/architecture/architecture-review.md`

There is no initialized application code, package manager config, Git metadata, dependency lockfile, CI, Docker setup, or source tree yet. This is good for the reuse-first phase because no early boilerplate choices have to be reversed.

Implementation remains blocked until this audit is approved.

## 2. Reuse-First Summary Table

| Block                | Ready solution                           | Repository/package                        | License                   | Activity | What we use                         | What we adapt                  | What we write ourselves   |
| -------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------- | -------- | ----------------------------------- | ------------------------------ | ------------------------- |
| UI foundation        | shadcn/ui + Radix + Tailwind             | `shadcn`, `@radix-ui/*`, `tailwindcss`    | MIT                       | High     | primitives, CLI registry, patterns  | Nodex theme, app shells        | product-specific layouts  |
| Admin dashboard      | shadcn-based shell + TanStack Table      | `@tanstack/react-table`, shadcn blocks    | MIT                       | High     | data table engine, sidebar patterns | dense SaaS admin UX            | admin domain screens      |
| Forms                | React Hook Form + Zod                    | `react-hook-form`, `zod`                  | MIT                       | High     | validation and form state           | shared schemas                 | domain schemas            |
| Tables               | TanStack Table                           | `@tanstack/react-table`                   | MIT                       | High     | sorting/filtering/pagination engine | reusable table wrapper         | saved-view domain logic   |
| Search/command       | cmdk                                     | `cmdk`                                    | MIT                       | Active   | command palette                     | admin global search UI         | search API/domain         |
| Seat selector        | shadcn patterns + dnd-kit for editor     | `@dnd-kit/*`                              | MIT                       | Active   | accessible interactions             | seat map components            | seat inventory rules      |
| Maps                 | MapLibre GL JS                           | `maplibre-gl`                             | BSD-3-Clause              | High     | map rendering                       | lazy map picker                | geocoding adapter         |
| Chat UI              | shadcn chat patterns                     | shadcn registry/templates                 | MIT                       | Active   | message bubbles, composer patterns  | Nodex chat visuals             | chat backend, permissions |
| Uploads              | Uppy                                     | `@uppy/*`                                 | MIT                       | High     | upload manager, progress, retry     | S3/MinIO flow                  | file ownership policy     |
| Notifications        | Sonner + BullMQ outbox                   | `sonner`, `bullmq`                        | MIT                       | High     | toast UI, queue engine              | templates, delivery logs       | notification domain       |
| Auth                 | Telegram Mini Apps SDK + jose            | `@telegram-apps/sdk-react`, `jose`        | MIT                       | Active   | SDK, crypto primitives              | Nest guards                    | session policy            |
| Permissions          | CASL + DB roles                          | `@casl/ability`                           | MIT                       | Active   | policy checks                       | Prisma/Nest integration        | permission catalog        |
| Audit logs           | Prisma extension + append-only tables    | Prisma + own thin layer                   | Apache-2.0 + own          | Active   | Prisma hooks/context                | audit writer                   | audit schema/events       |
| Queues               | BullMQ                                   | `bullmq`                                  | MIT                       | High     | jobs, retries, delayed work         | queue naming/retry policy      | outbox handlers           |
| Payments abstraction | Adapter interface + manual provider      | Own adapter, future provider SDKs         | N/A                       | N/A      | provider SDKs later                 | common contract                | payment orchestration     |
| File storage         | AWS SDK S3 client                        | `@aws-sdk/client-s3`                      | Apache-2.0                | High     | S3-compatible API                   | MinIO/R2 config                | file policy               |
| Localization         | next-intl                                | `next-intl`                               | MIT                       | Active   | routing/messages                    | `ru`, `uz`, `kaa` dictionaries | copy/content              |
| Tests                | Vitest, Testing Library, Playwright, MSW | multiple                                  | MIT/Apache-2.0            | High     | runners/tools                       | monorepo config                | domain tests              |
| Observability        | Pino, nestjs-pino, OpenTelemetry hooks   | `pino`, `nestjs-pino`, `@opentelemetry/*` | MIT/Apache-2.0            | High     | logging/tracing libs                | request context                | event taxonomy            |
| Docker setup         | Compose images                           | Postgres, Redis, MinIO, Mailpit           | OSS images                | High     | official images                     | project compose                | seed/bootstrap            |
| CI                   | GitHub Actions + Renovate                | actions, renovatebot                      | MIT/AGPL app service note | High     | workflows, updates                  | grouped update config          | project gates             |
| Documentation        | Storybook + Mermaid + OpenAPI            | `storybook`, Swagger                      | MIT/Apache-2.0            | High     | component docs, API docs            | Nodex docs taxonomy            | domain docs               |

## 3. Selected Solutions by Block

### UI Foundation

Block: UI foundation

Recommended solution: shadcn/ui, Tailwind CSS, Radix UI primitives, Lucide, Motion/Framer Motion, Sonner, Vaul, Embla, React Day Picker.

Source: `shadcn-ui/ui`, Radix UI, Tailwind, Lucide, Motion ecosystem.

License: primarily MIT.

Last release/activity: shadcn/ui shows active 2026 releases and GitHub activity; GitHub lists `shadcn@4.11.0` as latest on 2026-06-08 and the docs changelog lists July 2026 updates.

Why: shadcn gives accessible primitives without vendor lock-in because components are copied into our repo and themed with CSS variables. It supports a strong custom visual identity while avoiding hand-built primitives.

What we reuse: buttons, dialogs, sheets/drawers, popovers, command palette patterns, tabs, forms, calendar, toast, skeletons, badges, menus.

What we modify: theme tokens, density, mobile Mini App navigation, status colors, shell layouts.

What we do not copy: whole SaaS templates, unrelated dashboard pages, brand assets.

Alternatives: Mantine, Ant Design, Chakra, MUI.

Risks: shadcn components become local code, so upgrades are not automatic.

Final decision: use shadcn/ui as primitive layer with a Nodex theme package.

### Admin Foundation

Block: Admin dashboard

Recommended solution: shadcn-based custom admin shell with TanStack Table, cmdk, Vaul, Recharts/Tremor-inspired chart patterns.

Source: shadcn ecosystem and TanStack Table.

License: MIT.

Last release/activity: TanStack React Table npm page shows version `8.21.3`, MIT, and recent publishing; GitHub shows a large active repository. Refine is also active and MIT, with GitHub showing `@refinedev/core@5.0.12` on 2026-04-02.

Why: Admin must be visually strong and domain-specific. Refine/React Admin are useful references but would impose CRUD abstractions and routing/data-provider conventions that are not necessary yet.

What we reuse: TanStack Table engine, shadcn sidebar/command/dialog patterns, chart primitives.

What we modify: dense table shell, detail drawer, audit timeline, saved filters later.

What we do not copy: Refine/React Admin framework core, Ant Design Pro, AdminLTE, CoreUI.

Alternatives: Refine, React Admin, Ant Design Pro, Tabler, Tremor.

Risks: custom shell means we own layout composition.

Final decision: shadcn admin shell, not a full admin framework.

### Chat UI Foundation

Block: Chat UI

Recommended solution: shadcn chat components/patterns plus custom domain backend.

Source: shadcn registry/templates, Stream/Sendbird/TalkJS/Chatwoot as UX references only.

License: MIT for shadcn pieces; references are not copied.

Last release/activity: shadcn ecosystem has active 2026 chat-related registry updates.

Why: the hard part is Nodex access control, retention, audit, and dispute handling. A third-party chat backend would add vendor lock-in and data retention complexity.

What we reuse: message list, bubbles, composer, attachments, empty/loading/error states.

What we modify: Telegram-like compact mobile UI, system messages, dispute/report actions.

What we do not copy: Stream/Sendbird/TalkJS service SDKs or proprietary UI.

Alternatives: Chatwoot embedded components, Matrix UI components.

Risks: UI kit coverage may not include all states.

Final decision: reuse UI patterns, write Nodex chat backend.

### Maps Foundation

Block: Maps/geocoding

Recommended solution: MapLibre GL JS for map rendering, adapter interface for geocoding/providers.

Source: `maplibre/maplibre-gl-js`.

License: BSD-3-Clause.

Last release/activity: GitHub releases list `v6.0.0` on 2026-07-22; MapLibre remains actively maintained.

Why: open-source, no Mapbox vendor lock-in, supports vector tiles, can be lazy-loaded.

What we reuse: map renderer and controls.

What we modify: mobile picker, route point overlays, fallback manual point entry.

What we do not copy: tile provider assumptions or hosted commercial services.

Alternatives: Leaflet, React Map GL, Google Maps, Mapbox GL JS.

Risks: v6 is ESM-only and requires WebGL2; Mini App compatibility must be tested on target devices.

Final decision: MapLibre, lazy-loaded only where a map is needed.

### Uploads Foundation

Block: Uploads

Recommended solution: Uppy with S3-compatible upload flow; `react-dropzone` only for simple local drop areas if needed.

Source: `uppy`.

License: MIT.

Last release/activity: active npm/GitHub ecosystem; verify exact version during install.

Why: Uppy provides progress, retry, cancellation, previews, camera/mobile upload patterns, and multipart readiness.

What we reuse: Dashboard/headless upload state, progress, retry, validation hooks.

What we modify: signed URL integration and Nodex file categories.

What we do not copy: UploadThing vendor workflow.

Alternatives: react-dropzone, FilePond, UploadThing components.

Risks: Uppy can add bundle weight; keep it out of screens that do not upload.

Final decision: Uppy for document/media upload flows, lazy-loaded.

### Authorization/RBAC Foundation

Block: Authorization/RBAC

Recommended solution: CASL for object-level checks plus database roles/permissions.

Source: `@casl/ability`.

License: MIT.

Last release/activity: npm shows `7.0.1` published in July 2026; Snyk lists 7.x with no direct vulnerabilities. Older versions before fixed ranges had prototype pollution advisories, so pin current safe versions.

Why: Nodex needs object-level authorization like "driver owns trip", "support can see ticket but user cannot see internal notes".

What we reuse: ability rules and condition matching.

What we modify: NestJS guards, Prisma query constraints, permission seed.

What we do not copy: old CASL Prisma/Mongoose adapters blindly.

Alternatives: nest-access-control, AccessControl, custom thin RBAC.

Risks: CASL 7 adoption is newer; lock to patched version and test policy rules.

Final decision: CASL core plus explicit DB permissions.

### OpenAPI and Client Generation

Block: API contracts

Recommended solution: NestJS Swagger/OpenAPI + Orval for frontend clients + Zod schemas for shared validation where appropriate.

Source: `@nestjs/swagger`, `orval`, `zod`.

License: MIT.

Last release/activity: Orval npm shows `8.22.0`, MIT, and recent publication in July 2026.

Why: avoids hand-written API clients and duplicated response types.

What we reuse: OpenAPI generation, typed client generation, TanStack Query hooks.

What we modify: generated-client package boundaries and query key conventions.

What we do not copy: custom REST client boilerplate.

Alternatives: openapi-typescript, Hey API, ts-rest, Zodios.

Risks: Nest DTO decorators and Zod schemas can drift; contract tests must catch drift.

Final decision: Nest Swagger + Orval.

### Testing Foundation

Block: Testing

Recommended solution: Vitest, Testing Library, Playwright, MSW, Faker, Testcontainers where integration value justifies Docker overhead.

Source: respective OSS packages.

License: mostly MIT; Playwright Apache-2.0.

Last release/activity: all are active ecosystem standards; verify exact versions during foundation install.

Why: covers unit, component, API, E2E, mocked network, and realistic DB/Redis tests.

What we reuse: runners, browser automation, mock server, fake data.

What we modify: factories, fixtures, critical-flow tests.

What we do not copy: custom test runner.

Alternatives: Jest, Cypress.

Risks: Testcontainers can slow local tests on weak machines.

Final decision: Vitest default, Playwright for E2E, Testcontainers for selected integration suites.

### Storybook/Component Workshop

Block: Component workshop

Recommended solution: Storybook.

Source: `storybookjs/storybook`.

License: MIT.

Last release/activity: Storybook docs say latest major is actively maintained; GitHub shows active 2026 releases and MIT license.

Why: industry-standard workshop, docs, a11y addon, interaction testing, visual review.

What we reuse: isolated component dev, docs, a11y checks.

What we modify: Nodex stories and theme preview.

What we do not copy: a custom component preview system.

Alternatives: Ladle.

Risks: heavier than Ladle.

Final decision: Storybook for foundation because it supports documentation and quality gates better.

## 4. Found Open-Source Projects and Templates

Selected or useful:

- shadcn/ui: primitive layer and component registry.
- Radix UI: accessible primitives.
- TanStack Table and Query: tables and server state.
- Refine: admin architecture reference only.
- MapLibre GL JS: map rendering.
- Uppy: upload flows.
- CASL: authorization policy engine.
- BullMQ: Redis-backed queues.
- Storybook: component workshop.
- Orval: OpenAPI client generation.
- grammY: Telegram bots.
- Prisma: database ORM.
- NestJS: backend framework.
- Turborepo examples: monorepo structure reference.

Rejected as primary foundations:

- React Admin: strong CRUD assumptions and visual style mismatch.
- Ant Design Pro: large framework and visual/vendor gravity.
- AdminLTE/CoreUI: dated UI language for this product.
- Mantine-only stack: good components, but less aligned with shadcn/Tailwind requirement.
- Stream/Sendbird/TalkJS chat services: vendor lock-in and privacy/retention risk.
- Mapbox/Google Maps as default: vendor and billing dependency.
- UploadThing as default: useful reference, but vendor workflow is unnecessary for S3/MinIO.
- Custom UI primitives: violates reuse-first policy.

## 5. Proposed Starter Combination

Do not import a full SaaS starter blindly.

Recommended combination:

- Turborepo official examples as monorepo reference.
- Next.js app scaffolding for `client-mini-app`, `driver-mini-app`, `admin-web`.
- NestJS CLI app structure for `api` and `worker`.
- shadcn initialization in `packages/ui` and each app as needed.
- Prisma package under `packages/database`.
- Storybook configured against `packages/ui`.
- Docker Compose written for the selected services.

This avoids inheriting unrelated auth, billing, CRM, or SaaS pages.

## 6. License Analysis

Allowed by default:

- MIT: shadcn/ui, Radix, TanStack, CASL, BullMQ, Orval, Storybook, many UI utilities.
- Apache-2.0: Prisma ecosystem portions, Playwright, AWS SDK style packages where applicable.
- BSD-3-Clause: MapLibre GL JS.

Avoid without explicit approval:

- GPL/AGPL code copied into product.
- Proprietary UI kits or service SDKs that require paid infrastructure for core flows.
- Templates without clear license or with unclear attribution requirements.

Compliance actions:

- Keep `THIRD_PARTY_NOTICES.md`.
- Keep `docs/architecture/open-source-register.md`.
- During implementation, record exact versions and notices after dependencies are installed.
- Use `pnpm licenses list` or equivalent license tooling during foundation.

## 7. Vendor Lock-In Risks

- Maps: avoid Mapbox/Google default; use MapLibre plus replaceable tile/geocoding adapters.
- Chat: avoid hosted chat service for core conversation records.
- Uploads: use S3-compatible storage, not provider-specific upload service.
- Payments: adapter interface; manual payment MVP.
- Admin: avoid Refine/React Admin lock-in for core shell.
- UI: shadcn components become local code, reducing runtime vendor lock-in.

## 8. Abandoned Dependency Risks

Higher watch:

- Small shadcn registry chat templates: may become stale; use as patterns, not hard dependency.
- Niche seat selector packages: avoid unless license/activity is clearly good.
- Geocoding provider wrappers: prefer direct adapter over obscure wrapper.

Mitigation:

- Renovate with grouped updates.
- Monthly dependency review.
- `pnpm audit` in CI.
- Lockfile committed.
- Prefer packages with recent release, security policy, large adoption, and permissive license.

## 9. What Is Ready-Made, Adapted, and Custom

Ready-made:

- UI primitives, tables, forms, validation, query cache, dialogs, toasts, drawers, maps, uploads, queues, logging, OpenAPI docs, API client generation, Storybook, testing tools.

Adapted:

- Admin shell, Mini App shells, chat UI, seat map visual components, upload categories, map picker, notification templates, RBAC guards, audit writer, Docker/CI setup.

Custom:

- Nodex domain logic: trip publication, seat hold, booking state transitions, pricing snapshots, boarding code, parcel lifecycle, refund policy orchestration, reliability score inputs, support SLA rules, timeline events, idempotency scopes.

## 10. Updated Foundation Roadmap

1. Approve reuse audit and dependency choices.
2. Create monorepo foundation with pnpm/Turborepo and app/package structure.
3. Add shared TypeScript, ESLint, Prettier, Tailwind, env validation.
4. Add `packages/ui` with shadcn primitives, theme tokens, dark/light/Telegram-aware theme.
5. Build Client, Driver, and Admin visual shells using mock data.
6. Add Storybook with core UI stories.
7. Add NestJS API and worker shells with health endpoints, Pino logging, Swagger.
8. Add Prisma/PostgreSQL package and initial schema skeleton without full business logic.
9. Add Redis/BullMQ shell and outbox placeholder.
10. Add Orval generation pipeline from OpenAPI.
11. Add Docker Compose for local services.
12. Add Playwright/Vitest/MSW testing foundation.
13. Add CI: lint, typecheck, test, build, audit.
14. Add Renovate and dependency-management runbook.
15. Run security/license/dependency checks.

## 11. Estimated Reduction of Custom Development

Reuse is expected to reduce foundation custom code by roughly 55-70%.

Largest savings:

- UI primitives and accessibility: 70-80% saved.
- Tables/forms/uploads/maps: 60-75% saved.
- Queues/logging/testing/OpenAPI: 65-80% saved.
- Admin shell: 40-55% saved because product-specific workflows still need careful design.
- Chat: 35-50% saved because backend, permissions, retention, and timeline are custom.

## 12. Final Status

STATUS: REUSE_AUDIT_COMPLETED

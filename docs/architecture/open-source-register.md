# Open-Source Register

Date: 2026-07-29

This register records selected and candidate open-source dependencies for Nodex Intercity. Exact installed versions must be filled during the foundation implementation after package installation and lockfile creation.

| Name                   | Purpose                         | Source                                             | License           | Decision       | Notes                                                                                      |
| ---------------------- | ------------------------------- | -------------------------------------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------ |
| shadcn/ui              | UI primitive layer and registry | https://github.com/shadcn-ui/ui                    | MIT               | Selected       | Local component ownership; track upstream changes manually.                                |
| Radix UI               | Accessible React primitives     | https://github.com/radix-ui/primitives             | MIT               | Selected       | Used under shadcn components.                                                              |
| Tailwind CSS           | Styling system                  | https://github.com/tailwindlabs/tailwindcss        | MIT               | Selected       | Semantic tokens via CSS variables.                                                         |
| Lucide                 | Icons                           | https://github.com/lucide-icons/lucide             | ISC               | Selected       | Default icon set.                                                                          |
| TanStack Query         | Server state                    | https://github.com/TanStack/query                  | MIT               | Selected       | Shared query patterns.                                                                     |
| TanStack Table         | Data table engine               | https://github.com/TanStack/table                  | MIT               | Selected       | Admin table foundation.                                                                    |
| React Hook Form        | Forms                           | https://github.com/react-hook-form/react-hook-form | MIT               | Selected       | Shared form foundation.                                                                    |
| Zod                    | Validation                      | https://github.com/colinhacks/zod                  | MIT               | Selected       | Shared schema validation.                                                                  |
| cmdk                   | Command palette                 | https://github.com/pacocoursey/cmdk                | MIT               | Selected       | Admin command palette.                                                                     |
| sonner                 | Toasts                          | https://github.com/emilkowalski/sonner             | MIT               | Selected       | App notifications UI.                                                                      |
| Vaul                   | Drawer                          | https://github.com/emilkowalski/vaul               | MIT               | Selected       | Mobile bottom sheets.                                                                      |
| Embla Carousel         | Carousel                        | https://github.com/davidjerleke/embla-carousel     | MIT               | Selected       | Optional UI carousel.                                                                      |
| React Day Picker       | Calendar/date picker            | https://github.com/gpbl/react-day-picker           | MIT               | Selected       | Date selection.                                                                            |
| dnd-kit                | Drag-and-drop                   | https://github.com/clauderic/dnd-kit               | MIT               | Selected       | Seat layout editor later.                                                                  |
| MapLibre GL JS         | Maps                            | https://github.com/maplibre/maplibre-gl-js         | BSD-3-Clause      | Selected       | Lazy loaded; WebGL2 compatibility check required.                                          |
| Uppy                   | Upload manager                  | https://github.com/transloadit/uppy                | MIT               | Selected       | Document/photo uploads.                                                                    |
| CASL                   | Authorization                   | https://github.com/stalniy/casl                    | MIT               | Selected       | Use patched 7.x or later.                                                                  |
| BullMQ                 | Queues                          | https://github.com/taskforcesh/bullmq              | MIT               | Selected       | Redis-backed jobs.                                                                         |
| Prisma                 | ORM                             | https://github.com/prisma/prisma                   | Apache-2.0        | Selected       | Database access. Foundation pins 6.19.3 to keep classic `DATABASE_URL` datasource support. |
| NestJS                 | Backend framework               | https://github.com/nestjs/nest                     | MIT               | Selected       | Modular API and worker.                                                                    |
| grammY                 | Telegram bots                   | https://github.com/grammyjs/grammY                 | MIT               | Selected       | Client/driver/support bots.                                                                |
| jose                   | JWT/crypto                      | https://github.com/panva/jose                      | MIT               | Selected       | Avoid custom crypto.                                                                       |
| next-intl              | Localization                    | https://github.com/amannn/next-intl                | MIT               | Selected       | `ru`, `uz`, `kaa`.                                                                         |
| Orval                  | OpenAPI client generation       | https://github.com/orval-labs/orval                | MIT               | Selected       | Generated frontend API client.                                                             |
| Storybook              | Component workshop              | https://github.com/storybookjs/storybook           | MIT               | Selected       | UI docs and a11y checks.                                                                   |
| Playwright             | E2E tests                       | https://github.com/microsoft/playwright            | Apache-2.0        | Selected       | Browser E2E.                                                                               |
| Vitest                 | Unit tests                      | https://github.com/vitest-dev/vitest               | MIT               | Selected       | Unit/component tests.                                                                      |
| MSW                    | API mocks                       | https://github.com/mswjs/msw                       | MIT               | Selected       | Mock API in tests/storybook.                                                               |
| Pino                   | Structured logging              | https://github.com/pinojs/pino                     | MIT               | Selected       | API/worker logging.                                                                        |
| Refine                 | Admin framework                 | https://github.com/refinedev/refine                | MIT               | Reference only | Too much framework gravity for MVP shell.                                                  |
| React Admin            | Admin framework                 | https://github.com/marmelab/react-admin            | MIT               | Rejected       | CRUD conventions and UI mismatch.                                                          |
| Ant Design Pro         | Admin template                  | https://github.com/ant-design/ant-design-pro       | MIT               | Rejected       | Heavy and brand/style gravity.                                                             |
| AdminLTE               | Admin template                  | https://github.com/ColorlibHQ/AdminLTE             | MIT               | Rejected       | Dated UI for Nodex target.                                                                 |
| Stream/Sendbird/TalkJS | Chat references                 | Vendor docs/repos                                  | Mixed/proprietary | Reference only | No hosted chat dependency for MVP.                                                         |
| UploadThing            | Upload reference                | https://github.com/pingdotgg/uploadthing           | MIT               | Reference only | Avoid vendor-specific upload flow.                                                         |

## Required Follow-Up During Implementation

- Lockfile created and core foundation versions pinned on 2026-07-29.
- License summary ran successfully; see `THIRD_PARTY_NOTICES.md`.
- Vulnerability audit ran after overrides. One high dev-tooling advisory remains for `brace-expansion` via ESLint/minimatch because the patched major breaks ESLint's current dependency chain.
- Bundle impact is partially checked through successful Next production builds and Storybook build output; dedicated Mini App analyzer reports are still pending.

## Foundation Version Pins

| Package family | Foundation version |
| -------------- | ------------------ |
| Node.js        | 24.13.1            |
| pnpm           | 11.9.0             |
| TypeScript     | 5.9.3              |
| Next.js        | 16.2.12            |
| React          | 19.2.8             |
| Prisma         | 6.19.3             |
| NestJS         | 11.2.3             |
| Storybook      | 10.5.5             |
| Playwright     | 1.62.0             |
| Tailwind CSS   | 4.3.3              |
| PostCSS        | 8.5.24             |
| Vitest         | 4.1.10             |

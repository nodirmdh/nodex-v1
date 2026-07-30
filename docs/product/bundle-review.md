# Bundle Review

Date: 2026-07-29

## Commands

```bash
pnpm analyze:client
pnpm analyze:driver
pnpm analyze:admin
pnpm analyze
```

## Report Paths

- Client Mini App: `artifacts/bundle/client/`
- Driver Mini App: `artifacts/bundle/driver/`
- Admin Web: `artifacts/bundle/admin/`

## Acceptance Checks

- MapLibre must not appear in initial Mini App route bundles.
- Uppy must not appear where upload UI is unused.
- Admin table dependencies must not appear in Client Mini App bundles.
- Storybook must not appear in production app bundles.
- Prisma and server-only packages must not appear in browser bundles.
- Admin dependencies must not appear in Driver Mini App bundles.

## Latest Results

Pending rerun after analyzer setup. The generated `summary.json`, `summary.md`, and analyzer HTML files are the source of truth; do not replace them with estimated numbers.

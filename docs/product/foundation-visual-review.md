# Foundation Visual Review

Date: 2026-07-29

## Screens Reviewed

Pending automated screenshot acceptance run:

- Client home/search/trip/booking/profile.
- Driver dashboard/trips/operation/create/passengers/profile.
- Admin dashboard/drivers/trips/bookings/support/design-system.
- Storybook foundation stories.

## Review Template

```text
Screen:
Viewport:
Theme:
Problems found:
Changes made:
Remaining concerns:
Screenshot path:
```

## Issues Found

- Automated Playwright screenshot suite has been added and still needs a successful local run.

## Issues Fixed

- Tailwind v4 PostCSS setup added to apps and UI package so utility classes render.
- Mini Apps keep bottom navigation compact and avoid heavy admin dependencies.
- Admin shell uses dense tables and side detail instead of large empty KPI cards.

## Remaining

- Run `pnpm screenshots`.
- Save screenshots under `artifacts/screenshots/...`.
- Validate dark mode and long RU/UZ/KAA text after servers start.

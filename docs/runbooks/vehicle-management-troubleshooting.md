# Vehicle Management Troubleshooting

Use the standard Phase 3 checks before debugging application behavior:

- Regenerate Prisma Client after schema changes: `pnpm db:generate`.
- Seed local data after applying migrations: `pnpm db:seed`.
- Check API health through Playwright `webServer` during smoke runs rather than starting API manually.

Common errors:

- `VEHICLE_PLATE_DUPLICATE`: another non-archived vehicle has the same normalized plate.
- `VEHICLE_DRIVER_NOT_APPROVED`: the driver profile must be approved before submitting vehicles.
- `VEHICLE_INCOMPLETE`: required data, registration document, or required photos are missing.
- `VEHICLE_REASON_REQUIRED`: admin sensitive decisions need a reason, and `OTHER` also needs a comment.
- `VEHICLE_ACTIVE_TRIP`: archive is blocked because a future Trips module reports active usage.
